const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const TransactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      unique: true,
      default: () => `TXN-${uuidv4().substring(0, 12).toUpperCase()}`,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['credit', 'debit'],
      required: true,
    },
    category: {
      type: String,
      enum: ['consultation', 'wallet_recharge', 'withdrawal', 'subscription', 'refund'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    balanceBefore: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'cancelled'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['phonepe', 'card', 'netbanking', 'upi'],
    },
    paymentDetails: {
      type: mongoose.Schema.Types.Mixed,
    },
    consultation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Consultation',
    },
    description: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
TransactionSchema.index({ transactionId: 1 });
TransactionSchema.index({ user: 1, createdAt: -1 });
TransactionSchema.index({ status: 1 });
TransactionSchema.index({ category: 1 });

module.exports = mongoose.model('Transaction', TransactionSchema);

