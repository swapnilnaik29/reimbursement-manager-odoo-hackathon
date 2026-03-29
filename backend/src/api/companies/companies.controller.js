'use strict';

const Company = require('../../models/Company');
const User = require('../../models/User');
const { createError } = require('../../middleware/errorHandler');
const { z } = require('zod');

const updateCompanySchema = z.object({
  name:             z.string().min(1).optional(),
  default_currency: z.string().length(3).optional(),
  country_code:     z.string().length(2).optional(),
});

async function getMyCompany(req, res, next) {
  try {
    const data = await Company.findById(req.user.company_id).lean();
    if (!data) throw createError(404, 'Company not found.');
    return res.status(200).json({ data });
  } catch (err) { next(err); }
}

async function updateMyCompany(req, res, next) {
  try {
    const updates = updateCompanySchema.parse(req.body);

    const data = await Company.findByIdAndUpdate(
      req.user.company_id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!data) throw createError(500, 'Company update failed.');
    return res.status(200).json({ data });
  } catch (err) { next(err); }
}

async function getMembers(req, res, next) {
  try {
    const data = await User.find({ company_id: req.user.company_id })
      .select('_id email full_name role manager_id createdAt')
      .populate('manager_id', 'full_name email')
      .sort({ role: 1 })
      .lean();

    return res.status(200).json({ data });
  } catch (err) { next(err); }
}

async function updateMember(req, res, next) {
  try {
    const { userId } = req.params;
    const bodyArgs = z.object({ 
      role: z.enum(['Manager', 'Employee']).optional(),
      manager_id: z.string().optional()
    }).parse(req.body);

    if (userId.toString() === req.user._id.toString()) {
      throw createError(400, 'Admins cannot change their own privileges.');
    }

    const updates = {};
    if (bodyArgs.role) updates.role = bodyArgs.role;
    if (bodyArgs.manager_id) updates.manager_id = bodyArgs.manager_id;
    
    // allow unsetting manager
    if (req.body.manager_id === null) updates.manager_id = null;

    const data = await User.findOneAndUpdate(
      { _id: userId, company_id: req.user.company_id },
      { $set: updates },
      { new: true }
    ).select('-password');

    if (!data) throw createError(404, 'User not found in your company.');
    return res.status(200).json({ data });
  } catch (err) { next(err); }
}

module.exports = { getMyCompany, updateMyCompany, getMembers, updateMemberRole: updateMember };
