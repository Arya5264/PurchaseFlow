const express = require('express');
const router = express.Router();
const {
  getPendingApprovals,
  getApprovalHistory,
  approveRequisition,
  rejectRequisition,
} = require('../controllers/approvalController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(authenticate, authorizeRoles('APPROVER', 'ADMIN'));

router.get('/pending', getPendingApprovals);
router.get('/history', getApprovalHistory);
router.post('/:id/approve', approveRequisition);
router.post('/:id/reject', rejectRequisition);

module.exports = router;
