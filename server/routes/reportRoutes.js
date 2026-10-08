const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  getCustomerReport,
  getLeadReport,
  getFollowUpReport,
  getOpportunityReport,
  getPipelineReport,
  getConversionReport,
  getUserPerformanceReport,
} = require('../controllers/reportController');

const router = express.Router();

// All reporting endpoints require authentication
router.use(protect);

router.get('/customers', getCustomerReport);
router.get('/leads', getLeadReport);
router.get('/followups', getFollowUpReport);
router.get('/opportunities', getOpportunityReport);
router.get('/pipeline', getPipelineReport);
router.get('/conversion', getConversionReport);
router.get('/user-performance', getUserPerformanceReport);

module.exports = router;
