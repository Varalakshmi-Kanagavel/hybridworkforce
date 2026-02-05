const BroadcastMessage = require('../models/BroadcastMessage');
const User = require('../models/User');

// @desc    Send broadcast message
// @route   POST /api/broadcast
// @access  Private (MANAGER only)
exports.sendBroadcast = async (req, res) => {
  try {
    const { message, teamId, audience } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message is required' });
    }

    // Verify user is a manager
    if (req.user.role !== 'MANAGER') {
      return res.status(403).json({ message: 'Only managers can send broadcast messages' });
    }

    // Use manager's teamId if not provided
    const finalTeamId = teamId || req.user.teamId;
    if (!finalTeamId) {
      return res.status(400).json({ message: 'Team ID is required' });
    }

    const broadcastMessage = await BroadcastMessage.create({
      senderId: req.user.userId,
      teamId: finalTeamId,
      message: message.trim(),
      audience: audience || 'TEAM'
    });

    const populatedMessage = await BroadcastMessage.findById(broadcastMessage._id)
      .populate('senderId', 'name email role');

    res.status(201).json({
      message: 'Broadcast sent successfully',
      broadcast: populatedMessage
    });
  } catch (error) {
    console.error('Send broadcast error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get broadcast messages
// @route   GET /api/broadcast
// @access  Private (all authenticated users)
exports.getBroadcasts = async (req, res) => {
  try {
    let query = {};

    // Employees see broadcasts for their team
    if (req.user.role === 'EMPLOYEE' && req.user.teamId) {
      query.teamId = req.user.teamId;
      query.audience = { $in: ['TEAM', 'ORG'] };
    }
    // Managers see broadcasts for their team
    else if (req.user.role === 'MANAGER' && req.user.teamId) {
      query.teamId = req.user.teamId;
      query.audience = { $in: ['TEAM', 'ORG'] };
    }
    // HR_ADMIN and SYS_ADMIN see all broadcasts
    else if (['HR_ADMIN', 'SYS_ADMIN'].includes(req.user.role)) {
      // No filter - see all
    } else {
      // Default: only team broadcasts
      if (req.user.teamId) {
        query.teamId = req.user.teamId;
      }
    }

    const broadcasts = await BroadcastMessage.find(query)
      .populate('senderId', 'name email role')
      .sort({ createdAt: -1 })
      .limit(50); // Limit to recent 50 messages

    res.json({ broadcasts });
  } catch (error) {
    console.error('Get broadcasts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

