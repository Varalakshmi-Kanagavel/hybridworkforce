const mongoose = require('mongoose');

const leaveBalanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  casualLeave: {
    total: {
      type: Number,
      default: 12
    },
    used: {
      type: Number,
      default: 0
    }
  },
  sickLeave: {
    total: {
      type: Number,
      default: 6
    },
    used: {
      type: Number,
      default: 0
    }
  },
  wfhDays: {
    total: {
      type: Number,
      default: 24
    },
    used: {
      type: Number,
      default: 0
    }
  },
  year: {
    type: Number,
    default: () => new Date().getFullYear(),
    required: true
  }
}, {
  timestamps: true
});

// Compound index for unique user-year combination
leaveBalanceSchema.index({ userId: 1, year: 1 }, { unique: true });

// Virtual for remaining balances
leaveBalanceSchema.virtual('remainingCasual').get(function() {
  return Math.max(0, this.casualLeave.total - this.casualLeave.used);
});

leaveBalanceSchema.virtual('remainingSick').get(function() {
  return Math.max(0, this.sickLeave.total - this.sickLeave.used);
});

leaveBalanceSchema.virtual('remainingWFH').get(function() {
  return Math.max(0, this.wfhDays.total - this.wfhDays.used);
});

// Include virtuals in JSON output
leaveBalanceSchema.set('toJSON', { virtuals: true });

// Static method to get or create balance for user
leaveBalanceSchema.statics.getOrCreateBalance = async function(userId, year = new Date().getFullYear()) {
  let balance = await this.findOne({ userId, year });
  
  if (!balance) {
    balance = await this.create({ userId, year });
  }
  
  return balance;
};

// Instance method to check if sufficient balance exists
leaveBalanceSchema.methods.hasValidBalance = function(leaveType, days) {
  switch (leaveType.toLowerCase()) {
    case 'casual':
      return this.remainingCasual >= days;
    case 'sick':
      return this.remainingSick >= days;
    case 'wfh':
      return this.remainingWFH >= days;
    default:
      return false;
  }
};

// Instance method to deduct balance
leaveBalanceSchema.methods.deductBalance = async function(leaveType, days) {
  switch (leaveType.toLowerCase()) {
    case 'casual':
      if (this.remainingCasual >= days) {
        this.casualLeave.used += days;
        await this.save();
        return true;
      }
      return false;
    case 'sick':
      if (this.remainingSick >= days) {
        this.sickLeave.used += days;
        await this.save();
        return true;
      }
      return false;
    case 'wfh':
      if (this.remainingWFH >= days) {
        this.wfhDays.used += days;
        await this.save();
        return true;
      }
      return false;
    default:
      return false;
  }
};

// Instance method to restore balance (for rejected leaves)
leaveBalanceSchema.methods.restoreBalance = async function(leaveType, days) {
  switch (leaveType.toLowerCase()) {
    case 'casual':
      this.casualLeave.used = Math.max(0, this.casualLeave.used - days);
      break;
    case 'sick':
      this.sickLeave.used = Math.max(0, this.sickLeave.used - days);
      break;
    case 'wfh':
      this.wfhDays.used = Math.max(0, this.wfhDays.used - days);
      break;
  }
  await this.save();
};

module.exports = mongoose.model('LeaveBalance', leaveBalanceSchema);