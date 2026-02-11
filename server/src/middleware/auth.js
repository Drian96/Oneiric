// Import required modules and utilities
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Our User model
const { verifyToken, extractTokenFromHeader } = require('../utils/jwt'); // JWT utilities
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// These functions protect routes and handle user authentication
// ============================================================================

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user data to request
 * This middleware should be used on routes that require authentication
 * 
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function (calls next middleware)
 * 
 * Usage:
 * router.get('/profile', authenticateToken, getProfileController);
 * 
 * How it works:
 * 1. Extracts token from Authorization header
 * 2. Verifies the token is valid
 * 3. Finds the user in database
 * 4. Attaches user data to req.user
 * 5. Calls next() to continue to the route handler
 */
const getSupabaseUrl = () => process.env.SUPABASE_URL;
const shouldAllowLegacyJwt = () => process.env.ALLOW_LEGACY_CUSTOM_JWT === 'true';
let jwksCache = null;

const getJwks = async () => {
  if (jwksCache) return jwksCache;
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) return null;
  const { createRemoteJWKSet } = await import('jose');
  jwksCache = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`));
  return jwksCache;
};

const verifySupabaseToken = async (token) => {
  const supabaseSecret = process.env.SUPABASE_JWT_SECRET;
  if (supabaseSecret) {
    try {
      return jwt.verify(token, supabaseSecret);
    } catch (error) {
      // fall through to JWKS verification
    }
  }

  const jwks = await getJwks();
  if (!jwks) return null;
  try {
    const { jwtVerify } = await import('jose');
    const supabaseUrl = getSupabaseUrl();
    const issuer = supabaseUrl ? `${supabaseUrl}/auth/v1` : undefined;
    const { payload } = await jwtVerify(token, jwks, issuer ? { issuer } : {});
    return payload;
  } catch (error) {
    return null;
  }
};

const authenticateSupabase = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    const supabaseClaims = await verifySupabaseToken(token);
    if (supabaseClaims) {
      req.auth = { type: 'supabase', claims: supabaseClaims };
      return next();
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid Supabase token. Please login again.'
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token. Please login again.'
    });
  }
};

const authenticateToken = async (req, res, next) => {
  try {
    // Get the Authorization header from the request
    const authHeader = req.headers.authorization;
    
    // Extract the token from the header (removes 'Bearer ' prefix)
    const token = extractTokenFromHeader(authHeader);
    
    // If no token is provided, return unauthorized error
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    // Primary auth path: Supabase JWT
    const supabaseClaims = await verifySupabaseToken(token);
    if (supabaseClaims) {
      req.auth = { type: 'supabase', claims: supabaseClaims };
      let user = await User.findOne({ where: { auth_user_id: supabaseClaims.sub } });
      if (!user && supabaseClaims.email) {
        user = await User.findOne({ where: { email: supabaseClaims.email.toLowerCase() } });
        if (user && !user.auth_user_id) {
          await user.update({ auth_user_id: supabaseClaims.sub });
        }
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not linked. Please complete profile.'
        });
      }
      if (!user.isActive()) {
        return res.status(401).json({
          success: false,
          message: 'Account is inactive. Please contact support.'
        });
      }
      req.user = user;
      return next();
    }

    // Temporary compatibility mode: allow legacy custom JWT only when explicitly enabled.
    if (shouldAllowLegacyJwt()) {
      const decoded = verifyToken(token);
      const user = await User.findByPk(decoded.id);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      if (!user.isActive()) {
        return res.status(401).json({
          success: false,
          message: 'Account is inactive. Please contact support.'
        });
      }

      req.auth = { type: 'custom', claims: decoded };
      req.user = user;
      return next();
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid Supabase token. Please login again.'
    });

  } catch (error) {
    // Handle different types of JWT errors
    if (error.message === 'Token has expired') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please login again.'
      });
    } else if (error.message === 'Invalid token') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please login again.'
      });
    } else {
      console.error('❌ Authentication middleware error:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Authentication error'
      });
    }
  }
};

/**
 * Role-Based Access Control Middleware
 * Checks if the authenticated user has the required role
 * This middleware should be used AFTER authenticateToken middleware
 * 
 * @param {string|array} allowedRoles - Role(s) that are allowed to access the route
 * @returns {function} - Middleware function
 * 
 * Usage:
 * // Single role
 * router.get('/admin', authenticateToken, requireRole('admin'), adminController);
 * 
 * // Multiple roles
 * router.get('/management', authenticateToken, requireRole(['admin', 'manager']), managementController);
 * 
 * How it works:
 * 1. Gets user from req.user (set by authenticateToken)
 * 2. Checks if user's role is in the allowed roles
 * 3. If allowed, calls next() to continue
 * 4. If not allowed, returns forbidden error
 */
const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      // Get user from request (set by authenticateToken middleware)
      const user = req.user;
      
      // Convert single role to array for easier handling
      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
      
      if (req.shop?.id) {
        const [membership] = await sequelize.query(
          `SELECT role
           FROM public.shop_members
           WHERE shop_id = :shop_id AND user_id = :user_id AND status = 'active'
           LIMIT 1`,
          {
            type: QueryTypes.SELECT,
            replacements: { shop_id: req.shop.id, user_id: user.id },
          }
        );

        if (!membership || !roles.includes(membership.role)) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. Insufficient permissions.'
          });
        }

        if (req.user.last_shop_id !== req.shop.id) {
          await req.user.update({ last_shop_id: req.shop.id });
        }

        return next();
      }

      // Global role fallback
      if (!roles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Insufficient permissions.'
        });
      }
      
      // If user has required role, continue to next middleware/route handler
      next();
      
    } catch (error) {
      console.error('❌ Role middleware error:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Authorization error'
      });
    }
  };
};

/**
 * Optional Authentication Middleware
 * Similar to authenticateToken but doesn't require authentication
 * If token is provided and valid, attaches user data to request
 * If no token or invalid token, continues without user data
 * 
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 * 
 * Usage:
 * router.get('/public-data', optionalAuth, publicDataController);
 * 
 * How it works:
 * 1. Tries to extract and verify token
 * 2. If valid, attaches user data to req.user
 * 3. If invalid or no token, continues without user data
 * 4. Always calls next() to continue
 */
const optionalAuth = async (req, res, next) => {
  try {
    // Get the Authorization header from the request
    const authHeader = req.headers.authorization;
    
    // If no authorization header, continue without authentication
    if (!authHeader) {
      return next();
    }
    
    // Extract the token from the header
    const token = extractTokenFromHeader(authHeader);
    
    // If no token, continue without authentication
    if (!token) {
      return next();
    }

    const supabaseClaims = await verifySupabaseToken(token);
    if (supabaseClaims) {
      const user = await User.findOne({ where: { auth_user_id: supabaseClaims.sub } });
      if (user && user.isActive()) {
        req.auth = { type: 'supabase', claims: supabaseClaims };
        req.user = user;
      }
      return next();
    }

    if (shouldAllowLegacyJwt()) {
      // Try to verify the token
      const decoded = verifyToken(token);
      // Find the user in the database
      const user = await User.findByPk(decoded.id);
      
      // If user exists and is active, attach to request
      if (user && user.isActive()) {
        req.auth = { type: 'custom', claims: decoded };
        req.user = user;
      }
    }
    
    // Always continue to next middleware/route handler
    next();

  } catch (error) {
    // If token verification fails, continue without user data
    // Don't return error since authentication is optional
    console.log('⚠️ Optional auth: Invalid token provided, continuing without authentication');
    next();
  }
};

/**
 * Admin Only Middleware
 * Convenience middleware that requires admin role
 * This is equivalent to requireRole('admin')
 * 
 * Usage:
 * router.get('/admin-only', authenticateToken, requireAdmin, adminController);
 */
const requireAdmin = requireRole('admin');

/**
 * Customer Only Middleware
 * Convenience middleware that requires customer role
 * 
 * Usage:
 * router.get('/customer-only', authenticateToken, requireCustomer, customerController);
 */
const requireCustomer = requireRole('customer');

/**
 * Staff Only Middleware
 * Convenience middleware that requires staff role (admin, manager, or staff)
 * 
 * Usage:
 * router.get('/staff-only', authenticateToken, requireStaff, staffController);
 */
const requireStaff = requireRole(['admin', 'manager', 'staff']);

// Export all middleware functions
module.exports = {
  authenticateToken,  // Main authentication middleware
  authenticateSupabase, // Supabase JWT middleware
  requireRole,        // Role-based access control
  optionalAuth,       // Optional authentication
  requireAdmin,       // Admin-only access
  requireCustomer,    // Customer-only access
  requireStaff        // Staff-only access
};
