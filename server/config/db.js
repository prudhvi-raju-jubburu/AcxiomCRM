const mongoose = require('mongoose');

/**
 * Connect to MongoDB using Mongoose.
 * Uses environment variable MONGODB_URI with a fallback to local MongoDB.
 */
const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/acxiom_crm';
    const conn = await mongoose.connect(uri);
    console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host}, database: ${conn.connection.name}`);
  } catch (error) {
    console.error(`[MongoDB] Connection error: ${error.message}`);
    // Do not exit process in dev if DB is temporarily down, but log clearly
    process.exit(1);
  }
};

module.exports = connectDB;
