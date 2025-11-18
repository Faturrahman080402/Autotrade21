import Decimal from 'decimal.js';
import { pool } from '../config/database';
import { Wallet, WalletType, Transaction, TransactionType, TransactionStatus } from '../../../shared/types';

export class WalletModel {
  /**
   * Create a new wallet for a user
   */
  async create(walletData: {
    userId: string;
    walletType: WalletType;
    currency: string;
    initialBalance?: string;
  }): Promise<Wallet> {
    try {
      const query = `
        INSERT INTO wallets (user_id, wallet_type, balance, available_balance, frozen_balance, currency)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, user_id, wallet_type, balance, available_balance, frozen_balance,
                 currency, created_at, updated_at, is_active, metadata
      `;

      const initialBalance = new Decimal(walletData.initialBalance || '0');
      const values = [
        walletData.userId,
        walletData.walletType,
        initialBalance.toString(),
        initialBalance.toString(), // All balance is initially available
        '0', // No frozen balance initially
        walletData.currency.toUpperCase(),
      ];

      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Failed to create wallet');
      }

      const wallet = result.rows[0];
      return this.mapRowToWallet(wallet);
    } catch (error) {
      console.error('Error creating wallet:', error);
      throw new Error('Failed to create wallet');
    }
  }

  /**
   * Get wallet by user ID, type, and currency
   */
  async findByUserTypeCurrency(
    userId: string,
    walletType: WalletType,
    currency: string
  ): Promise<Wallet | null> {
    try {
      const query = `
        SELECT id, user_id, wallet_type, balance, available_balance, frozen_balance,
               currency, created_at, updated_at, is_active, metadata
        FROM wallets
        WHERE user_id = $1 AND wallet_type = $2 AND currency = $3 AND is_active = true
      `;

      const result = await pool.query(query, [userId, walletType, currency.toUpperCase()]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToWallet(result.rows[0]);
    } catch (error) {
      console.error('Error finding wallet:', error);
      return null;
    }
  }

  /**
   * Get all wallets for a user
   */
  async findByUserId(userId: string): Promise<Wallet[]> {
    try {
      const query = `
        SELECT id, user_id, wallet_type, balance, available_balance, frozen_balance,
               currency, created_at, updated_at, is_active, metadata
        FROM wallets
        WHERE user_id = $1 AND is_active = true
        ORDER BY created_at ASC
      `;

      const result = await pool.query(query, [userId]);
      return result.rows.map(row => this.mapRowToWallet(row));
    } catch (error) {
      console.error('Error finding wallets by user ID:', error);
      return [];
    }
  }

  /**
   * Get wallet by ID
   */
  async findById(id: string): Promise<Wallet | null> {
    try {
      const query = `
        SELECT id, user_id, wallet_type, balance, available_balance, frozen_balance,
               currency, created_at, updated_at, is_active, metadata
        FROM wallets
        WHERE id = $1 AND is_active = true
      `;

      const result = await pool.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToWallet(result.rows[0]);
    } catch (error) {
      console.error('Error finding wallet by ID:', error);
      return null;
    }
  }

  /**
   * Update wallet balances (atomic operation)
   */
  async updateBalances(
    walletId: string,
    updates: {
      balance?: string;
      availableBalance?: string;
      frozenBalance?: string;
    }
  ): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lock the wallet row for update
      const lockQuery = 'SELECT id, balance, available_balance, frozen_balance FROM wallets WHERE id = $1 FOR UPDATE';
      const lockResult = await client.query(lockQuery, [walletId]);

      if (lockResult.rows.length === 0) {
        throw new Error('Wallet not found');
      }

      const currentWallet = lockResult.rows[0];
      const currentBalance = new Decimal(currentWallet.balance);
      const currentAvailable = new Decimal(currentWallet.available_balance);
      const currentFrozen = new Decimal(currentWallet.frozen_balance);

      let newBalance = currentBalance;
      let newAvailable = currentAvailable;
      let newFrozen = currentFrozen;

      // Update balance if provided
      if (updates.balance !== undefined) {
        newBalance = new Decimal(updates.balance);
      }

      // Update available balance if provided
      if (updates.availableBalance !== undefined) {
        newAvailable = new Decimal(updates.availableBalance);
      }

      // Update frozen balance if provided
      if (updates.frozenBalance !== undefined) {
        newFrozen = new Decimal(updates.frozenBalance);
      }

      // Validate that balance equals available + frozen
      const calculatedTotal = newAvailable.add(newFrozen);
      if (!calculatedTotal.equals(newBalance)) {
        throw new Error('Balance inconsistency: total must equal available + frozen');
      }

      // Validate that balances are non-negative
      if (newBalance.lt(0) || newAvailable.lt(0) || newFrozen.lt(0)) {
        throw new Error('Balances cannot be negative');
      }

      // Update the wallet
      const updateQuery = `
        UPDATE wallets
        SET balance = $1, available_balance = $2, frozen_balance = $3, updated_at = NOW()
        WHERE id = $4
      `;

      await client.query(updateQuery, [
        newBalance.toString(),
        newAvailable.toString(),
        newFrozen.toString(),
        walletId,
      ]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating wallet balances:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Freeze funds in a wallet
   */
  async freezeFunds(walletId: string, amount: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lock the wallet row
      const lockQuery = 'SELECT id, available_balance, frozen_balance, balance FROM wallets WHERE id = $1 FOR UPDATE';
      const lockResult = await client.query(lockQuery, [walletId]);

      if (lockResult.rows.length === 0) {
        throw new Error('Wallet not found');
      }

      const wallet = lockResult.rows[0];
      const available = new Decimal(wallet.available_balance);
      const frozen = new Decimal(wallet.frozen_balance);
      const freezeAmount = new Decimal(amount);

      // Check if enough funds are available
      if (available.lt(freezeAmount)) {
        throw new Error('Insufficient available funds');
      }

      // Update balances
      const newAvailable = available.minus(freezeAmount);
      const newFrozen = frozen.plus(freezeAmount);

      const updateQuery = `
        UPDATE wallets
        SET available_balance = $1, frozen_balance = $2, updated_at = NOW()
        WHERE id = $3
      `;

      await client.query(updateQuery, [
        newAvailable.toString(),
        newFrozen.toString(),
        walletId,
      ]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error freezing funds:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Unfreeze funds in a wallet
   */
  async unfreezeFunds(walletId: string, amount: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lock the wallet row
      const lockQuery = 'SELECT id, available_balance, frozen_balance FROM wallets WHERE id = $1 FOR UPDATE';
      const lockResult = await client.query(lockQuery, [walletId]);

      if (lockResult.rows.length === 0) {
        throw new Error('Wallet not found');
      }

      const wallet = lockResult.rows[0];
      const available = new Decimal(wallet.available_balance);
      const frozen = new Decimal(wallet.frozen_balance);
      const unfreezeAmount = new Decimal(amount);

      // Check if enough frozen funds are available
      if (frozen.lt(unfreezeAmount)) {
        throw new Error('Insufficient frozen funds');
      }

      // Update balances
      const newAvailable = available.plus(unfreezeAmount);
      const newFrozen = frozen.minus(unfreezeAmount);

      const updateQuery = `
        UPDATE wallets
        SET available_balance = $1, frozen_balance = $2, updated_at = NOW()
        WHERE id = $3
      `;

      await client.query(updateQuery, [
        newAvailable.toString(),
        newFrozen.toString(),
        walletId,
      ]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error unfreezing funds:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Add funds to wallet (deposit)
   */
  async addFunds(walletId: string, amount: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lock the wallet row
      const lockQuery = 'SELECT id, balance, available_balance FROM wallets WHERE id = $1 FOR UPDATE';
      const lockResult = await client.query(lockQuery, [walletId]);

      if (lockResult.rows.length === 0) {
        throw new Error('Wallet not found');
      }

      const wallet = lockResult.rows[0];
      const currentBalance = new Decimal(wallet.balance);
      const currentAvailable = new Decimal(wallet.available_balance);
      const addAmount = new Decimal(amount);

      if (addAmount.lte(0)) {
        throw new Error('Amount must be positive');
      }

      // Update balances
      const newBalance = currentBalance.plus(addAmount);
      const newAvailable = currentAvailable.plus(addAmount);

      const updateQuery = `
        UPDATE wallets
        SET balance = $1, available_balance = $2, updated_at = NOW()
        WHERE id = $3
      `;

      await client.query(updateQuery, [
        newBalance.toString(),
        newAvailable.toString(),
        walletId,
      ]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error adding funds:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Subtract funds from wallet (withdrawal)
   */
  async subtractFunds(walletId: string, amount: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lock the wallet row
      const lockQuery = 'SELECT id, balance, available_balance FROM wallets WHERE id = $1 FOR UPDATE';
      const lockResult = await client.query(lockQuery, [walletId]);

      if (lockResult.rows.length === 0) {
        throw new Error('Wallet not found');
      }

      const wallet = lockResult.rows[0];
      const currentBalance = new Decimal(wallet.balance);
      const currentAvailable = new Decimal(wallet.available_balance);
      const subtractAmount = new Decimal(amount);

      if (subtractAmount.lte(0)) {
        throw new Error('Amount must be positive');
      }

      // Check if enough funds are available
      if (currentAvailable.lt(subtractAmount)) {
        throw new Error('Insufficient available funds');
      }

      // Update balances
      const newBalance = currentBalance.minus(subtractAmount);
      const newAvailable = currentAvailable.minus(subtractAmount);

      if (newBalance.lt(0) || newAvailable.lt(0)) {
        throw new Error('Insufficient funds');
      }

      const updateQuery = `
        UPDATE wallets
        SET balance = $1, available_balance = $2, updated_at = NOW()
        WHERE id = $3
      `;

      await client.query(updateQuery, [
        newBalance.toString(),
        newAvailable.toString(),
        walletId,
      ]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error subtracting funds:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get wallet statistics for a user
   */
  async getUserWalletStats(userId: string): Promise<{
    totalBalance: string;
    availableBalance: string;
    frozenBalance: string;
    walletBreakdown: Array<{
      currency: string;
      total: string;
      available: string;
      frozen: string;
      walletType: string;
    }>;
  }> {
    try {
      const query = `
        SELECT wallet_type, currency, SUM(balance) as total_balance,
               SUM(available_balance) as available_balance,
               SUM(frozen_balance) as frozen_balance
        FROM wallets
        WHERE user_id = $1 AND is_active = true
        GROUP BY wallet_type, currency
        ORDER BY currency, wallet_type
      `;

      const result = await pool.query(query, [userId]);

      let totalBalance = new Decimal('0');
      let availableBalance = new Decimal('0');
      let frozenBalance = new Decimal('0');

      const walletBreakdown = result.rows.map(row => {
        const total = new Decimal(row.total_balance);
        const available = new Decimal(row.available_balance);
        const frozen = new Decimal(row.frozen_balance);

        totalBalance = totalBalance.plus(total);
        availableBalance = availableBalance.plus(available);
        frozenBalance = frozenBalance.plus(frozen);

        return {
          currency: row.currency,
          total: total.toString(),
          available: available.toString(),
          frozen: frozen.toString(),
          walletType: row.wallet_type,
        };
      });

      return {
        totalBalance: totalBalance.toString(),
        availableBalance: availableBalance.toString(),
        frozenBalance: frozenBalance.toString(),
        walletBreakdown,
      };
    } catch (error) {
      console.error('Error getting wallet stats:', error);
      throw new Error('Failed to get wallet statistics');
    }
  }

  /**
   * Deactivate wallet (soft delete)
   */
  async deactivateWallet(walletId: string): Promise<void> {
    try {
      const query = 'UPDATE wallets SET is_active = false, updated_at = NOW() WHERE id = $1';
      await pool.query(query, [walletId]);
    } catch (error) {
      console.error('Error deactivating wallet:', error);
      throw new Error('Failed to deactivate wallet');
    }
  }

  /**
   * Map database row to Wallet object
   */
  private mapRowToWallet(row: any): Wallet {
    return {
      id: row.id,
      userId: row.user_id,
      walletType: row.wallet_type as WalletType,
      balance: row.balance,
      availableBalance: row.available_balance,
      frozenBalance: row.frozen_balance,
      currency: row.currency,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const walletModel = new WalletModel();