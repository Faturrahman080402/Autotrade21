import bcrypt from 'bcryptjs';
import { pool } from '../config/database';
import { User, AccountType, KYCStatus } from '../../../shared/types';

export class UserModel {
  private readonly saltRounds = 12;

  /**
   * Create a new user
   */
  async create(userData: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    accountType?: AccountType;
  }): Promise<{ user: Omit<User, 'passwordHash'>; id: string }> {
    try {
      // Hash password
      const passwordHash = await bcrypt.hash(userData.password, this.saltRounds);

      // Insert user into database
      const query = `
        INSERT INTO users (
          email, password_hash, first_name, last_name, phone,
          account_type, is_verified, is_active, kyc_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, email, first_name, last_name, phone, account_type,
                 is_verified, is_active, kyc_status, created_at, updated_at,
                 last_login, two_factor_enabled, email_verified, phone_verified,
                 date_of_birth, country, state_province, city, address,
                 postal_code, preferences, metadata
      `;

      const values = [
        userData.email.toLowerCase().trim(),
        passwordHash,
        userData.firstName || null,
        userData.lastName || null,
        userData.phone || null,
        userData.accountType || AccountType.STANDARD,
        false, // is_verified
        true,  // is_active
        KYCStatus.NOT_STARTED,
      ];

      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Failed to create user');
      }

      const user = result.rows[0];

      // Create default wallets for the user
      await this.createDefaultWallets(user.id);

      // Return user without password hash
      const { password_hash, ...userWithoutPassword } = user;

      return {
        user: {
          id: userWithoutPassword.id,
          email: userWithoutPassword.email,
          passwordHash: '', // Never return password hash
          firstName: userWithoutPassword.first_name,
          lastName: userWithoutPassword.last_name,
          phone: userWithoutPassword.phone,
          avatarUrl: userWithoutPassword.avatar_url,
          accountType: userWithoutPassword.account_type as AccountType,
          isVerified: userWithoutPassword.is_verified,
          isActive: userWithoutPassword.is_active,
          createdAt: userWithoutPassword.created_at,
          updatedAt: userWithoutPassword.updated_at,
          lastLogin: userWithoutPassword.last_login,
          twoFactorEnabled: userWithoutPassword.two_factor_enabled,
          twoFactorSecret: userWithoutPassword.two_factor_secret,
        },
        id: userWithoutPassword.id,
      };
    } catch (error) {
      // Handle unique constraint violation for email
      if (error instanceof Error && error.message.includes('users_email_key')) {
        throw new Error('Email already exists');
      }
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<(User & { passwordHash: string }) | null> {
    try {
      const query = `
        SELECT id, email, password_hash, first_name, last_name, phone,
               avatar_url, account_type, is_verified, is_active,
               created_at, updated_at, last_login, two_factor_enabled,
               two_factor_secret, kyc_status, email_verified, phone_verified,
               date_of_birth, country, state_province, city, address,
               postal_code, preferences, metadata
        FROM users
        WHERE email = $1 AND is_active = true
      `;

      const result = await pool.query(query, [email.toLowerCase().trim()]);

      if (result.rows.length === 0) {
        return null;
      }

      const user = result.rows[0];
      return {
        id: user.id,
        email: user.email,
        passwordHash: user.password_hash,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        avatarUrl: user.avatar_url,
        accountType: user.account_type as AccountType,
        isVerified: user.is_verified,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        lastLogin: user.last_login,
        twoFactorEnabled: user.two_factor_enabled,
        twoFactorSecret: user.two_factor_secret,
      };
    } catch (error) {
      console.error('Error finding user by email:', error);
      return null;
    }
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    try {
      const query = `
        SELECT id, email, first_name, last_name, phone, avatar_url,
               account_type, is_verified, is_active, created_at, updated_at,
               last_login, two_factor_enabled, two_factor_secret, kyc_status,
               email_verified, phone_verified, date_of_birth, country,
               state_province, city, address, postal_code, preferences,
               metadata
        FROM users
        WHERE id = $1 AND is_active = true
      `;

      const result = await pool.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      const user = result.rows[0];
      return {
        id: user.id,
        email: user.email,
        passwordHash: '', // Never return password hash
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        avatarUrl: user.avatar_url,
        accountType: user.account_type as AccountType,
        isVerified: user.is_verified,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        lastLogin: user.last_login,
        twoFactorEnabled: user.two_factor_enabled,
        twoFactorSecret: user.two_factor_secret,
      };
    } catch (error) {
      console.error('Error finding user by ID:', error);
      return null;
    }
  }

  /**
   * Update user last login timestamp
   */
  async updateLastLogin(id: string): Promise<void> {
    try {
      const query = 'UPDATE users SET last_login = NOW() WHERE id = $1';
      await pool.query(query, [id]);
    } catch (error) {
      console.error('Error updating last login:', error);
      throw new Error('Failed to update last login');
    }
  }

  /**
   * Enable two-factor authentication for user
   */
  async enableTwoFactor(id: string, secret: string): Promise<void> {
    try {
      const query = `
        UPDATE users
        SET two_factor_enabled = true, two_factor_secret = $2, updated_at = NOW()
        WHERE id = $1
      `;
      await pool.query(query, [id, secret]);
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      throw new Error('Failed to enable two-factor authentication');
    }
  }

  /**
   * Disable two-factor authentication for user
   */
  async disableTwoFactor(id: string): Promise<void> {
    try {
      const query = `
        UPDATE users
        SET two_factor_enabled = false, two_factor_secret = NULL, updated_at = NOW()
        WHERE id = $1
      `;
      await pool.query(query, [id]);
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      throw new Error('Failed to disable two-factor authentication');
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(id: string, updates: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    dateOfBirth?: Date;
    country?: string;
    stateProvince?: string;
    city?: string;
    address?: string;
    postalCode?: string;
  }): Promise<void> {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.firstName !== undefined) {
        fields.push(`first_name = $${paramIndex++}`);
        values.push(updates.firstName);
      }
      if (updates.lastName !== undefined) {
        fields.push(`last_name = $${paramIndex++}`);
        values.push(updates.lastName);
      }
      if (updates.phone !== undefined) {
        fields.push(`phone = $${paramIndex++}`);
        values.push(updates.phone);
      }
      if (updates.dateOfBirth !== undefined) {
        fields.push(`date_of_birth = $${paramIndex++}`);
        values.push(updates.dateOfBirth);
      }
      if (updates.country !== undefined) {
        fields.push(`country = $${paramIndex++}`);
        values.push(updates.country);
      }
      if (updates.stateProvince !== undefined) {
        fields.push(`state_province = $${paramIndex++}`);
        values.push(updates.stateProvince);
      }
      if (updates.city !== undefined) {
        fields.push(`city = $${paramIndex++}`);
        values.push(updates.city);
      }
      if (updates.address !== undefined) {
        fields.push(`address = $${paramIndex++}`);
        values.push(updates.address);
      }
      if (updates.postalCode !== undefined) {
        fields.push(`postal_code = $${paramIndex++}`);
        values.push(updates.postalCode);
      }

      if (fields.length === 0) {
        return; // No updates to make
      }

      fields.push(`updated_at = NOW()`);
      values.push(id);

      const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex}`;
      await pool.query(query, values);
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new Error('Failed to update user profile');
    }
  }

  /**
   * Update user password
   */
  async updatePassword(id: string, newPassword: string): Promise<void> {
    try {
      const passwordHash = await bcrypt.hash(newPassword, this.saltRounds);
      const query = `
        UPDATE users
        SET password_hash = $2, updated_at = NOW()
        WHERE id = $1
      `;
      await pool.query(query, [id, passwordHash]);
    } catch (error) {
      console.error('Error updating password:', error);
      throw new Error('Failed to update password');
    }
  }

  /**
   * Verify password
   */
  async verifyPassword(email: string, password: string): Promise<User | null> {
    try {
      const user = await this.findByEmail(email);
      if (!user) {
        return null;
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return null;
      }

      // Return user without password hash
      const { passwordHash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      console.error('Error verifying password:', error);
      return null;
    }
  }

  /**
   * Create default wallets for new user
   */
  private async createDefaultWallets(userId: string): Promise<void> {
    try {
      const defaultCurrencies = ['USD', 'BTC', 'ETH'];
      const walletTypes = ['trading', 'funding'];

      for (const currency of defaultCurrencies) {
        for (const walletType of walletTypes) {
          const query = `
            INSERT INTO wallets (user_id, wallet_type, balance, available_balance, frozen_balance, currency)
            VALUES ($1, $2, 0, 0, 0, $3)
            ON CONFLICT (user_id, wallet_type, currency) DO NOTHING
          `;
          await pool.query(query, [userId, walletType, currency]);
        }
      }
    } catch (error) {
      console.error('Error creating default wallets:', error);
      // Don't throw error here as user creation should not fail if wallet creation fails
    }
  }

  /**
   * Deactivate user (soft delete)
   */
  async deactivateUser(id: string): Promise<void> {
    try {
      const query = 'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1';
      await pool.query(query, [id]);
    } catch (error) {
      console.error('Error deactivating user:', error);
      throw new Error('Failed to deactivate user');
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string): Promise<{
    totalDeposits: string;
    totalWithdrawals: string;
    activeTrades: number;
    totalTrades: number;
    portfolioValue: string;
  }> {
    try {
      const queries = [
        // Total deposits
        `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
         WHERE user_id = $1 AND type = 'deposit' AND status = 'completed'`,
        // Total withdrawals
        `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
         WHERE user_id = $1 AND type = 'withdrawal' AND status = 'completed'`,
        // Active trades
        `SELECT COUNT(*) as count FROM trades
         WHERE user_id = $1 AND status IN ('pending', 'executed', 'partially_filled')`,
        // Total trades
        `SELECT COUNT(*) as count FROM trades WHERE user_id = $1`,
        // Portfolio value
        `SELECT COALESCE(SUM(balance), 0) as total FROM wallets
         WHERE user_id = $1 AND wallet_type = 'trading' AND is_active = true`,
      ];

      const results = await Promise.all(
        queries.map(query => pool.query(query, [userId]))
      );

      return {
        totalDeposits: results[0].rows[0].total || '0',
        totalWithdrawals: results[1].rows[0].total || '0',
        activeTrades: parseInt(results[2].rows[0].count || '0'),
        totalTrades: parseInt(results[3].rows[0].count || '0'),
        portfolioValue: results[4].rows[0].total || '0',
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw new Error('Failed to get user statistics');
    }
  }
}

export const userModel = new UserModel();