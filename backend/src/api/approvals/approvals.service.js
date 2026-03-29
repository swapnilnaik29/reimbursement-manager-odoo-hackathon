'use strict';

const User = require('../../models/User');
const Expense = require('../../models/Expense');
const ApprovalRule = require('../../models/ApprovalRule');
const ApprovalRequest = require('../../models/ApprovalRequest');
const { createError } = require('../../middleware/errorHandler');
const logger = require('../../config/logger');

/* ─── Helpers ─────────────────────────────────────────────────── */

async function getUsersByRole(companyId, role) {
  return User.find({ company_id: companyId, role }).select('_id role full_name email').lean();
}

async function getApplicableRules(expense) {
  const rules = await ApprovalRule.find({ company_id: expense.company_id }).sort({ step_order: 1 });
  if (!rules || rules.length === 0) return [];

  return rules.filter((rule) => {
    const evalAmount = expense.converted_amount ?? expense.original_amount;
    if (rule.min_amount != null && evalAmount < rule.min_amount) return false;
    if (rule.max_amount != null && evalAmount > rule.max_amount) return false;
    if (rule.category   != null && rule.category !== expense.category) return false;
    return true;
  });
}

/**
 * Build ApprovalRequest documents for a given set of rules at the same step_order.
 * Returns an array of objects ready for insertMany (does NOT save them).
 */
async function buildRequestsForRules(expense, rules) {
  const docs = [];

  for (const rule of rules) {
    const config = rule.config || {};
    logger.info('ApprovalEngine', `Building requests for rule "${rule.name}" [${rule.rule_type}] step ${rule.step_order}`);

    if (rule.rule_type === 'Sequential') {
      // ALL users of the required role receive a request — the step is complete when ANY ONE approves.
      const role       = config.approver_role || 'Manager';
      const candidates = await getUsersByRole(expense.company_id, role);
      if (candidates.length === 0) {
        logger.warn('ApprovalEngine', `No users with role "${role}" — skipping Sequential rule "${rule.name}"`);
        continue;
      }
      for (const c of candidates) {
        docs.push({ expense_id: expense._id, rule_id: rule._id, approver_id: c._id, step_order: rule.step_order, status: 'Pending' });
      }

    } else if (rule.rule_type === 'Direct_Manager') {
      const submitter = await User.findById(expense.submitted_by).lean();
      if (!submitter || !submitter.manager_id) {
        logger.warn('ApprovalEngine', `No direct manager for user ${expense.submitted_by} — skipping rule "${rule.name}"`);
        continue;
      }
      docs.push({ expense_id: expense._id, rule_id: rule._id, approver_id: submitter.manager_id, step_order: rule.step_order, status: 'Pending' });

    } else if (rule.rule_type === 'Percentage') {
      // ALL users of required role receive requests — step complete when X% approve.
      const role       = config.approver_role || 'Manager';
      const candidates = await getUsersByRole(expense.company_id, role);
      for (const c of candidates) {
        docs.push({ expense_id: expense._id, rule_id: rule._id, approver_id: c._id, step_order: rule.step_order, status: 'Pending' });
      }

    } else if (rule.rule_type === 'Role_Override') {
      const overrideRole = config.override_role || 'Admin';
      const candidates   = await getUsersByRole(expense.company_id, overrideRole);
      if (candidates.length === 0) {
        logger.warn('ApprovalEngine', `No users with role "${overrideRole}" — skipping Role_Override rule "${rule.name}"`);
        continue;
      }
      docs.push({ expense_id: expense._id, rule_id: rule._id, approver_id: candidates[0]._id, step_order: rule.step_order, status: 'Pending' });
    }
  }

  return docs;
}

/**
 * Check if a step is "complete" (ready to advance) based on the rule type.
 * For Sequential / Direct_Manager / Role_Override: ONE approval is enough.
 * For Percentage: X% of that step's requests must be Approved.
 */
async function isStepComplete(expenseId, stepOrder) {
  const stepRequests = await ApprovalRequest.find({ expense_id: expenseId, step_order: stepOrder }).lean();
  if (stepRequests.length === 0) return false;

  const approvedCount = stepRequests.filter((r) => r.status === 'Approved').length;
  if (approvedCount === 0) return false;

  // Determine rule type from the populated rule
  const sampleRequest = await ApprovalRequest.findOne({ expense_id: expenseId, step_order: stepOrder }).populate('rule_id').lean();
  const rule = sampleRequest?.rule_id;
  if (!rule) return true; // fallback

  if (rule.rule_type === 'Percentage') {
    const required = rule.config?.percentage ?? 60;
    const pct = (approvedCount / stepRequests.length) * 100;
    logger.info('ApprovalEngine', `Percentage check: ${approvedCount}/${stepRequests.length} (${pct.toFixed(1)}%) vs required ${required}%`);
    return pct >= required;
  }

  // Sequential / Direct_Manager / Role_Override: one approval suffices
  return true;
}

/* ─── Public: Kick off the approval engine ─────────────────────── */

async function evaluateAndCreateApprovalRequests(expense) {
  logger.info('ApprovalEngine', `Evaluating expense ${expense._id}`, { amount: expense.original_amount });

  const rules = await getApplicableRules(expense);

  if (rules.length === 0) {
    logger.info('ApprovalEngine', `No applicable rules — auto-approving expense ${expense._id}`);
    expense.status = 'Approved';
    await expense.save();
    return;
  }

  // LAZY: only create requests for STEP 1 now. Next steps are created when each step completes.
  const firstStepOrder = rules[0].step_order;
  const firstStepRules = rules.filter((r) => r.step_order === firstStepOrder);

  const docs = await buildRequestsForRules(expense, firstStepRules);

  if (docs.length === 0) {
    // All step-1 rules were skipped (no eligible approvers) — try to advance
    logger.warn('ApprovalEngine', `Step ${firstStepOrder} had no eligible approvers — checking for further steps`);
    await advanceToNextStep(expense, firstStepOrder, rules);
    return;
  }

  await ApprovalRequest.insertMany(docs);
  logger.db('ApprovalEngine', `Created ${docs.length} request(s) for step ${firstStepOrder}`);

  expense.status = 'Pending_Approval';
  expense.current_approval_step = firstStepOrder;
  await expense.save();
}

/**
 * Advance the expense to the next step, OR mark it fully Approved if no more steps.
 * Called after a step completes.
 */
async function advanceToNextStep(expense, completedStepOrder, allRules) {
  // Find the next higher step_order
  const remainingRules = allRules.filter((r) => r.step_order > completedStepOrder);

  if (remainingRules.length === 0) {
    logger.info('ApprovalEngine', `All steps complete — expense ${expense._id} FULLY APPROVED`);
    expense.status = 'Approved';
    expense.current_approval_step = 0;
    await expense.save();
    return { outcome: 'Approved' };
  }

  const nextStepOrder = remainingRules[0].step_order;
  const nextStepRules = remainingRules.filter((r) => r.step_order === nextStepOrder);
  const docs = await buildRequestsForRules(expense, nextStepRules);

  if (docs.length === 0) {
    // No eligible approvers for this step either — skip to the one after
    logger.warn('ApprovalEngine', `Step ${nextStepOrder} had no eligible approvers — skipping`);
    return advanceToNextStep(expense, nextStepOrder, allRules);
  }

  await ApprovalRequest.insertMany(docs);
  logger.db('ApprovalEngine', `Advanced to step ${nextStepOrder}, created ${docs.length} request(s)`);

  expense.current_approval_step = nextStepOrder;
  await expense.save();
  return { outcome: 'Advanced', next_step: nextStepOrder };
}

/* ─── Public: Process an approver's decision ───────────────────── */

async function processDecision({ requestId, approverId, decision, comment }) {
  const request = await ApprovalRequest.findById(requestId).populate('rule_id');
  if (!request) throw createError(404, 'Approval request not found.');
  if (request.status !== 'Pending') throw createError(400, `This request has already been ${request.status.toLowerCase()}.`);
  if (request.approver_id.toString() !== approverId.toString()) throw createError(403, 'You are not the designated approver for this request.');

  const expense = await Expense.findById(request.expense_id);
  if (!expense) throw createError(404, 'Associated expense not found.');
  if (expense.status !== 'Pending_Approval') throw createError(400, 'This expense is not awaiting approval.');

  // Prevent self-approval
  if (expense.submitted_by.toString() === approverId.toString()) {
    throw createError(403, 'You cannot approve an expense that you submitted.');
  }

  /* ── REJECT ─────────────────────────────────────────────────── */
  if (decision === 'Rejected') {
    if (!comment?.trim()) throw createError(400, 'A comment is required when rejecting an expense.');

    request.status     = 'Rejected';
    request.comment    = comment;
    request.decided_at = new Date();
    await request.save();

    // Cancel ALL remaining pending requests across all steps
    await ApprovalRequest.updateMany(
      { expense_id: expense._id, status: 'Pending', _id: { $ne: request._id } },
      { $set: { status: 'Skipped' } }
    );

    expense.status = 'Rejected';
    await expense.save();
    logger.info('ApprovalEngine', `Expense ${expense._id} REJECTED at step ${request.step_order}`, { comment });
    return { outcome: 'Rejected', expense_id: expense._id };
  }

  /* ── APPROVE ────────────────────────────────────────────────── */
  logger.info('ApprovalEngine', `Expense ${expense._id} APPROVED at step ${request.step_order} by ${approverId}`);
  request.status     = 'Approved';
  request.comment    = comment || null;
  request.decided_at = new Date();
  await request.save();

  const stepDone = await isStepComplete(expense._id, request.step_order);
  if (!stepDone) {
    return { outcome: 'Pending', message: 'Approval recorded. Waiting for other approvers at this step.', expense_id: expense._id };
  }

  // Skip remaining Pending requests for THIS step (e.g. other managers who haven't voted)
  await ApprovalRequest.updateMany(
    { expense_id: expense._id, step_order: request.step_order, status: 'Pending' },
    { $set: { status: 'Skipped' } }
  );

  // Load ALL applicable rules to find what comes next
  const allRules = await getApplicableRules(expense);
  const result = await advanceToNextStep(expense, request.step_order, allRules);
  return { ...result, expense_id: expense._id };
}

module.exports = { evaluateAndCreateApprovalRequests, processDecision };
