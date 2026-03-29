'use strict';

const nodemailer = require('nodemailer');
const logger = require('./logger');

let transporter;

async function initMailer() {
  if (transporter) return transporter;

  // Use variables from standard .env file
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    logger.warn('EmailService', 'Missing SMTP_HOST, SMTP_USER, or SMTP_PASS in .env!');
    logger.warn('EmailService', 'Falling back to mock Ethereal emails to prevent crashes...');
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    return transporter;
  }

  try {
    transporter = nodemailer.createTransport({
      host,
      port: Number(port),
      secure: Number(port) === 465, // true for 465, false for other ports (like 587)
      auth: {
        user,
        pass,
      },
    });

    logger.info('EmailService', `Real SMTP service initialized targeting ${host}`);
    return transporter;
  } catch (err) {
    logger.error('EmailService', 'Failed to initialize SMTP', { error: err.message });
    throw err;
  }
}

async function sendEmail({ to, subject, html }) {
  try {
    const mailer = await initMailer();
    
    // For services like Gmail, you generally have to send FROM the authenticated email.
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@reimbursements.local';
    
    const info = await mailer.sendMail({
      from: `"Reimbursement Manager" <${fromEmail}>`,
      to,
      subject,
      html,
    });

    logger.info('EmailService', `Email successfully sent to ${to}`);
    
    // If we're using the fallback Ethereal test account, log the preview URL
    if (info.messageId && info.messageId.includes('@ethereal.email')) {
      logger.info('EmailService', `Preview URL (Mock Email): ${nodemailer.getTestMessageUrl(info)}`);
    }
    
    return info;
  } catch (err) {
    logger.error('EmailService', 'Failed to send email', { error: err.message });
    throw err;
  }
}

async function sendInviteEmail(email, tempPassword, role, companyName) {
  const subject = `You've been invited to join ${companyName}`;
  const html = `
    <h2>Welcome to Reimbursement Manager!</h2>
    <p>You have been invited to join <strong>${companyName}</strong> as a <strong>${role}</strong>.</p>
    <p>Your temporary password is: <strong>${tempPassword}</strong></p>
    <p>Please log in and change your password immediately.</p>
  `;
  return sendEmail({ to: email, subject, html });
}

async function sendPasswordResetEmail(email, token) {
  const subject = `Password Reset Request`;
  // Assuming frontend is running locally on 5173
  const resetUrl = `http://localhost:5173/reset-password?token=${token}`;
  
  const html = `
    <h2>Password Reset Request</h2>
    <p>You requested a password reset. Click the link below to set a new password:</p>
    <p><a href="${resetUrl}">Reset Password</a></p>
    <p>If you did not request this, please ignore this email. The link expires in 1 hour.</p>
  `;
  return sendEmail({ to: email, subject, html });
}

module.exports = {
  sendEmail,
  sendInviteEmail,
  sendPasswordResetEmail,
};
