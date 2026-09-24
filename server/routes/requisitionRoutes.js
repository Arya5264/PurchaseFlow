const express = require('express');
const router = express.Router();
const {
  getRequisitions,
  getRequisitionById,
  createRequisition,
  updateRequisition,
  submitRequisition,
  cancelRequisition,
} = require('../controllers/requisitionController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(authenticate);

// View list and details
router.get('/', authorizeRoles('ADMIN', 'PURCHASE_MANAGER', 'APPROVER', 'FINANCE'), getRequisitions);
router.get('/:id', authorizeRoles('ADMIN', 'PURCHASE_MANAGER', 'APPROVER', 'FINANCE'), getRequisitionById);

// Requisition creation and draft lifecycle
router.post('/', authorizeRoles('PURCHASE_MANAGER', 'ADMIN'), createRequisition);
router.put('/:id', authorizeRoles('PURCHASE_MANAGER', 'ADMIN'), updateRequisition);
router.post('/:id/submit', authorizeRoles('PURCHASE_MANAGER', 'ADMIN'), submitRequisition);
router.post('/:id/cancel', authorizeRoles('PURCHASE_MANAGER', 'ADMIN'), cancelRequisition);

module.exports = router;
