const User = require('../models/User');
const { logAuditEvent } = require('../utils/auditLogger');

/**
 * Get all users with search and filter support (Admin only)
 * GET /api/users?search=&role=&isActive=
 */
const getUsers = async (req, res, next) => {
  try {
    const { search, role, isActive } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    if (role && ['Admin', 'Manager', 'Sales Executive'].includes(role)) {
      query.role = role;
    }

    if (isActive !== undefined && isActive !== '') {
      query.isActive = isActive === 'true';
    }

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .select('-failedLoginAttempts -lockoutUntil');

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single user by ID (Admin only)
 * GET /api/users/:id
 */
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new user (Admin only)
 * POST /api/users
 */
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, isActive } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required fields.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email address already exists.',
      });
    }

    const validRoles = ['Admin', 'Manager', 'Sales Executive'];
    const assignedRole = validRoles.includes(role) ? role : 'Sales Executive';

    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: assignedRole,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    logAuditEvent({
      action: 'ADMIN_CREATE_USER',
      performedBy: req.user.email,
      targetEntity: 'USER',
      details: { createdUserId: newUser._id, createdEmail: newUser.email, role: newUser.role },
      ip: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully.',
      data: newUser,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing user (Admin only)
 * PUT /api/users/:id
 */
const updateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const { name, email, role, isActive, password } = req.body;

    // Check email uniqueness if email is modified
    if (email && email.toLowerCase().trim() !== user.email) {
      const emailInUse = await User.findOne({ email: email.toLowerCase().trim() });
      if (emailInUse) {
        return res.status(409).json({
          success: false,
          message: 'Email address is already in use by another account.',
        });
      }
      user.email = email.toLowerCase().trim();
    }

    if (name) user.name = name.trim();

    // Prevent Admin from stripping their own Admin role
    if (req.user._id.toString() === user._id.toString() && role && role !== 'Admin') {
      return res.status(400).json({
        success: false,
        message: 'You cannot remove your own Admin privileges.',
      });
    }

    if (role && ['Admin', 'Manager', 'Sales Executive'].includes(role)) {
      user.role = role;
    }

    // Prevent Admin from deactivating their own account
    if (req.user._id.toString() === user._id.toString() && isActive === false) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account.',
      });
    }

    if (isActive !== undefined) {
      user.isActive = Boolean(isActive);
    }

    // Optional password reset by Admin
    if (password && password.length >= 6) {
      user.password = password; // Will be hashed by pre-save hook
    }

    await user.save();

    logAuditEvent({
      action: 'ADMIN_UPDATE_USER',
      performedBy: req.user.email,
      targetEntity: 'USER',
      details: { updatedUserId: user._id, role: user.role, isActive: user.isActive },
      ip: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'User updated successfully.',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle user active/inactive status (Admin only)
 * PATCH /api/users/:id/status
 */
const toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Prevent self-deactivation
    if (req.user._id.toString() === user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account.',
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    logAuditEvent({
      action: 'ADMIN_TOGGLE_USER_STATUS',
      performedBy: req.user.email,
      targetEntity: 'USER',
      details: { targetUserId: user._id, newStatus: user.isActive ? 'Active' : 'Deactivated' },
      ip: req.ip,
    });

    res.status(200).json({
      success: true,
      message: `User account has been ${user.isActive ? 'activated' : 'deactivated'}.`,
      data: user,
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
};
