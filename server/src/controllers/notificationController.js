const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

/**
 * GET /api/v1/notifications
 * Returns latest notifications for authenticated user.
 */
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user?.id;
    const before = typeof req.query.before === 'string' ? req.query.before : null;
    const rawLimit = Number(req.query.limit);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 50;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const beforeClause = before ? 'AND created_at < :before' : '';
    const notifications = await sequelize.query(
      `SELECT id, user_id, shop_id, title, message, type, read, link, metadata, created_at
         FROM public.notifications
        WHERE user_id = :user_id
          ${beforeClause}
        ORDER BY created_at DESC
        LIMIT :limit`,
      {
        type: QueryTypes.SELECT,
        replacements: {
          user_id: userId,
          limit,
          ...(before ? { before } : {}),
        },
      }
    );

    return res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error('❌ Get notifications error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
    });
  }
};

/**
 * GET /api/v1/notifications/unread-count
 * Returns unread notification count for authenticated user.
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const [row] = await sequelize.query(
      `SELECT COUNT(*)::int AS unread_count
         FROM public.notifications
        WHERE user_id = :user_id
          AND read = false`,
      {
        type: QueryTypes.SELECT,
        replacements: { user_id: userId },
      }
    );

    return res.status(200).json({
      success: true,
      data: { count: row?.unread_count || 0 },
    });
  } catch (error) {
    console.error('❌ Get unread notification count error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch unread notification count',
    });
  }
};

/**
 * PATCH /api/v1/notifications/:id/read
 * Marks a single notification as read for authenticated user.
 */
exports.markNotificationAsRead = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const [updated] = await sequelize.query(
      `UPDATE public.notifications
          SET read = true
        WHERE id = :id
          AND user_id = :user_id
      RETURNING id, user_id, shop_id, title, message, type, read, link, metadata, created_at`,
      {
        type: QueryTypes.SELECT,
        replacements: { id, user_id: userId },
      }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('❌ Mark notification as read error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to update notification',
    });
  }
};

/**
 * PATCH /api/v1/notifications/read-all
 * Marks all unread notifications as read for authenticated user.
 */
exports.markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const updated = await sequelize.query(
      `UPDATE public.notifications
          SET read = true
        WHERE user_id = :user_id
          AND read = false`,
      {
        type: QueryTypes.UPDATE,
        replacements: { user_id: userId },
      }
    );

    return res.status(200).json({
      success: true,
      data: { updated: updated?.[1] || 0 },
    });
  } catch (error) {
    console.error('❌ Mark all notifications as read error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to update notifications',
    });
  }
};

/**
 * DELETE /api/v1/notifications/:id
 * Deletes a single notification owned by authenticated user.
 */
exports.deleteNotification = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const deleted = await sequelize.query(
      `DELETE FROM public.notifications
        WHERE id = :id
          AND user_id = :user_id`,
      {
        type: QueryTypes.DELETE,
        replacements: { id, user_id: userId },
      }
    );

    if (!deleted || (Array.isArray(deleted) && deleted[1] === 0)) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    console.error('❌ Delete notification error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
    });
  }
};
