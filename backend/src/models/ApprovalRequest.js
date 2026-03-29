'use strict';

const mongoose = require('mongoose');

const approvalRequestSchema = new mongoose.Schema({
  expense_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expense',
    required: true,
    index: true,
  },
  rule_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ApprovalRule',
    required: true,
  },
  approver_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  step_order: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Skipped'],
    default: 'Pending',
  },
  comment: String,
  decided_at: Date,
}, { timestamps: true });

module.exports = mongoose.model('ApprovalRequest', approvalRequestSchema);
