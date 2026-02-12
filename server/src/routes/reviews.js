const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../middleware/auth');
const { resolveShop, requireShop } = require('../middleware/tenant');
const { auditLogger } = require('../middleware/auditLogger');
const {
  getShopReviews,
  updateReviewStatus,
  deleteReview,
} = require('../controllers/reviewController');

router.get('/', resolveShop, requireShop, authenticateToken, getShopReviews);
router.patch('/:id/status', resolveShop, requireShop, authenticateToken, auditLogger('Update Review Status', 'Reviews', 'Updated review moderation status'), updateReviewStatus);
router.delete('/:id', resolveShop, requireShop, authenticateToken, auditLogger('Delete Review', 'Reviews', 'Deleted review'), deleteReview);

module.exports = router;
