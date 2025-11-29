const mongoose = require('mongoose');

const WithdrawalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    fee: {
      type: Number,
      default: 0,
    },
    netAmount: {
      type: Number,
      required: true,
    },
    bankDetails: {
      accountNumber: {
        type: String,
        required: true,
      },
      ifscCode: {
        type: String,
        required: true,
      },
      accountHolderName: {
        type: String,
        required: true,
      },
      bankName: {
        type: String,
        required: true,
      },
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed'],
      default: 'pending',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
    rejectionReason: String,
    transactionId: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
WithdrawalSchema.index({ user: 1, status: 1 });
WithdrawalSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Withdrawal', WithdrawalSchema);

