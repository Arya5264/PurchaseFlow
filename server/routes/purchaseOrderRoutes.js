const express = require('express');
const router = express.Router();
const {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  sendPurchaseOrder,
  acknowledgePurchaseOrder,
  markInTransit,
  downloadPOReceiptPDF,
} = require('../controllers/purchaseOrderController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(authenticate);

// View list and details
router.get('/', authorizeRoles('ADMIN', 'PURCHASE_MANAGER', 'VENDOR', 'WAREHOUSE', 'FINANCE'), getPurchaseOrders);
router.get('/:id', authorizeRoles('ADMIN', 'PURCHASE_MANAGER', 'VENDOR', 'WAREHOUSE', 'FINANCE'), getPurchaseOrderById);

// PDF generation
router.get('/:id/pdf', authorizeRoles('ADMIN', 'PURCHASE_MANAGER', 'VENDOR', 'WAREHOUSE', 'FINANCE'), downloadPOReceiptPDF);

// Creation and sending
router.post('/', authorizeRoles('PURCHASE_MANAGER', 'ADMIN'), createPurchaseOrder);
router.post('/:id/send', authorizeRoles('PURCHASE_MANAGER', 'ADMIN'), sendPurchaseOrder);

// Vendor acknowledgement
router.post('/:id/acknowledge', authorizeRoles('VENDOR'), acknowledgePurchaseOrder);

// Mark in transit
router.post('/:id/in-transit', authorizeRoles('VENDOR', 'PURCHASE_MANAGER', 'ADMIN'), markInTransit);

module.exports = router;
