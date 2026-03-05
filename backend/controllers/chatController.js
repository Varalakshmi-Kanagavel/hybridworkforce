const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

const ANNOUNCEMENT_ALLOWED_ROLES = ['ADMIN', 'HR_ADMIN', 'MANAGER', 'SYS_ADMIN'];

const isConversationParticipant = (conversation, userId) => {
  return conversation.participants.some(
    (participantId) => participantId.toString() === userId.toString()
  );
};

const canSendInConversation = (conversation, role) => {
  if (conversation.type !== 'announcement') {
    return true;
  }
  return ANNOUNCEMENT_ALLOWED_ROLES.includes(role);
};

const isConversationAdmin = (conversation, userId) => {
  const isCreator = conversation.createdBy?.toString() === userId.toString();
  const isAdminListMember = Array.isArray(conversation.admins)
    && conversation.admins.some((adminId) => adminId.toString() === userId.toString());
  return isCreator || isAdminListMember;
};

const getConversationUnreadCount = async (conversationId, userId) => {
  return Message.countDocuments({
    conversationId,
    senderId: { $ne: userId },
    isDeletedForEveryone: false,
    deletedForUsers: { $ne: userId },
    statusByUser: {
      $elemMatch: {
        userId,
        status: { $ne: 'read' },
      },
    },
  });
};

const parseMentionUserIds = (mentions, conversation) => {
  if (!Array.isArray(mentions)) {
    return [];
  }

  const participantSet = new Set(conversation.participants.map((id) => id.toString()));

  return [...new Set(mentions)]
    .map((id) => id.toString())
    .filter((id) => participantSet.has(id))
    .map((id) => ({ userId: id }));
};

const buildInitialStatus = (conversation, senderId) => {
  return conversation.participants.map((participantId) => ({
    userId: participantId,
    status: participantId.toString() === senderId.toString() ? 'sent' : 'delivered',
    updatedAt: new Date(),
  }));
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const createConversation = async (req, res) => {
  try {
    const { type, participants, name, department } = req.body;
    const baseParticipants = Array.isArray(participants) ? participants : [];
    const participantList = [...new Set([...baseParticipants, req.user.userId])];

    if (!type || !['direct', 'group', 'announcement'].includes(type)) {
      return res.status(400).json({ message: 'Invalid conversation type' });
    }

    if (
      (type === 'direct' || type === 'group' || type === 'announcement') &&
      baseParticipants.length === 0
    ) {
      return res.status(400).json({
        message: 'Participants array is required'
      });
    }

    if (participantList.length < 2) {
      return res.status(400).json({
        message: 'Conversation must have at least two participants'
      });
    }

    // Direct chat validation
    if (type === 'direct') {
      if (participantList.length !== 2) {
        return res.status(400).json({
          message: 'Direct chat must contain exactly two participants'
        });
      }

      // Prevent duplicate direct conversations
      const existingConversation = await Conversation.findOne({
        type: 'direct',
        participants: { $all: participantList, $size: 2 }
      }).populate('participants', 'name email role lastLoginAt')
        .populate('createdBy', 'name email role lastLoginAt');

      if (existingConversation) {
        return res.status(200).json({
          message: 'Conversation already exists',
          conversation: existingConversation
        });
      }
    }

    // Group chat validation
    if (type === 'group') {
      if (!name) {
        return res.status(400).json({
          message: 'Group chat name is required'
        });
      }

      if (participantList.length < 3) {
        return res.status(400).json({
          message: 'Group chat must have at least 3 participants'
        });
      }
    }

    // Announcement channel validation
    if (type === 'announcement') {
      if (!ANNOUNCEMENT_ALLOWED_ROLES.includes(req.user.role)) {
        return res.status(403).json({
          message: 'Only Admin, HR, or Manager can create announcement channels'
        });
      }

      if (!name) {
        return res.status(400).json({
          message: 'Announcement channel name is required'
        });
      }

      if (baseParticipants.length < 1) {
        return res.status(400).json({
          message: 'Announcement channel must include at least one participant'
        });
      }
    }

    const conversationData = {
      type,
      participants: participantList,
      createdBy: req.user.userId,
      admins: ['group', 'announcement'].includes(type) ? [req.user.userId] : [],
    };

    if (name) conversationData.name = name;
    if (department) conversationData.department = department;

    const conversation = await Conversation.create(conversationData);
    const populatedConversation = await Conversation.findById(conversation._id)
      .populate('participants', 'name email role lastLoginAt')
      .populate('createdBy', 'name email role lastLoginAt');

    res.status(201).json({
      message: 'Conversation created successfully',
      conversation: populatedConversation,
    });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getUserConversations = async (req, res) => {
  try {
    const rawConversations = await Conversation.find({
      participants: req.user.userId,
    })
      .populate('participants', 'name email role lastLoginAt')
      .populate('createdBy', 'name email role lastLoginAt')
      .sort({ updatedAt: -1 });

    const conversations = await Promise.all(
      rawConversations.map(async (conversation) => {
        const unreadCount = await getConversationUnreadCount(conversation._id, req.user.userId);
        return {
          ...conversation.toObject(),
          unreadCount,
        };
      })
    );

    res.json({ conversations });
  } catch (error) {
    console.error('Get user conversations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const before = req.query.before;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const isParticipant = isConversationParticipant(conversation, req.user.userId);

    if (!isParticipant) {
      return res.status(403).json({ message: 'Access denied. You are not a participant in this conversation' });
    }

    const query = {
      conversationId,
      deletedForUsers: { $ne: req.user.userId },
    };

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .populate('senderId', 'name email role')
      .populate('reactions.userId', 'name email role')
      .populate('replyTo', 'content senderId createdAt isDeletedForEveryone')
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({
      messages: messages.reverse(),
      pagination: {
        hasMore: messages.length === limit,
        limit,
      },
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { conversationId, content, mentions = [], replyTo = null } = req.body;

    if (!conversationId || !content) {
      return res.status(400).json({ message: 'Conversation ID and content are required' });
    }

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const isParticipant = isConversationParticipant(conversation, req.user.userId);

    if (!isParticipant) {
      return res.status(403).json({ message: 'Access denied. You are not a participant in this conversation' });
    }

    // Restrict messages in announcement channels
    if (!canSendInConversation(conversation, req.user.role)) {
      return res.status(403).json({
        message: 'Employees cannot send messages in announcement channels'
      });
    }

    if (conversation.isLocked && !isConversationAdmin(conversation, req.user.userId)) {
      return res.status(403).json({ message: 'Conversation is locked' });
    }

    if (replyTo) {
      const parent = await Message.findOne({ _id: replyTo, conversationId });
      if (!parent) {
        return res.status(404).json({ message: 'Reply target message not found' });
      }
    }

    const parsedMentions = parseMentionUserIds(mentions, conversation);

    const message = await Message.create({
      conversationId,
      senderId: req.user.userId,
      content,
      replyTo,
      mentions: parsedMentions,
      statusByUser: buildInitialStatus(conversation, req.user.userId),
    });

    conversation.updatedAt = new Date();
    await conversation.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'name email role')
      .populate('replyTo', 'content senderId createdAt isDeletedForEveryone');

    res.status(201).json({
      message: 'Message sent successfully',
      data: populatedMessage,
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content, mentions = [] } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Updated content is required' });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.senderId.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ message: 'You can only edit your own messages' });
    }

    if (message.isDeletedForEveryone) {
      return res.status(400).json({ message: 'Deleted messages cannot be edited' });
    }

    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation || !isConversationParticipant(conversation, req.user.userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    message.content = content.trim();
    message.mentions = parseMentionUserIds(mentions, conversation);
    message.editedAt = new Date();
    await message.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'name email role')
      .populate('replyTo', 'content senderId createdAt isDeletedForEveryone');

    res.json({
      message: 'Message edited successfully',
      data: populatedMessage,
    });
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { scope = 'me' } = req.body;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation || !isConversationParticipant(conversation, req.user.userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (scope === 'everyone') {
      const isOwner = message.senderId.toString() === req.user.userId.toString();
      const isModerator = ANNOUNCEMENT_ALLOWED_ROLES.includes(req.user.role);

      if (!isOwner && !isModerator) {
        return res.status(403).json({ message: 'Not allowed to delete this message for everyone' });
      }

      message.isDeletedForEveryone = true;
      message.content = '';
      message.reactions = [];
      message.editedAt = new Date();
      await message.save();

      return res.json({
        message: 'Message deleted for everyone',
        data: { _id: message._id, scope: 'everyone' },
      });
    }

    if (!message.deletedForUsers.some((id) => id.toString() === req.user.userId.toString())) {
      message.deletedForUsers.push(req.user.userId);
      await message.save();
    }

    res.json({
      message: 'Message deleted for you',
      data: { _id: message._id, scope: 'me' },
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const replyToMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content, mentions = [] } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Reply content is required' });
    }

    const parentMessage = await Message.findById(messageId);
    if (!parentMessage) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const conversation = await Conversation.findById(parentMessage.conversationId);
    if (!conversation || !isConversationParticipant(conversation, req.user.userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!canSendInConversation(conversation, req.user.role)) {
      return res.status(403).json({
        message: 'Employees cannot send messages in announcement channels',
      });
    }

    if (conversation.isLocked && !isConversationAdmin(conversation, req.user.userId)) {
      return res.status(403).json({ message: 'Conversation is locked' });
    }

    const message = await Message.create({
      conversationId: parentMessage.conversationId,
      senderId: req.user.userId,
      content: content.trim(),
      replyTo: parentMessage._id,
      mentions: parseMentionUserIds(mentions, conversation),
      statusByUser: buildInitialStatus(conversation, req.user.userId),
    });

    conversation.updatedAt = new Date();
    await conversation.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'name email role')
      .populate('replyTo', 'content senderId createdAt isDeletedForEveryone');

    res.status(201).json({
      message: 'Reply sent successfully',
      data: populatedMessage,
    });
  } catch (error) {
    console.error('Reply message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const reactToMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji || typeof emoji !== 'string') {
      return res.status(400).json({ message: 'Emoji is required' });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation || !isConversationParticipant(conversation, req.user.userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const existingReactionIndex = message.reactions.findIndex(
      (reaction) =>
        reaction.userId.toString() === req.user.userId.toString() &&
        reaction.emoji === emoji
    );

    if (existingReactionIndex >= 0) {
      message.reactions.splice(existingReactionIndex, 1);
    } else {
      message.reactions.push({
        emoji,
        userId: req.user.userId,
      });
    }

    await message.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'name email role')
      .populate('reactions.userId', 'name email role')
      .populate('replyTo', 'content senderId createdAt isDeletedForEveryone');

    res.json({
      message: 'Reaction updated',
      data: populatedMessage,
    });
  } catch (error) {
    console.error('React message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const markConversationRead = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !isConversationParticipant(conversation, req.user.userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const messages = await Message.find({
      conversationId,
      'statusByUser.userId': req.user.userId,
    });

    for (const message of messages) {
      const statusEntry = message.statusByUser.find(
        (entry) => entry.userId.toString() === req.user.userId.toString()
      );

      if (statusEntry && statusEntry.status !== 'read') {
        statusEntry.status = 'read';
        statusEntry.updatedAt = new Date();
      }

      await message.save();
    }

    res.json({ message: 'Conversation marked as read' });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const searchMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const query = (req.query.q || '').toString().trim();
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);

    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !isConversationParticipant(conversation, req.user.userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const baseFilters = {
      conversationId,
      deletedForUsers: { $ne: req.user.userId },
      isDeletedForEveryone: false,
    };

    const tokenizedTerms = query
      .split(/\s+/)
      .map((part) => part.replace(/[^a-zA-Z0-9']/g, ''))
      .filter(Boolean);

    const textSearchQuery = tokenizedTerms.length > 0
      ? tokenizedTerms.join(' ')
      : query;

    let messages = await Message.find({
      ...baseFilters,
      $text: { $search: textSearchQuery },
    })
      .populate('senderId', 'name email role')
      .populate('replyTo', 'content senderId createdAt isDeletedForEveryone')
      .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
      .limit(limit);

    if (messages.length === 0) {
      const regexTerms = tokenizedTerms.length > 0 ? tokenizedTerms : [query];
      const regexPattern = regexTerms.map(escapeRegex).join('|');

      messages = await Message.find({
        ...baseFilters,
        content: { $regex: regexPattern, $options: 'i' },
      })
        .populate('senderId', 'name email role')
        .populate('replyTo', 'content senderId createdAt isDeletedForEveryone')
        .sort({ createdAt: -1 })
        .limit(limit);
    }

    res.json({ messages });
  } catch (error) {
    console.error('Search messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await User.find(
      { _id: { $ne: req.user.userId } },
      'name email role'
    );

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getConversationParticipants = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conversation = await Conversation.findById(conversationId)
      .populate('participants', 'name email role lastLoginAt')
      .populate('admins', 'name email role lastLoginAt');

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!isConversationParticipant(conversation, req.user.userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      participants: conversation.participants,
      admins: conversation.admins,
    });
  } catch (error) {
    console.error('Get participants error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const addGroupMembers = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { participantIds } = req.body;

    if (!Array.isArray(participantIds) || participantIds.length === 0) {
      return res.status(400).json({ message: 'participantIds array is required' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!['group', 'announcement'].includes(conversation.type)) {
      return res.status(400).json({ message: 'Members can only be managed in group or announcement conversations' });
    }

    if (!isConversationAdmin(conversation, req.user.userId)) {
      return res.status(403).json({ message: 'Only group admins can add members' });
    }

    const participantSet = new Set(conversation.participants.map((id) => id.toString()));
    participantIds.forEach((id) => participantSet.add(id.toString()));
    conversation.participants = [...participantSet];
    conversation.updatedAt = new Date();
    await conversation.save();

    const populatedConversation = await Conversation.findById(conversation._id)
      .populate('participants', 'name email role lastLoginAt')
      .populate('createdBy', 'name email role lastLoginAt')
      .populate('admins', 'name email role lastLoginAt');

    res.json({
      message: 'Members added successfully',
      conversation: populatedConversation,
    });
  } catch (error) {
    console.error('Add members error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const removeGroupMember = async (req, res) => {
  try {
    const { conversationId, userId } = req.params;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!['group', 'announcement'].includes(conversation.type)) {
      return res.status(400).json({ message: 'Members can only be managed in group or announcement conversations' });
    }

    if (!isConversationAdmin(conversation, req.user.userId)) {
      return res.status(403).json({ message: 'Only group admins can remove members' });
    }

    if (userId.toString() === conversation.createdBy.toString()) {
      return res.status(400).json({ message: 'Conversation creator cannot be removed' });
    }

    conversation.participants = conversation.participants.filter(
      (participantId) => participantId.toString() !== userId.toString()
    );

    conversation.admins = (conversation.admins || []).filter(
      (adminId) => adminId.toString() !== userId.toString()
    );

    if (conversation.participants.length < 2) {
      return res.status(400).json({ message: 'Conversation must have at least two participants' });
    }

    conversation.updatedAt = new Date();
    await conversation.save();

    const populatedConversation = await Conversation.findById(conversation._id)
      .populate('participants', 'name email role lastLoginAt')
      .populate('createdBy', 'name email role lastLoginAt')
      .populate('admins', 'name email role lastLoginAt');

    res.json({
      message: 'Member removed successfully',
      conversation: populatedConversation,
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const leaveGroup = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!['group', 'announcement'].includes(conversation.type)) {
      return res.status(400).json({ message: 'Only group or announcement conversations support leave action' });
    }

    if (!isConversationParticipant(conversation, req.user.userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (conversation.createdBy.toString() === req.user.userId.toString()) {
      return res.status(400).json({ message: 'Conversation creator cannot leave without assigning a new admin' });
    }

    conversation.participants = conversation.participants.filter(
      (participantId) => participantId.toString() !== req.user.userId.toString()
    );

    conversation.admins = (conversation.admins || []).filter(
      (adminId) => adminId.toString() !== req.user.userId.toString()
    );

    if (conversation.participants.length < 2) {
      return res.status(400).json({ message: 'Conversation must have at least two participants' });
    }

    conversation.updatedAt = new Date();
    await conversation.save();

    res.json({ message: 'You left the conversation successfully' });
  } catch (error) {
    console.error('Leave group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const renameGroup = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!['group', 'announcement'].includes(conversation.type)) {
      return res.status(400).json({ message: 'Only group or announcement conversations can be renamed' });
    }

    if (!isConversationAdmin(conversation, req.user.userId)) {
      return res.status(403).json({ message: 'Only group admins can rename the conversation' });
    }

    conversation.name = name.trim();
    conversation.updatedAt = new Date();
    await conversation.save();

    const populatedConversation = await Conversation.findById(conversation._id)
      .populate('participants', 'name email role lastLoginAt')
      .populate('createdBy', 'name email role lastLoginAt')
      .populate('admins', 'name email role lastLoginAt');

    res.json({
      message: 'Conversation name updated successfully',
      conversation: populatedConversation,
    });
  } catch (error) {
    console.error('Rename group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const lockConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!isConversationAdmin(conversation, req.user.userId) && !ANNOUNCEMENT_ALLOWED_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: 'Only admins can lock this conversation' });
    }

    conversation.isLocked = true;
    conversation.lockedBy = req.user.userId;
    conversation.lockedAt = new Date();
    await conversation.save();

    res.json({ message: 'Conversation locked successfully' });
  } catch (error) {
    console.error('Lock conversation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const unlockConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!isConversationAdmin(conversation, req.user.userId) && !ANNOUNCEMENT_ALLOWED_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: 'Only admins can unlock this conversation' });
    }

    conversation.isLocked = false;
    conversation.lockedBy = null;
    conversation.lockedAt = null;
    await conversation.save();

    res.json({ message: 'Conversation unlocked successfully' });
  } catch (error) {
    console.error('Unlock conversation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getUnreadSummary = async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.user.userId }).select('_id name type updatedAt');

    const byConversation = await Promise.all(
      conversations.map(async (conversation) => ({
        conversationId: conversation._id,
        name: conversation.name,
        type: conversation.type,
        unreadCount: await getConversationUnreadCount(conversation._id, req.user.userId),
      }))
    );

    const totalUnread = byConversation.reduce((sum, item) => sum + item.unreadCount, 0);

    res.json({
      totalUnread,
      byConversation,
    });
  } catch (error) {
    console.error('Unread summary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getMentionNotifications = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

    const mentions = await Message.find({
      'mentions.userId': req.user.userId,
      senderId: { $ne: req.user.userId },
      isDeletedForEveryone: false,
      deletedForUsers: { $ne: req.user.userId },
    })
      .populate('senderId', 'name email role')
      .populate('conversationId', 'name type')
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({ mentions });
  } catch (error) {
    console.error('Mention notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getPinnedMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!isConversationParticipant(conversation, req.user.userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const pinnedMessages = await Message.find({
      _id: { $in: conversation.pinnedMessages || [] },
      isDeletedForEveryone: false,
      deletedForUsers: { $ne: req.user.userId },
    })
      .populate('senderId', 'name email role')
      .sort({ createdAt: -1 });

    res.json({ pinnedMessages });
  } catch (error) {
    console.error('Get pinned messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const pinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!isConversationParticipant(conversation, req.user.userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!isConversationAdmin(conversation, req.user.userId) && !ANNOUNCEMENT_ALLOWED_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: 'Only admins can pin messages' });
    }

    const alreadyPinned = (conversation.pinnedMessages || []).some(
      (pinnedId) => pinnedId.toString() === messageId.toString()
    );

    if (!alreadyPinned) {
      conversation.pinnedMessages = [...(conversation.pinnedMessages || []), message._id];
      conversation.updatedAt = new Date();
      await conversation.save();
    }

    res.json({ message: 'Message pinned successfully' });
  } catch (error) {
    console.error('Pin message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const unpinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!isConversationParticipant(conversation, req.user.userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!isConversationAdmin(conversation, req.user.userId) && !ANNOUNCEMENT_ALLOWED_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: 'Only admins can unpin messages' });
    }

    conversation.pinnedMessages = (conversation.pinnedMessages || []).filter(
      (pinnedId) => pinnedId.toString() !== messageId.toString()
    );
    conversation.updatedAt = new Date();
    await conversation.save();

    res.json({ message: 'Message unpinned successfully' });
  } catch (error) {
    console.error('Unpin message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createConversation,
  getUserConversations,
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  replyToMessage,
  reactToMessage,
  markConversationRead,
  searchMessages,
  getConversationParticipants,
  addGroupMembers,
  removeGroupMember,
  leaveGroup,
  renameGroup,
  lockConversation,
  unlockConversation,
  getUnreadSummary,
  getMentionNotifications,
  getPinnedMessages,
  pinMessage,
  unpinMessage,
  getUsers,
};
