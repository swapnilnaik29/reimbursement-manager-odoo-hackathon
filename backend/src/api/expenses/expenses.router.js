// src/api/expenses/expenses.router.js
'use strict';

const { Router } = require('express');
const requireAuth = require('../../middleware/requireAuth');
const requireRole = require('../../middleware/requireRole');
const {
  ingestOcrDraft, createManual, submit,
  myExpenses, companyExpenses, getOne,
} = require('./expenses.controller');
const upload = require('../../config/upload');

const router = Router();

// All expense routes require authentication
router.use(requireAuth);

// ── Employee routes ────────────────────────────────────────────
router.post('/ocr-draft',            ingestOcrDraft);            // POST /api/v1/expenses/ocr-draft
router.post('/manual', upload.single('receipt'), createManual);  // POST /api/v1/expenses/manual
router.get('/me',                    myExpenses);                // GET  /api/v1/expenses/me
router.post('/:expenseId/submit',    submit);                    // POST /api/v1/expenses/:id/submit

// ── Manager / Admin routes (with currency conversion) ─────────
router.get('/',                      requireRole('Manager', 'Admin'), companyExpenses);  // GET /api/v1/expenses

// ── Shared — single expense (access controlled inside service) ─
router.get('/:expenseId',            getOne);                    // GET  /api/v1/expenses/:id

module.exports = router;
