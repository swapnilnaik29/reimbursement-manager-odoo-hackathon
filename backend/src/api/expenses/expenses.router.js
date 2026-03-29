// src/api/expenses/expenses.router.js
'use strict';

const { Router } = require('express');
const requireAuth = require('../../middleware/requireAuth');
const requireRole = require('../../middleware/requireRole');
const {
  ingestOcrDraft, createManual, submit, editExpense,
  myExpenses, companyExpenses, getOne,
} = require('./expenses.controller');
const upload = require('../../config/upload');
const axios  = require('axios');
const multer = require('multer');
const memStorage = multer({ storage: multer.memoryStorage() });

const router = Router();

// All expense routes require authentication
router.use(requireAuth);

// ── Employee routes ────────────────────────────────────────────
router.post('/ocr-draft',            requireRole('Employee'), ingestOcrDraft);                        // POST /api/v1/expenses/ocr-draft
router.post('/manual', requireRole('Employee'), upload.single('receipt'), createManual);              // POST /api/v1/expenses/manual (Employee only)
router.get('/me',                    myExpenses);                                                     // GET  /api/v1/expenses/me
router.post('/:expenseId/submit',    submit);                                                         // POST /api/v1/expenses/:id/submit
router.patch('/:expenseId',          editExpense);                                                    // PATCH /api/v1/expenses/:id   (edit draft)

// ── OCR Proxy: browser → Node → Python (avoids CORS) ─────────
router.post('/ocr/scan', requireRole('Employee'), memStorage.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const FormData = require('form-data');
    const fd = new FormData();
    fd.append('file', req.file.buffer, { filename: req.file.originalname, contentType: req.file.mimetype });
    const ocrResponse = await axios.post('http://localhost:3000/extract', fd, { headers: fd.getHeaders(), timeout: 30000 });
    return res.status(200).json(ocrResponse.data);
  } catch (err) {
    next(err);
  }
});

// ── Manager / Admin routes (with currency conversion) ─────────
router.get('/',                      requireRole('Senior_Manager', 'Manager', 'Admin'), companyExpenses);  // GET /api/v1/expenses

// ── Shared — single expense (access controlled inside service) ─
router.get('/:expenseId',            getOne);                    // GET  /api/v1/expenses/:id

module.exports = router;
