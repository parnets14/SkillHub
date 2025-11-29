const { Review, Consultation, User } = require('../models');
const { AppError } = require('../middlewares/errorHandler');

// @desc    Create review
// @route   POST /api/reviews
// @access  Private
const createReview = async (req, res, next) => {
  try {
    const { consultationId, rating, review, tags } = req.body;

    if (!consultationId || !rating) {
      return next(new AppError('Consultation ID and rating are required', 400));
    }

    if (rating < 1 || rating > 5) {
      return next(new AppError('Rating must be between 1 and 5', 400));
    }

    const consultation = await Consultation.findById(consultationId);
    if (!consultation) {
      return next(new AppError('Consultation not found', 404));
    }

    // Check if user was part of the consultation
    if (consultation.user.toString() !== req.user?._id.toString()) {
      return next(new AppError('You can only review your own consultations', 403));
    }

    // Check if consultation is completed
    if (consultation.status !== 'completed') {
      return next(new AppError('Can only review completed consultations', 400));
    }

    // Check if review already exists
    const existingReview = await Review.findOne({ consultation: consultationId });
    if (existingReview) {
      return next(new AppError('Review already exists for this consultation', 400));
    }

    // Create review
    const newReview = await Review.create({
      consultation: consultationId,
      user: req.user?._id,
      provider: consultation.provider,
      rating,
      review,
      tags: tags || [],
    });

    // Update provider rating
    const provider = await User.findById(consultation.provider);
    if (provider) {
      const totalRating = provider.rating.average * provider.rating.count + rating;
      provider.rating.count += 1;
      provider.rating.average = totalRating / provider.rating.count;
      await provider.save();
    }

    // Update consultation rating
    consultation.rating = {
      stars: rating,
      review,
      tags: tags || [],
    };
    await consultation.save();

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: newReview,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get reviews for a provider
// @route   GET /api/reviews/provider/:providerId
// @access  Public
const getProviderReviews = async (req, res, next) => {
  try {
    const { providerId } = req.params;
    const { page = 1, limit = 20, rating } = req.query;

    const query = {
      provider: providerId,
      status: 'active',
    };

    if (rating) {
      query.rating = parseInt(rating);
    }

    const reviews = await Review.find(query)
      .populate('user', 'fullName profilePhoto')
      .populate('consultation', 'type duration')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await Review.countDocuments(query);

    // Get rating breakdown
    const ratingBreakdown = await Review.aggregate([
      { $match: { provider: providerId, status: 'active' } },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: reviews,
      ratingBreakdown,
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

// @desc    Report review
// @route   POST /api/reviews/:id/report
// @access  Private
const reportReview = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const { id } = req.params;

    if (!reason) {
      return next(new AppError('Report reason is required', 400));
    }

    const review = await Review.findById(id);
    if (!review) {
      return next(new AppError('Review not found', 404));
    }

    review.isReported = true;
    review.reportReason = reason;
    await review.save();

    res.status(200).json({
      success: true,
      message: 'Review reported successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete review
// @route   DELETE /api/reviews/:id
// @access  Private
const deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return next(new AppError('Review not found', 404));
    }

    // Check if user owns the review
    if (review.user.toString() !== req.user?._id.toString()) {
      return next(new AppError('Not authorized to delete this review', 403));
    }

    review.status = 'deleted';
    await review.save();

    // Update provider rating
    const provider = await User.findById(review.provider);
    if (provider && provider.rating.count > 0) {
      const totalRating = provider.rating.average * provider.rating.count - review.rating;
      provider.rating.count -= 1;
      provider.rating.average = provider.rating.count > 0 ? totalRating / provider.rating.count : 0;
      await provider.save();
    }

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReview,
  getProviderReviews,
  reportReview,
  deleteReview,
};

