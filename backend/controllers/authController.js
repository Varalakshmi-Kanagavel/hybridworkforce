const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const { validationResult } = require('express-validator');

// Generate JWT Token
const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Private (HR_ADMIN, SYS_ADMIN only)
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, role, teamId } = req.body;

    // RBAC: Enforce role hierarchy for user creation
    const creatorRole = req.user.role;
    const targetRole = role || 'EMPLOYEE';

    // MANAGER and EMPLOYEE cannot create users
    if (creatorRole === 'EMPLOYEE' || creatorRole === 'MANAGER') {
      return res.status(403).json({ message: 'Not authorized to create users' });
    }

    // HR_ADMIN can only create MANAGER and EMPLOYEE
    if (creatorRole === 'HR_ADMIN' && (targetRole === 'SYS_ADMIN' || targetRole === 'HR_ADMIN')) {
      return res.status(403).json({ message: 'HR Admin cannot create System Admin or HR Admin users' });
    }

    // Validate role is one of the allowed values
    const validRoles = ['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'SYS_ADMIN'];
    if (!validRoles.includes(targetRole)) {
      return res.status(400).json({ message: 'Invalid role specified' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Ensure password is provided
    if (!password) {
      return res.status(400).json({ message: 'Initial password is required' });
    }

    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: role || 'EMPLOYEE',
      teamId: teamId || null
    });

    // Generate token
    const token = generateToken(user._id, user.role);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        teamId: user.teamId
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, deviceType } = req.body;

    // Find user and include password for comparison
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is inactive. Please contact administrator' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Store deviceType for audit (optional, doesn't block login)
    if (deviceType) {
      user.lastLoginDevice = deviceType;
      user.lastLoginAt = new Date();
      await user.save();
    }

    // Auto check-in: Create attendance record if not already checked in today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const existingAttendance = await Attendance.findOne({
      userId: user._id,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    if (!existingAttendance) {
      const now = new Date();
      await Attendance.create({
        userId: user._id,
        date: now,
        checkInTime: now,
        lastActivity: now,
        status: 'AVAILABLE'
      });
    }

    // Generate token
    const token = generateToken(user._id, user.role);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        teamId: user.teamId
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        teamId: user.teamId,
        isActive: user.isActive,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

