const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

const resolveShop = async (req, res, next) => {
  try {
    const headerSlug = req.headers['x-shop-slug'];
    const querySlug = req.query.shop_slug;
    const paramSlug = req.params.shopSlug;
    const slug = (headerSlug || querySlug || paramSlug || '').toString().trim().toLowerCase();

    if (!slug) {
      req.shop = null;
      return next();
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
