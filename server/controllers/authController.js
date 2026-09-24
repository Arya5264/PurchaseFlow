const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { logAudit } = require('../services/auditService');

const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET || 'supersecret_purchaseflow_jwt_key_2026_production_academic_secure',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// @desc   Authenticate user & return token
// @route  POST /api/auth/login
// @access Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .select('+passwordHash')
      .populate('vendorId');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact an administrator.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const token = generateToken(user._id, user.role);

    await logAudit({
      userId: user._id,
      action: 'LOGIN',
      entityType: 'User',
      entityId: user._id,
      description: `User ${user.email} (${user.role}) logged in successfully.`,
      ipAddress: req.ip || req.connection.remoteAddress,
    });

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        user: user.toSafeObject(),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Register a new user
// @route  POST /api/auth/register
// @access Public (or Admin)
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, vendorId } = req.body;

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
      isActive: true,
    });

    const token = generateToken(user._id, user.role);

    await logAudit({
      userId: user._id,
      action: 'REGISTER',
      entityType: 'User',
      entityId: user._id,
      description: `New user ${user.email} registered with role ${user.role}.`,
      ipAddress: req.ip || req.connection.remoteAddress,
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      data: {
        token,
        user: user.toSafeObject(),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Get authenticated user profile
// @route  GET /api/auth/me
// @access Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('vendorId');
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

module.exports = { login, register, getMe };
