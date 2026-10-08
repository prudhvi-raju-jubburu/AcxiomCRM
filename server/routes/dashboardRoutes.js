const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getDashboardSummary } = require('../controllers/dashboardController');

const router = express.Router();

// GET /api/dashboard/summary - Protected role-aware dashboard metrics
router.get('/summary', protect, getDashboardSummary);

module.exports = router;
