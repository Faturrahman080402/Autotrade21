import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { userModel } from '../models/User';
import { jwtService } from '../config/jwt';
import { twoFactorService } from '../services/twoFactorService';
import { auditLogger } from '../utils/auditLogger';
import { rateLimiter } from '../middleware/rateLimiter';

export class AuthController {
  /**
   * Register a new user
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        auditLogger.log({
          action: 'registration_attempt_failed',
          resource: 'user',
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          metadata: { errors: errors.array() },
        });

        res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: errors.array().map(err => err.msg).join(', '),
        });
        return;
      }

      const { email, password, firstName, lastName, phone, accountType } = req.body;

      // Check if user already exists
      const existingUser = await userModel.findByEmail(email);
      if (existingUser) {
        auditLogger.log({
          action: 'registration_duplicate_email',
          resource: 'user',
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          metadata: { email },
        });

        res.status(409).json({
          success: false,
          error: 'Email already exists',
          message: 'An account with this email already exists',
        });
        return;
      }

      // Create user
      const { user, id } = await userModel.create({
        email,
        password,
        firstName,
        lastName,
        phone,
        accountType,
      });

      // Generate tokens
      const accessToken = jwtService.generateAccessToken({
        userId: user.id,
        email: user.email,
        accountType: user.accountType,
        sessionId: '', // Will be set by JWT service
      });

      const refreshToken = await jwtService.generateRefreshToken(user.id);

      // Log successful registration
      auditLogger.log({
        userId: user.id,
        action: 'user_registered',
        resource: 'user',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        metadata: {
          email: user.email,
          accountType: user.accountType,
        },
      });

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            accountType: user.accountType,
            isVerified: user.isVerified,
            twoFactorEnabled: user.twoFactorEnabled,
            createdAt: user.createdAt,
          },
          accessToken,
          refreshToken,
        },
        message: 'User registered successfully',
      });
    } catch (error) {
      console.error('Registration error:', error);

      auditLogger.log({
        action: 'registration_error',
        resource: 'user',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
      });

      res.status(500).json({
        success: false,
        error: 'Registration failed',
        message: 'An error occurred during registration',
      });
    }
  }

  /**
   * Login user
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: errors.array().map(err => err.msg).join(', '),
        });
        return;
      }

      const { email, password, twoFactorCode } = req.body;

      // Verify password
      const user = await userModel.verifyPassword(email, password);
      if (!user) {
        auditLogger.log({
          action: 'login_failed_invalid_credentials',
          resource: 'user',
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          metadata: { email },
        });

        res.status(401).json({
          success: false,
          error: 'Invalid credentials',
          message: 'Email or password is incorrect',
        });
        return;
      }

      // Check if 2FA is enabled
      if (user.twoFactorEnabled) {
        if (!twoFactorCode) {
          // Generate temp token for 2FA verification
          const sessionId = Math.random().toString(36).substring(2, 15);
          await twoFactorService.store2FAVerificationSession(sessionId, user.id, {
            email,
            passwordVerified: true,
          });

          res.status(200).json({
            success: true,
            data: {
              requiresTwoFactor: true,
              sessionId,
            },
            message: 'Two-factor authentication required',
          });
          return;
        }

        // Verify 2FA code
        const is2FAValid = twoFactorService.verifyToken(
          user.twoFactorSecret!,
          twoFactorCode
        );

        if (!is2FAValid) {
          // Check rate limiting
          const canAttempt = await twoFactorService.check2FARateLimit(user.id);
          if (!canAttempt) {
            auditLogger.log({
              userId: user.id,
              action: 'login_2fa_rate_limit_exceeded',
              resource: 'user',
              ip: req.ip,
              userAgent: req.get('User-Agent'),
            });

            res.status(429).json({
              success: false,
              error: 'Too many attempts',
              message: 'Too many 2FA attempts. Please try again later.',
            });
            return;
          }

          auditLogger.log({
            userId: user.id,
            action: 'login_failed_invalid_2fa',
            resource: 'user',
            ip: req.ip,
            userAgent: req.get('User-Agent'),
          });

          res.status(401).json({
            success: false,
            error: 'Invalid 2FA code',
            message: 'The two-factor authentication code is invalid',
          });
          return;
        }

        // Reset 2FA rate limit on successful verification
        await twoFactorService.reset2FARateLimit(user.id);
      }

      // Update last login
      await userModel.updateLastLogin(user.id);

      // Generate tokens
      const accessToken = jwtService.generateAccessToken({
        userId: user.id,
        email: user.email,
        accountType: user.accountType,
        sessionId: '', // Will be set by JWT service
      });

      const refreshToken = await jwtService.generateRefreshToken(user.id);

      // Log successful login
      auditLogger.log({
        userId: user.id,
        action: 'user_login',
        resource: 'user',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            accountType: user.accountType,
            isVerified: user.isVerified,
            twoFactorEnabled: user.twoFactorEnabled,
            lastLogin: new Date(),
          },
          accessToken,
          refreshToken,
        },
        message: 'Login successful',
      });
    } catch (error) {
      console.error('Login error:', error);

      auditLogger.log({
        action: 'login_error',
        resource: 'user',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
      });

      res.status(500).json({
        success: false,
        error: 'Login failed',
        message: 'An error occurred during login',
      });
    }
  }

  /**
   * Verify 2FA code during login
   */
  async verifyTwoFactor(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId, twoFactorCode } = req.body;

      if (!sessionId || !twoFactorCode) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'Session ID and 2FA code are required',
        });
        return;
      }

      // Get verification session
      const session = await twoFactorService.get2FAVerificationSession(sessionId);
      if (!session) {
        res.status(401).json({
          success: false,
          error: 'Invalid session',
          message: 'Verification session has expired or is invalid',
        });
        return;
      }

      // Get user
      const user = await userModel.findById(session.userId);
      if (!user || !user.twoFactorEnabled) {
        await twoFactorService.cleanup2FAVerificationSession(sessionId);
        res.status(400).json({
          success: false,
          error: 'Invalid user',
          message: 'User not found or 2FA not enabled',
        });
        return;
      }

      // Verify 2FA code
      const is2FAValid = twoFactorService.verifyToken(
        user.twoFactorSecret!,
        twoFactorCode
      );

      if (!is2FAValid) {
        // Check rate limiting
        const canAttempt = await twoFactorService.check2FARateLimit(user.id);
        if (!canAttempt) {
          await twoFactorService.cleanup2FAVerificationSession(sessionId);
          res.status(429).json({
            success: false,
            error: 'Too many attempts',
            message: 'Too many 2FA attempts. Please try again later.',
          });
          return;
        }

        res.status(401).json({
          success: false,
          error: 'Invalid 2FA code',
          message: 'The two-factor authentication code is invalid',
        });
        return;
      }

      // Clean up verification session
      await twoFactorService.cleanup2FAVerificationSession(sessionId);

      // Update last login
      await userModel.updateLastLogin(user.id);

      // Generate tokens
      const accessToken = jwtService.generateAccessToken({
        userId: user.id,
        email: user.email,
        accountType: user.accountType,
        sessionId: '', // Will be set by JWT service
      });

      const refreshToken = await jwtService.generateRefreshToken(user.id);

      // Reset 2FA rate limit on successful verification
      await twoFactorService.reset2FARateLimit(user.id);

      // Log successful login
      auditLogger.log({
        userId: user.id,
        action: 'user_login_2fa_verified',
        resource: 'user',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            accountType: user.accountType,
            isVerified: user.isVerified,
            twoFactorEnabled: user.twoFactorEnabled,
            lastLogin: new Date(),
          },
          accessToken,
          refreshToken,
        },
        message: 'Login successful',
      });
    } catch (error) {
      console.error('2FA verification error:', error);

      res.status(500).json({
        success: false,
        error: 'Verification failed',
        message: 'An error occurred during 2FA verification',
      });
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          error: 'Missing refresh token',
          message: 'Refresh token is required',
        });
        return;
      }

      // Verify and refresh tokens
      const tokens = await jwtService.refreshAccessToken(refreshToken);

      res.status(200).json({
        success: true,
        data: tokens,
        message: 'Tokens refreshed successfully',
      });
    } catch (error) {
      console.error('Token refresh error:', error);

      auditLogger.log({
        action: 'token_refresh_failed',
        resource: 'auth',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
      });

      res.status(401).json({
        success: false,
        error: 'Token refresh failed',
        message: error instanceof Error ? error.message : 'Failed to refresh token',
      });
    }
  }

  /**
   * Logout user
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.body;

      // Revoke all user sessions
      await jwtService.revokeUserSessions(userId);

      // Log logout
      auditLogger.log({
        userId,
        action: 'user_logout',
        resource: 'user',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.status(200).json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      console.error('Logout error:', error);

      res.status(500).json({
        success: false,
        error: 'Logout failed',
        message: 'An error occurred during logout',
      });
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      const user = await userModel.findById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          message: 'User profile not found',
        });
        return;
      }

      // Get user statistics
      const userStats = await userModel.getUserStats(userId);

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            avatarUrl: user.avatarUrl,
            accountType: user.accountType,
            isVerified: user.isVerified,
            twoFactorEnabled: user.twoFactorEnabled,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin,
          },
          stats: userStats,
        },
      });
    } catch (error) {
      console.error('Get profile error:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to get profile',
        message: 'An error occurred while fetching user profile',
      });
    }
  }

  /**
   * Setup two-factor authentication
   */
  async setupTwoFactor(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      // Get user email
      const user = await userModel.findById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          message: 'User not found',
        });
        return;
      }

      // Generate 2FA setup
      const setup = twoFactorService.generateSecret(user.email);
      const qrCodeImage = await twoFactorService.generateQRCodeImage(setup.qrCodeUrl);

      // Store temp verification token
      const tempToken = await twoFactorService.storeTempVerificationToken(
        userId,
        setup.secret,
        setup.backupCodes
      );

      // Log 2FA setup initiation
      auditLogger.log({
        userId,
        action: '2fa_setup_initiated',
        resource: 'user',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.status(200).json({
        success: true,
        data: {
          qrCode: qrCodeImage,
          secret: setup.secret,
          backupCodes: setup.backupCodes,
          tempToken,
        },
        message: 'Two-factor authentication setup initiated',
      });
    } catch (error) {
      console.error('2FA setup error:', error);

      res.status(500).json({
        success: false,
        error: '2FA setup failed',
        message: 'An error occurred during 2FA setup',
      });
    }
  }

  /**
   * Verify and enable two-factor authentication
   */
  async verifyAndEnableTwoFactor(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const { tempToken, verificationCode } = req.body;

      if (!userId || !tempToken || !verificationCode) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'All fields are required for 2FA verification',
        });
        return;
      }

      // Verify temp token and get setup data
      const setupData = await twoFactorService.verifyTempToken(tempToken);
      if (!setupData || setupData.userId !== userId) {
        res.status(401).json({
          success: false,
          error: 'Invalid verification',
          message: 'Invalid or expired verification token',
        });
        return;
      }

      // Verify the code
      const isValid = twoFactorService.verifyToken(setupData.secret, verificationCode);
      if (!isValid) {
        res.status(401).json({
          success: false,
          error: 'Invalid code',
          message: 'The verification code is invalid',
        });
        return;
      }

      // Enable 2FA for user
      await userModel.enableTwoFactor(userId, setupData.secret);

      // Clean up temp token
      await twoFactorService.cleanupTempToken(tempToken);

      // Log successful 2FA enablement
      auditLogger.log({
        userId,
        action: '2fa_enabled',
        resource: 'user',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.status(200).json({
        success: true,
        message: 'Two-factor authentication enabled successfully',
      });
    } catch (error) {
      console.error('2FA verification error:', error);

      res.status(500).json({
        success: false,
        error: '2FA verification failed',
        message: 'An error occurred during 2FA verification',
      });
    }
  }

  /**
   * Disable two-factor authentication
   */
  async disableTwoFactor(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const { password, twoFactorCode } = req.body;

      if (!userId || !password) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'Password is required',
        });
        return;
      }

      // Get user
      const user = await userModel.findById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          message: 'User not found',
        });
        return;
      }

      // Verify password
      const userWithPassword = await userModel.findByEmail(user.email);
      if (!userWithPassword) {
        res.status(401).json({
          success: false,
          error: 'Invalid credentials',
          message: 'Password verification failed',
        });
        return;
      }

      // Check if 2FA is enabled and verify code if provided
      if (user.twoFactorEnabled) {
        if (!twoFactorCode) {
          res.status(400).json({
            success: false,
            error: '2FA code required',
            message: 'Two-factor authentication code is required',
          });
          return;
        }

        const is2FAValid = twoFactorService.verifyToken(
          user.twoFactorSecret!,
          twoFactorCode
        );

        if (!is2FAValid) {
          res.status(401).json({
            success: false,
            error: 'Invalid 2FA code',
            message: 'The two-factor authentication code is invalid',
          });
          return;
        }
      }

      // Disable 2FA
      await userModel.disableTwoFactor(userId);

      // Log 2FA disablement
      auditLogger.log({
        userId,
        action: '2fa_disabled',
        resource: 'user',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.status(200).json({
        success: true,
        message: 'Two-factor authentication disabled successfully',
      });
    } catch (error) {
      console.error('2FA disable error:', error);

      res.status(500).json({
        success: false,
        error: '2FA disable failed',
        message: 'An error occurred while disabling 2FA',
      });
    }
  }
}

export const authController = new AuthController();