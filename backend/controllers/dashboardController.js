const User = require('../models/User');
const LeaveRequest = require('../models/LeaveRequest');
const BroadcastMessage = require('../models/BroadcastMessage');
const Attendance = require('../models/Attendance');

// Helper to get start and end of day
const getStartOfDay = (date = new Date()) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
};

const getEndOfDay = (date = new Date()) => {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
};

// Helper to check if user has approved WFH for today
const checkWFHStatus = async (userId) => {
  const today = new Date();
  const startOfDay = getStartOfDay(today);
  const endOfDay = getEndOfDay(today);

  const wfhRequest = await LeaveRequest.findOne({
    userId,
    type: 'wfh',
    status: 'approved',
    fromDate: { $lte: endOfDay },
    toDate: { $gte: startOfDay }
  });

  return wfhRequest ? 'wfh' : 'office';
};

// @desc    Get employee dashboard data
// @route   GET /api/dashboard/employee
// @access  Private (EMPLOYEE)
exports.getEmployeeDashboard = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get today's attendance for login time
    const startOfDay = getStartOfDay();
    const endOfDay = getEndOfDay();
    
    const todayAttendance = await Attendance.findOne({
      userId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    // Check work mode (WFH or Office)
    const workMode = await checkWFHStatus(userId);

    // Get user's leave requests
    const leaveRequests = await LeaveRequest.find({ userId })
      .sort({ appliedOn: -1 })
      .limit(5);

    // Get pending leave count
    const pendingLeaveCount = await LeaveRequest.countDocuments({ 
      userId, 
      status: 'pending' 
    });

    // Get recent broadcasts
    const broadcasts = await BroadcastMessage.find({
      teamId: req.user.teamId,
      audience: { $in: ['TEAM', 'ORG'] }
    })
      .populate('senderId', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      stats: {
        pendingLeaveCount,
        totalLeaveRequests: leaveRequests.length,
        loginTime: todayAttendance?.checkInTime || null,
        workMode,
        status: todayAttendance?.status || 'available'
      },
      recentLeaveRequests: leaveRequests,
      recentBroadcasts: broadcasts
    });
  } catch (error) {
    console.error('Get employee dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get manager dashboard data
// @route   GET /api/dashboard/manager
// @access  Private (MANAGER)
exports.getManagerDashboard = async (req, res) => {
  try {
    const userId = req.user.userId;
    const teamId = req.user.teamId;

    // Get today's attendance for login time
    const startOfDay = getStartOfDay();
    const endOfDay = getEndOfDay();
    
    const todayAttendance = await Attendance.findOne({
      userId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    // Check work mode (WFH or Office)
    const workMode = await checkWFHStatus(userId);

    // Get team members
    const teamMembers = await User.find({ 
      teamId,
      isActive: true 
    }).select('name email role');

    // Get pending leave requests for team
    const teamMemberIds = teamMembers.map(m => m._id);
    const pendingLeaveRequests = await LeaveRequest.find({
      userId: { $in: teamMemberIds },
      status: 'pending'
    })
      .populate('userId', 'name email')
      .sort({ appliedOn: -1 });

    // Get team attendance stats (mock for now)
    const teamOnlineCount = teamMembers.length; // This would come from attendance tracking

    res.json({
      stats: {
        teamSize: teamMembers.length,
        pendingApprovals: pendingLeaveRequests.length,
        teamOnlineCount,
        loginTime: todayAttendance?.checkInTime || null,
        workMode,
        status: todayAttendance?.status || 'available'
      },
      teamMembers,
      pendingLeaveRequests: pendingLeaveRequests.slice(0, 10)
    });
  } catch (error) {
    console.error('Get manager dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get HR dashboard data
// @route   GET /api/dashboard/hr
// @access  Private (HR_ADMIN)
exports.getHRDashboard = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get today's attendance for login time
    const startOfDay = getStartOfDay();
    const endOfDay = getEndOfDay();
    
    const todayAttendance = await Attendance.findOne({
      userId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    // Check work mode (WFH or Office)
    const workMode = await checkWFHStatus(userId);

    // Get all users
    const totalUsers = await User.countDocuments({ isActive: true });
    const activeUsers = await User.countDocuments({ isActive: true });
    
    // Get all pending leave requests
    const pendingLeaveRequests = await LeaveRequest.find({ status: 'pending' })
      .populate('userId', 'name email role teamId')
      .sort({ appliedOn: -1 });

    // Get recent user activities (mock)
    const recentUsers = await User.find({ isActive: true })
      .select('name email role createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      stats: {
        totalUsers,
        activeUsers,
        pendingApprovals: pendingLeaveRequests.length,
        loginTime: todayAttendance?.checkInTime || null,
        workMode,
        status: todayAttendance?.status || 'available'
      },
      pendingLeaveRequests: pendingLeaveRequests.slice(0, 10),
      recentUsers
    });
  } catch (error) {
    console.error('Get HR dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get system admin dashboard data
// @route   GET /api/dashboard/system
// @access  Private (SYS_ADMIN)
exports.getSystemDashboard = async (req, res) => {
  try {
    // Get all users
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    
    // Get all pending leave requests
    const pendingLeaveRequests = await LeaveRequest.find({ status: 'pending' })
      .populate('userId', 'name email role')
      .sort({ appliedOn: -1 });

    // Get system stats
    const totalLeaveRequests = await LeaveRequest.countDocuments();
    const totalBroadcasts = await BroadcastMessage.countDocuments();

    // Get users by role
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    res.json({
      stats: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        pendingApprovals: pendingLeaveRequests.length,
        totalLeaveRequests,
        totalBroadcasts
      },
      usersByRole,
      pendingLeaveRequests: pendingLeaveRequests.slice(0, 10)
    });
  } catch (error) {
    console.error('Get system dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

