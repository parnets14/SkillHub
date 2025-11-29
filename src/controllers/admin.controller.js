const { User, Consultation, Transaction, Review, Withdrawal, Category, Banner, Settings } = require('../models');
const { AppError } = require('../middlewares/errorHandler');
const mongoose = require('mongoose');

// @desc    Get admin dashboard stats
// @route   GET /api/admin/dashboard
// @access  Private/Admin
const getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Total users
    const totalUsers = await User.countDocuments();
    const newUsersToday = await User.countDocuments({ createdAt: { $gte: today } });

    // Total providers
    const totalProviders = await User.countDocuments({ isServiceProvider: true });

    // Consultations
    const totalConsultations = await Consultation.countDocuments({ status: 'completed' });
    const consultationsToday = await Consultation.countDocuments({
      status: 'completed',
      endTime: { $gte: today },
    });

    // Revenue
    const revenueData = await Transaction.aggregate([
      { $match: { category: 'consultation', status: 'completed' } },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);
    const totalRevenue = revenueData[0]?.total || 0;

    const todayRevenueData = await Transaction.aggregate([
      {
        $match: {
          category: 'consultation',
          status: 'completed',
          createdAt: { $gte: today },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);
    const todayRevenue = todayRevenueData[0]?.total || 0;

    // Pending withdrawals
    const pendingWithdrawals = await Withdrawal.countDocuments({ status: 'pending' });

    res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          newToday: newUsersToday,
        },
        providers: {
          total: totalProviders,
        },
        consultations: {
          total: totalConsultations,
          today: consultationsToday,
        },
        revenue: {
          total: totalRevenue,
          today: todayRevenue,
        },
        pendingWithdrawals,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, status } = req.query;

    const query = {};
    if (role === 'provider') query.isServiceProvider = true;
    if (status) query.status = status;

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user status
// @route   PUT /api/admin/users/:id/status
// @access  Private/Admin
const updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    res.status(200).json({
      success: true,
      message: 'User status updated',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Aadhar
// @route   PUT /api/admin/users/:id/verify-aadhar
// @access  Private/Admin
const verifyAadhar = async (req, res, next) => {
  try {
    const { verified } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isAadharVerified: verified },
      { new: true }
    );

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    res.status(200).json({
      success: true,
      message: `Aadhar ${verified ? 'verified' : 'unverified'}`,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all withdrawals
// @route   GET /api/admin/withdrawals
// @access  Private/Admin
const getAllWithdrawals = async (req, res, next) => {
  try {
    const withdrawals = await Withdrawal.find()
      .populate('user', 'fullName mobile')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: withdrawals,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Process withdrawal
// @route   PUT /api/admin/withdrawals/:id/process
// @access  Private/Admin
const processWithdrawal = async (req, res, next) => {
  try {
    const { status, rejectionReason } = req.body;

    const withdrawal = await Withdrawal.findById(req.params.id).populate('user');
    if (!withdrawal) {
      return next(new AppError('Withdrawal not found', 404));
    }

    withdrawal.status = status;
    if (status === 'rejected') {
      withdrawal.rejectionReason = rejectionReason;
      // Refund amount to user wallet
      const user = await User.findById(withdrawal.user);
      if (user) {
        user.wallet += withdrawal.amount;
        await user.save();
      }
    } else if (status === 'completed') {
      withdrawal.approvedAt = new Date();
      withdrawal.transactionId = `TXN-${Date.now()}`;
    }

    await withdrawal.save();

    res.status(200).json({
      success: true,
      message: `Withdrawal ${status}`,
      data: withdrawal,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all reviews
// @route   GET /api/admin/reviews
// @access  Private/Admin
const getAllReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find()
      .populate('user', 'fullName')
      .populate('provider', 'fullName')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Moderate review
// @route   PUT /api/admin/reviews/:id/moderate
// @access  Private/Admin
const moderateReview = async (req, res, next) => {
  try {
    const { status } = req.body;

    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!review) {
      return next(new AppError('Review not found', 404));
    }

    res.status(200).json({
      success: true,
      message: `Review ${status}`,
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get analytics
// @route   GET /api/admin/analytics
// @access  Private/Admin
const getAnalytics = async (req, res, next) => {
  try {
    // Monthly revenue for last 12 months
    const monthlyRevenue = await Transaction.aggregate([
      {
        $match: {
          category: 'consultation',
          status: 'completed',
          createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        monthlyRevenue,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get monetization overview
// @route   GET /api/admin/monetization
// @access  Private/Admin
const getMonetizationOverview = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Commission revenue from consultations
    const commissionRevenue = await Transaction.aggregate([
      {
        $match: {
          category: 'consultation',
          status: 'completed',
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Subscription revenue
    const subscriptionRevenue = await Transaction.aggregate([
      {
        $match: {
          category: 'subscription',
          status: 'completed',
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Wallet recharge fees
    const walletRevenue = await Transaction.aggregate([
      {
        $match: {
          category: 'wallet_recharge',
          status: 'completed',
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Get settings for commission rates
    const commissionSetting = await Settings.findOne({ key: 'platformCommission' });
    const walletFeeSetting = await Settings.findOne({ key: 'walletRechargeFee' });

    res.status(200).json({
      success: true,
      data: {
        commission: {
          revenue: commissionRevenue[0]?.total || 0,
          transactions: commissionRevenue[0]?.count || 0,
          rate: commissionSetting?.value || 0,
        },
        subscriptions: {
          revenue: subscriptionRevenue[0]?.total || 0,
          count: subscriptionRevenue[0]?.count || 0,
        },
        walletRecharges: {
          revenue: walletRevenue[0]?.total || 0,
          count: walletRevenue[0]?.count || 0,
          feePercentage: walletFeeSetting?.value || 0,
        },
        totalRevenue:
          (commissionRevenue[0]?.total || 0) +
          (subscriptionRevenue[0]?.total || 0) +
          (walletRevenue[0]?.total || 0),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get settings
// @route   GET /api/admin/settings
// @access  Private/Admin
const getSettings = async (req, res, next) => {
  try {
    const settings = await Settings.find();
    const settingsMap = {};

    settings.forEach(setting => {
      settingsMap[setting.key] = {
        value: setting.value,
        type: setting.type,
        description: setting.description,
      };
    });

    res.status(200).json({
      success: true,
      data: settingsMap,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update settings
// @route   PUT /api/admin/settings
// @access  Private/Admin
const updateSettings = async (req, res, next) => {
  try {
    const updates = req.body;

    for (const [key, value] of Object.entries(updates)) {
      await Settings.findOneAndUpdate(
        { key },
        { value },
        { upsert: true }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Settings updated',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getAllUsers,
  updateUserStatus,
  verifyAadhar,
  getAllWithdrawals,
  processWithdrawal,
  getAllReviews,
  moderateReview,
  getAnalytics,
  getSettings,
  updateSettings,
  getMonetizationOverview,
};

