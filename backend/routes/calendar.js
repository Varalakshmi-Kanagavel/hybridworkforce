const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendarController');
const authMiddleware = require('../middleware/auth');

// Routes
router.get('/month',
  authMiddleware,
  calendarController.getMonthCalendar
);

module.exports = router;
