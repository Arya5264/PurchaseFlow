const express = require('express');
const router = express.Router();
const {
  getReceipts,
  getReceiptById,
  createReceipt,
} = require('../controllers/goodsReceiptController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(authenticate);

router.get('/', authorizeRoles('WAREHOUSE', 'PURCHASE_MANAGER', 'FINANCE', 'ADMIN'), getReceipts);
router.get('/:id', authorizeRoles('WAREHOUSE', 'PURCHASE_MANAGER', 'FINANCE', 'ADMIN'), getReceiptById);
router.post('/', authorizeRoles('WAREHOUSE', 'ADMIN'), createReceipt);

module.exports = router;
