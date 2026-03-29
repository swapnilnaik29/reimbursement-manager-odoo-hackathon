// src/api/expenses/expenses.controller.js
'use strict';

const {
  createDraftFromOcr,
  createManualExpense,
  submitExpense,
  getMyExpenses,
  getCompanyExpenses,
  getExpenseById,
} = require('./expenses.service');
const { ocrIngestionSchema, submitExpenseSchema } = require('./expenses.validator');

/**
 * POST /api/v1/expenses/ocr-draft
 * OCR microservice sends its processed JSON here.
 * Creates a Draft expense. Employee only.
 */
async function ingestOcrDraft(req, res, next) {
  try {
    const ocrData = ocrIngestionSchema.parse(req.body);
    const expense = await createDraftFromOcr({
      userId:    req.user.id,
      companyId: req.user.company_id,
      ocrData,
    });
    return res.status(201).json({ data: expense });
  } catch (err) { next(err); }
}

/**
 * POST /api/v1/expenses/manual
 * Employee manually submits an expense with an optional receipt upload.
 */
async function createManual(req, res, next) {
  try {
    const expense = await createManualExpense({
      userId:    req.user.id,
      companyId: req.user.company_id,
      data:      req.body,
      file:      req.file,
    });
    return res.status(201).json({ data: expense });
  } catch (err) { next(err); }
}

/**
 * POST /api/v1/expenses/:expenseId/submit
 * Employee finalises and submits a draft expense.
 */
async function submit(req, res, next) {
  try {
    const { expenseId } = req.params;
    const updates = submitExpenseSchema.parse(req.body);
    const expense = await submitExpense(expenseId, req.user.id, updates);
    return res.status(200).json({ data: expense });
  } catch (err) { next(err); }
}

/**
 * GET /api/v1/expenses/me
 * Returns the authenticated employee's own expenses.
 */
async function myExpenses(req, res, next) {
  try {
    const data = await getMyExpenses(req.user.id);
    return res.status(200).json({ data });
  } catch (err) { next(err); }
}

/**
 * GET /api/v1/expenses
 * Manager/Admin: returns all company expenses with converted amounts.
 */
async function companyExpenses(req, res, next) {
  try {
    const data = await getCompanyExpenses(req.user.company_id);
    return res.status(200).json({ data });
  } catch (err) { next(err); }
}

/**
 * GET /api/v1/expenses/:expenseId
 * Returns a single expense with full approval history.
 */
async function getOne(req, res, next) {
  try {
    const { expenseId } = req.params;
    const data = await getExpenseById(expenseId, req.user);
    return res.status(200).json({ data });
  } catch (err) { next(err); }
}

module.exports = { ingestOcrDraft, createManual, submit, myExpenses, companyExpenses, getOne };
