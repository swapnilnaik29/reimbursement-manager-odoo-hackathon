// src/middleware/requireRole.js
// Factory function that returns an Express middleware checking req.user.role.
// Usage: router.get('/admin-only', requireAuth, requireRole('Admin'), handler)
// Usage: router.get('/shared',     requireAuth, requireRole('Admin', 'Manager'), handler)
'use strict';

/**
 * @param {...string} allowedRoles - One or more role strings that may access the route.
 * @returns Express middleware function.
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      // Safety net — requireAuth should always run first
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role(s): ${allowedRoles.join(', ')}. Your role: ${req.user.role}.`,
      });
    }

    next();
  };
}

module.exports = requireRole;
