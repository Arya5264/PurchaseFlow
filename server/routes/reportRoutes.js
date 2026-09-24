const express = require('express');
const router = express.Router();
const {
  getDashboardMetrics,
  getPurchaseReports,
} = require('../controllers/reportController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(authenticate);

// Dynamic dashboard metrics for all authenticated roles
router.get('/dashboard', getDashboardMetrics);

// Analytical purchase reports
router.get('/purchases', authorizeRoles('ADMIN', 'PURCHASE_MANAGER', 'FINANCE'), getPurchaseReports);

module.exports = router;
