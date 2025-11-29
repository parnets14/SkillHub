const express = require('express');
const {
  initiateWalletRecharge,
  paymentWebhook,
  verifyPayment,
  getWalletBalance,
  getTransactions,
  requestWithdrawal,
  getWithdrawals,
} = require('../controllers/payment.controller');
const { protect } = require('../middlewares/auth');
const { paymentLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

// Public routes
router.post('/webhook', paymentWebhook);

// Private routes
router.use(protect);
router.post('/recharge', paymentLimiter, initiateWalletRecharge);
router.get('/verify/:transactionId', verifyPayment);
router.get('/wallet', getWalletBalance);
router.get('/transactions', getTransactions);
router.post('/withdraw', requestWithdrawal);
router.get('/withdrawals', getWithdrawals);

module.exports = router;

