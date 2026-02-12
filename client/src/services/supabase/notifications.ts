// =============================
// Notification Service
// Handles all notification-related operations
// =============================

import type { Notification } from './types';
import {
  getNotifications as getNotificationsApi,
  getUnreadNotificationCount,
  markNotificationAsRead as markNotificationAsReadApi,
  markAllNotificationsAsRead as markAllNotificationsAsReadApi,
  deleteNotificationById,
} from '../api';

export const notificationService = {
  /**
   * Get all notifications for the current user
   * Returns notifications ordered by most recent first
   */
  async getNotifications(userId: number): Promise<Notification[]> {
    try {
      void userId; // Kept for compatibility with existing context calls.
      return (await getNotificationsApi()) as Notification[];
    } catch (error) {
      console.error('Error getting notifications:', error);
      throw error;
    }
  },

  /**
   * Get unread notifications count for the current user
   */
  async getUnreadCount(userId: number): Promise<number> {
    try {
      void userId;
      return await getUnreadNotificationCount();
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0; // Return 0 on error to not break the UI
    }
  },

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      await markNotificationAsReadApi(notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: number): Promise<void> {
    try {
      void userId;
      await markAllNotificationsAsReadApi();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  },

  /**
   * Create a new notification (typically called by backend/system)
   * Note: Client-side creation is intentionally unsupported for security.
   */
  async createNotification(notification: {
    user_id: number;
    title: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error' | 'order' | 'promotion';
    link?: string;
    metadata?: Record<string, any>;
  }): Promise<Notification> {
    void notification;
    throw new Error('Client-side notification creation is not supported. Use backend service role.');
  },

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await deleteNotificationById(notificationId);
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  },
};

