'use strict';

const mongoose = require('mongoose');

const approvalRuleSchema = new mongoose.Schema({
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
  },
  step_order: {
    type: Number,
    required: true,
  },
  rule_type: {
    type: String,
    enum: ['Sequential', 'Percentage', 'Role_Override', 'Direct_Manager'],
    required: true,
  },
  min_amount: Number,
  max_amount: Number,
  category: String,
  config: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, { timestamps: true });

module.exports = mongoose.model('ApprovalRule', approvalRuleSchema);
