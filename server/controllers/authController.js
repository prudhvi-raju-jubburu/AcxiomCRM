const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const { logAuditEvent } = require('../utils/auditLogger');

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout

/**
 * Register a new user
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // Input Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid full name.',
      });
    }

    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    // Check if email already registered
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email address already exists.',
      });
    }

    // Security Rule: Public self-registration cannot elevate to Admin or Manager
    // Default all public registrations to 'Sales Executive'
    let assignedRole = 'Sales Executive';
    if (role && role !== 'Sales Executive') {
      return res.status(400).json({
        success: false,
        message: 'Self-registration with Admin or Manager roles is restricted. Contact system administrator.',
      });
    }

    // Create user (password is automatically hashed by Mongoose pre-save hook)
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: assignedRole,
      isActive: true,
    });

    const token = generateToken(user);

    logAuditEvent({
      action: 'USER_REGISTERED',
      performedBy: user.email,
      targetEntity: 'USER',
      details: { userId: user._id, role: user.role },
      ip: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Log in an existing user
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user and explicitly include password field
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      logAuditEvent({
        action: 'LOGIN_FAILED',
        performedBy: normalizedEmail,
        targetEntity: 'AUTH',
        details: { reason: 'User not found' },
        ip: req.ip,
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Check account lockout status
    if (user.isLocked()) {
      const minutesRemaining = Math.ceil(
        (new Date(user.lockoutUntil) - new Date()) / (60 * 1000)
      );
      logAuditEvent({
        action: 'LOGIN_LOCKED_ATTEMPT',
        performedBy: user.email,
        targetEntity: 'AUTH',
        details: { minutesRemaining },
        ip: req.ip,
      });
      return res.status(403).json({
        success: false,
        message: `Account is temporarily locked due to repeated failed login attempts. Please try again in ${minutesRemaining} minute(s).`,
      });
    }

    // Check active status
    if (!user.isActive) {
      logAuditEvent({
        action: 'LOGIN_INACTIVE_ATTEMPT',
        performedBy: user.email,
        targetEntity: 'AUTH',
        details: { reason: 'Account deactivated' },
        ip: req.ip,
      });
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact an administrator.',
      });
    }

    // Verify password with bcryptjs
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      user.failedLoginAttempts += 1;

      // Lock account if max attempts reached
      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
        await user.save();

        logAuditEvent({
          action: 'ACCOUNT_LOCKED',
          performedBy: user.email,
          targetEntity: 'AUTH',
          details: { attempts: user.failedLoginAttempts, lockoutDurationMinutes: 15 },
          ip: req.ip,
        });

        return res.status(403).json({
          success: false,
          message: 'Account locked due to 5 consecutive failed login attempts. Please try again in 15 minutes.',
        });
      }

      await user.save();

      logAuditEvent({
        action: 'LOGIN_FAILED',
        performedBy: user.email,
        targetEntity: 'AUTH',
        details: { attempts: user.failedLoginAttempts },
        ip: req.ip,
      });

      const remaining = MAX_FAILED_ATTEMPTS - user.failedLoginAttempts;
      return res.status(401).json({
        success: false,
        message: `Invalid email or password. (${remaining} attempt(s) remaining before temporary lockout)`,
      });
    }

    // Authentication Successful: Reset lockout counters
    user.failedLoginAttempts = 0;
    user.lockoutUntil = null;
    await user.save();

    const token = generateToken(user);

    logAuditEvent({
      action: 'LOGIN_SUCCESS',
      performedBy: user.email,
      targetEntity: 'AUTH',
      details: { role: user.role },
      ip: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Log out user (Client discards token; API provides acknowledgment)
 * POST /api/auth/logout
 */
const logout = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

/**
 * Get current authenticated user profile
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        isActive: req.user.isActive,
        createdAt: req.user.createdAt,
      },
    },
  });
};

module.exports = {
  register,
  login,
  logout,
  getMe,
};
