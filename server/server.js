require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB & launch server
const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`[PurchaseFlow API Server running on port ${PORT}] in ${process.env.NODE_ENV || 'development'} mode.`);
  });
};

startServer();
