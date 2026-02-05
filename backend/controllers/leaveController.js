const LeaveRequest = require('../models/LeaveRequest');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// Helper function to determine who can approve based on hierarchy
const getApproverRole = (applicantRole) => {
  switch (applicantRole) {
    case 'EMPLOYEE':
      return 'MANAGER';
    case 'MANAGER':
      return 'HR_ADMIN';
    case 'HR_ADMIN':
      return 'SYS_ADMIN';
    default:
      return null;
  }
};

// @desc    Apply for leave/WFH
// @route   POST /api/leave
// @access  Private (all authenticated users)
exports.applyLeave = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { type, fromDate, toDate, reason } = req.body;

    // Validate dates
    const from = new Date(fromDate);
    const to = new Date(toDate);
    
    if (from > to) {
      return res.status(400).json({ message: 'From date must be before or equal to to date' });
    }

    const leaveRequest = await LeaveRequest.create({
      userId: req.user.userId,
      type,
      fromDate: from,
      toDate: to,
      reason
    });

    const populatedRequest = await LeaveRequest.findById(leaveRequest._id)
      .populate('userId', 'name email role');

    res.status(201).json({
      message: 'Leave request submitted successfully',
      leaveRequest: populatedRequest
    });
  } catch (error) {
    console.error('Apply leave error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get own leave requests
// @route   GET /api/leave/my
// @access  Private
exports.getMyLeaveRequests = async (req, res) => {
  try {
    const leaveRequests = await LeaveRequest.find({ userId: req.user.userId })
      .populate('approvedBy', 'name email')
      .sort({ appliedOn: -1 });

    res.json({ leaveRequests });
  } catch (error) {
    console.error('Get my leave requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get pending leave requests for approval
// @route   GET /api/leave/pending
// @access  Private (MANAGER, HR_ADMIN, SYS_ADMIN)
exports.getPendingLeaveRequests = async (req, res) => {
  try {
    let query = { status: 'pending' };

    // Managers can only see their team's requests
    if (req.user.role === 'MANAGER') {
      // Get all employees in the manager's team
      const teamMembers = await User.find({ 
        teamId: req.user.teamId,
        role: 'EMPLOYEE'
      }).select('_id');
      
      const teamMemberIds = teamMembers.map(m => m._id);
      query.userId = { $in: teamMemberIds };
    }
    // HR_ADMIN and SYS_ADMIN can see all pending requests

    const leaveRequests = await LeaveRequest.find(query)
      .populate('userId', 'name email role teamId')
      .populate('approvedBy', 'name email')
      .sort({ appliedOn: -1 });

    res.json({ leaveRequests });
  } catch (error) {
    console.error('Get pending leave requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Approve leave request
// @route   PUT /api/leave/:id/approve
// @access  Private (MANAGER, HR_ADMIN, SYS_ADMIN)
exports.approveLeave = async (req, res) => {
  try {
    const { id } = req.params;

    const leaveRequest = await LeaveRequest.findById(id)
      .populate('userId', 'role teamId');

    if (!leaveRequest) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({ message: 'Leave request is not pending' });
    }

    // Check hierarchy: Cannot approve your own leave
    if (leaveRequest.userId._id.toString() === req.user.userId) {
      return res.status(403).json({ message: 'Cannot approve your own leave request' });
    }

    const applicantRole = leaveRequest.userId.role;
    const requiredApproverRole = getApproverRole(applicantRole);

    // Check if current user has permission to approve
    if (req.user.role === 'MANAGER') {
      // Managers can only approve EMPLOYEE requests from their team
      if (applicantRole !== 'EMPLOYEE' || leaveRequest.userId.teamId !== req.user.teamId) {
        return res.status(403).json({ 
          message: 'You can only approve leave requests from employees in your team' 
        });
      }
    } else if (req.user.role === 'HR_ADMIN') {
      // HR_ADMIN can approve EMPLOYEE and MANAGER requests
      if (!['EMPLOYEE', 'MANAGER'].includes(applicantRole)) {
        return res.status(403).json({ 
          message: 'You can only approve leave requests from employees and managers' 
        });
      }
    } else if (req.user.role === 'SYS_ADMIN') {
      // SYS_ADMIN can approve all requests
      // No additional check needed
    } else {
      return res.status(403).json({ message: 'Insufficient permissions to approve leave' });
    }

    // Auto-approve HR_ADMIN requests if approved by SYS_ADMIN
    // Or handle special cases here

    leaveRequest.status = 'approved';
    leaveRequest.approvedBy = req.user.userId;
    await leaveRequest.save();

    const updatedRequest = await LeaveRequest.findById(id)
      .populate('userId', 'name email role')
      .populate('approvedBy', 'name email');

    res.json({
      message: 'Leave request approved successfully',
      leaveRequest: updatedRequest
    });
  } catch (error) {
    console.error('Approve leave error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Reject leave request
// @route   PUT /api/leave/:id/reject
// @access  Private (MANAGER, HR_ADMIN, SYS_ADMIN)
exports.rejectLeave = async (req, res) => {
  try {
    const { id } = req.params;

    const leaveRequest = await LeaveRequest.findById(id)
      .populate('userId', 'role teamId');

    if (!leaveRequest) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({ message: 'Leave request is not pending' });
    }

    // Check hierarchy: Cannot reject your own leave
    if (leaveRequest.userId._id.toString() === req.user.userId) {
      return res.status(403).json({ message: 'Cannot reject your own leave request' });
    }

    const applicantRole = leaveRequest.userId.role;
    const requiredApproverRole = getApproverRole(applicantRole);

    // Check if current user has permission to reject (same as approve)
    if (req.user.role === 'MANAGER') {
      if (applicantRole !== 'EMPLOYEE' || leaveRequest.userId.teamId !== req.user.teamId) {
        return res.status(403).json({ 
          message: 'You can only reject leave requests from employees in your team' 
        });
      }
    } else if (req.user.role === 'HR_ADMIN') {
      if (!['EMPLOYEE', 'MANAGER'].includes(applicantRole)) {
        return res.status(403).json({ 
          message: 'You can only reject leave requests from employees and managers' 
        });
      }
    } else if (req.user.role !== 'SYS_ADMIN') {
      return res.status(403).json({ message: 'Insufficient permissions to reject leave' });
    }

    leaveRequest.status = 'rejected';
    leaveRequest.approvedBy = req.user.userId;
    await leaveRequest.save();

    const updatedRequest = await LeaveRequest.findById(id)
      .populate('userId', 'name email role')
      .populate('approvedBy', 'name email');

    res.json({
      message: 'Leave request rejected',
      leaveRequest: updatedRequest
    });
  } catch (error) {
    console.error('Reject leave error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

