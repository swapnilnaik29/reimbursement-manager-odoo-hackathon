'use strict';

const ApprovalRequest = require('../../models/ApprovalRequest');
const ApprovalRule = require('../../models/ApprovalRule');
const { processDecision } = require('./approvals.service');
const { createError } = require('../../middleware/errorHandler');
const { z } = require('zod');

const decisionSchema = z.object({
  decision: z.enum(['Approved', 'Rejected']),
  comment:  z.string().optional(),
});

async function getMyQueue(req, res, next) {
  try {
    const data = await ApprovalRequest.find({
      approver_id: req.user._id,
      status: 'Pending',
    })
      .populate({
        path: 'expense_id',
        populate: { path: 'submitted_by', select: 'full_name email' }
      })
      .sort({ createdAt: 1 })
      .lean();

    return res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

async function decide(req, res, next) {
  try {
    const { requestId } = req.params;
    const body = decisionSchema.parse(req.body);

    const result = await processDecision({
      requestId,
      approverId: req.user._id,
      decision:   body.decision,
      comment:    body.comment || null,
    });

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function getRules(req, res, next) {
  try {
    const data = await ApprovalRule.find({ company_id: req.user.company_id })
      .sort({ step_order: 1 })
      .lean();

    return res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

async function createRule(req, res, next) {
  try {
    const ruleSchema = z.object({
      name:        z.string().min(1),
      step_order:  z.number().int().positive(),
      rule_type:   z.enum(['Sequential', 'Percentage', 'Role_Override', 'Direct_Manager']),
      min_amount:  z.number().optional().nullable(),
      max_amount:  z.number().optional().nullable(),
      category:    z.string().optional().nullable(),
      config:      z.record(z.unknown()),
    });

    const body = ruleSchema.parse(req.body);

    const data = await ApprovalRule.create({
      ...body,
      company_id: req.user.company_id,
    });

    return res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
}

async function deleteRule(req, res, next) {
  try {
    const { ruleId } = req.params;
    const data = await ApprovalRule.findOneAndDelete({
      _id: ruleId,
      company_id: req.user.company_id,
    });

    if (!data) throw createError(404, 'Approval rule not found or access denied.');
    
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { getMyQueue, decide, getRules, createRule, deleteRule };
