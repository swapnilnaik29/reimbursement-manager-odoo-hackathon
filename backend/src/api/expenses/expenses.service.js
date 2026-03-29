'use strict';

const axios = require('axios');
const Company = require('../../models/Company');
const Expense = require('../../models/Expense');
const { evaluateAndCreateApprovalRequests } = require('../approvals/approvals.service');
const { createError } = require('../../middleware/errorHandler');
const logger = require('../../config/logger');

const rateCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000;

async function getConversionRate(fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return 1;

  const cacheKey = `${fromCurrency}_${toCurrency}`;
  const cached   = rateCache.get(cacheKey);

  if (cached && cached.expiry > Date.now()) {
    logger.debug('CurrencyService', `Cache hit: ${cacheKey} = ${cached.rate}`);
    return cached.rate;
  }

  const apiKey = process.env.EXCHANGE_RATE_API_KEY;
  if (!apiKey) throw createError(500, 'EXCHANGE_RATE_API_KEY is not configured.');

  const url = `https://v6.exchangerate-api.com/v6/${apiKey}/pair/${fromCurrency}/${toCurrency}`;

  try {
    logger.info('CurrencyService', `Fetching live rate: ${fromCurrency} → ${toCurrency}`);
    const { data } = await axios.get(url, { timeout: 8000 });
    if (data.result !== 'success') {
      throw new Error(data['error-type'] || 'Unknown API error');
    }

    const rate = data.conversion_rate;
    logger.info('CurrencyService', `Rate fetched: 1 ${fromCurrency} = ${rate} ${toCurrency}`);
    rateCache.set(cacheKey, { rate, expiry: Date.now() + CACHE_TTL_MS });
    return rate;
  } catch (err) {
    logger.error('CurrencyService', 'Failed to fetch rate', { error: err.message });
    throw createError(502, `Currency conversion failed: ${err.message}`);
  }
}

async function enrichWithConvertedAmount(expense, companyDefaultCurrency) {
  try {
    const rate = await getConversionRate(expense.original_currency, companyDefaultCurrency);
    expense.converted_amount = parseFloat((expense.original_amount * rate).toFixed(2));
    expense.converted_currency = companyDefaultCurrency;
    return expense;
  } catch (_err) {
    return expense;
  }
}

async function createDraftFromOcr({ userId, companyId, ocrData }) {
  logger.info('ExpenseService', 'Creating draft from OCR data', { userId, companyId });
  const {
    title            = 'Untitled Expense',
    description,
    category,
    amount,
    currency         = 'USD',
    receipt_url,
  } = ocrData;

  if (!amount || isNaN(parseFloat(amount))) {
    throw createError(400, 'OCR data must include a valid numeric `amount` field.');
  }

  try {
    const expense = await Expense.create({
      company_id:        companyId,
      submitted_by:      userId,
      title,
      description,
      category,
      original_amount:   parseFloat(amount),
      original_currency: currency.toUpperCase(),
      receipt_url,
      ocr_data:          ocrData,
      status:            'Draft',
    });
    
    logger.db('ExpenseService', `Draft expense created: ${expense._id}`);
    return expense;
  } catch (err) {
    throw createError(500, `Failed to create draft expense: ${err.message}`);
  }
}

async function createManualExpense({ userId, companyId, data, file }) {
  logger.info('ExpenseService', 'Creating manual expense', { userId, companyId });
  const { title, description, category, amount, currency } = data;

  if (!amount || isNaN(parseFloat(amount))) {
    throw createError(400, 'Valid numeric `amount` is required.');
  }

  let receipt_url = null;
  if (file) {
    receipt_url = `/uploads/receipts/${file.filename}`;
  }

  const company = await Company.findById(companyId);

  const expense = new Expense({
    company_id:        companyId,
    submitted_by:      userId,
    title:             title || 'Manual Expense',
    description,
    category:          category || 'General',
    original_amount:   parseFloat(amount),
    original_currency: (currency || 'USD').toUpperCase(),
    receipt_url,
    status:            'Submitted',
    submitted_at:      new Date(),
  });
  
  try {
    const rate = await getConversionRate(expense.original_currency, company.default_currency);
    expense.converted_amount = parseFloat((expense.original_amount * rate).toFixed(2));
    expense.converted_currency = company.default_currency;
  } catch (_err) {
    expense.converted_amount = expense.original_amount;
    expense.converted_currency = expense.original_currency;
  }

  await expense.save();
  
  try {
    // Trigger Approval Engine immediately
    await evaluateAndCreateApprovalRequests(expense);
    return expense;
  } catch (err) {
    throw createError(500, `Failed to submit manual expense: ${err.message}`);
  }
}

async function submitExpense(expenseId, userId, updates = {}) {
  logger.info('ExpenseService', `Submitting expense ${expenseId}`, { userId });

  const expense = await Expense.findById(expenseId);
  if (!expense) throw createError(404, 'Expense not found.');
  if (expense.submitted_by.toString() !== userId.toString()) throw createError(403, 'You can only submit your own expenses.');
  if (expense.status !== 'Draft') throw createError(400, `Expense is already in "${expense.status}" state.`);

  const allowed = ['title', 'description', 'category', 'original_amount', 'original_currency', 'receipt_url'];
  for (const [k, v] of Object.entries(updates)) {
    if (allowed.includes(k)) {
      expense[k] = v;
    }
  }

  expense.status = 'Submitted';
  expense.submitted_at = new Date();
  
  const company = await Company.findById(expense.company_id);
  try {
    const rate = await getConversionRate(expense.original_currency, company.default_currency);
    expense.converted_amount = parseFloat((expense.original_amount * rate).toFixed(2));
    expense.converted_currency = company.default_currency;
  } catch (_err) {
    expense.converted_amount = expense.original_amount;
    expense.converted_currency = expense.original_currency;
  }
  
  try {
    await expense.save();
    
    // Trigger Approval Engine
    await evaluateAndCreateApprovalRequests(expense);
    return expense;
  } catch (err) {
    throw createError(500, `Failed to submit expense: ${err.message}`);
  }
}

async function getMyExpenses(userId) {
  try {
    return await Expense.find({ submitted_by: userId }).sort({ createdAt: -1 }).lean();
  } catch (err) {
    throw createError(500, err.message);
  }
}

async function getCompanyExpenses(companyId) {
  const company = await Company.findById(companyId).select('default_currency');
  if (!company) throw createError(500, 'Company not found');

  try {
    const expenses = await Expense.find({ company_id: companyId })
      .populate('submitted_by', 'full_name email')
      .sort({ createdAt: -1 })
      .lean();

    const enriched = await Promise.all(
      expenses.map((e) => enrichWithConvertedAmount(e, company.default_currency))
    );

    return enriched;
  } catch (err) {
    throw createError(500, err.message);
  }
}

async function getExpenseById(expenseId, requestingUser) {
  try {
    const expense = await Expense.findById(expenseId)
      .populate('submitted_by', 'full_name email')
      .lean();

    if (!expense) throw createError(404, 'Expense not found.');

    if (expense.company_id.toString() !== requestingUser.company_id.toString()) {
      throw createError(403, 'Access denied to this expense.');
    }
    if (requestingUser.role === 'Employee' && expense.submitted_by._id.toString() !== requestingUser._id.toString()) {
      throw createError(403, 'You can only view your own expenses.');
    }

    // Populate approval requests manually
    const mongoose = require('mongoose');
    const ApprovalRequest = mongoose.model('ApprovalRequest');
    
    expense.approval_requests = await ApprovalRequest.find({ expense_id: expense._id })
      .populate('approver_id', 'full_name email role')
      .populate('rule_id', 'name rule_type config')
      .lean();

    return expense;
  } catch (err) {
    if (err.statusCode) throw err;
    throw createError(500, err.message);
  }
}

module.exports = {
  createDraftFromOcr,
  createManualExpense,
  submitExpense,
  getMyExpenses,
  getCompanyExpenses,
  getExpenseById,
};
