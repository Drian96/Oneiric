const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

const SLUG_PATTERN = /^[a-z0-9-]{3,50}$/;

const resolveShop = async (req, res, next) => {
  try {
    const rawHeaderSlug = req.headers['x-shop-slug'];
    const rawQuerySlug = req.query.shop_slug;
    const rawParamSlug = req.params.shopSlug;

    const headerSlug = rawHeaderSlug ? rawHeaderSlug.toString().trim().toLowerCase() : '';
    const querySlug = rawQuerySlug ? rawQuerySlug.toString().trim().toLowerCase() : '';
    const paramSlug = rawParamSlug ? rawParamSlug.toString().trim().toLowerCase() : '';

    const candidates = [paramSlug, querySlug, headerSlug].filter(Boolean);
    const slug = candidates[0] || '';

    if (candidates.length > 1) {
      const hasMismatch = candidates.some((value) => value !== slug);
      if (hasMismatch) {
        return res.status(400).json({
          success: false,
          message: 'Conflicting shop context was provided.'
        });
      }
    }

    if (!slug) {
      req.shop = null;
      return next();
    }

    if (!SLUG_PATTERN.test(slug)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid shop slug format.'
      });
    }

    const [shop] = await sequelize.query(
      `SELECT id, name, slug, status, logo_url, theme_primary, theme_secondary, theme_accent
       FROM public.shops
       WHERE slug = :slug
       LIMIT 1`,
      {
        type: QueryTypes.SELECT,
        replacements: { slug },
      }
    );

    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    if (shop.status === 'suspended') {
      return res.status(403).json({ success: false, message: 'Shop is suspended' });
    }

    req.shop = shop;
    return next();
  } catch (error) {
    console.error('❌ resolveShop error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to resolve shop' });
  }
};

const requireShop = (req, res, next) => {
  if (!req.shop) {
    return res.status(400).json({ success: false, message: 'Shop context is required' });
  }
  return next();
};

module.exports = { resolveShop, requireShop };
