const mongoose = require('mongoose');

const BannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: String,
    image: {
      type: String,
      required: true,
    },
    link: String,
    type: {
      type: String,
      enum: ['home', 'category', 'promotional'],
      default: 'home',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    startDate: Date,
    endDate: Date,
  },
  {
    timestamps: true,
  }
);

// Index
BannerSchema.index({ type: 1, isActive: 1 });

module.exports = mongoose.model('Banner', BannerSchema);

