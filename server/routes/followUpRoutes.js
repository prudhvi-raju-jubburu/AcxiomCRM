const express = require('express');
const router = express.Router();
const {
  getFollowUps,
  getFollowUpById,
  createFollowUp,
  updateFollowUp,
  deleteFollowUp,
} = require('../controllers/followUpController');
const { protect } = require('../middleware/authMiddleware');

// All follow-up routes require authentication
router.use(protect);

router.route('/')
  .get(getFollowUps)
  .post(createFollowUp);

router.route('/:id')
  .get(getFollowUpById)
  .put(updateFollowUp)
  .delete(deleteFollowUp);

module.exports = router;
