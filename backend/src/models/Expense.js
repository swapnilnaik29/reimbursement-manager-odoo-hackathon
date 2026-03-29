'use strict';

const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true,
  },
  submitted_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: String,
  category: String,
  original_amount: {
    type: Number,
    required: true,
  },
  original_currency: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 3,
  },
  converted_amount: Number,
  converted_currency: String,
  receipt_url: String,
  ocr_data: mongoose.Schema.Types.Mixed,
  status: {
    type: String,
    enum: ['Draft', 'Submitted', 'Pending', 'Pending_Approval', 'Approved', 'Rejected', 'Cancelled'],
    default: 'Draft',
  },
  current_approval_step: {
    type: Number,
    default: 0,
  },
  submitted_at: Date,
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);
