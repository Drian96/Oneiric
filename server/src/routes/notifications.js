const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../middleware/auth');
const {
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} = require('../controllers/notificationController');

router.get('/', authenticateToken, getNotifications);
router.get('/unread-count', authenticateToken, getUnreadCount);
router.patch('/read-all', authenticateToken, markAllNotificationsAsRead);
router.patch('/:id/read', authenticateToken, markNotificationAsRead);
router.delete('/:id', authenticateToken, deleteNotification);

module.exports = router;
