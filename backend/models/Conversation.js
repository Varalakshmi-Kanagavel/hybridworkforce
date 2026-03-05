const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['direct', 'group', 'announcement'],
    },
    name: {
      type: String,
      trim: true,
    },
    participants: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
      required: true,
      validate: {
        validator: function(v) {
          return v && v.length >= 2;
        },
        message: 'Conversation must have at least two participants'
      }
    },
    department: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    admins: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
    icon: {
      type: String,
      trim: true,
      default: null,
    },
    pinnedMessages: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Message',
      default: [],
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    lockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    lockedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

conversationSchema.index({ participants: 1, updatedAt: -1 });
conversationSchema.index({ type: 1, updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
