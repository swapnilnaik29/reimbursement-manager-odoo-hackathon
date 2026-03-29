'use strict';

const axios = require('axios');
const jwt = require('jsonwebtoken');
const Company = require('../../models/Company');
const User = require('../../models/User');
const ApprovalRule = require('../../models/ApprovalRule');
const { createError } = require('../../middleware/errorHandler');
const logger = require('../../config/logger');
const crypto = require('crypto');
const { sendInviteEmail, sendPasswordResetEmail } = require('../../config/email');

async function getCurrencyForCountry(countryCode) {
  try {
    const url = `https://restcountries.com/v3.1/alpha/${countryCode}`;
    logger.info('AuthService', `Fetching currency for country ${countryCode}`);
    const { data } = await axios.get(url, { timeout: 5000 });

    const country    = data[0];
    const currencies = country?.currencies ?? {};
    const firstKey   = Object.keys(currencies)[0];
    const currency   = firstKey || 'USD';

    logger.info('AuthService', `Resolved currency for ${countryCode}: ${currency}`);
    return currency;
  } catch (_err) {
    logger.warn('AuthService', `Could not fetch currency for ${countryCode}, defaulting to USD`);
    return 'USD';
  }
}

function generateToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

async function onboardNewAdmin({ email, password, fullName, companyName, countryCode }) {
  logger.info('AuthService', `Onboarding new admin`, { email, companyName, countryCode });

  // 1. Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) throw createError(400, 'Email already registered');

  // 2. Resolve default currency
  const defaultCurrency = await getCurrencyForCountry(countryCode.toUpperCase());

  // 3. Create Company
  let company;
  try {
    company = await Company.create({
      name: companyName,
      default_currency: defaultCurrency,
      country_code: countryCode.toUpperCase(),
    });
    logger.db('AuthService', `Company created: ${company._id}`);

    // Create a sensible default 2-step approval workflow:
    // Step 1: Direct Manager (the submitter's assigned manager)
    // Step 2: Company-wide Manager fallback (Sequential — any Manager in the company)
    await ApprovalRule.create({
      company_id: company._id,
      name: 'Manager Approval',
      step_order: 1,
      rule_type: 'Sequential',
      min_amount: 0,
      config: { approver_role: 'Manager' },
    });
    logger.db('AuthService', `Default approval rule created for company ${company._id}`);
  } catch (err) {
    logger.error('AuthService', `Failed to create company`, { error: err.message });
    throw createError(500, `Failed to create company: ${err.message}`);
  }

  // 4. Create User profile
  let user;
  try {
    user = await User.create({
      company_id: company._id,
      email,
      password,
      full_name: fullName,
      role: 'Admin',
    });
    logger.db('AuthService', `User profile created`, { email, role: 'Admin' });
  } catch (err) {
    logger.error('AuthService', `Failed to create user profile, rolling back company`, { error: err.message });
    await Company.findByIdAndDelete(company._id);
    throw createError(500, `Failed to create user profile: ${err.message}`);
  }

  logger.info('AuthService', `Admin onboarded successfully`, { userId: user._id, companyId: company._id });
  return { company, user };
}

async function loginUser({ email, password }) {
  const user = await User.findOne({ email }).select('+password');
  if (!user) throw createError(401, 'Invalid email or password');

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw createError(401, 'Invalid email or password');

  const token = generateToken(user._id);

  // Return user without password
  const userObj = user.toObject();
  delete userObj.password;

  return { token, user: userObj };
}

async function inviteTeamMember({ companyId, email, fullName, role, password }) {
  const existingUser = await User.findOne({ email });
  if (existingUser) throw createError(400, 'User with this email already exists');

  // Securely generate a 12-character random password if none provided
  const tempPassword = password || crypto.randomBytes(6).toString('hex');

  const user = await User.create({
    company_id: companyId,
    email,
    password: tempPassword, 
    full_name: fullName,
    role,
  });

  const company = await Company.findById(companyId);

  // Send an invite email in the background
  sendInviteEmail(email, tempPassword, role, company.name).catch(err => {
    logger.error('AuthService', 'Failed to send invite email', { error: err.message });
  });

  const userObj = user.toObject();
  delete userObj.password;

  return { user: userObj };
}

async function forgotPassword(email) {
  const user = await User.findOne({ email });
  if (!user) {
    // Return success to prevent enumeration
    return { message: 'If an account exists, a reset link was sent.' };
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.reset_password_token = resetToken;
  user.reset_password_expires = Date.now() + 3600000; // 1 hour
  await user.save();

  await sendPasswordResetEmail(user.email, resetToken);
  
  return { message: 'If an account exists, a reset link was sent.' };
}

async function resetPassword({ token, newPassword }) {
  const user = await User.findOne({
    reset_password_token: token,
    reset_password_expires: { $gt: Date.now() }
  });

  if (!user) {
    throw createError(400, 'Password reset token is invalid or has expired.');
  }

  // Pre-save hook will hash it
  user.password = newPassword;
  user.reset_password_token = undefined;
  user.reset_password_expires = undefined;
  await user.save();

  return { message: 'Password has been successfully updated.' };
}

module.exports = { onboardNewAdmin, loginUser, inviteTeamMember, forgotPassword, resetPassword };
