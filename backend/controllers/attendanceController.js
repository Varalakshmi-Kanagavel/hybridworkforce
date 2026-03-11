const Attendance = require('../models/Attendance');

// Helper function to calculate status based on lastActivity
const calculateStatus = (attendance) => {
  if (attendance.checkOutTime) {
    return 'OFFLINE';
  }
  
  const now = new Date();
  const lastActivity = new Date(attendance.lastActivity);
  const minutesSinceActivity = (now - lastActivity) / (1000 * 60);
  
  if (minutesSinceActivity > 5) {
    return 'IDLE';
  }
  
  return 'AVAILABLE';
};

// Helper function to calculate active duration in minutes
const calculateActiveDuration = (checkInTime) => {
  const now = new Date();
  const checkIn = new Date(checkInTime);
  return Math.floor((now - checkIn) / (1000 * 60)); // in minutes
};

// Helper function to calculate total hours
const calculateTotalHours = (checkInTime, checkOutTime) => {
  const checkIn = new Date(checkInTime);
  const checkOut = new Date(checkOutTime);
  return ((checkOut - checkIn) / (1000 * 60 * 60)).toFixed(2); // in hours
};

// Helper function to get start of day
const getStartOfDay = (date = new Date()) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
};

// Helper function to get end of day
const getEndOfDay = (date = new Date()) => {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
};

// @desc    Get today's attendance session
// @route   GET /api/attendance/today
// @access  Private
exports.getTodaySession = async (req, res) => {
  try {
    const userId = req.user.userId;
    const startOfDay = getStartOfDay();
    const endOfDay = getEndOfDay();

    let attendance = await Attendance.findOne({
      userId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).populate('userId', 'name email');

    if (!attendance) {
      return res.json({
        session: null,
        message: 'No attendance session for today'
      });
    }

    // Update status based on lastActivity
    const currentStatus = calculateStatus(attendance);
    if (currentStatus !== attendance.status) {
      attendance.status = currentStatus;
      await attendance.save();
    }

    // Calculate active duration
    const activeDuration = calculateActiveDuration(attendance.checkInTime);

    res.json({
      session: {
        id: attendance._id,
        userId: attendance.userId._id,
        userName: attendance.userId.name,
        date: attendance.date,
        checkInTime: attendance.checkInTime,
        checkOutTime: attendance.checkOutTime,
        lastActivity: attendance.lastActivity,
        status: currentStatus,
        activeDuration, // in minutes
        totalHours: attendance.totalHours
      }
    });
  } catch (error) {
    console.error('Get today session error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Check in (create attendance record)
// @route   POST /api/attendance/check-in
// @access  Private
exports.checkIn = async (req, res) => {
  try {
    const userId = req.user.userId;
    const startOfDay = getStartOfDay();
    const endOfDay = getEndOfDay();

    // Check if attendance record exists for today
    let attendance = await Attendance.findOne({
      userId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    const now = new Date();

    if (attendance) {
      // Record exists - check if user is already logged in
      if (!attendance.checkOutTime) {
        // Already logged in - return existing session
        const populatedAttendance = await Attendance.findById(attendance._id)
          .populate('userId', 'name email');
        
        return res.json({
          message: 'Already checked in today',
          session: {
            id: populatedAttendance._id,
            userId: populatedAttendance.userId._id,
            userName: populatedAttendance.userId.name,
            date: populatedAttendance.date,
            checkInTime: populatedAttendance.checkInTime,
            checkOutTime: populatedAttendance.checkOutTime,
            lastActivity: populatedAttendance.lastActivity,
            status: populatedAttendance.status,
            activeDuration: calculateActiveDuration(populatedAttendance.checkInTime),
            totalHours: populatedAttendance.totalHours
          }
        });
      } else {
        // User logged out earlier - start new session
        attendance.checkInTime = now;
        attendance.checkOutTime = null;
        attendance.lastActivity = now;
        attendance.status = 'AVAILABLE';
        attendance.totalHours = 0;
        await attendance.save();
      }
    } else {
      // No record exists - create new attendance record
      attendance = await Attendance.create({
        userId,
        date: now,
        checkInTime: now,
        lastActivity: now,
        status: 'AVAILABLE'
      });
    }

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate('userId', 'name email');

    // Emit socket event for real-time dashboard update
    const io = req.app.get('io');
    if (io) {
      io.emit('attendanceUpdated', {
        userId: populatedAttendance.userId._id.toString(),
        timestamp: populatedAttendance.checkInTime,
        status: populatedAttendance.status
      });
    }

    res.status(201).json({
      message: 'Check-in successful',
      session: {
        id: populatedAttendance._id,
        userId: populatedAttendance.userId._id,
        userName: populatedAttendance.userId.name,
        date: populatedAttendance.date,
        checkInTime: populatedAttendance.checkInTime,
        checkOutTime: populatedAttendance.checkOutTime,
        lastActivity: populatedAttendance.lastActivity,
        status: populatedAttendance.status,
        activeDuration: 0,
        totalHours: 0
      }
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ message: 'Server error during check-in' });
  }
};

// @desc    Check out (update attendance record)
// @route   POST /api/attendance/check-out
// @access  Private
exports.checkOut = async (req, res) => {
  try {
    const userId = req.user.userId;
    const startOfDay = getStartOfDay();
    const endOfDay = getEndOfDay();

    // Find today's attendance record
    const attendance = await Attendance.findOne({
      userId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    if (!attendance) {
      return res.status(400).json({
        message: 'No check-in record found for today'
      });
    }

    if (attendance.checkOutTime) {
      return res.status(400).json({
        message: 'Already checked out today',
        session: attendance
      });
    }

    // Update check-out time and calculate total hours
    const now = new Date();
    attendance.checkOutTime = now;
    attendance.totalHours = calculateTotalHours(attendance.checkInTime, now);
    attendance.status = 'OFFLINE';
    
    await attendance.save();

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate('userId', 'name email');

    // Emit socket event for real-time dashboard update
    const io = req.app.get('io');
    if (io) {
      io.emit('attendanceUpdated', {
        userId: populatedAttendance.userId._id.toString(),
        timestamp: populatedAttendance.checkOutTime,
        status: populatedAttendance.status
      });
    }

    res.json({
      message: 'Check-out successful',
      session: {
        id: populatedAttendance._id,
        userId: populatedAttendance.userId._id,
        userName: populatedAttendance.userId.name,
        date: populatedAttendance.date,
        checkInTime: populatedAttendance.checkInTime,
        checkOutTime: populatedAttendance.checkOutTime,
        lastActivity: populatedAttendance.lastActivity,
        status: populatedAttendance.status,
        activeDuration: calculateActiveDuration(populatedAttendance.checkInTime),
        totalHours: populatedAttendance.totalHours
      }
    });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({ message: 'Server error during check-out' });
  }
};

// @desc    Get attendance history
// @route   GET /api/attendance/history
// @access  Private
exports.getHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { startDate, endDate, limit = 30 } = req.query;

    // Build query
    const query = { userId };
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        query.date.$lte = getEndOfDay(new Date(endDate));
      }
    }

    // Get attendance records
    const attendanceRecords = await Attendance.find(query)
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .populate('userId', 'name email');

    // Format the response
    const history = attendanceRecords.map(record => ({
      id: record._id,
      date: record.date,
      checkInTime: record.checkInTime,
      checkOutTime: record.checkOutTime,
      lastActivity: record.lastActivity,
      status: calculateStatus(record),
      totalHours: record.totalHours,
      userName: record.userId.name
    }));

    res.json({
      history,
      count: history.length
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update last activity (called periodically from frontend)
// @route   PUT /api/attendance/activity
// @access  Private
exports.updateActivity = async (req, res) => {
  try {
    const userId = req.user.userId;
    const startOfDay = getStartOfDay();
    const endOfDay = getEndOfDay();

    // Find today's attendance record
    const attendance = await Attendance.findOne({
      userId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    if (!attendance || attendance.checkOutTime) {
      return res.status(400).json({
        message: 'No active session found'
      });
    }

    // Update last activity
    attendance.lastActivity = new Date();
    attendance.status = 'AVAILABLE';
    await attendance.save();

    res.json({
      message: 'Activity updated',
      lastActivity: attendance.lastActivity
    });
  } catch (error) {
    console.error('Update activity error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
