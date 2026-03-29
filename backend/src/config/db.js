'use strict';

const mongoose = require('mongoose');
const logger = require('./logger');

async function connectDB() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in .env');
    }

    await mongoose.connect(mongoUri);
    logger.db('MongoDB', 'Connected to MongoDB successfully 🥬');
  } catch (err) {
    logger.error('MongoDB', 'Failed to connect to MongoDB', { error: err.message });
    process.exit(1);
  }
}

module.exports = connectDB;
