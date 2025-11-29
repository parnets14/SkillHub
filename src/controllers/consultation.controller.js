const { Consultation, User, Transaction, Notification } = require('../models');
const { AppError } = require('../middlewares/errorHandler');

// @desc    Create consultation booking
// @route   POST /api/consultations
// @access  Private
const createConsultation = async (req, res, next) => {
  try {
    const { providerId, type } = req.body;

    if (!providerId || !type) {
      return next(new AppError('Provider ID and consultation type are required', 400));
    }

    const provider = await User.findById(providerId);
    if (!provider || !provider.isServiceProvider) {
      return next(new AppError('Provider not found', 404));
    }

    // Check if consultation mode is enabled
    if (!provider.consultationModes?.[type]) {
      return next(new AppError(`${type} consultation is not available for this provider`, 400));
    }

    // Get rate
    const rate = provider.rates?.[type] || 0;

    // Check user wallet balance
    const user = await User.findById(req.user?._id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    if (user.wallet < rate) {
      return next(new AppError('Insufficient wallet balance', 400));
    }

    // Create consultation
    const consultation = await Consultation.create({
      user: req.user?._id,
      provider: providerId,
      type,
      rate,
      status: 'pending',
    });

    // Create notification for provider
    await Notification.create({
      user: providerId,
      title: 'New Consultation Request',
      message: `New ${type} consultation request from ${user.fullName}`,
      type: 'consultation',
      data: { consultationId: consultation._id },
    });

    res.status(201).json({
      success: true,
      message: 'Consultation request sent successfully',
      data: consultation,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get consultation by ID
// @route   GET /api/consultations/:id
// @access  Private
const getConsultation = async (req, res, next) => {
  try {
    const consultation = await Consultation.findById(req.params.id)
      .populate('user', 'fullName profilePhoto')
      .populate('provider', 'fullName profilePhoto rates');

    if (!consultation) {
      return next(new AppError('Consultation not found', 404));
    }

    // Check if user is part of consultation
    if (
      consultation.user.toString() !== req.user?._id.toString() &&
      consultation.provider.toString() !== req.user?._id.toString()
    ) {
      return next(new AppError('Not authorized', 403));
    }

    res.status(200).json({
      success: true,
      data: consultation,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's consultations
// @route   GET /api/consultations
// @access  Private
const getMyConsultations = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    const query = {
      $or: [{ user: req.user?._id }, { provider: req.user?._id }],
    };

    if (status) {
      query.status = status;
    }

    const consultations = await Consultation.find(query)
      .populate('user', 'fullName profilePhoto')
      .populate('provider', 'fullName profilePhoto')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await Consultation.countDocuments(query);

    res.status(200).json({
      success: true,
      data: consultations,
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

// @desc    Get consultation history
// @route   GET /api/consultations/history
// @access  Private
const getConsultationHistory = async (req, res, next) => {
  try {
    const consultations = await Consultation.find({
      $or: [{ user: req.user?._id }, { provider: req.user?._id }],
      status: 'completed',
    })
      .populate('user', 'fullName profilePhoto')
      .populate('provider', 'fullName profilePhoto')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      data: consultations,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Start consultation
// @route   PUT /api/consultations/:id/start
// @access  Private
const startConsultation = async (req, res, next) => {
  try {
    const consultation = await Consultation.findById(req.params.id);

    if (!consultation) {
      return next(new AppError('Consultation not found', 404));
    }

    // Only provider can start consultation
    if (consultation.provider.toString() !== req.user?._id.toString()) {
      return next(new AppError('Not authorized', 403));
    }

    consultation.status = 'ongoing';
    consultation.startTime = new Date();
    await consultation.save();

    res.status(200).json({
      success: true,
      message: 'Consultation started',
      data: consultation,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    End consultation
// @route   PUT /api/consultations/:id/end
// @access  Private
const endConsultation = async (req, res, next) => {
  try {
    const consultation = await Consultation.findById(req.params.id);

    if (!consultation) {
      return next(new AppError('Consultation not found', 404));
    }

    // Either party can end consultation
    if (
      consultation.user.toString() !== req.user?._id.toString() &&
      consultation.provider.toString() !== req.user?._id.toString()
    ) {
      return next(new AppError('Not authorized', 403));
    }

    consultation.status = 'completed';
    consultation.endTime = new Date();

    // Calculate duration and amount
    if (consultation.startTime) {
      const duration = Math.ceil(
        (consultation.endTime.getTime() - consultation.startTime.getTime()) / (1000 * 60)
      );
      consultation.duration = duration;
      consultation.totalAmount = duration * consultation.rate;

      // Transfer money to provider
      const user = await User.findById(consultation.user);
      const provider = await User.findById(consultation.provider);

      if (user && provider) {
        user.wallet -= consultation.totalAmount;
        provider.earnings += consultation.totalAmount;

        await user.save();
        await provider.save();

        // Create transaction
        await Transaction.create({
          user: consultation.user,
          type: 'debit',
          category: 'consultation',
          amount: consultation.totalAmount,
          balanceBefore: user.wallet + consultation.totalAmount,
          balanceAfter: user.wallet,
          status: 'completed',
          description: `${consultation.type} consultation with ${provider.fullName}`,
        });
      }
    }

    await consultation.save();

    res.status(200).json({
      success: true,
      message: 'Consultation ended',
      data: consultation,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel consultation
// @route   PUT /api/consultations/:id/cancel
// @access  Private
const cancelConsultation = async (req, res, next) => {
  try {
    const consultation = await Consultation.findById(req.params.id);

    if (!consultation) {
      return next(new AppError('Consultation not found', 404));
    }

    // Only user can cancel pending consultations
    if (consultation.user.toString() !== req.user?._id.toString()) {
      return next(new AppError('Not authorized', 403));
    }

    if (consultation.status !== 'pending') {
      return next(new AppError('Cannot cancel ongoing or completed consultations', 400));
    }

    consultation.status = 'cancelled';
    await consultation.save();

    res.status(200).json({
      success: true,
      message: 'Consultation cancelled',
      data: consultation,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createConsultation,
  getConsultation,
  getMyConsultations,
  startConsultation,
  endConsultation,
  cancelConsultation,
  getConsultationHistory,
};

