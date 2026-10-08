const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
} = require('../controllers/userController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// All user management routes require valid JWT and Admin role
router.use(protect);
router.use(authorizeRoles('Admin'));

router.route('/')
  .get(getUsers)
  .post(createUser);

router.route('/:id')
  .get(getUserById)
  .put(updateUser);

router.patch('/:id/status', toggleUserStatus);

module.exports = router;
