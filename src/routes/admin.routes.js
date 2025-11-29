const express = require('express');
const {
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
} = require('../controllers/admin.controller');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect, authorize('admin'));

router.get('/dashboard', getDashboardStats);
router.get('/users', getAllUsers);
router.put('/users/:id/status', updateUserStatus);
router.put('/users/:id/verify-aadhar', verifyAadhar);
router.get('/withdrawals', getAllWithdrawals);
router.put('/withdrawals/:id/process', processWithdrawal);
router.get('/reviews', getAllReviews);
router.put('/reviews/:id/moderate', moderateReview);
router.get('/analytics', getAnalytics);
router.get('/settings', getSettings);
router.put('/settings', updateSettings);
router.get('/monetization', require('../controllers/admin.controller').getMonetizationOverview);

module.exports = router;

