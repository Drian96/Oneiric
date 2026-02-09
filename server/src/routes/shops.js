const express = require('express');
const router = express.Router();

const { getShopBySlug, updateShopBranding, registerShop } = require('../controllers/shopController');
const { resolveShop, requireShop } = require('../middleware/tenant');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Public endpoint to resolve a shop by slug
router.get('/slug/:slug', getShopBySlug);

// Public: create a new shop + admin user
router.post('/register', registerShop);

// Admin: update branding for current shop
router.put(
  '/branding',
  resolveShop,
  requireShop,
  authenticateToken,
  requireRole(['admin']),
  updateShopBranding
);

module.exports = router;
