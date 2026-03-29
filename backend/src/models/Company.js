'use strict';

const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  default_currency: {
    type: String,
    required: true,
    default: 'USD',
    uppercase: true,
    minlength: 3,
    maxlength: 3,
  },
  country_code: {
    type: String,
    uppercase: true,
    minlength: 2,
    maxlength: 2,
  },
}, { timestamps: true });

module.exports = mongoose.model('Company', companySchema);
