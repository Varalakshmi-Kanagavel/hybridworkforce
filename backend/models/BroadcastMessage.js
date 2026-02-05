const mongoose = require('mongoose');

const broadcastMessageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  teamId: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  audience: {
    type: String,
    enum: ['TEAM', 'ORG'],
    default: 'TEAM'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
broadcastMessageSchema.index({ teamId: 1, createdAt: -1 });
broadcastMessageSchema.index({ audience: 1, createdAt: -1 });

module.exports = mongoose.model('BroadcastMessage', broadcastMessageSchema);

