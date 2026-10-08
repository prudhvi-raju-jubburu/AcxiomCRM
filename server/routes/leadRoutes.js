const express = require('express');
const router = express.Router();
const {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  convertLeadToCustomer,
} = require('../controllers/leadController');
const { protect } = require('../middleware/authMiddleware');

// All lead routes require authentication
router.use(protect);

router.route('/')
  .get(getLeads)
  .post(createLead);

router.route('/:id')
  .get(getLeadById)
  .put(updateLead)
  .delete(deleteLead);

// Lead to Customer conversion endpoint
router.post('/:id/convert', convertLeadToCustomer);

module.exports = router;
