import Decimal from 'decimal.js';
import { walletModel } from '../models/Wallet';
import { transactionModel } from '../models/Transaction';
import { Wallet, WalletType, TransactionType, TransactionStatus } from '../../../shared/types';
import { auditLogger } from '../utils/auditLogger';

export interface WalletOperation {
  type: 'credit' | 'debit' | 'freeze' | 'unfreeze';
  amount: string;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface TransactionRequest {
  userId: string;
  walletId: string;
  type: TransactionType;
  amount: string;
  currency: string;
  description?: string;
  metadata?: Record<string, any>;
  externalId?: string;
  fee?: string;
  relatedTradeId?: string;
}

export class WalletService {
  /**
   * Get or create a wallet for a user
   */
  async getOrCreateWallet(
    userId: string,
    walletType: WalletType,
    currency: string,
    initialBalance?: string
  ): Promise<Wallet> {
    try {
      // Try to find existing wallet
      let wallet = await walletModel.findByUserTypeCurrency(userId, walletType, currency);

      // If wallet doesn't exist, create it
      if (!wallet) {
        wallet = await walletModel.create({
          userId,
          walletType,
          currency,
          initialBalance: initialBalance || '0',
        });

        auditLogger.log({
          userId,
          action: 'wallet_created',
          resource: 'wallet',
          resourceId: wallet.id,
          ip: 'system', // System operation
          metadata: {
            walletType,
            currency,
            initialBalance: initialBalance || '0',
          },
        });
      }

      return wallet;
    } catch (error) {
      console.error('Error getting or creating wallet:', error);
      throw new Error('Failed to get or create wallet');
    }
  }

  /**
   * Process a wallet operation with transaction recording
   */
  async processWalletOperation(
    operation: WalletOperation & {
      userId: string;
      walletId: string;
      currency: string;
      transactionType: TransactionType;
      description?: string;
    }
  ): Promise<{
    wallet: Wallet;
    transaction: any;
  }> {
    const client = await walletModel.pool?.connect();

    try {
      if (client) {
        await client.query('BEGIN');
      }

      // Get current wallet state
      const wallet = await walletModel.findById(operation.walletId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Validate operation
      this.validateWalletOperation(wallet, operation);

      // Create transaction record
      const transaction = await transactionModel.create({
        userId: operation.userId,
        walletId: operation.walletId,
        type: operation.transactionType,
        amount: operation.amount,
        currency: operation.currency,
        description: operation.description,
        metadata: operation.metadata,
      });

      // Perform wallet operation
      await this.performWalletOperation(operation);

      // Update transaction status to completed
      await transactionModel.updateStatus(transaction.id, TransactionStatus.COMPLETED, new Date());

      if (client) {
        await client.query('COMMIT');
      }

      // Get updated wallet
      const updatedWallet = await walletModel.findById(operation.walletId);

      // Log the operation
      auditLogger.log({
        userId: operation.userId,
        action: `wallet_${operation.type}`,
        resource: 'wallet',
        resourceId: operation.walletId,
        ip: 'system',
        metadata: {
          operation,
          transactionId: transaction.id,
          walletState: updatedWallet,
        },
      });

      return {
        wallet: updatedWallet!,
        transaction,
      };
    } catch (error) {
      if (client) {
        await client.query('ROLLBACK');
      }
      console.error('Error processing wallet operation:', error);
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Transfer funds between wallets
   */
  async transferFunds(
    fromUserId: string,
    fromWalletId: string,
    toUserId: string,
    toWalletId: string,
    amount: string,
    currency: string,
    description?: string,
    metadata?: Record<string, any>
  ): Promise<{
    fromWallet: Wallet;
    toWallet: Wallet;
    fromTransaction: any;
    toTransaction: any;
  }> {
    const client = await walletModel.pool?.connect();

    try {
      if (client) {
        await client.query('BEGIN');
      }

      const transferAmount = new Decimal(amount);
      if (transferAmount.lte(0)) {
        throw new Error('Transfer amount must be positive');
      }

      // Get wallets
      const fromWallet = await walletModel.findById(fromWalletId);
      const toWallet = await walletModel.findById(toWalletId);

      if (!fromWallet || !toWallet) {
        throw new Error('One or both wallets not found');
      }

      if (fromWallet.currency !== toWallet.currency || fromWallet.currency !== currency) {
        throw new Error('Currency mismatch between wallets');
      }

      // Check if sender has sufficient funds
      const availableFrom = new Decimal(fromWallet.availableBalance);
      if (availableFrom.lt(transferAmount)) {
        throw new Error('Insufficient funds for transfer');
      }

      // Create transfer transactions
      const fromTransaction = await transactionModel.create({
        userId: fromUserId,
        walletId: fromWalletId,
        type: TransactionType.TRANSFER,
        amount: transferAmount.neg().toString(),
        currency,
        description: description || `Transfer to user ${toUserId}`,
        metadata: {
          ...metadata,
          transferType: 'outgoing',
          toUserId,
          toWalletId,
        },
      });

      const toTransaction = await transactionModel.create({
        userId: toUserId,
        walletId: toWalletId,
        type: TransactionType.TRANSFER,
        amount: transferAmount.toString(),
        currency,
        description: description || `Transfer from user ${fromUserId}`,
        metadata: {
          ...metadata,
          transferType: 'incoming',
          fromUserId,
          fromWalletId,
          relatedTransactionId: fromTransaction.id,
        },
        relatedTransactionId: fromTransaction.id,
      });

      // Update related transaction IDs
      await client?.query(
        'UPDATE transactions SET related_transaction_id = $1 WHERE id = $2',
        [toTransaction.id, fromTransaction.id]
      );

      // Perform the transfers
      await walletModel.subtractFunds(fromWalletId, transferAmount.toString());
      await walletModel.addFunds(toWalletId, transferAmount.toString());

      // Mark transactions as completed
      await transactionModel.updateStatus(fromTransaction.id, TransactionStatus.COMPLETED, new Date());
      await transactionModel.updateStatus(toTransaction.id, TransactionStatus.COMPLETED, new Date());

      if (client) {
        await client.query('COMMIT');
      }

      // Get updated wallets
      const updatedFromWallet = await walletModel.findById(fromWalletId);
      const updatedToWallet = await walletModel.findById(toWalletId);

      // Log the transfer
      auditLogger.log({
        userId: fromUserId,
        action: 'funds_transferred',
        resource: 'wallet',
        resourceId: fromWalletId,
        ip: 'system',
        metadata: {
          fromUserId,
          toUserId,
          fromWalletId,
          toWalletId,
          amount: transferAmount.toString(),
          currency,
          fromTransactionId: fromTransaction.id,
          toTransactionId: toTransaction.id,
        },
      });

      return {
        fromWallet: updatedFromWallet!,
        toWallet: updatedToWallet!,
        fromTransaction,
        toTransaction,
      };
    } catch (error) {
      if (client) {
        await client.query('ROLLBACK');
      }
      console.error('Error transferring funds:', error);
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Freeze funds for trading or other purposes
   */
  async freezeFunds(
    userId: string,
    walletId: string,
    amount: string,
    reason?: string,
    metadata?: Record<string, any>
  ): Promise<{ wallet: Wallet; transaction: any }> {
    return this.processWalletOperation({
      userId,
      walletId,
      currency: '', // Will be filled from wallet
      type: 'freeze',
      amount,
      reason,
      metadata,
      transactionType: TransactionType.COMMISSION, // Or appropriate type
      description: reason || 'Funds frozen',
    });
  }

  /**
   * Unfreeze previously frozen funds
   */
  async unfreezeFunds(
    userId: string,
    walletId: string,
    amount: string,
    reason?: string,
    metadata?: Record<string, any>
  ): Promise<{ wallet: Wallet; transaction: any }> {
    return this.processWalletOperation({
      userId,
      walletId,
      currency: '', // Will be filled from wallet
      type: 'unfreeze',
      amount,
      reason,
      metadata,
      transactionType: TransactionType.BONUS, // Or appropriate type
      description: reason || 'Funds unfrozen',
    });
  }

  /**
   * Get comprehensive wallet overview for user
   */
  async getWalletOverview(userId: string): Promise<{
    totalBalance: string;
    availableBalance: string;
    frozenBalance: string;
    wallets: Array<{
      id: string;
      type: WalletType;
      currency: string;
      balance: string;
      availableBalance: string;
      frozenBalance: string;
    }>;
    recentTransactions: any[];
    dailyChange: string;
    weeklyChange: string;
  }> {
    try {
      // Get all user wallets
      const wallets = await walletModel.findByUserId(userId);

      // Get wallet statistics
      const stats = await walletModel.getUserWalletStats(userId);

      // Get recent transactions
      const recentTransactionsResult = await transactionModel.findByUserId(userId, 1, 10);

      // Calculate daily and weekly changes (simplified - in production, you'd compare with historical data)
      const dailyChange = new Decimal('0'); // Would calculate from previous day
      const weeklyChange = new Decimal('0'); // Would calculate from previous week

      return {
        totalBalance: stats.totalBalance,
        availableBalance: stats.availableBalance,
        frozenBalance: stats.frozenBalance,
        wallets: wallets.map(wallet => ({
          id: wallet.id,
          type: wallet.walletType,
          currency: wallet.currency,
          balance: wallet.balance,
          availableBalance: wallet.availableBalance,
          frozenBalance: wallet.frozenBalance,
        })),
        recentTransactions: recentTransactionsResult.transactions,
        dailyChange: dailyChange.toString(),
        weeklyChange: weeklyChange.toString(),
      };
    } catch (error) {
      console.error('Error getting wallet overview:', error);
      throw new Error('Failed to get wallet overview');
    }
  }

  /**
   * Validate wallet operation
   */
  private validateWalletOperation(wallet: Wallet, operation: WalletOperation & { currency: string }): void {
    const amount = new Decimal(operation.amount);

    if (amount.lte(0)) {
      throw new Error('Operation amount must be positive');
    }

    const available = new Decimal(wallet.availableBalance);
    const frozen = new Decimal(wallet.frozenBalance);

    switch (operation.type) {
      case 'debit':
        if (available.lt(amount)) {
          throw new Error('Insufficient available funds for debit operation');
        }
        break;

      case 'freeze':
        if (available.lt(amount)) {
          throw new Error('Insufficient available funds to freeze');
        }
        break;

      case 'unfreeze':
        if (frozen.lt(amount)) {
          throw new Error('Insufficient frozen funds to unfreeze');
        }
        break;

      case 'credit':
        // Credit operations always valid (adding funds)
        break;
    }
  }

  /**
   * Perform the actual wallet operation
   */
  private async performWalletOperation(
    operation: WalletOperation & { walletId: string }
  ): Promise<void> {
    switch (operation.type) {
      case 'credit':
        await walletModel.addFunds(operation.walletId, operation.amount);
        break;

      case 'debit':
        await walletModel.subtractFunds(operation.walletId, operation.amount);
        break;

      case 'freeze':
        await walletModel.freezeFunds(operation.walletId, operation.amount);
        break;

      case 'unfreeze':
        await walletModel.unfreezeFunds(operation.walletId, operation.amount);
        break;

      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  /**
   * Process deposit completion
   */
  async processDepositCompletion(
    transactionId: string,
    status: 'completed' | 'failed',
    completedAt?: Date
  ): Promise<void> {
    try {
      const transaction = await transactionModel.findById(transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      const newStatus = status === 'completed' ? TransactionStatus.COMPLETED : TransactionStatus.FAILED;

      // Update transaction status
      await transactionModel.updateStatus(transactionId, newStatus, completedAt || new Date());

      if (status === 'completed') {
        // Add funds to wallet
        await walletModel.addFunds(transaction.walletId, transaction.amount);
      }

      // Log the completion
      auditLogger.log({
        userId: transaction.userId,
        action: `deposit_${status}`,
        resource: 'transaction',
        resourceId: transactionId,
        ip: 'system',
        metadata: {
          amount: transaction.amount,
          currency: transaction.currency,
          walletId: transaction.walletId,
        },
      });
    } catch (error) {
      console.error('Error processing deposit completion:', error);
      throw error;
    }
  }

  /**
   * Process withdrawal
   */
  async processWithdrawal(
    userId: string,
    walletId: string,
    amount: string,
    currency: string,
    description?: string,
    metadata?: Record<string, any>
  ): Promise<{
    wallet: Wallet;
    transaction: any;
  }> {
    return this.processWalletOperation({
      userId,
      walletId,
      currency,
      type: 'debit',
      amount,
      transactionType: TransactionType.WITHDRAWAL,
      description: description || 'Withdrawal',
      metadata,
    });
  }
}

export const walletService = new WalletService();