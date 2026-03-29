// src/middleware/errorHandler.js
// Global Express error handler — must be the LAST middleware in app.js.
'use strict';

const { ZodError } = require('zod');

/**
 * Centralised error handler.
 * Catches errors forwarded via next(err) from any route or middleware.
 */
function errorHandler(err, req, res, _next) {
  // ── Zod validation errors ──────────────────────────────────────
  if (err instanceof ZodError) {
    return res.status(422).json({
      error: 'Validation failed.',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // ── Operational / known errors ─────────────────────────────────
  if (err.statusCode) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // ── Unexpected errors ──────────────────────────────────────────
  console.error('[UNHANDLED ERROR]', err);
  return res.status(500).json({ error: 'An unexpected internal server error occurred.' });
}

/**
 * Helper to create a consistent operational error with an HTTP status.
 * Usage: throw createError(404, 'Expense not found.')
 */
function createError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

module.exports = { errorHandler, createError };
