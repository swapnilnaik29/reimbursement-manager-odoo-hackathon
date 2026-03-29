// src/api/auth/auth.validator.js
// Zod schemas for auth-related request bodies.
'use strict';

const { z } = require('zod');

const signupSchema = z.object({
  email:       z.string().email(),
  password:    z.string().min(8, 'Password must be at least 8 characters'),
  full_name:   z.string().min(1),
  company_name: z.string().min(1),
  country_code: z.string().length(2, 'Must be ISO 3166-1 alpha-2 (e.g. IN, US)'),
});

const inviteSchema = z.object({
  email:     z.string().email(),
  full_name: z.string().min(1),
  role:      z.enum(['Manager', 'Employee']),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token:    z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

module.exports = { signupSchema, inviteSchema, forgotPasswordSchema, resetPasswordSchema };
