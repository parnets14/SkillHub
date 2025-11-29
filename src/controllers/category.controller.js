const { Category } = require('../models');
const { AppError } = require('../middlewares/errorHandler');

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
const getCategories = async (req, res, next) => {
  try {
    const { parent } = req.query;

    const query = { isActive: true };
    if (parent) {
      query.parent = parent;
    } else {
      query.parent = { $exists: false };
    }

    const categories = await Category.find(query)
      .populate('parent')
      .sort({ order: 1, name: 1 });

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get category by ID
// @route   GET /api/categories/:id
// @access  Public
const getCategoryById = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id).populate('parent');

    if (!category) {
      return next(new AppError('Category not found', 404));
    }

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create category
// @route   POST /api/categories
// @access  Private/Admin
const createCategory = async (req, res, next) => {
  try {
    const { name, slug, description, icon, parent, order } = req.body;

    // Check if slug already exists
    const existingCategory = await Category.findOne({ slug });
    if (existingCategory) {
      return next(new AppError('Category with this slug already exists', 400));
    }

    const category = await Category.create({
      name,
      slug,
      description,
      icon,
      parent,
      order,
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private/Admin
const updateCategory = async (req, res, next) => {
  try {
    const { name, slug, description, icon, parent, order, isActive } = req.body;

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { name, slug, description, icon, parent, order, isActive },
      { new: true, runValidators: true }
    );

    if (!category) {
      return next(new AppError('Category not found', 404));
    }

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return next(new AppError('Category not found', 404));
    }

    // Check if category has children
    const hasChildren = await Category.findOne({ parent: category._id });
    if (hasChildren) {
      return next(new AppError('Cannot delete category with sub-categories', 400));
    }

    await category.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};

