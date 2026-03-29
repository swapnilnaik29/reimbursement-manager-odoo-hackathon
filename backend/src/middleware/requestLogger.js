// src/middleware/requestLogger.js
// Replaces morgan — prints one structured log line per request + response.
'use strict';

const logger = require('../config/logger');

/**
 * Logs incoming requests and their completed responses.
 * Format:  METHOD /path → STATUS  Xms
 */
function requestLogger(req, res, next) {
  const start = Date.now();

  // Log the incoming request immediately
  logger.http('Request', `→ ${req.method} ${req.originalUrl}`, {
    ip:   req.ip || req.socket?.remoteAddress,
    body: req.method !== 'GET' && Object.keys(req.body || {}).length
            ? sanitizeBody(req.body)
            : undefined,
  });

  // Hook into response finish to log the outcome
  res.on('finish', () => {
    const ms         = Date.now() - start;
    const statusCode = res.statusCode;
    const isError    = statusCode >= 400;

    const logFn = isError ? logger.warn : logger.http;
    logFn(
      'Response',
      `← ${req.method} ${req.originalUrl} ${statusCode}  ${ms}ms`,
      isError ? { status: statusCode } : undefined
    );
  });

  next();
}

/**
 * Strips sensitive fields before logging request bodies.
 */
function sanitizeBody(body) {
  const REDACTED_KEYS = ['password', 'token', 'secret', 'access_token', 'refresh_token'];
  const safe = { ...body };
  for (const key of REDACTED_KEYS) {
    if (key in safe) safe[key] = '[REDACTED]';
  }
  return safe;
}

module.exports = requestLogger;
