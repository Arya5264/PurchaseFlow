const User = require('../models/User');
const { logAudit } = require('../services/auditService');

// @desc   Get all users with search, filtering, and pagination
// @route  GET /api/users
// @access Private (Admin)
const getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = {};

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [{ name: searchRegex }, { email: searchRegex }];
    }

    if (req.query.role) {
      query.role = req.query.role;
    }

    if (req.query.status !== undefined && req.query.status !== '') {
      query.isActive = req.query.status === 'active' || req.query.status === 'true';
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .populate('vendorId', 'name vendorCode')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: users.map((u) => u.toSafeObject()),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Get single user by ID
// @route  GET /api/users/:id
// @access Private (Admin)
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate('vendorId');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    res.status(200).json({
      success: true,
      data: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Create user by Admin
// @route  POST /api/users
// @access Private (Admin)
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, vendorId, isActive } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, and role are required.',
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email address already exists.',
      });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase().trim(),
      passwordHash: password,
      role,
      vendorId: vendorId || null,
      isActive: isActive !== undefined ? isActive : true,
    });

    await logAudit({
      userId: req.user._id,
      action: 'CREATE_USER',
      entityType: 'User',
      entityId: user._id,
      description: `Admin created user ${user.email} (${user.role}).`,
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully.',
      data: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Update user details
// @route  PUT /api/users/:id
// @access Private (Admin)
const updateUser = async (req, res, next) => {
  try {
    const { name, role, vendorId, isActive, password } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    if (name) user.name = name;
    if (role) user.role = role;
    if (vendorId !== undefined) user.vendorId = vendorId || null;
    if (isActive !== undefined) user.isActive = isActive;
    if (password) user.passwordHash = password;

    await user.save();

    await logAudit({
      userId: req.user._id,
      action: 'UPDATE_USER',
      entityType: 'User',
      entityId: user._id,
      description: `Admin updated user details for ${user.email}.`,
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'User updated successfully.',
      data: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Toggle user active status
// @route  PATCH /api/users/:id/status
// @access Private (Admin)
const toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Prevent admin from deactivating themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account.',
      });
    }

    user.isActive = req.body.isActive !== undefined ? req.body.isActive : !user.isActive;
    await user.save();

    await logAudit({
      userId: req.user._id,
      action: user.isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
      entityType: 'User',
      entityId: user._id,
      description: `Admin ${user.isActive ? 'activated' : 'deactivated'} user ${user.email}.`,
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully.`,
      data: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Delete user
// @route  DELETE /api/users/:id
// @access Private (Admin)
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account.',
      });
    }

    await User.findByIdAndDelete(req.params.id);

    await logAudit({
      userId: req.user._id,
      action: 'DELETE_USER',
      entityType: 'User',
      entityId: user._id,
      description: `Admin deleted user ${user.email}.`,
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'User deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser,
};
