const { User, Consultation, Review, Transaction } = require('../models');
const { AppError } = require('../middlewares/errorHandler');
const { uploadToCloudinary } = require('../utils/cloudinary');

// @desc    Get user profile
// @route   GET /api/users/profile/:id
// @access  Public
const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-wallet -earnings -bankDetails')
      .populate('serviceCategories');

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Don't show hidden profiles
    if (user.isProfileHidden) {
      return next(new AppError('Profile not available', 404));
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const allowedFields = [
      'fullName',
      'email',
      'dateOfBirth',
      'gender',
      'place',
      'address',
      'profession',
      'education',
      'hobbies',
      'skills',
      'languagesKnown',
      'bio',
    ];

    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user?._id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload profile photo
// @route   POST /api/users/profile-photo
// @access  Private
const uploadProfilePhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('Please upload a file', 400));
    }

    const result = await uploadToCloudinary(req.file.path, 'skillhub/profiles');

    if (!result) {
      return next(new AppError('File upload failed', 500));
    }

    const user = await User.findByIdAndUpdate(
      req.user?._id,
      { profilePhoto: result.url },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profile photo uploaded successfully',
      data: {
        profilePhoto: result.url,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload Aadhar documents
// @route   POST /api/users/aadhar
// @access  Private
const uploadAadhar = async (req, res, next) => {
  try {
    const { aadharNumber } = req.body;
    const files = req.files;

    if (!aadharNumber) {
      return next(new AppError('Aadhar number is required', 400));
    }

    if (!files || !files.front || !files.back) {
      return next(new AppError('Please upload both front and back of Aadhar card', 400));
    }

    const frontResult = await uploadToCloudinary(files.front[0].path, 'skillhub/aadhar');
    const backResult = await uploadToCloudinary(files.back[0].path, 'skillhub/aadhar');

    if (!frontResult || !backResult) {
      return next(new AppError('File upload failed', 500));
    }

    const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
        aadharNumber,
        aadharDocuments: {
          front: frontResult.url,
          back: backResult.url,
        },
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Aadhar documents uploaded successfully. Verification pending.',
      data: {
        aadharNumber,
        aadharDocuments: user?.aadharDocuments,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Become a service provider
// @route   POST /api/users/become-provider
// @access  Private
const becomeProvider = async (req, res, next) => {
  try {
    const {
      serviceCategories,
      consultationModes,
      rates,
      availability,
    } = req.body;

    if (!serviceCategories || serviceCategories.length === 0) {
      return next(new AppError('Please select at least one service category', 400));
    }

    if (!consultationModes || (!consultationModes.chat && !consultationModes.audio && !consultationModes.video)) {
      return next(new AppError('Please enable at least one consultation mode', 400));
    }

    const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
        isServiceProvider: true,
        serviceCategories,
        consultationModes,
        rates,
        availability,
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'You are now a service provider!',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update service provider settings
// @route   PUT /api/users/provider-settings
// @access  Private
const updateProviderSettings = async (req, res, next) => {
  try {
    if (!req.user?.isServiceProvider) {
      return next(new AppError('You are not a service provider', 403));
    }

    const allowedFields = [
      'serviceCategories',
      'consultationModes',
      'rates',
      'availability',
      'portfolioMedia',
    ];

    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Provider settings updated successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle profile visibility
// @route   PUT /api/users/toggle-visibility
// @access  Private
const toggleProfileVisibility = async (req, res, next) => {
  try {
    const user = await User.findById(req.user?._id);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    user.isProfileHidden = !user.isProfileHidden;
    await user.save();

    res.status(200).json({
      success: true,
      message: `Profile is now ${user.isProfileHidden ? 'hidden' : 'visible'}`,
      data: {
        isProfileHidden: user.isProfileHidden,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user dashboard
// @route   GET /api/users/dashboard
// @access  Private
const getDashboard = async (req, res, next) => {
  try {
    const userId = req.user?._id;

    // Get upcoming consultations
    const upcomingConsultations = await Consultation.find({
      $or: [{ user: userId }, { provider: userId }],
      status: { $in: ['pending', 'ongoing'] },
    })
      .populate('user', 'fullName profilePhoto')
      .populate('provider', 'fullName profilePhoto')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get recent transactions
    const recentTransactions = await Transaction.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(10);

    // Get stats
    const totalConsultations = await Consultation.countDocuments({
      $or: [{ user: userId }, { provider: userId }],
      status: 'completed',
    });

    const totalEarnings = req.user?.earnings || 0;
    const walletBalance = req.user?.wallet || 0;

    // Get rating summary for providers
    let ratingSummary = null;
    if (req.user?.isServiceProvider) {
      const reviews = await Review.find({ provider: userId, status: 'active' });
      ratingSummary = {
        average: req.user.rating.average,
        count: req.user.rating.count,
        breakdown: {
          5: reviews.filter(r => r.rating === 5).length,
          4: reviews.filter(r => r.rating === 4).length,
          3: reviews.filter(r => r.rating === 3).length,
          2: reviews.filter(r => r.rating === 2).length,
          1: reviews.filter(r => r.rating === 1).length,
        },
      };
    }

    res.status(200).json({
      success: true,
      data: {
        upcomingConsultations,
        recentTransactions,
        stats: {
          totalConsultations,
          totalEarnings,
          walletBalance,
        },
        ratingSummary,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update bank details
// @route   PUT /api/users/bank-details
// @access  Private
const updateBankDetails = async (req, res, next) => {
  try {
    const { accountNumber, ifscCode, accountHolderName, bankName } = req.body;

    if (!accountNumber || !ifscCode || !accountHolderName || !bankName) {
      return next(new AppError('All bank details are required', 400));
    }

    const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
        bankDetails: {
          accountNumber,
          ifscCode,
          accountHolderName,
          bankName,
        },
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Bank details updated successfully',
      data: {
        bankDetails: user?.bankDetails,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search service providers
// @route   GET /api/users/search
// @access  Public
const searchProviders = async (req, res, next) => {
  try {
    const {
      skill,
      category,
      language,
      profession,
      city,
      gender,
      minRating,
      maxPrice,
      consultationType,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {
      isServiceProvider: true,
      isProfileHidden: false,
      status: 'active',
    };

    if (skill) {
      query.skills = { $in: [skill] };
    }

    if (category) {
      query.serviceCategories = category;
    }

    if (language) {
      query.languagesKnown = { $in: [language] };
    }

    if (profession) {
      query.profession = new RegExp(profession, 'i');
    }

    if (city) {
      query['place.city'] = new RegExp(city, 'i');
    }

    if (gender) {
      query.gender = gender;
    }

    if (minRating) {
      query['rating.average'] = { $gte: parseFloat(minRating) };
    }

    if (consultationType) {
      query[`consultationModes.${consultationType}`] = true;
    }

    if (maxPrice) {
      query[`rates.${consultationType || 'chat'}`] = { $lte: parseFloat(maxPrice) };
    }

    const providers = await User.find(query)
      .select('-wallet -earnings -bankDetails -password')
      .populate('serviceCategories')
      .sort({ 'rating.average': -1, isOnline: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: providers,
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

module.exports = {
  getUserProfile,
  updateProfile,
  uploadProfilePhoto,
  uploadAadhar,
  becomeProvider,
  updateProviderSettings,
  toggleProfileVisibility,
  getDashboard,
  updateBankDetails,
  searchProviders,
};

