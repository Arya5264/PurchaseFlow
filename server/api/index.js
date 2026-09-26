const app = require('../app');
const connectDB = require('../config/db');

/**
 * Vercel Serverless Function entry point for PurchaseFlow Express API.
 * Ensures active cached MongoDB connection before processing incoming HTTP requests.
 */
module.exports = async (req, res) => {
  try {
    await connectDB();
  } catch (error) {
    console.error('[Vercel Serverless DB Connection Warning/Error]:', error.message);

    // If request is healthcheck or status ping, permit Express to return the operational response with DB state
    const url = req.url || '';
    const isHealthCheck =
      url === '/' ||
      url === '/api' ||
      url === '/health' ||
      url.startsWith('/api/health') ||
      url.startsWith('/health');

    if (isHealthCheck) {
      return app(req, res);
    }

    return res.status(500).json({
      success: false,
      message: 'Database connection failed. Please verify MONGODB_URI in Vercel Environment Variables and Network Access (0.0.0.0/0) in MongoDB Atlas.',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message,
    });
  }

  return app(req, res);
};
