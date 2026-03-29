// src/scripts/seed-dummy-rules.js
'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const Company = require('../models/Company');
const ApprovalRule = require('../models/ApprovalRule');
const logger = require('../config/logger');

async function seedDummyRules() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/reimbursement-prod';
    await mongoose.connect(mongoUri);
    logger.info('Database', 'Connected to MongoDB for seeding');

    const companies = await Company.find();
    
    for (const company of companies) {
      const existingRules = await ApprovalRule.countDocuments({ company_id: company._id });
      
      if (existingRules === 0) {
        logger.info('Seeder', `Company ${company.name} has no rules. Creating dummy rule...`);
        
        await ApprovalRule.create({
          company_id: company._id,
          name: 'Default Direct Manager Approval',
          step_order: 1,
          rule_type: 'Direct_Manager',
          min_amount: 0,
        });

        logger.info('Seeder', `Created dummy rule for ${company.name} successfully.`);
      } else {
        logger.info('Seeder', `Company ${company.name} already has ${existingRules} rules. Skipping.`);
      }
    }

    logger.info('Seeder', 'Seeding completed successfully');
  } catch (error) {
    logger.error('Seeder', 'Seeding failed', { error: error.message });
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seedDummyRules();
