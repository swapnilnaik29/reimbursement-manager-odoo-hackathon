// src/api/approvals/approvals.router.js
'use strict';

const { Router } = require('express');
const requireAuth = require('../../middleware/requireAuth');
const requireRole = require('../../middleware/requireRole');
const {
  getMyQueue, decide,
  getRules, createRule, deleteRule,
} = require('./approvals.controller');

const router = Router();

// All approval routes require authentication
router.use(requireAuth);

// ── Approver endpoints (Manager, Admin) ───────────────────────
router.get('/my-queue',              requireRole('Senior_Manager', 'Manager', 'Admin'), getMyQueue);
router.post('/:requestId/decide',    requireRole('Senior_Manager', 'Manager', 'Admin'), decide);

// ── Approval Rules CRUD (Admin only) ─────────────────────────
router.get('/rules',                 requireRole('Admin'), getRules);
router.post('/rules',                requireRole('Admin'), createRule);
router.delete('/rules/:ruleId',      requireRole('Admin'), deleteRule);

module.exports = router;
