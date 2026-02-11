const express = require('express');
const router = express.Router();

const { authenticateSupabase } = require('../middleware/auth');
const { getMe, getCustomerSummary } = require('../controllers/meController');

router.get('/me', authenticateSupabase, getMe);
router.get('/customers/me/summary', authenticateSupabase, getCustomerSummary);

module.exports = router;
