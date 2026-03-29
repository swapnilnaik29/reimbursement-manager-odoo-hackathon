'use strict';

const User = require('../../models/User');
const Expense = require('../../models/Expense');
const ApprovalRule = require('../../models/ApprovalRule');
const ApprovalRequest = require('../../models/ApprovalRequest');
const { createError }   = require('../../middleware/errorHandler');
const logger            = require('../../config/logger');

async function getUsersByRole(companyId, role) {
  try {
    return await User.find({ company_id: companyId, role }).select('_id role full_name email');
  } catch (err) {
    throw createError(500, `Could not fetch users by role: ${err.message}`);
  }
}

async function getApplicableRules(expense) {
  try {
    const rules = await ApprovalRule.find({ company_id: expense.company_id }).sort({ step_order: 1 });

    if (!rules || rules.length === 0) {
      logger.info('ApprovalEngine', 'No approval rules configured for company', { companyId: expense.company_id });
      return [];
    }

    const applicable = rules.filter((rule) => {
      // Use converted_amount safely, fallback to original if conversion had failed
      const evalAmount = expense.converted_amount != null ? expense.converted_amount : expense.original_amount;
      if (rule.min_amount != null && evalAmount < rule.min_amount) return false;
      if (rule.max_amount != null && evalAmount > rule.max_amount) return false;
      if (rule.category   != null && rule.category !== expense.category) return false;
      return true;
    });

    logger.info('ApprovalEngine', `${applicable.length}/${rules.length} rules apply to expense ${expense._id}`);
    return applicable;
  } catch (err) {
    throw createError(500, `Could not fetch approval rules: ${err.message}`);
  }
}

async function evaluateAndCreateApprovalRequests(expense) {
  logger.info('ApprovalEngine', `Evaluating approval rules for expense ${expense._id}`, { amount: expense.original_amount, category: expense.category });
  const rules = await getApplicableRules(expense);

  if (rules.length === 0) {
    logger.info('ApprovalEngine', `No applicable rules — auto-approving expense ${expense._id}`);
    expense.status = 'Approved';
    await expense.save();
    return;
  }

  const requestsToInsert = [];

  for (const rule of rules) {
    const config = rule.config || {};
    logger.info('ApprovalEngine', `Processing rule "${rule.name}" [${rule.rule_type}] step ${rule.step_order}`);

    if (rule.rule_type === 'Sequential') {
      const approverRole = config.approver_role || 'Manager';
      const candidates   = await getUsersByRole(expense.company_id, approverRole);

      if (candidates.length === 0) {
        logger.warn('ApprovalEngine', `No users with role "${approverRole}" in company ${expense.company_id}. Skipping rule "${rule.name}".`);
        continue;
      }

      requestsToInsert.push({
        expense_id:   expense._id,
        rule_id:      rule._id,
        approver_id:  candidates[0]._id,
        step_order:   rule.step_order,
        status:       'Pending',
      });
    } else if (rule.rule_type === 'Percentage') {
      const approverRole = config.approver_role || 'Manager';
      const candidates   = await getUsersByRole(expense.company_id, approverRole);

      for (const candidate of candidates) {
        requestsToInsert.push({
          expense_id:  expense._id,
          rule_id:     rule._id,
          approver_id: candidate._id,
          step_order:  rule.step_order,
          status:      'Pending',
        });
      }
    } else if (rule.rule_type === 'Role_Override') {
      const overrideRole = config.override_role || 'Admin';
      const candidates   = await getUsersByRole(expense.company_id, overrideRole);

      if (candidates.length === 0) {
        logger.warn('ApprovalEngine', `No override role "${overrideRole}" users found. Skipping rule.`);
        continue;
      }

      requestsToInsert.push({
        expense_id:  expense._id,
        rule_id:     rule._id,
        approver_id: candidates[0]._id,
        step_order:  rule.step_order,
        status:      'Pending',
      });
    } else if (rule.rule_type === 'Direct_Manager') {
      const submitter = await User.findById(expense.submitted_by);
      if (!submitter || !submitter.manager_id) {
        logger.warn('ApprovalEngine', `No direct manager found for user ${expense.submitted_by}. Skipping direct manager rule.`);
        continue;
      }

      requestsToInsert.push({
        expense_id:  expense._id,
        rule_id:     rule._id,
        approver_id: submitter.manager_id,
        step_order:  rule.step_order,
        status:      'Pending',
      });
    }
  }

  if (requestsToInsert.length === 0) {
    logger.warn('ApprovalEngine', `All rules were skipped (no eligible users) — auto-approving expense ${expense._id}`);
    expense.status = 'Approved';
    await expense.save();
    return;
  }

  try {
    await ApprovalRequest.insertMany(requestsToInsert);
    const firstStep = rules[0].step_order;
    logger.db('ApprovalEngine', `Inserted ${requestsToInsert.length} approval request(s). Setting expense to Pending_Approval at step ${firstStep}.`);
    
    expense.status = 'Pending_Approval';
    expense.current_approval_step = firstStep;
    await expense.save();
  } catch (err) {
    throw createError(500, `Failed to create approval requests: ${err.message}`);
  }
}

async function processDecision({ requestId, approverId, decision, comment }) {
  const request = await ApprovalRequest.findById(requestId).populate('rule_id');

  if (!request) throw createError(404, 'Approval request not found.');
  if (request.status !== 'Pending') {
    logger.warn('ApprovalEngine', `Decision blocked — request ${requestId} already ${request.status}`);
    throw createError(400, `This request has already been ${request.status.toLowerCase()}.`);
  }
  if (request.approver_id.toString() !== approverId.toString()) {
    logger.warn('ApprovalEngine', `Unauthorized decision attempt`, { requestId, approverId });
    throw createError(403, 'You are not the designated approver for this request.');
  }

  const expense = await Expense.findById(request.expense_id);
  if (!expense) throw createError(404, 'Associated expense not found.');
  if (expense.status !== 'Pending_Approval') {
    throw createError(400, 'This expense is not awaiting approval.');
  }

  // REJECT FLOW
  if (decision === 'Rejected') {
    if (!comment || comment.trim().length === 0) {
      throw createError(400, 'A comment is required when rejecting an expense.');
    }
    logger.info('ApprovalEngine', `Expense ${expense._id} REJECTED by approver ${approverId}`, { comment });

    request.status = 'Rejected';
    request.comment = comment;
    request.decided_at = new Date();
    await request.save();

    await ApprovalRequest.updateMany(
      { expense_id: expense._id, status: 'Pending', _id: { $ne: requestId } },
      { $set: { status: 'Skipped' } }
    );

    expense.status = 'Rejected';
    await expense.save();

    return { outcome: 'Rejected', expense_id: expense._id };
  }

  // APPROVE FLOW
  logger.info('ApprovalEngine', `Expense ${expense._id} APPROVED at step ${request.step_order} by ${approverId}`);
  request.status = 'Approved';
  request.comment = comment || null;
  request.decided_at = new Date();
  await request.save();

  const rule = request.rule_id;
  const stepComplete = await isStepComplete(expense._id, request.step_order, rule);

  if (!stepComplete) {
    return { outcome: 'Pending', message: 'Approval recorded. Waiting for other approvers.', expense_id: expense._id };
  }

  const nextRequests = await ApprovalRequest.find({ expense_id: expense._id, status: 'Pending' })
    .sort({ step_order: 1 })
    .limit(1);

  if (!nextRequests || nextRequests.length === 0) {
    logger.info('ApprovalEngine', `All steps complete — expense ${expense._id} FULLY APPROVED`);
    expense.status = 'Approved';
    expense.current_approval_step = 0;
    await expense.save();
    return { outcome: 'Approved', expense_id: expense._id };
  }

  const nextStep = nextRequests[0].step_order;
  logger.info('ApprovalEngine', `Advancing expense ${expense._id} to step ${nextStep}`);
  expense.current_approval_step = nextStep;
  await expense.save();

  return { outcome: 'Advanced', next_step: nextStep, expense_id: expense._id };
}

async function isStepComplete(expenseId, stepOrder, rule) {
  if (rule.rule_type === 'Sequential' || rule.rule_type === 'Role_Override' || rule.rule_type === 'Direct_Manager') {
    return true;
  }

  if (rule.rule_type === 'Percentage') {
    const requiredPct = rule.config?.percentage ?? 60;
    const stepRequests = await ApprovalRequest.find({ expense_id: expenseId, step_order: stepOrder });

    const total = stepRequests.length;
    const approved = stepRequests.filter((r) => r.status === 'Approved').length;

    if (total === 0) return false;

    const pct = (approved / total) * 100;
    logger.info('ApprovalEngine', `Percentage check: ${approved}/${total} (${pct.toFixed(1)}%) vs required ${requiredPct}%`);
    return pct >= requiredPct;
  }

  return true;
}

module.exports = {
  evaluateAndCreateApprovalRequests,
  processDecision,
};
