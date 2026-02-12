const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

const STAFF_ROLES = new Set(['admin', 'manager', 'staff']);

const getActiveShopMembershipRole = async (shopId, userId) => {
  if (!shopId || !userId) return null;
  const [membership] = await sequelize.query(
    `SELECT role
       FROM public.shop_members
      WHERE shop_id = :shop_id
        AND user_id = :user_id
        AND status = 'active'
      LIMIT 1`,
    {
      type: QueryTypes.SELECT,
      replacements: { shop_id: shopId, user_id: userId },
    }
  );
  return membership?.role || null;
};

const ensureStaffActor = async (shopId, actorUserId) => {
  const role = await getActiveShopMembershipRole(shopId, actorUserId);
  return STAFF_ROLES.has(role);
};

exports.getShopReviews = async (req, res) => {
  try {
    const shopId = req.shop?.id;
    const actorUserId = req.user?.id;
    const allowed = await ensureStaffActor(shopId, actorUserId);
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'Only shop staff can view reviews.' });
    }

    const reviews = await sequelize.query(
      `SELECT
         pr.id,
         pr.order_id,
         pr.product_id,
         pr.user_id,
         pr.rating,
         pr.comment,
         pr.status,
         pr.created_at,
         pr.updated_at,
         u.first_name AS user_first_name,
         u.last_name AS user_last_name,
         p.name AS product_name
       FROM public.product_reviews pr
       LEFT JOIN public.users u ON u.id = pr.user_id
       LEFT JOIN public.products p ON p.id = pr.product_id
       WHERE pr.shop_id = :shop_id
       ORDER BY pr.created_at DESC`,
      {
        type: QueryTypes.SELECT,
        replacements: { shop_id: shopId },
      }
    );

    return res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    console.error('❌ Get shop reviews error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
  }
};

exports.updateReviewStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const shopId = req.shop?.id;
    const actorUserId = req.user?.id;
    const allowed = await ensureStaffActor(shopId, actorUserId);
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'Only shop staff can update review status.' });
    }

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid review status.' });
    }

    const [updated] = await sequelize.query(
      `UPDATE public.product_reviews
          SET status = :status,
              updated_at = NOW()
        WHERE id = :id
          AND shop_id = :shop_id
      RETURNING id, order_id, product_id, user_id, rating, comment, status, created_at, updated_at`,
      {
        type: QueryTypes.SELECT,
        replacements: { id, status, shop_id: shopId },
      }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('❌ Update review status error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to update review status' });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const shopId = req.shop?.id;
    const actorUserId = req.user?.id;
    const allowed = await ensureStaffActor(shopId, actorUserId);
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'Only shop staff can delete reviews.' });
    }

    const result = await sequelize.query(
      `DELETE FROM public.product_reviews
        WHERE id = :id
          AND shop_id = :shop_id`,
      {
        type: QueryTypes.DELETE,
        replacements: { id, shop_id: shopId },
      }
    );

    if (!result || (Array.isArray(result) && result[1] === 0)) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    return res.status(200).json({ success: true, message: 'Review deleted successfully' });
  } catch (error) {
    console.error('❌ Delete review error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to delete review' });
  }
};
