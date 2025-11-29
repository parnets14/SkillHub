const mongoose = require('mongoose');
const Subscription = require('../src/models/Subscription.model');
require('dotenv').config();

const subscriptionPlans = [
  // User Plans
  {
    name: 'Basic User',
    type: 'user',
    duration: 30,
    price: 99,
    description: 'Perfect for occasional users',
    isPopular: false,
    displayOrder: 1,
    features: {
      unlimitedChat: false,
      audioVideoDiscount: 5,
      prioritySupport: false,
      highlightedProfile: false,
      unlimitedProfileSearch: false,
    },
  },
  {
    name: 'Premium User',
    type: 'user',
    duration: 30,
    price: 299,
    description: 'Most popular choice for regular users',
    isPopular: true,
    displayOrder: 2,
    features: {
      unlimitedChat: true,
      audioVideoDiscount: 15,
      prioritySupport: true,
      highlightedProfile: true,
      unlimitedProfileSearch: true,
    },
  },
  {
    name: 'Elite User',
    type: 'user',
    duration: 90,
    price: 799,
    description: 'Best value for power users',
    isPopular: false,
    displayOrder: 3,
    features: {
      unlimitedChat: true,
      audioVideoDiscount: 25,
      prioritySupport: true,
      highlightedProfile: true,
      unlimitedProfileSearch: true,
    },
  },

  // Provider Plans
  {
    name: 'Starter Provider',
    type: 'provider',
    duration: 30,
    price: 499,
    description: 'Get started with premium features',
    isPopular: false,
    displayOrder: 1,
    features: {
      premiumVisibility: true,
      zeroCommission: false,
      analyticsDashboard: false,
      featuredBadge: false,
      commissionRate: 8, // Reduced from default 10%
    },
  },
  {
    name: 'Professional Provider',
    type: 'provider',
    duration: 30,
    price: 999,
    description: 'Best for growing professionals',
    isPopular: true,
    displayOrder: 2,
    features: {
      premiumVisibility: true,
      zeroCommission: false,
      analyticsDashboard: true,
      featuredBadge: true,
      commissionRate: 5, // Reduced from default 10%
    },
  },
  {
    name: 'Enterprise Provider',
    type: 'provider',
    duration: 30,
    price: 1999,
    description: 'Maximum visibility and zero commission',
    isPopular: false,
    displayOrder: 3,
    features: {
      premiumVisibility: true,
      zeroCommission: true,
      analyticsDashboard: true,
      featuredBadge: true,
      commissionRate: null,
    },
  },
];

const seedSubscriptions = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing subscriptions
    await Subscription.deleteMany({});
    console.log('Cleared existing subscriptions');

    // Insert new subscriptions
    await Subscription.insertMany(subscriptionPlans);
    console.log('Subscription plans seeded successfully');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding subscriptions:', error);
    process.exit(1);
  }
};

seedSubscriptions();
