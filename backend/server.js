const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const User = require('./models/User');
const Conversation = require('./models/Conversation');
const Message = require('./models/Message');

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

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hybrid-workforce-hub')
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => console.error('MongoDB connection error:', err));

// ===== Socket.IO Setup =====
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:8080',
    credentials: true
  }
});

app.set('io', io);

// Track online users
const onlineUsers = new Map(); // userId -> { socketId, name, teamId }

// Socket.IO Authentication Middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication error'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user || !user.isActive) {
      return next(new Error('Invalid token or inactive user'));
    }

    socket.user = {
      userId: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      teamId: user.teamId
    };

    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Invalid token'));
  }
});

// Socket.IO Connection Handler
io.on('connection', async (socket) => {
  console.log('User connected:', socket.user.userId);

  // Track online user
  onlineUsers.set(socket.user.userId, {
    socketId: socket.id,
    name: socket.user.name,
    teamId: socket.user.teamId
  });

  // Broadcast online users count
  io.emit('onlineUsersCount', onlineUsers.size);

  // Join personal room
  socket.join(`user_${socket.user.userId}`);

  // Join all conversation rooms
  try {
    const conversations = await Conversation.find({
      participants: socket.user.userId
    });

    conversations.forEach(conversation => {
      socket.join(`conversation_${conversation._id}`);
    });

    // Broadcast user online
    socket.broadcast.emit('user_online', {
      userId: socket.user.userId,
      name: socket.user.name
    });
  } catch (error) {
    console.error('Error joining rooms:', error);
  }

  // Handle send_message event
  socket.on('send_message', async (data) => {
    try {
      const { conversationId, content, mentions = [], replyTo = null } = data;

      if (!conversationId || !content) {
        return socket.emit('message_error', {
          message: 'Conversation ID and content are required'
        });
      }

      const conversation = await Conversation.findById(conversationId);

      if (!conversation) {
        return socket.emit('message_error', {
          message: 'Conversation not found'
        });
      }

      const isParticipant = isConversationParticipant(conversation, socket.user.userId);

      if (!isParticipant) {
        return socket.emit('message_error', {
          message: 'Access denied. You are not a participant in this conversation'
        });
      }

      if (!canSendInConversation(conversation, socket.user.role)) {
        return socket.emit('message_error', {
          message: 'Employees cannot send messages in announcement channels'
        });
      }

      if (replyTo) {
        const parent = await Message.findOne({ _id: replyTo, conversationId });
        if (!parent) {
          return socket.emit('message_error', {
            message: 'Reply target message not found'
          });
        }
      }

      const message = await Message.create({
        conversationId,
        senderId: socket.user.userId,
        content,
        replyTo,
        mentions: parseMentionUserIds(mentions, conversation),
        statusByUser: buildInitialStatus(conversation, socket.user.userId)
      });

      conversation.updatedAt = new Date();
      await conversation.save();

      const populatedMessage = await Message.findById(message._id)
        .populate('senderId', 'name email role')
        .populate('replyTo', 'content senderId createdAt isDeletedForEveryone');

      // Emit to all participants in the conversation
      io.to(`conversation_${conversationId}`).emit('receive_message', {
        conversationId,
        message: populatedMessage
      });

      // Acknowledge to sender
      socket.emit('message_sent', {
        message: populatedMessage
      });
    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('message_error', {
        message: 'Failed to send message'
      });
    }
  });

  socket.on('typing_start', async (data) => {
    try {
      const { conversationId } = data;
      if (!conversationId) return;

      const conversation = await Conversation.findById(conversationId);
      if (!conversation || !isConversationParticipant(conversation, socket.user.userId)) {
        return;
      }

      socket.to(`conversation_${conversationId}`).emit('typing_start', {
        conversationId,
        userId: socket.user.userId,
        name: socket.user.name,
      });
    } catch (error) {
      console.error('Typing start error:', error);
    }
  });

  socket.on('typing_stop', async (data) => {
    try {
      const { conversationId } = data;
      if (!conversationId) return;

      const conversation = await Conversation.findById(conversationId);
      if (!conversation || !isConversationParticipant(conversation, socket.user.userId)) {
        return;
      }

      socket.to(`conversation_${conversationId}`).emit('typing_stop', {
        conversationId,
        userId: socket.user.userId,
        name: socket.user.name,
      });
    } catch (error) {
      console.error('Typing stop error:', error);
    }
  });

  socket.on('edit_message', async (data) => {
    try {
      const { messageId, content, mentions = [] } = data;
      if (!messageId || !content) {
        return socket.emit('message_error', { message: 'Message ID and content are required' });
      }

      const message = await Message.findById(messageId);
      if (!message) {
        return socket.emit('message_error', { message: 'Message not found' });
      }

      const conversation = await Conversation.findById(message.conversationId);
      if (!conversation || !isConversationParticipant(conversation, socket.user.userId)) {
        return socket.emit('message_error', { message: 'Access denied' });
      }

      if (message.senderId.toString() !== socket.user.userId.toString()) {
        return socket.emit('message_error', { message: 'You can only edit your own messages' });
      }

      message.content = content.trim();
      message.mentions = parseMentionUserIds(mentions, conversation);
      message.editedAt = new Date();
      await message.save();

      const populatedMessage = await Message.findById(message._id)
        .populate('senderId', 'name email role')
        .populate('replyTo', 'content senderId createdAt isDeletedForEveryone');

      io.to(`conversation_${conversation._id}`).emit('message_updated', {
        conversationId: conversation._id.toString(),
        message: populatedMessage,
      });
    } catch (error) {
      console.error('Edit message socket error:', error);
      socket.emit('message_error', { message: 'Failed to edit message' });
    }
  });

  socket.on('delete_message', async (data) => {
    try {
      const { messageId, scope = 'me' } = data;
      if (!messageId) {
        return socket.emit('message_error', { message: 'Message ID is required' });
      }

      const message = await Message.findById(messageId);
      if (!message) {
        return socket.emit('message_error', { message: 'Message not found' });
      }

      const conversation = await Conversation.findById(message.conversationId);
      if (!conversation || !isConversationParticipant(conversation, socket.user.userId)) {
        return socket.emit('message_error', { message: 'Access denied' });
      }

      if (scope === 'everyone') {
        const isOwner = message.senderId.toString() === socket.user.userId.toString();
        const isModerator = ANNOUNCEMENT_ALLOWED_ROLES.includes(socket.user.role);

        if (!isOwner && !isModerator) {
          return socket.emit('message_error', { message: 'Not allowed to delete for everyone' });
        }

        message.isDeletedForEveryone = true;
        message.content = '';
        message.reactions = [];
        message.editedAt = new Date();
        await message.save();

        io.to(`conversation_${conversation._id}`).emit('message_deleted', {
          conversationId: conversation._id.toString(),
          messageId: message._id.toString(),
          scope: 'everyone',
        });
      } else {
        if (!message.deletedForUsers.some((id) => id.toString() === socket.user.userId.toString())) {
          message.deletedForUsers.push(socket.user.userId);
          await message.save();
        }

        socket.emit('message_deleted', {
          conversationId: conversation._id.toString(),
          messageId: message._id.toString(),
          scope: 'me',
        });
      }
    } catch (error) {
      console.error('Delete message socket error:', error);
      socket.emit('message_error', { message: 'Failed to delete message' });
    }
  });

  socket.on('react_message', async (data) => {
    try {
      const { messageId, emoji } = data;
      if (!messageId || !emoji) {
        return socket.emit('message_error', { message: 'Message ID and emoji are required' });
      }

      const message = await Message.findById(messageId);
      if (!message) {
        return socket.emit('message_error', { message: 'Message not found' });
      }

      const conversation = await Conversation.findById(message.conversationId);
      if (!conversation || !isConversationParticipant(conversation, socket.user.userId)) {
        return socket.emit('message_error', { message: 'Access denied' });
      }

      const existingReactionIndex = message.reactions.findIndex(
        (reaction) =>
          reaction.userId.toString() === socket.user.userId.toString() &&
          reaction.emoji === emoji
      );

      if (existingReactionIndex >= 0) {
        message.reactions.splice(existingReactionIndex, 1);
      } else {
        message.reactions.push({ emoji, userId: socket.user.userId });
      }

      await message.save();

      const populatedMessage = await Message.findById(message._id)
        .populate('senderId', 'name email role')
        .populate('reactions.userId', 'name email role')
        .populate('replyTo', 'content senderId createdAt isDeletedForEveryone');

      io.to(`conversation_${conversation._id}`).emit('reaction_updated', {
        conversationId: conversation._id.toString(),
        message: populatedMessage,
      });
    } catch (error) {
      console.error('React message socket error:', error);
      socket.emit('message_error', { message: 'Failed to update reaction' });
    }
  });

  // ===== Dashboard Real-Time Events =====
  
  socket.on('statusChange', (data) => {
    try {
      const { status } = data;
      // Broadcast status change to all connected clients
      io.emit('statusUpdated', {
        userId: socket.user.userId,
        status,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Status change error:', error);
    }
  });

  socket.on('workModeChange', (data) => {
    try {
      const { mode } = data;
      // Broadcast work mode change to all connected clients
      io.emit('workModeUpdated', {
        userId: socket.user.userId,
        mode,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Work mode change error:', error);
    }
  });

  socket.on('attendanceMarked', (data) => {
    try {
      const { type, timestamp } = data;
      // Broadcast attendance update to all connected clients
      io.emit('attendanceUpdated', {
        userId: socket.user.userId,
        type,
        timestamp: timestamp || new Date()
      });
    } catch (error) {
      console.error('Attendance marked error:', error);
    }
  });

  socket.on('activeTimeUpdate', (data) => {
    try {
      const { time } = data;
      // Broadcast active time update to all connected clients
      io.emit('activeTimeUpdated', {
        userId: socket.user.userId,
        time,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Active time update error:', error);
    }
  });

  socket.on('teamOnlineUpdate', (data) => {
    try {
      const { count, members } = data;
      // Broadcast team online count to all connected clients
      io.emit('teamOnlineUpdated', {
        userId: socket.user.userId,
        count,
        members: members || [],
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Team online update error:', error);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.user.userId);
    
    // Remove from online users
    onlineUsers.delete(socket.user.userId);
    
    // Broadcast updated online count
    io.emit('onlineUsersCount', onlineUsers.size);
    
    socket.broadcast.emit('user_offline', {
      userId: socket.user.userId,
      name: socket.user.name
    });
  });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/leave', require('./routes/leave'));
app.use('/api/broadcast', require('./routes/broadcast'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/chat', require('./routes/chat'));
// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

