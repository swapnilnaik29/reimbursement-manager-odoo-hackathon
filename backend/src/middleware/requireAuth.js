'use strict';

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../config/logger');

/**
 * requireAuth middleware
 * Validates the custom JWT and populates req.user with:
 *   { _id, email, role, company_id, full_name }
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header.' });
    }

    const token = authHeader.split(' ')[1];

    // ── Step 1: Verify Custom JWT ──────────────────────────────────
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      logger.warn('AuthMiddleware', 'Invalid or expired token', { err: err.message });
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }

    // ── Step 2: Fetch application-level profile from MongoDB ────────
    const user = await User.findById(decoded.id).select('-password').lean();

    if (!user) {
      logger.warn('AuthMiddleware', `User not found for token ID ${decoded.id}`);
      return res.status(404).json({ error: 'User associated with this token no longer exists.' });
    }

    // ── Step 3: Attach to request ──────────────────────────────────
    logger.debug('AuthMiddleware', `Authenticated: ${user.email} [${user.role}]`);
    req.user = user;
    next();
  } catch (err) {
    logger.error('AuthMiddleware', 'Unexpected error', { message: err.message });
    next(err);
  }
}

module.exports = requireAuth;
