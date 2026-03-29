// src/api/auth/auth.router.js
'use strict';

const { Router } = require('express');
const requireAuth = require('../../middleware/requireAuth');
const requireRole = require('../../middleware/requireRole');
const { signup, login, invite, forgotPassword, resetPassword, me } = require('./auth.controller');

const router = Router();

// ── Public routes ──────────────────────────────────────────────
router.post('/signup', signup);    // POST /api/v1/auth/signup
router.post('/login',  login);     // POST /api/v1/auth/login
router.post('/forgot-password', forgotPassword); // POST /api/v1/auth/forgot-password
router.post('/reset-password', resetPassword);   // POST /api/v1/auth/reset-password

// ── Protected routes ───────────────────────────────────────────
router.get('/me', requireAuth, me);                                   // GET  /api/v1/auth/me
router.post('/invite', requireAuth, requireRole('Admin'), invite);    // POST /api/v1/auth/invite

module.exports = router;
