const express = require('express');
const router = express.Router();
const {
  getInvoices,
  getInvoiceById,
  createInvoice,
  matchInvoice,
  approveInvoice,
  rejectInvoice,
} = require('../controllers/invoiceController');
const { processPayment } = require('../controllers/paymentController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(authenticate);

// View list & details
router.get('/', authorizeRoles('FINANCE', 'VENDOR', 'ADMIN', 'PURCHASE_MANAGER'), getInvoices);
router.get('/:id', authorizeRoles('FINANCE', 'VENDOR', 'ADMIN', 'PURCHASE_MANAGER'), getInvoiceById);

// Submit invoice (Vendors or Finance)
router.post('/', authorizeRoles('VENDOR', 'FINANCE', 'ADMIN'), createInvoice);

// 3-way matching, approval, rejection, and payment (Finance & Admin)
router.post('/:id/match', authorizeRoles('FINANCE', 'ADMIN'), matchInvoice);
router.post('/:id/approve', authorizeRoles('FINANCE', 'ADMIN'), approveInvoice);
router.post('/:id/reject', authorizeRoles('FINANCE', 'ADMIN'), rejectInvoice);
router.post('/:id/pay', authorizeRoles('FINANCE', 'ADMIN'), processPayment);

module.exports = router;
