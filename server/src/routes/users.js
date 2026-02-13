const express = require('express');
const router = express.Router();

const { authenticateToken, requireRole } = require('../middleware/auth');
const { resolveShop, requireShop } = require('../middleware/tenant');
const { listUsers, createUser, updateUser, deleteUser } = require('../controllers/userController');

// Staff management routes - admin, manager, and staff can view users (customers)
// Only admin can create, update, and delete users
router.get('/', resolveShop, requireShop, authenticateToken, requireRole(['admin', 'manager', 'staff']), listUsers);
router.post('/', resolveShop, requireShop, authenticateToken, requireRole('admin'), createUser);
router.put('/:id', resolveShop, requireShop, authenticateToken, requireRole('admin'), updateUser);
router.delete('/:id', resolveShop, requireShop, authenticateToken, requireRole('admin'), deleteUser);

module.exports = router;


