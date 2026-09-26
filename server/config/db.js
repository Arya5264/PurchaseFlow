const mongoose = require('mongoose');

let cachedPromise = null;

/**
 * Connects to MongoDB with connection caching for serverless environments.
 * Reuses existing active connection across warm invocations.
 */
const connectDB = async () => {
  // If already connected (readyState 1), reuse connection immediately
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // If currently connecting (readyState 2), return the existing in-flight promise
  if (mongoose.connection.readyState === 2 && cachedPromise) {
    return cachedPromise;
  }

  if (process.env.NODE_ENV === 'production' && !process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is required in production. Do not use local MongoDB in production.');
  }

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/purchaseflow';

  try {
    cachedPromise = mongoose.connect(uri);
    const conn = await cachedPromise;
    console.log(`[MongoDB Connected]: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    cachedPromise = null;
    console.error(`[MongoDB Connection Error]: ${error.message}`);
    throw error;
  }
};

module.exports = connectDB;
