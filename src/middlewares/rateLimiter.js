const rateLimit = require('express-rate-limit');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for auth routes
const authLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'development' ? 30 * 1000 : 15 * 60 * 1000, // 30 seconds in dev, 15 minutes in prod
  max: process.env.NODE_ENV === 'development' ? 50 : 5, // 50 attempts in dev, 5 in prod
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true,
});

// OTP request limiter
const otpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 2,
  message: 'Too many OTP requests, please try again after 1 minute.',
});

// Payment limiter
const paymentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: 'Too many payment requests, please try again later.',
});

module.exports = {
  apiLimiter,
  authLimiter,
  otpLimiter,
  paymentLimiter,
};

