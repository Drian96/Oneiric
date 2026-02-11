const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');
const User = require('../models/User');
const { hashPassword, validatePasswordStrength } = require('../utils/passwordUtils');
const { supabaseAdmin } = require('../utils/supabaseAdmin');

/**
 * Public: resolve shop by slug
 * GET /api/v1/shops/slug/:slug
 */
exports.getShopBySlug = async (req, res) => {
  try {
    const slug = (req.params.slug || '').toString().trim().toLowerCase();
    if (!slug) {
      return res.status(400).json({ success: false, message: 'Shop slug is required' });
    }

    const [shop] = await sequelize.query(
      `SELECT id, name, slug, status, logo_url, theme_primary, theme_secondary, theme_accent
       FROM public.shops
       WHERE slug = :slug
       LIMIT 1`,
      { type: QueryTypes.SELECT, replacements: { slug } }
    );

    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    if (shop.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Shop is not active' });
    }

    return res.status(200).json({ success: true, data: shop });
  } catch (error) {
    console.error('❌ getShopBySlug error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch shop' });
  }
};

/**
 * Admin: update branding for current shop
 * PUT /api/v1/shops/branding
 */
exports.updateShopBranding = async (req, res) => {
  try {
    const shopId = req.shop?.id;
    if (!shopId) {
      return res.status(400).json({ success: false, message: 'Shop context is required' });
    }

    const { logo_url, theme_primary, theme_secondary, theme_accent } = req.body;

    const [updated] = await sequelize.query(
      `UPDATE public.shops
       SET
         logo_url = COALESCE(:logo_url, logo_url),
         theme_primary = COALESCE(:theme_primary, theme_primary),
         theme_secondary = COALESCE(:theme_secondary, theme_secondary),
         theme_accent = COALESCE(:theme_accent, theme_accent),
         updated_at = NOW()
       WHERE id = :shop_id
       RETURNING id, name, slug, status, logo_url, theme_primary, theme_secondary, theme_accent`,
      {
        type: QueryTypes.SELECT,
        replacements: {
          shop_id: shopId,
          logo_url: logo_url || null,
          theme_primary: theme_primary || null,
          theme_secondary: theme_secondary || null,
          theme_accent: theme_accent || null,
        },
      }
    );

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('❌ updateShopBranding error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to update shop branding' });
  }
};

/**
 * Public: create a new shop + admin user
 * POST /api/v1/shops/register
 */
exports.registerShop = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      shop_name,
      shop_slug,
      admin_first_name,
      admin_last_name,
      admin_email,
      admin_password,
      admin_phone,
    } = req.body;

    if (!shop_name || !shop_slug || !admin_first_name || !admin_last_name || !admin_email || !admin_password) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    const slug = shop_slug.toString().trim().toLowerCase();
    if (!/^[a-z0-9-]{3,50}$/.test(slug)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Shop slug must be 3-50 characters, lowercase, and use only letters, numbers, and hyphens.',
      });
    }
    if (slug === 'platform') {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Shop slug is reserved.' });
    }

    const passwordCheck = validatePasswordStrength(admin_password);
    if (!passwordCheck.isValid) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: passwordCheck.error });
    }

    const [existingShop] = await sequelize.query(
      `SELECT id FROM public.shops WHERE slug = :slug LIMIT 1`,
      { type: QueryTypes.SELECT, replacements: { slug }, transaction }
    );
    if (existingShop) {
      await transaction.rollback();
      return res.status(409).json({ success: false, message: 'Shop slug already exists.' });
    }

    const existingUser = await User.findOne({
      where: { email: admin_email.toLowerCase() },
      transaction,
    });
    if (existingUser) {
      await transaction.rollback();
      return res.status(409).json({ success: false, message: 'Email already in use.' });
    }

    const [shop] = await sequelize.query(
      `INSERT INTO public.shops (name, slug, status, created_at, updated_at)
       VALUES (:name, :slug, 'active', NOW(), NOW())
       RETURNING id, name, slug, status, logo_url, theme_primary, theme_secondary, theme_accent`,
      {
        type: QueryTypes.SELECT,
        replacements: { name: shop_name, slug },
        transaction,
      }
    );

    let authUserId = null;
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: admin_email.toLowerCase(),
        password: admin_password,
        email_confirm: true,
      });
      if (error) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: `Supabase auth error: ${error.message}` });
      }
      authUserId = data?.user?.id || null;
    }

    const password_hash = await hashPassword(admin_password);
    const adminUser = await User.create(
      {
        email: admin_email.toLowerCase(),
        password_hash,
        first_name: admin_first_name,
        last_name: admin_last_name,
        phone: admin_phone || null,
        role: 'admin',
        status: 'active',
        auth_user_id: authUserId,
        last_shop_id: shop.id,
      },
      { transaction }
    );

    await sequelize.query(
      `INSERT INTO public.shop_members (shop_id, user_id, role, status, created_at, updated_at)
       VALUES (:shop_id, :user_id, 'admin', 'active', NOW(), NOW())`,
      {
        type: QueryTypes.INSERT,
        replacements: { shop_id: shop.id, user_id: adminUser.id },
        transaction,
      }
    );

    await transaction.commit();

    return res.status(201).json({
      success: true,
      data: {
        shop,
        admin_user: {
          id: adminUser.id,
          email: adminUser.email,
          role: 'admin',
        },
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ registerShop error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to register shop.' });
  }
};
