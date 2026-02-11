const crypto = require('crypto');
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');
const User = require('../models/User');
const { hashPassword } = require('../utils/passwordUtils');

const ensureUserFromAuth = async (req) => {
  if (req.user) return req.user;
  if (!req.auth) return null;

  if (req.auth.type === 'supabase') {
    const claims = req.auth.claims || {};
    const authUserId = claims.sub;
    const email = claims.email;

    let user = authUserId
      ? await User.findOne({ where: { auth_user_id: authUserId } })
      : null;

    if (!user && email) {
      user = await User.findOne({ where: { email: email.toLowerCase() } });
      if (user && !user.auth_user_id) {
        await user.update({ auth_user_id: authUserId || null });
      }
    }

    if (!user) {
      const firstName =
        claims.user_metadata?.first_name ||
        claims.user_metadata?.full_name?.split(' ')[0] ||
        'User';
      const lastName =
        claims.user_metadata?.last_name ||
        claims.user_metadata?.full_name?.split(' ').slice(1).join(' ') ||
        'User';

      const randomPassword = crypto.randomBytes(16).toString('hex');
      const password_hash = await hashPassword(randomPassword);

      user = await User.create({
        email: email ? email.toLowerCase() : `${authUserId}@local.user`,
        password_hash,
        first_name: firstName,
        last_name: lastName,
        role: 'customer',
        status: 'active',
        auth_user_id: authUserId || null,
      });
    }

    return user;
  }

  if (req.auth.type === 'custom' && req.auth.claims?.id) {
    return await User.findByPk(req.auth.claims.id);
  }

  return null;
};

exports.getMe = async (req, res) => {
  try {
    const user = await ensureUserFromAuth(req);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const memberships = await sequelize.query(
      `SELECT sm.shop_id,
              sm.role,
              s.slug,
              s.name,
              s.status,
              s.logo_url
         FROM public.shop_members sm
         JOIN public.shops s ON s.id = sm.shop_id
        WHERE sm.user_id = :user_id AND sm.status = 'active'
        ORDER BY sm.created_at ASC`,
      {
        type: QueryTypes.SELECT,
        replacements: { user_id: user.id },
      }
    );

    const lastShop = user.last_shop_id
      ? memberships.find((m) => m.shop_id === user.last_shop_id)
      : memberships[0] || null;

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          status: user.status,
          lastLogin: user.last_login,
        },
        memberships,
        lastShopSlug: lastShop ? lastShop.slug : null,
      },
    });
  } catch (error) {
    console.error('❌ getMe error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load profile' });
  }
};

exports.getCustomerSummary = async (req, res) => {
  try {
    const user = await ensureUserFromAuth(req);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const orders = await sequelize.query(
      `SELECT o.id,
              o.order_number,
              o.total_amount,
              o.status,
              o.created_at,
              s.id AS shop_id,
              s.slug AS shop_slug,
              s.name AS shop_name,
              s.logo_url AS shop_logo_url
         FROM public.orders o
         JOIN public.shops s ON s.id = o.shop_id
        WHERE o.user_id = :user_id
        ORDER BY o.created_at DESC`,
      {
        type: QueryTypes.SELECT,
        replacements: { user_id: user.id },
      }
    );

    const shops = await sequelize.query(
      `SELECT s.id,
              s.slug,
              s.name,
              s.logo_url
         FROM public.shop_customers sc
         JOIN public.shops s ON s.id = sc.shop_id
        WHERE sc.customer_user_id = :user_id
        ORDER BY sc.first_order_at DESC`,
      {
        type: QueryTypes.SELECT,
        replacements: { user_id: user.id },
      }
    );

    return res.json({
      success: true,
      data: {
        orders,
        shops,
      },
    });
  } catch (error) {
    console.error('❌ getCustomerSummary error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load summary' });
  }
};
