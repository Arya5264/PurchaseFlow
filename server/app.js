const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const requisitionRoutes = require('./routes/requisitionRoutes');
const approvalRoutes = require('./routes/approvalRoutes');
const purchaseOrderRoutes = require('./routes/purchaseOrderRoutes');
const goodsReceiptRoutes = require('./routes/goodsReceiptRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const reportRoutes = require('./routes/reportRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');

const app = express();

// Determine allowed CORS origins
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((url) => url.trim().replace(/\/+$/, ''))
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

// Standard middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server, test suite)
      if (!origin) return callback(null, true);

      // Check explicit allowed origins, wildcard, development mode, or Vercel preview domains
      if (
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes('*') ||
        process.env.NODE_ENV !== 'production' ||
        origin.endsWith('.vercel.app')
      ) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Path prefix normalization for Vercel Serverless Function routing
// If a proxy or serverless rewrite strips /api, prepend it so standard Express routes match
app.use((req, res, next) => {
  if (
    !req.url.startsWith('/api') &&
    req.url !== '/' &&
    !req.url.startsWith('/health')
  ) {
    req.url = `/api${req.url}`;
  }
  next();
});

// Root status endpoint (handles / and /api)
app.get(['/', '/api'], (req, res) => {
  res.status(200).json({
    success: true,
    message: 'PurchaseFlow API Server is running.',
    health: '/api/health',
    environment: process.env.NODE_ENV || 'development',
  });
});

// Healthcheck (handles both /api/health and /health)
app.get(['/api/health', '/health'], (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  res.status(200).json({
    success: true,
    message: 'PurchaseFlow API is operational.',
    database: dbStatusMap[dbState] || 'unknown',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/requisitions', requisitionRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/receipts', goodsReceiptRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit-logs', auditLogRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

module.exports = app;
