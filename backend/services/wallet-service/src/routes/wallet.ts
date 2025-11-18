import { Router } from 'express';
import { body } from 'express-validator';
import { walletController } from '../controllers/walletController';
import { jwtService } from '../config/database';
import { rateLimitMiddleware, createUserRateLimitMiddleware } from '../middleware/rateLimiter';

const router = Router();

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

    // Verify token with user service (or use shared JWT service)
    const decoded = jwtService.verifyAccessToken(token);
    req.user = decoded;

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
 * Validation rules
 */
const transferValidation = [
  body('fromWalletId')
    .isUUID()
    .withMessage('Valid source wallet ID is required'),
  body('toUserId')
    .isUUID()
    .withMessage('Valid destination user ID is required'),
  body('toWalletId')
    .isUUID()
    .withMessage('Valid destination wallet ID is required'),
  body('amount')
    .isDecimal({ decimal_digits: '0,8' })
    .withMessage('Valid amount is required'),
  body('currency')
    .isLength({ min: 3, max: 10 })
    .isAlpha()
    .withMessage('Valid currency code is required'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
];

const freezeValidation = [
  body('walletId')
    .isUUID()
    .withMessage('Valid wallet ID is required'),
  body('amount')
    .isDecimal({ decimal_digits: '0,8' })
    .withMessage('Valid amount is required'),
  body('reason')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Reason must be less than 200 characters'),
];

/**
 * Apply authentication to all routes
 */
router.use(authenticateToken);

/**
 * Wallet Overview and Management Routes
 */

// Get wallet overview
router.get(
  '/overview',
  createUserRateLimitMiddleware(rateLimitMiddleware.general),
  walletController.getOverview.bind(walletController)
);

// Get all user wallets
router.get(
  '/',
  createUserRateLimitMiddleware(rateLimitMiddleware.general),
  walletController.getWallets.bind(walletController)
);

// Get specific wallet
router.get(
  '/:walletId',
  createUserRateLimitMiddleware(rateLimitMiddleware.general),
  walletController.getWallet.bind(walletController)
);

// Get wallet statistics
router.get(
  '/stats/summary',
  createUserRateLimitMiddleware(rateLimitMiddleware.general),
  walletController.getWalletStats.bind(walletController)
);

/**
 * Transaction Routes
 */

// Get user transactions
router.get(
  '/transactions',
  createUserRateLimitMiddleware(rateLimitMiddleware.general),
  walletController.getTransactions.bind(walletController)
);

// Get specific transaction
router.get(
  '/transactions/:transactionId',
  createUserRateLimitMiddleware(rateLimitMiddleware.general),
  walletController.getTransaction.bind(walletController)
);

// Get wallet transactions
router.get(
  '/:walletId/transactions',
  createUserRateLimitMiddleware(rateLimitMiddleware.general),
  walletController.getWalletTransactions.bind(walletController)
);

/**
 * Fund Management Routes
 */

// Transfer funds between wallets
router.post(
  '/transfer',
  createUserRateLimitMiddleware(rateLimitMiddleware.sensitiveOperation),
  transferValidation,
  walletController.transferFunds.bind(walletController)
);

// Freeze funds
router.post(
  '/freeze',
  createUserRateLimitMiddleware(rateLimitMiddleware.sensitiveOperation),
  freezeValidation,
  walletController.freezeFunds.bind(walletController)
);

// Unfreeze funds
router.post(
  '/unfreeze',
  createUserRateLimitMiddleware(rateLimitMiddleware.sensitiveOperation),
  freezeValidation,
  walletController.unfreezeFunds.bind(walletController)
);

export default router;