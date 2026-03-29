// src/api/expenses/expenses.validator.js
'use strict';

const { z } = require('zod');

// OCR microservice sends structured JSON — we validate its shape here.
const ocrIngestionSchema = z.object({
  title:       z.string().optional(),
  description: z.string().optional(),
  category:    z.string().optional(),
  amount:      z.union([z.string(), z.number()]),  // OCR may return string
  currency:    z.string().length(3).optional(),
  receipt_url: z.string().url().optional(),
});

// Final expense submission — user can optionally override OCR-extracted fields
const submitExpenseSchema = z.object({
  title:             z.string().min(1).optional(),
  description:       z.string().optional(),
  category:          z.string().optional(),
  original_amount:   z.number().positive().optional(),
  original_currency: z.string().length(3).optional(),
  receipt_url:       z.string().url().optional(),
});

module.exports = { ocrIngestionSchema, submitExpenseSchema };
