const express = require('express');
const router = express.Router();
const { getPayments } = require('../controllers/paymentController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(authenticate, authorizeRoles('FINANCE', 'ADMIN'));

router.get('/', getPayments);

module.exports = router;
