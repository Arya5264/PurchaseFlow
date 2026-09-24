const express = require('express');
const router = express.Router();
const {
  getVendors,
  getVendorById,
  createVendor,
  updateVendor,
  updateVendorStatus,
} = require('../controllers/vendorController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(authenticate);

// List & view vendors accessible to all internal staff
router.get('/', authorizeRoles('ADMIN', 'PURCHASE_MANAGER', 'FINANCE', 'WAREHOUSE', 'APPROVER'), getVendors);
router.get('/:id', authorizeRoles('ADMIN', 'PURCHASE_MANAGER', 'FINANCE', 'WAREHOUSE', 'APPROVER', 'VENDOR'), getVendorById);

// Creation & modification restricted to Admin & Purchase Manager
router.post('/', authorizeRoles('ADMIN', 'PURCHASE_MANAGER'), createVendor);
router.put('/:id', authorizeRoles('ADMIN', 'PURCHASE_MANAGER'), updateVendor);
router.patch('/:id/status', authorizeRoles('ADMIN'), updateVendorStatus);

module.exports = router;
