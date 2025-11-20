import { Router } from 'express';
import { body } from 'express-validator';
import { authController } from '../controllers/authController';
import { jwtService } from '../config/jwt';
import { rateLimitMiddleware, createUserRateLimitMiddleware } from '../middleware/rateLimiter';
import { auditLogger } from '../utils/auditLogger';

const router = Router();

// Validation rules
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, number, and special character'),
  body('firstName')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be between 1 and 100 characters'),
  body('lastName')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name must be between 1 and 100 characters'),
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Valid phone number is required'),
  body('accountType')
    .optional()
    .isIn(['standard', 'premium', 'enterprise', 'demo'])
    .withMessage('Valid account type is required'),
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  body('twoFactorCode')
    .optional()
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('2FA code must be 6 digits'),
];

const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required'),
];

const twoFactorSetupValidation = [
  body('verificationCode')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('Verification code must be 6 digits'),
  body('tempToken')
    .notEmpty()
    .withMessage('Temporary token is required'),
];

const twoFactorVerifyValidation = [
  body('sessionId')
    .notEmpty()
    .withMessage('Session ID is required'),
  body('twoFactorCode')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('2FA code must be 6 digits'),
];

const twoFactorDisableValidation = [
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  body('twoFactorCode')
    .optional()
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('2FA code must be 6 digits'),
];

const logoutValidation = [
  body('userId')
    .isUUID()
    .withMessage('Valid user ID is required'),
];

/**
 * JWT Authentication Middleware
 */
const authenticateToken = async (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Access token is required',
      });
    }

    // Verify token
    const decoded = jwtService.verifyAccessToken(token);
    req.user = decoded;

    // Check if session is still active
    const isActive = await jwtService.isSessionActive(decoded.userId, decoded.sessionId);
    if (!isActive) {
      return res.status(401).json({
        success: false,
        error: 'Session expired',
        message: 'Please log in again',
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      message: error instanceof Error ? error.message : 'Token verification failed',
    });
  }
};

/**
 * Middleware to extract request ID for audit logging
 */
const addRequestId = (req: any, res: any, next: any) => {
  req.requestId = Math.random().toString(36).substring(2, 15);
  res.set('X-Request-ID', req.requestId);
  next();
};

// Apply request ID middleware to all routes
router.use(addRequestId);

/**
 * Authentication Routes
 */

// Register new user
router.post(
  '/register',
  rateLimitMiddleware.registration,
  registerValidation,
  authController.register.bind(authController)
);

// Login user
router.post(
  '/login',
  rateLimitMiddleware.auth,
  loginValidation,
  authController.login.bind(authController)
);

// Verify 2FA during login
router.post(
  '/verify-2fa',
  rateLimitMiddleware.twoFactor,
  twoFactorVerifyValidation,
  authController.verifyTwoFactor.bind(authController)
);

// Refresh access token
router.post(
  '/refresh',
  rateLimitMiddleware.general,
  refreshTokenValidation,
  authController.refreshToken.bind(authController)
);

// Logout user
router.post(
  '/logout',
  authenticateToken,
  rateLimitMiddleware.general,
  logoutValidation,
  authController.logout.bind(authController)
);

/**
 * Protected Routes (require authentication)
 */

// Get user profile
router.get(
  '/profile',
  authenticateToken,
  createUserRateLimitMiddleware(rateLimitMiddleware.general),
  authController.getProfile.bind(authController)
);

/**
 * Two-Factor Authentication Routes
 */

// Setup 2FA
router.post(
  '/2fa/setup',
  authenticateToken,
  rateLimitMiddleware.sensitiveOperation,
  authController.setupTwoFactor.bind(authController)
);

// Verify and enable 2FA
router.post(
  '/2fa/enable',
  authenticateToken,
  rateLimitMiddleware.sensitiveOperation,
  twoFactorSetupValidation,
  authController.verifyAndEnableTwoFactor.bind(authController)
);

// Disable 2FA
router.post(
  '/2fa/disable',
  authenticateToken,
  rateLimitMiddleware.sensitiveOperation,
  twoFactorDisableValidation,
  authController.disableTwoFactor.bind(authController)
);

/**
 * Session Management Routes
 */

// Get active sessions
router.get(
  '/sessions',
  authenticateToken,
  async (req: any, res: any) => {
    try {
      const sessions = await jwtService.getActiveSessions(req.user.userId);
      res.json({
        success: true,
        data: { sessions },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get sessions',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// Revoke specific session
router.delete(
  '/sessions/:sessionId',
  authenticateToken,
  async (req: any, res: any) => {
    try {
      await jwtService.revokeRefreshToken(req.user.userId, req.params.sessionId);

      auditLogger.log({
        userId: req.user.userId,
        action: 'session_revoked',
        resource: 'session',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        metadata: { sessionId: req.params.sessionId },
      });

      res.json({
        success: true,
        message: 'Session revoked successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to revoke session',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// Revoke all sessions
router.delete(
  '/sessions',
  authenticateToken,
  async (req: any, res: any) => {
    try {
      await jwtService.revokeUserSessions(req.user.userId);

      auditLogger.log({
        userId: req.user.userId,
        action: 'all_sessions_revoked',
        resource: 'session',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.json({
        success: true,
        message: 'All sessions revoked successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to revoke sessions',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;