const express = require('express');
const router = express.Router();

const { authenticateToken, requireRole } = require('../middleware/auth');
const { auditLogger } = require('../middleware/auditLogger');
const { resolveShop, requireShop } = require('../middleware/tenant');
const admin = require('../controllers/adminController');

// Staff access to dashboard/reports; admin for creating logs
// Note: We no longer audit simple page/views to keep logs action-focused.
router.get('/dashboard', resolveShop, requireShop, authenticateToken, requireRole(['admin','manager','staff']), admin.getDashboard);
router.get('/reports', resolveShop, requireShop, authenticateToken, requireRole(['admin','manager','staff']), admin.getReports);
router.get('/audit-logs', resolveShop, requireShop, authenticateToken, requireRole(['admin','manager','staff']), admin.getAuditLogs);
router.post('/audit-logs', resolveShop, requireShop, authenticateToken, requireRole(['admin']), admin.createAuditLog);
router.get('/customer/:id/orders', resolveShop, requireShop, authenticateToken, requireRole(['admin','manager','staff']), admin.getCustomerOrders);

module.exports = router;


