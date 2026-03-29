// src/app.js
// Express application factory — wires up middleware and all domain routers.
'use strict';

const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');
const path    = require('path');
const logger        = require('./config/logger');
const requestLogger = require('./middleware/requestLogger');

// --- Domain Routers ---
const authRouter      = require('./api/auth/auth.router');
const expensesRouter  = require('./api/expenses/expenses.router');
const approvalsRouter = require('./api/approvals/approvals.router');
const companiesRouter = require('./api/companies/companies.router');

// --- Global Error Handler ---
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// ──────────────────────────────────────────────
// Core Middleware
// ──────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(requestLogger);   // structured HTTP logger
app.use(express.json());

// Serve uploaded local receipts statically at /uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ──────────────────────────────────────────────
// Health Check
// ──────────────────────────────────────────────
app.get('/health', (req, res) => {
  logger.info('Health', 'Health check pinged');
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ──────────────────────────────────────────────
// API Routes  (all prefixed with /api/v1)
// ──────────────────────────────────────────────
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/expenses', expensesRouter);
app.use('/api/v1/approvals', approvalsRouter);
app.use('/api/v1/companies', companiesRouter);

// ──────────────────────────────────────────────
// 404 Handler
// ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// ──────────────────────────────────────────────
// Global Error Handler (must be last)
// ──────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
