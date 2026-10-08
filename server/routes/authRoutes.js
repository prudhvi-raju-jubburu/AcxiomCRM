const express = require('express');
const router = express.Router();
const {
  register,
  login,
  logout,
  getMe,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public authentication routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

// Protected routes (requires valid JWT)
router.get('/me', protect, getMe);

module.exports = router;
