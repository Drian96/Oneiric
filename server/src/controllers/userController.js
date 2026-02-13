const User = require('../models/User');
const { hashPassword } = require('../utils/passwordUtils');
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

// Allowed staff roles that admins can manage
const MANAGEABLE_ROLES = ['admin', 'manager', 'staff'];

const sanitizeUser = (user) => ({
  id: user.id,
  email: user.email,
  firstName: user.first_name,
  lastName: user.last_name,
  phone: user.phone,
  role: user.role,
  status: user.status,
  lastLogin: user.last_login,
  createdAt: user.created_at,
  updatedAt: user.updated_at,
});

// GET /api/v1/users
const listUsers = async (req, res) => {
  try {
    const shopId = req.shop?.id;
    const users = await sequelize.query(
      `WITH staff_users AS (
         SELECT
           u.id,
           u.email,
           u.first_name,
           u.last_name,
           u.phone,
           sm.role::text AS role,
           sm.status::text AS status,
           u.last_login,
           u.created_at,
           u.updated_at
         FROM public.shop_members sm
         JOIN public.users u
           ON u.id = sm.user_id
        WHERE sm.shop_id = :shop_id
       ),
       ordering_customers AS (
         SELECT DISTINCT ON (u.id)
           u.id,
           u.email,
           u.first_name,
           u.last_name,
           u.phone,
           'customer'::text AS role,
           u.status::text AS status,
           u.last_login,
           u.created_at,
           u.updated_at
         FROM public.orders o
         JOIN public.users u
           ON u.id = o.user_id
        WHERE o.shop_id = :shop_id
          AND NOT EXISTS (
            SELECT 1
            FROM public.shop_members sm2
            WHERE sm2.shop_id = :shop_id
              AND sm2.user_id = u.id
          )
        ORDER BY u.id, o.created_at DESC
       )
       SELECT *
       FROM (
         SELECT * FROM staff_users
         UNION ALL
         SELECT * FROM ordering_customers
       ) scoped_users
       ORDER BY created_at DESC`,
      {
        type: QueryTypes.SELECT,
        replacements: { shop_id: shopId },
      }
    );

    res.status(200).json({
      success: true,
      data: {
        users: users.map((u) =>
          sanitizeUser({
            ...u,
            // role + status should be tenant-scoped from shop_members
            role: u.role,
            status: u.status,
          })
        ),
      },
    });
  } catch (error) {
    console.error('❌ listUsers error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
};

// POST /api/v1/users
const createUser = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const shopId = req.shop?.id;
    const { fullName, email, contact, role, password } = req.body;

    if (!fullName || !email || !role || !password) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const normalizedRole = String(role).toLowerCase();
    if (!MANAGEABLE_ROLES.includes(normalizedRole)) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const existing = await User.findOne({ where: { email: email.toLowerCase() }, transaction });
    if (existing) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }

    // Split full name -> first/last
    const parts = fullName.trim().split(/\s+/);
    const firstName = parts.shift();
    const lastName = parts.join(' ') || '-';

    const passwordHash = await hashPassword(password);

    const created = await User.create({
      email: email.toLowerCase(),
      password_hash: passwordHash,
      first_name: firstName,
      last_name: lastName,
      phone: contact || null,
      role: normalizedRole,
      status: 'active',
      last_shop_id: shopId,
    }, { transaction });

    await sequelize.query(
      `INSERT INTO public.shop_members (shop_id, user_id, role, status, created_at, updated_at)
       VALUES (:shop_id, :user_id, :role, 'active', NOW(), NOW())`,
      {
        type: QueryTypes.INSERT,
        replacements: {
          shop_id: shopId,
          user_id: created.id,
          role: normalizedRole,
        },
        transaction,
      }
    );

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { user: sanitizeUser(created) },
    });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ createUser error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to create user' });
  }
};

// PUT /api/v1/users/:id
const updateUser = async (req, res) => {
  try {
    const shopId = req.shop?.id;
    const { id } = req.params;
    const { fullName, email, contact, role, status } = req.body;

    const [membership] = await sequelize.query(
      `SELECT user_id FROM public.shop_members
       WHERE shop_id = :shop_id
         AND user_id = :user_id
       LIMIT 1`,
      {
        type: QueryTypes.SELECT,
        replacements: { shop_id: shopId, user_id: id },
      }
    );
    if (!membership) {
      return res.status(404).json({ success: false, message: 'User not found in this shop' });
    }

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const updates = {};
    if (email) {
      const lower = email.toLowerCase();
      if (lower !== user.email) {
        const exists = await User.findOne({ where: { email: lower } });
        if (exists) {
          return res.status(400).json({ success: false, message: 'Email already in use' });
        }
      }
      updates.email = lower;
    }
    if (typeof contact !== 'undefined') updates.phone = contact;
    if (typeof role !== 'undefined') {
      const normalizedRole = String(role).toLowerCase();
      if (!MANAGEABLE_ROLES.includes(normalizedRole)) {
        return res.status(400).json({ success: false, message: 'Invalid role' });
      }
      updates.role = normalizedRole;
      await sequelize.query(
        `UPDATE public.shop_members
         SET role = :role, updated_at = NOW()
         WHERE shop_id = :shop_id
           AND user_id = :user_id`,
        {
          type: QueryTypes.UPDATE,
          replacements: { role: normalizedRole, shop_id: shopId, user_id: id },
        }
      );
    }
    if (typeof status !== 'undefined') {
      const normalizedStatus = String(status).toLowerCase();
      if (!['active', 'inactive'].includes(normalizedStatus)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
      }
      updates.status = normalizedStatus;
      await sequelize.query(
        `UPDATE public.shop_members
         SET status = :status, updated_at = NOW()
         WHERE shop_id = :shop_id
           AND user_id = :user_id`,
        {
          type: QueryTypes.UPDATE,
          replacements: { status: normalizedStatus, shop_id: shopId, user_id: id },
        }
      );
    }
    if (fullName) {
      const parts = fullName.trim().split(/\s+/);
      updates.first_name = parts.shift();
      updates.last_name = parts.join(' ') || '-';
    }

    await user.update(updates);

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: { user: sanitizeUser(user) },
    });
  } catch (error) {
    console.error('❌ updateUser error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
};

// DELETE /api/v1/users/:id
const deleteUser = async (req, res) => {
  try {
    const shopId = req.shop?.id;
    const { id } = req.params;

    const removedMembership = await sequelize.query(
      `DELETE FROM public.shop_members
       WHERE shop_id = :shop_id
         AND user_id = :user_id`,
      {
        type: QueryTypes.DELETE,
        replacements: { shop_id: shopId, user_id: id },
      }
    );

    if (!removedMembership || (Array.isArray(removedMembership) && removedMembership[1] === 0)) {
      return res.status(404).json({ success: false, message: 'User not found in this shop' });
    }

    res.status(200).json({ success: true, message: 'User removed from this shop successfully' });
  } catch (error) {
    console.error('❌ deleteUser error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
};

module.exports = {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
};


