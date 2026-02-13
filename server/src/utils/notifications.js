// Notification utility for backend
// Creates notifications in Supabase when orders are created/updated

const { createClient } = require('@supabase/supabase-js');
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

// Initialize Supabase client for backend operations
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key for backend

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️ Supabase credentials not found. Notifications will not be created.');
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * Create a notification for a user
 * @param {Object} notificationData - Notification data
 * @param {number} notificationData.user_id - User ID
 * @param {string} notificationData.title - Notification title
 * @param {string} notificationData.message - Notification message
 * @param {string} notificationData.type - Notification type (info, success, warning, error, order, promotion)
 * @param {string} [notificationData.link] - Optional link to navigate to
 * @param {Object} [notificationData.metadata] - Optional metadata
 */
const createNotification = async (notificationData) => {
  if (!supabase) {
    console.warn('⚠️ Supabase not configured. Skipping notification creation.');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert([{
        user_id: notificationData.user_id,
        shop_id: notificationData.shop_id || null,
        title: notificationData.title,
        message: notificationData.message,
        type: notificationData.type || 'info',
        link: notificationData.link || null,
        metadata: notificationData.metadata || null,
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to create notification:', error);
      return null;
    }

    console.log('✅ Notification created:', data.id);
    return data;
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    return null;
  }
};

/**
 * Create order-related notifications
 */
const formatPeso = (amount) =>
  `₱${Number(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const summarizeItems = (items = []) => {
  if (!Array.isArray(items) || items.length === 0) return null;
  const [first] = items;
  if (!first?.name) return null;
  const quantity = Number(first.quantity || 1);
  const firstLabel = `${quantity}x ${first.name}`;
  const extraCount = items.length - 1;
  return extraCount > 0 ? `${firstLabel} (+${extraCount} more)` : firstLabel;
};

const createOrderNotification = async (
  userId,
  orderNumber,
  orderId,
  status,
  totalAmount,
  shopId,
  options = {}
) => {
  const itemCount = Number(options.itemCount || 0);
  const itemSummary = options.itemSummary || summarizeItems(options.items);
  const statusMessages = {
    pending: {
      title: 'Order Placed',
      message: `Order #${orderNumber} placed • ${itemCount > 0 ? `${itemCount} item${itemCount > 1 ? 's' : ''} • ` : ''}${formatPeso(totalAmount)}`,
    },
    confirmed: {
      title: 'Order Confirmed',
      message: `Order #${orderNumber} is confirmed and being prepared.`,
    },
    shipped: {
      title: 'Order Shipped',
      message: `Order #${orderNumber} is on the way.`,
    },
    delivered: {
      title: 'Order Delivered',
      message: `Order #${orderNumber} was delivered successfully.`,
    },
    cancelled: {
      title: 'Order Cancelled',
      message: `Order #${orderNumber} was cancelled.`,
    },
  };

  const statusInfo = statusMessages[status] || {
    title: 'Order Update',
    message: `Your order #${orderNumber} status has been updated to ${status}.`,
  };

  return await createNotification({
    user_id: userId,
    shop_id: shopId,
    title: statusInfo.title,
    message: statusInfo.message,
    type: 'order',
    link: `/orders/${orderId}`,
    metadata: {
      order_id: orderId,
      order_number: orderNumber,
      status: status,
      total_amount: Number(totalAmount || 0),
      item_count: itemCount || undefined,
      item_summary: itemSummary || undefined,
    },
  });
};

// ====================================================================
// Admin notifications
// ====================================================================

const ADMIN_ROLES = ['admin', 'manager', 'staff'];

const fetchShopAdmins = async (shopId) => {
  try {
    const adminsFromMembership = await sequelize.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, sm.role
         FROM public.shop_members sm
         JOIN public.users u ON u.id = sm.user_id
        WHERE sm.shop_id = :shop_id
          AND sm.status = 'active'
          AND sm.role IN (:roles)
          AND u.status = 'active'`,
      {
        type: QueryTypes.SELECT,
        replacements: { shop_id: shopId, roles: ADMIN_ROLES },
      }
    );

    if (adminsFromMembership.length > 0) {
      return adminsFromMembership;
    }

    // Compatibility fallback:
    // Some existing shops may have legacy admins with user.role + last_shop_id set
    // but missing shop_members rows. This keeps notifications working while data
    // is being normalized.
    const adminsFromLegacyUsers = await sequelize.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.role
         FROM public.users u
        WHERE u.last_shop_id = :shop_id
          AND u.status = 'active'
          AND u.role IN (:roles)`,
      {
        type: QueryTypes.SELECT,
        replacements: { shop_id: shopId, roles: ADMIN_ROLES },
      }
    );

    if (adminsFromLegacyUsers.length > 0) {
      console.warn(
        `⚠️ Notification fallback used for shop ${shopId}: found ${adminsFromLegacyUsers.length} admin(s) via users.last_shop_id.`
      );
    }

    return adminsFromLegacyUsers;
  } catch (error) {
    console.error('❌ Failed to fetch admin users for notifications:', error.message);
    return [];
  }
};

const createAdminOrderNotification = async ({
  orderNumber,
  orderId,
  totalAmount,
  customerName,
  event,
  shopId,
  items = [],
  itemCount = 0,
}) => {
  const safeItemCount = Number(itemCount || (Array.isArray(items) ? items.reduce((acc, i) => acc + Number(i.quantity || 0), 0) : 0));
  const itemSummary = summarizeItems(items);
  console.log(`🔔 Creating admin order notifications for shop ${shopId} (event: ${event}, order: ${orderNumber})`);
  const admins = await fetchShopAdmins(shopId);
  if (admins.length === 0) {
    console.warn(`⚠️ No admin users found to notify for shop ${shopId}.`);
    return;
  }

  const eventMessages = {
    new_order: {
      title: 'New Order',
      message: customerName,
    },
    cancelled: {
      title: 'Order Cancelled by Customer',
      message: `${customerName} cancelled order #${orderNumber}`,
    },
    return_refund: {
      title: 'Return/Refund Requested',
      message: `${customerName} requested a return/refund for order #${orderNumber}`,
    },
  };

  const { title, message } = eventMessages[event] || {
    title: 'Order Update',
    message: `${customerName} updated order #${orderNumber} (${event})`,
  };

  await Promise.all(
    admins.map((admin) =>
      createNotification({
        user_id: admin.id,
        shop_id: shopId,
        title,
        message,
        type: 'order',
        link: '/admin/orders',
        metadata: {
          order_id: orderId,
          order_number: orderNumber,
          event,
          customer_name: customerName,
          total_amount: Number(totalAmount || 0),
          item_count: safeItemCount || undefined,
          item_summary: itemSummary || undefined,
        },
      })
    )
  );
  console.log(`✅ Admin notifications created for ${admins.length} recipient(s) on order ${orderNumber}`);
};

module.exports = {
  createNotification,
  createOrderNotification,
  createAdminOrderNotification,
};

