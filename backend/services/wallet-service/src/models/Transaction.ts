import Decimal from 'decimal.js';
import { pool } from '../config/database';
import { Transaction as ITransaction, TransactionType, TransactionStatus } from '../../../shared/types';

export class TransactionModel {
  /**
   * Create a new transaction
   */
  async create(transactionData: {
    userId: string;
    walletId: string;
    type: TransactionType;
    amount: string;
    currency: string;
    description?: string;
    metadata?: Record<string, any>;
    externalId?: string;
    fee?: string;
    exchangeRate?: Decimal;
    relatedTradeId?: string;
    relatedTransactionId?: string;
  }): Promise<ITransaction> {
    try {
      const query = `
        INSERT INTO transactions (
          user_id, wallet_id, type, amount, currency, status,
          description, metadata, external_id, fee, exchange_rate,
          related_trade_id, related_transaction_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id, user_id, wallet_id, type, amount, currency, status,
                 description, metadata, created_at, updated_at, completed_at,
                 external_id, fee, exchange_rate, related_trade_id,
                 related_transaction_id
      `;

      const values = [
        transactionData.userId,
        transactionData.walletId,
        transactionData.type,
        transactionData.amount,
        transactionData.currency.toUpperCase(),
        TransactionStatus.PENDING,
        transactionData.description || null,
        JSON.stringify(transactionData.metadata || {}),
        transactionData.externalId || null,
        transactionData.fee?.toString() || '0',
        transactionData.exchangeRate?.toString() || null,
        transactionData.relatedTradeId || null,
        transactionData.relatedTransactionId || null,
      ];

      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Failed to create transaction');
      }

      return this.mapRowToTransaction(result.rows[0]);
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw new Error('Failed to create transaction');
    }
  }

  /**
   * Get transaction by ID
   */
  async findById(id: string): Promise<ITransaction | null> {
    try {
      const query = `
        SELECT id, user_id, wallet_id, type, amount, currency, status,
               description, metadata, created_at, updated_at, completed_at,
               external_id, fee, exchange_rate, related_trade_id,
               related_transaction_id
        FROM transactions
        WHERE id = $1
      `;

      const result = await pool.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToTransaction(result.rows[0]);
    } catch (error) {
      console.error('Error finding transaction by ID:', error);
      return null;
    }
  }

  /**
   * Get transactions for a user with pagination
   */
  async findByUserId(
    userId: string,
    page: number = 1,
    limit: number = 20,
    filters: {
      type?: TransactionType;
      status?: TransactionStatus;
      currency?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{
    transactions: ITransaction[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      let query = `
        SELECT id, user_id, wallet_id, type, amount, currency, status,
               description, metadata, created_at, updated_at, completed_at,
               external_id, fee, exchange_rate, related_trade_id,
               related_transaction_id
        FROM transactions
        WHERE user_id = $1
      `;

      const values: any[] = [userId];
      let paramIndex = 2;

      // Apply filters
      if (filters.type) {
        query += ` AND type = $${paramIndex++}`;
        values.push(filters.type);
      }

      if (filters.status) {
        query += ` AND status = $${paramIndex++}`;
        values.push(filters.status);
      }

      if (filters.currency) {
        query += ` AND currency = $${paramIndex++}`;
        values.push(filters.currency.toUpperCase());
      }

      if (filters.startDate) {
        query += ` AND created_at >= $${paramIndex++}`;
        values.push(filters.startDate);
      }

      if (filters.endDate) {
        query += ` AND created_at <= $${paramIndex++}`;
        values.push(filters.endDate);
      }

      // Add order and pagination
      query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      const offset = (page - 1) * limit;
      values.push(limit, offset);

      const result = await pool.query(query, values);

      // Get total count
      let countQuery = 'SELECT COUNT(*) as total FROM transactions WHERE user_id = $1';
      const countValues: any[] = [userId];
      let countParamIndex = 2;

      if (filters.type) {
        countQuery += ` AND type = $${countParamIndex++}`;
        countValues.push(filters.type);
      }

      if (filters.status) {
        countQuery += ` AND status = $${countParamIndex++}`;
        countValues.push(filters.status);
      }

      if (filters.currency) {
        countQuery += ` AND currency = $${countParamIndex++}`;
        countValues.push(filters.currency.toUpperCase());
      }

      if (filters.startDate) {
        countQuery += ` AND created_at >= $${countParamIndex++}`;
        countValues.push(filters.startDate);
      }

      if (filters.endDate) {
        countQuery += ` AND created_at <= $${countParamIndex++}`;
        countValues.push(filters.endDate);
      }

      const countResult = await pool.query(countQuery, countValues);
      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      return {
        transactions: result.rows.map(row => this.mapRowToTransaction(row)),
        total,
        page,
        totalPages,
      };
    } catch (error) {
      console.error('Error finding transactions by user ID:', error);
      return {
        transactions: [],
        total: 0,
        page,
        totalPages: 0,
      };
    }
  }

  /**
   * Get transactions for a wallet
   */
  async findByWalletId(
    walletId: string,
    limit: number = 50
  ): Promise<ITransaction[]> {
    try {
      const query = `
        SELECT id, user_id, wallet_id, type, amount, currency, status,
               description, metadata, created_at, updated_at, completed_at,
               external_id, fee, exchange_rate, related_trade_id,
               related_transaction_id
        FROM transactions
        WHERE wallet_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `;

      const result = await pool.query(query, [walletId, limit]);
      return result.rows.map(row => this.mapRowToTransaction(row));
    } catch (error) {
      console.error('Error finding transactions by wallet ID:', error);
      return [];
    }
  }

  /**
   * Update transaction status
   */
  async updateStatus(
    transactionId: string,
    status: TransactionStatus,
    completedAt?: Date
  ): Promise<void> {
    try {
      const query = `
        UPDATE transactions
        SET status = $1, updated_at = NOW()
        ${completedAt ? ', completed_at = $2' : ''}
        WHERE id = $${completedAt ? 3 : 2}
      `;

      const values = completedAt
        ? [status, completedAt, transactionId]
        : [status, transactionId];

      await pool.query(query, values);
    } catch (error) {
      console.error('Error updating transaction status:', error);
      throw new Error('Failed to update transaction status');
    }
  }

  /**
   * Get transaction by external ID (e.g., Stripe payment intent ID)
   */
  async findByExternalId(externalId: string): Promise<ITransaction | null> {
    try {
      const query = `
        SELECT id, user_id, wallet_id, type, amount, currency, status,
               description, metadata, created_at, updated_at, completed_at,
               external_id, fee, exchange_rate, related_trade_id,
               related_transaction_id
        FROM transactions
        WHERE external_id = $1
      `;

      const result = await pool.query(query, [externalId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToTransaction(result.rows[0]);
    } catch (error) {
      console.error('Error finding transaction by external ID:', error);
      return null;
    }
  }

  /**
   * Get transaction statistics for a user
   */
  async getUserTransactionStats(
    userId: string,
    filters: {
      startDate?: Date;
      endDate?: Date;
      type?: TransactionType;
    } = {}
  ): Promise<{
    totalTransactions: number;
    totalAmount: string;
    totalFees: string;
    breakdownByType: Record<TransactionType, {
      count: number;
      totalAmount: string;
    }>;
    breakdownByStatus: Record<TransactionStatus, number>;
  }> {
    try {
      let query = `
        SELECT type, status, COUNT(*) as count,
               SUM(amount) as total_amount,
               SUM(fee) as total_fees
        FROM transactions
        WHERE user_id = $1
      `;

      const values: any[] = [userId];
      let paramIndex = 2;

      if (filters.startDate) {
        query += ` AND created_at >= $${paramIndex++}`;
        values.push(filters.startDate);
      }

      if (filters.endDate) {
        query += ` AND created_at <= $${paramIndex++}`;
        values.push(filters.endDate);
      }

      if (filters.type) {
        query += ` AND type = $${paramIndex++}`;
        values.push(filters.type);
      }

      query += ` GROUP BY type, status`;

      const result = await pool.query(query, values);

      const breakdownByType: Record<TransactionType, { count: number; totalAmount: string }> = {} as any;
      const breakdownByStatus: Record<TransactionStatus, number> = {} as any;

      let totalTransactions = 0;
      let totalAmount = new Decimal('0');
      let totalFees = new Decimal('0');

      result.rows.forEach(row => {
        const count = parseInt(row.count);
        const amount = new Decimal(row.total_amount || '0');
        const fees = new Decimal(row.total_fees || '0');
        const type = row.type as TransactionType;
        const status = row.status as TransactionStatus;

        totalTransactions += count;
        totalAmount = totalAmount.plus(amount);
        totalFees = totalFees.plus(fees);

        // Update type breakdown
        if (!breakdownByType[type]) {
          breakdownByType[type] = { count: 0, totalAmount: '0' };
        }
        breakdownByType[type].count += count;
        breakdownByType[type].totalAmount = new Decimal(breakdownByType[type].totalAmount)
          .plus(amount)
          .toString();

        // Update status breakdown
        if (!breakdownByStatus[status]) {
          breakdownByStatus[status] = 0;
        }
        breakdownByStatus[status] += count;
      });

      return {
        totalTransactions,
        totalAmount: totalAmount.toString(),
        totalFees: totalFees.toString(),
        breakdownByType,
        breakdownByStatus,
      };
    } catch (error) {
      console.error('Error getting transaction statistics:', error);
      throw new Error('Failed to get transaction statistics');
    }
  }

  /**
   * Get pending transactions for processing
   */
  async getPendingTransactions(limit: number = 100): Promise<ITransaction[]> {
    try {
      const query = `
        SELECT id, user_id, wallet_id, type, amount, currency, status,
               description, metadata, created_at, updated_at, completed_at,
               external_id, fee, exchange_rate, related_trade_id,
               related_transaction_id
        FROM transactions
        WHERE status = $1
        ORDER BY created_at ASC
        LIMIT $2
      `;

      const result = await pool.query(query, [TransactionStatus.PENDING, limit]);
      return result.rows.map(row => this.mapRowToTransaction(row));
    } catch (error) {
      console.error('Error getting pending transactions:', error);
      return [];
    }
  }

  /**
   * Get failed transactions for retry
   */
  async getFailedTransactions(limit: number = 50): Promise<ITransaction[]> {
    try {
      const query = `
        SELECT id, user_id, wallet_id, type, amount, currency, status,
               description, metadata, created_at, updated_at, completed_at,
               external_id, fee, exchange_rate, related_trade_id,
               related_transaction_id
        FROM transactions
        WHERE status = $1 AND created_at > NOW() - INTERVAL '24 hours'
        ORDER BY created_at ASC
        LIMIT $2
      `;

      const result = await pool.query(query, [TransactionStatus.FAILED, limit]);
      return result.rows.map(row => this.mapRowToTransaction(row));
    } catch (error) {
      console.error('Error getting failed transactions:', error);
      return [];
    }
  }

  /**
   * Delete old transactions (cleanup job)
   */
  async deleteOldTransactions(daysToKeep: number = 365): Promise<number> {
    try {
      const query = `
        DELETE FROM transactions
        WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
          AND status IN ($1, $2)
      `;

      const result = await pool.query(query, [
        TransactionStatus.COMPLETED,
        TransactionStatus.FAILED,
      ]);

      return result.rowCount || 0;
    } catch (error) {
      console.error('Error deleting old transactions:', error);
      return 0;
    }
  }

  /**
   * Map database row to Transaction object
   */
  private mapRowToTransaction(row: any): ITransaction {
    return {
      id: row.id,
      userId: row.user_id,
      walletId: row.wallet_id,
      type: row.type as TransactionType,
      amount: row.amount,
      currency: row.currency,
      status: row.status as TransactionStatus,
      description: row.description,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at,
      externalId: row.external_id,
      fee: row.fee,
      exchangeRate: row.exchange_rate,
      relatedTradeId: row.related_trade_id,
      relatedTransactionId: row.related_transaction_id,
    };
  }
}

export const transactionModel = new TransactionModel();