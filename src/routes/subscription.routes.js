const express = require('express');
const {
  getSubscriptions,
  purchaseSubscription,
  getMySubscription,
  cancelSubscription,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  getSubscriptionRevenue,
  getActiveSubscribers,
} = require('../controllers/subscription.controller');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// Public routes
router.get('/', getSubscriptions);

// Private routes
router.use(protect);
router.post('/purchase', purchaseSubscription);
router.get('/my-subscription', getMySubscription);
router.post('/cancel', cancelSubscription);

// Admin routes
router.post('/admin/create', authorize('admin'), createSubscriptionPlan);
router.put('/admin/:id', authorize('admin'), updateSubscriptionPlan);
router.delete('/admin/:id', authorize('admin'), deleteSubscriptionPlan);
router.get('/admin/revenue', authorize('admin'), getSubscriptionRevenue);
router.get('/admin/subscribers', authorize('admin'), getActiveSubscribers);

module.exports = router;

