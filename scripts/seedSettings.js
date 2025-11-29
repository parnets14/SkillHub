const mongoose = require('mongoose');
const Settings = require('../src/models/Settings.model');
require('dotenv').config();

const defaultSettings = [
  {
    key: 'platformCommission',
    value: 10,
    type: 'number',
    description: 'Platform commission percentage on consultations',
  },
  {
    key: 'walletRechargeFee',
    value: 2,
    type: 'number',
    description: 'Fee percentage on wallet recharge transactions',
  },
  {
    key: 'minWithdrawalAmount',
    value: 500,
    type: 'number',
    description: 'Minimum amount required for withdrawal',
  },
  {
    key: 'maxWithdrawalAmount',
    value: 50000,
    type: 'number',
    description: 'Maximum amount allowed per withdrawal',
  },
  {
    key: 'featuredListingPrice',
    value: 199,
    type: 'number',
    description: 'Price for featured listing per day',
  },
];

const seedSettings = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    for (const setting of defaultSettings) {
      await Settings.findOneAndUpdate(
        { key: setting.key },
        setting,
        { upsert: true, new: true }
      );
      console.log(`Setting ${setting.key} updated`);
    }

    console.log('Settings seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding settings:', error);
    process.exit(1);
  }
};

seedSettings();
