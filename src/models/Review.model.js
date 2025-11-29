const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema(
  {
    consultation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Consultation',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    review: String,
    tags: [String],
    isReported: {
      type: Boolean,
      default: false,
    },
    reportReason: String,
    status: {
      type: String,
      enum: ['active', 'hidden', 'deleted'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
ReviewSchema.index({ provider: 1, status: 1 });
ReviewSchema.index({ consultation: 1 });

module.exports = mongoose.model('Review', ReviewSchema);

