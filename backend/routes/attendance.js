const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const attendanceController = require('../controllers/attendanceController');

// Use protect as alias for consistency
const protect = authMiddleware;

// All routes require authentication
router.use(protect);

// @route   GET /api/attendance/today
// @desc    Get today's attendance session
// @access  Private
router.get('/today', attendanceController.getTodaySession);

// @route   POST /api/attendance/check-in
// @desc    Check in (create attendance record)
// @access  Private
router.post('/check-in', attendanceController.checkIn);

// @route   POST /api/attendance/check-out
// @desc    Check out (update attendance record)
// @access  Private
router.post('/check-out', attendanceController.checkOut);

// @route   GET /api/attendance/history
// @desc    Get attendance history
// @access  Private
router.get('/history', attendanceController.getHistory);

// @route   PUT /api/attendance/activity
// @desc    Update last activity timestamp
// @access  Private
router.put('/activity', attendanceController.updateActivity);

module.exports = router;
