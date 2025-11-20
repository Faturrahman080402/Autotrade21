import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { walletService } from '../services/walletService';
import { transactionModel } from '../models/Transaction';
import { walletModel } from '../models/Wallet';
import { auditLogger } from '../utils/auditLogger';

export class WalletController {
  /**
   * Get wallet overview for user
   */
  async getOverview(req: Request, res: Response): Promise<void> {
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

      const overview = await walletService.getWalletOverview(userId);

      res.status(200).json({
        success: true,
        data: overview,
      });
    } catch (error) {
      console.error('Error getting wallet overview:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to get wallet overview',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get user wallets
   */
  async getWallets(req: Request, res: Response): Promise<void> {
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

      const wallets = await walletModel.findByUserId(userId);

      res.status(200).json({
        success: true,
        data: { wallets },
      });
    } catch (error) {
      console.error('Error getting wallets:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to get wallets',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get specific wallet
   */
  async getWallet(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const { walletId } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      const wallet = await walletModel.findById(walletId);

      if (!wallet) {
        res.status(404).json({
          success: false,
          error: 'Wallet not found',
          message: 'The requested wallet was not found',
        });
        return;
      }

      // Verify wallet belongs to user
      if (wallet.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'You do not have access to this wallet',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { wallet },
      });
    } catch (error) {
      console.error('Error getting wallet:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to get wallet',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get transactions for user
   */
  async getTransactions(req: Request, res: Response): Promise<void> {
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

      const {
        page = '1',
        limit = '20',
        type,
        status,
        currency,
        startDate,
        endDate,
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);

      const filters: any = {};

      if (type) filters.type = type;
      if (status) filters.status = status;
      if (currency) filters.currency = currency;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);

      const result = await transactionModel.findByUserId(userId, pageNum, limitNum, filters);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error getting transactions:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to get transactions',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const { transactionId } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      const transaction = await transactionModel.findById(transactionId);

      if (!transaction) {
        res.status(404).json({
          success: false,
          error: 'Transaction not found',
          message: 'The requested transaction was not found',
        });
        return;
      }

      // Verify transaction belongs to user
      if (transaction.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'You do not have access to this transaction',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { transaction },
      });
    } catch (error) {
      console.error('Error getting transaction:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to get transaction',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get wallet transactions
   */
  async getWalletTransactions(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const { walletId } = req.params;
      const { limit = '50' } = req.query;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      // Verify wallet belongs to user
      const wallet = await walletModel.findById(walletId);
      if (!wallet || wallet.userId !== userId) {
        res.status(404).json({
          success: false,
          error: 'Wallet not found',
          message: 'The requested wallet was not found',
        });
        return;
      }

      const transactions = await transactionModel.findByWalletId(
        walletId,
        parseInt(limit as string)
      );

      res.status(200).json({
        success: true,
        data: { transactions },
      });
    } catch (error) {
      console.error('Error getting wallet transactions:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to get wallet transactions',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Transfer funds between wallets
   */
  async transferFunds(req: Request, res: Response): Promise<void> {
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

      const {
        fromWalletId,
        toUserId,
        toWalletId,
        amount,
        currency,
        description,
      } = req.body;

      // Verify from wallet belongs to user
      const fromWallet = await walletModel.findById(fromWalletId);
      if (!fromWallet || fromWallet.userId !== userId) {
        res.status(404).json({
          success: false,
          error: 'Source wallet not found',
          message: 'The source wallet was not found or access denied',
        });
        return;
      }

      // In production, you might want to verify the destination wallet/user
      // For now, we'll proceed with the transfer

      const result = await walletService.transferFunds(
        userId,
        fromWalletId,
        toUserId,
        toWalletId,
        amount,
        currency,
        description,
        {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        }
      );

      // Log the transfer request
      auditLogger.log({
        userId,
        action: 'funds_transfer_requested',
        resource: 'wallet',
        resourceId: fromWalletId,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        metadata: {
          fromWalletId,
          toUserId,
          toWalletId,
          amount,
          currency,
          description,
        },
      });

      res.status(200).json({
        success: true,
        data: {
          fromWallet: result.fromWallet,
          toWallet: result.toWallet,
          fromTransaction: result.fromTransaction,
          toTransaction: result.toTransaction,
        },
        message: 'Funds transferred successfully',
      });
    } catch (error) {
      console.error('Error transferring funds:', error);

      auditLogger.log({
        userId: (req as any).user?.userId,
        action: 'funds_transfer_failed',
        resource: 'wallet',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          request: req.body,
        },
      });

      res.status(500).json({
        success: false,
        error: 'Transfer failed',
        message: error instanceof Error ? error.message : 'An error occurred during transfer',
      });
    }
  }

  /**
   * Get wallet statistics
   */
  async getWalletStats(req: Request, res: Response): Promise<void> {
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

      const {
        startDate,
        endDate,
        type,
      } = req.query;

      const filters: any = {};

      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (type) filters.type = type;

      const [walletStats, transactionStats] = await Promise.all([
        walletModel.getUserWalletStats(userId),
        transactionModel.getUserTransactionStats(userId, filters),
      ]);

      res.status(200).json({
        success: true,
        data: {
          wallets: walletStats,
          transactions: transactionStats,
        },
      });
    } catch (error) {
      console.error('Error getting wallet statistics:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to get statistics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Freeze funds
   */
  async freezeFunds(req: Request, res: Response): Promise<void> {
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

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: errors.array().map(err => err.msg).join(', '),
        });
        return;
      }

      const { walletId, amount, reason } = req.body;

      // Verify wallet belongs to user
      const wallet = await walletModel.findById(walletId);
      if (!wallet || wallet.userId !== userId) {
        res.status(404).json({
          success: false,
          error: 'Wallet not found',
          message: 'The requested wallet was not found',
        });
        return;
      }

      const result = await walletService.freezeFunds(userId, walletId, amount, reason, {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.status(200).json({
        success: true,
        data: {
          wallet: result.wallet,
          transaction: result.transaction,
        },
        message: 'Funds frozen successfully',
      });
    } catch (error) {
      console.error('Error freezing funds:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to freeze funds',
        message: error instanceof Error ? error.message : 'An error occurred while freezing funds',
      });
    }
  }

  /**
   * Unfreeze funds
   */
  async unfreezeFunds(req: Request, res: Response): Promise<void> {
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

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: errors.array().map(err => err.msg).join(', '),
        });
        return;
      }

      const { walletId, amount, reason } = req.body;

      // Verify wallet belongs to user
      const wallet = await walletModel.findById(walletId);
      if (!wallet || wallet.userId !== userId) {
        res.status(404).json({
          success: false,
          error: 'Wallet not found',
          message: 'The requested wallet was not found',
        });
        return;
      }

      const result = await walletService.unfreezeFunds(userId, walletId, amount, reason, {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.status(200).json({
        success: true,
        data: {
          wallet: result.wallet,
          transaction: result.transaction,
        },
        message: 'Funds unfrozen successfully',
      });
    } catch (error) {
      console.error('Error unfreezing funds:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to unfreeze funds',
        message: error instanceof Error ? error.message : 'An error occurred while unfreezing funds',
      });
    }
  }
}

export const walletController = new WalletController();