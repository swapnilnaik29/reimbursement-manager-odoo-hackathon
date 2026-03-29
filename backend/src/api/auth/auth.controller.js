'use strict';

const { onboardNewAdmin, loginUser, inviteTeamMember, forgotPassword: forgotPasswordService, resetPassword: resetPasswordService } = require('./auth.service');
const { signupSchema, inviteSchema, forgotPasswordSchema, resetPasswordSchema } = require('./auth.validator');
const jwt = require('jsonwebtoken');

async function signup(req, res, next) {
  try {
    const body = signupSchema.parse(req.body);

    const { company, user } = await onboardNewAdmin({
      email:       body.email,
      password:    body.password,
      fullName:    body.full_name,
      companyName: body.company_name,
      countryCode: body.country_code,
    });

    // Generate token for automatic login
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    const userObj = user.toObject();
    delete userObj.password;

    return res.status(201).json({
      message: 'Signup successful.',
      token,
      user: userObj,
      company,
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const { token, user } = await loginUser({ email, password });

    return res.status(200).json({
      token,
      user,
    });
  } catch (err) {
    next(err);
  }
}

async function invite(req, res, next) {
  try {
    const body = inviteSchema.parse(req.body);
    const { user } = await inviteTeamMember({
      companyId: req.user.company_id,
      email:     body.email,
      fullName:  body.full_name,
      role:      body.role,
    });

    return res.status(201).json({
      message: `Invitation sent to ${body.email}. A secure random password has been emailed to them.`,
      user,
    });
  } catch (err) {
    next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const result = await forgotPasswordService(email);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);
    const result = await resetPasswordService({ token, newPassword: password });
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function me(req, res) {
  return res.status(200).json({ user: req.user });
}

module.exports = { signup, login, invite, forgotPassword, resetPassword, me };
