const User = require('../models/User');
const { verifyToken } = require('../utils/jwt');

/**
 * Protect middleware:
 * Verifies JWT token from Authorization header and attaches active user to req.user
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized: No token provided. Please log in.',
    });
  }

  try {
    // Verify token
    const decoded = verifyToken(token);

    // Fetch user from database
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized: User no longer exists.',
      });
    }

    // Ensure account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account has been deactivated. Please contact an administrator.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized: Invalid or expired token.',
    });
  }
};

/**
 * Role authorization middleware:
 * Ensures the authenticated user possesses one of the allowed roles
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied: Role '${req.user?.role || 'Guest'}' is not authorized to perform this action.`,
      });
    }
    next();
  };
};

module.exports = {
  protect,
  authorizeRoles,
};
