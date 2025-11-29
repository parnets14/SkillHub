const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ['user', 'provider'],
      required: true,
    },
    duration: {
      type: Number,
      required: true, // in days
    },
    price: {
      type: Number,
      required: true,
    },
    features: {
      // User features
      unlimitedChat: { type: Boolean, default: false },
      audioVideoDiscount: { type: Number, default: 0 }, // percentage
      prioritySupport: { type: Boolean, default: false },
      highlightedProfile: { type: Boolean, default: false },
      unlimitedProfileSearch: { type: Boolean, default: false },
      
      // Provider features
      premiumVisibility: { type: Boolean, default: false },
      zeroCommission: { type: Boolean, default: false },
      analyticsDashboard: { type: Boolean, default: false },
      featuredBadge: { type: Boolean, default: false },
      commissionRate: { type: Number, default: null }, // custom commission rate if not zero
    },
    description: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Subscription', SubscriptionSchema);

