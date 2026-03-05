const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');

// Helper function to get all dates in a month
const getDatesInMonth = (year, month) => {
  const dates = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    dates.push(date);
  }
  
  return dates;
};

// Helper function to check if date is in range
const isDateInRange = (date, fromDate, toDate) => {
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  
  const from = new Date(fromDate);
  from.setHours(0, 0, 0, 0);
  
  const to = new Date(toDate);
  to.setHours(0, 0, 0, 0);
  
  return checkDate >= from && checkDate <= to;
};

// @desc    Get calendar data for a specific month
// @route   GET /api/calendar/month?year=YYYY&month=MM
// @access  Private
exports.getMonthCalendar = async (req, res) => {
  try {
    const { year, month } = req.query;
    const userId = req.user.userId;

    // Validate input
    if (!year || !month) {
      return res.status(400).json({ message: 'Year and month are required' });
    }

    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ message: 'Invalid year or month' });
    }

    // Get start and end of month
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);

    // Fetch attendance records for the month
    const attendanceRecords = await Attendance.find({
      userId: userId,
      date: { $gte: startDate, $lte: endDate }
    });

    // Fetch approved leave/WFH requests for the month
    const leaveRequests = await LeaveRequest.find({
      userId: userId,
      status: 'approved',
      $or: [
        { fromDate: { $lte: endDate }, toDate: { $gte: startDate } }
      ]
    });

    // Create a map to store calendar data
    const calendarMap = {};

    // Process attendance records (totalHours >= 9 → OFFICE)
    attendanceRecords.forEach(record => {
      const dateStr = record.date.toISOString().split('T')[0];
      if (record.totalHours >= 9) {
        calendarMap[dateStr] = { date: dateStr, type: 'OFFICE' };
      }
    });

    // Process leave requests (priority: LEAVE > WFH > OFFICE)
    const allDatesInMonth = getDatesInMonth(yearNum, monthNum);
    
    leaveRequests.forEach(leaveReq => {
      allDatesInMonth.forEach(date => {
        if (isDateInRange(date, leaveReq.fromDate, leaveReq.toDate)) {
          const dateStr = date.toISOString().split('T')[0];
          const leaveType = leaveReq.type.toUpperCase();
          
          // Apply priority: LEAVE > WFH > OFFICE
          if (!calendarMap[dateStr]) {
            calendarMap[dateStr] = { date: dateStr, type: leaveType };
          } else {
            // Override if current type has higher priority
            if (leaveType === 'LEAVE') {
              calendarMap[dateStr] = { date: dateStr, type: 'LEAVE' };
            } else if (leaveType === 'WFH' && calendarMap[dateStr].type === 'OFFICE') {
              calendarMap[dateStr] = { date: dateStr, type: 'WFH' };
            }
          }
        }
      });
    });

    // Convert map to array
    const calendarData = Object.values(calendarMap);

    res.json(calendarData);
  } catch (error) {
    console.error('Get calendar error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
