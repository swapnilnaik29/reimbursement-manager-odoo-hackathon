// src/api/companies/companies.router.js
'use strict';

const { Router } = require('express');
const requireAuth = require('../../middleware/requireAuth');
const requireRole = require('../../middleware/requireRole');
const {
  getMyCompany, updateMyCompany,
  getMembers, updateMemberRole,
} = require('./companies.controller');

const router = Router();

router.use(requireAuth);

router.get('/me',                              getMyCompany);                               // GET   /api/v1/companies/me
router.patch('/me',          requireRole('Admin'), updateMyCompany);                         // PATCH /api/v1/companies/me
router.get('/me/members',    requireRole('Admin', 'Manager'), getMembers);                  // GET   /api/v1/companies/me/members
router.patch('/me/members/:userId/role', requireRole('Admin'), updateMemberRole);            // PATCH /api/v1/companies/me/members/:userId/role

module.exports = router;
