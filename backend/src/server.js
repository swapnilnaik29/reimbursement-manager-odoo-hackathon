// src/server.js
// Entry point — bootstraps Express and starts the HTTP server.
'use strict';

require('dotenv').config();
const app       = require('./app');
const logger    = require('./config/logger');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 8000;
const ENV  = process.env.NODE_ENV || 'development';

let server;

async function startServer() {
  try {
    // ── Connect to DB first ──
    await connectDB();

    server = app.listen(PORT, () => {
      logger.info('Server', '═══════════════════════════════════════════════');
      logger.info('Server', `🚀  Reimbursement Manager API started (MERN)`);
      logger.info('Server', `   Port    : ${PORT}`);
      logger.info('Server', `   Env     : ${ENV}`);
      logger.info('Server', `   Base URL: http://localhost:${PORT}/api/v1`);
      logger.info('Server', '───────────────────────────────────────────────');
      logger.info('Server', '   Registered Domains:');
      logger.info('Server', '   • /api/v1/auth       → Auth & Onboarding');
      logger.info('Server', '   • /api/v1/expenses   → Expense Management');
      logger.info('Server', '   • /api/v1/approvals  → Approval Engine');
      logger.info('Server', '   • /api/v1/companies  → Company Settings');
      logger.info('Server', '   • /health            → Health Check');
      logger.info('Server', '═══════════════════════════════════════════════');
    });
  } catch (err) {
    logger.error('Server', 'Failed to boot', { error: err.message });
    process.exit(1);
  }
}

startServer();

// ── Graceful shutdown ─────────────────────────────────────────
process.on('SIGTERM', () => {
  logger.warn('Server', 'SIGTERM received — shutting down gracefully…');
  server.close(() => {
    logger.info('Server', 'HTTP server closed.');
    process.exit(0);
  });
});

process.on('uncaughtException', (err) => {
  logger.error('Server', 'Uncaught Exception — shutting down', { message: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Server', 'Unhandled Promise Rejection', { reason: String(reason) });
  process.exit(1);
});
