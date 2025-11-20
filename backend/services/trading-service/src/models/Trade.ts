import Decimal from 'decimal.js';
import { pool } from '../config/database';
import {
  Trade,
  TradeSide,
  TradeStatus,
  AIStrategy,
  AIPrediction,
  TimeFrame,
} from '../../../../../backend/shared/types';

export interface CreateTradeRequest {
  userId: string;
  strategyId?: string;
  symbol: string;
  side: TradeSide;
  quantity: string;
  price?: string;
  stopLoss?: string;
  takeProfit?: string;
  leverage?: number;
  accountType: 'real' | 'demo';
  metadata?: Record<string, any>;
}

export interface UpdateTradeRequest {
  stopLoss?: string;
  takeProfit?: string;
  quantity?: string;
  metadata?: Record<string, any>;
}

export class TradeModel {
  /**
   * Create a new trade
   */
  async create(tradeData: CreateTradeRequest): Promise<Trade> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lock user for concurrent operations
      await client.query('SELECT 1 FROM users WHERE id = $1 FOR UPDATE', [tradeData.userId]);

      // Validate and get current price if not provided
      let currentPrice = tradeData.price;
      if (!currentPrice) {
        currentPrice = await this.getCurrentPrice(tradeData.symbol);
        if (!currentPrice) {
          throw new Error('Unable to get current price for symbol');
        }
      }

      const price = new Decimal(currentPrice);
      const quantity = new Decimal(tradeData.quantity);
      const totalValue = price.mul(quantity);

      // Validate trade value
      const minTradeValue = new Decimal('10'); // $10 minimum trade
      if (totalValue.lt(minTradeValue)) {
        throw new Error(`Trade value must be at least $${minTradeValue}`);
      }

      // Calculate margin and commission
      const leverage = tradeData.leverage || 1;
      const commission = totalValue.mul(0.001); // 0.1% commission
      const margin = leverage > 1 ? totalValue.div(leverage) : totalValue;

      // Insert trade
      const query = `
        INSERT INTO trades (
          user_id, strategy_id, symbol, side, quantity, price,
          stop_loss, take_profit, status, commission, leverage,
          margin, account_type, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;

      const values = [
        tradeData.userId,
        tradeData.strategyId || null,
        tradeData.symbol,
        tradeData.side,
        quantity.toString(),
        price.toString(),
        tradeData.stopLoss || null,
        tradeData.takeProfit || null,
        TradeStatus.PENDING,
        commission.toString(),
        leverage,
        margin.toString(),
        tradeData.accountType,
        JSON.stringify(tradeData.metadata || {}),
      ];

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Failed to create trade');
      }

      await client.query('COMMIT');

      const trade = result.rows[0];
      return this.mapRowToTrade(trade);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating trade:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get trade by ID
   */
  async findById(id: string): Promise<Trade | null> {
    try {
      const query = `
        SELECT *
        FROM trades
        WHERE id = $1
      `;

      const result = await pool.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToTrade(result.rows[0]);
    } catch (error) {
      console.error('Error finding trade by ID:', error);
      return null;
    }
  }

  /**
   * Get trades for a user with pagination
   */
  async findByUserId(
    userId: string,
    page: number = 1,
    limit: number = 20,
    filters: {
      symbol?: string;
      side?: TradeSide;
      status?: TradeStatus;
      accountType?: 'real' | 'demo';
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{
    trades: Trade[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      let query = `
        SELECT *
        FROM trades
        WHERE user_id = $1
      `;

      const values: any[] = [userId];
      let paramIndex = 2;

      // Apply filters
      if (filters.symbol) {
        query += ` AND symbol = $${paramIndex++}`;
        values.push(filters.symbol);
      }

      if (filters.side) {
        query += ` AND side = $${paramIndex++}`;
        values.push(filters.side);
      }

      if (filters.status) {
        query += ` AND status = $${paramIndex++}`;
        values.push(filters.status);
      }

      if (filters.accountType) {
        query += ` AND account_type = $${paramIndex++}`;
        values.push(filters.accountType);
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
      let countQuery = 'SELECT COUNT(*) as total FROM trades WHERE user_id = $1';
      const countValues: any[] = [userId];
      let countParamIndex = 2;

      if (filters.symbol) {
        countQuery += ` AND symbol = $${countParamIndex++}`;
        countValues.push(filters.symbol);
      }

      if (filters.side) {
        countQuery += ` AND side = $${countParamIndex++}`;
        countValues.push(filters.side);
      }

      if (filters.status) {
        countQuery += ` AND status = $${countParamIndex++}`;
        countValues.push(filters.status);
      }

      if (filters.accountType) {
        countQuery += ` AND account_type = $${countParamIndex++}`;
        countValues.push(filters.accountType);
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
        trades: result.rows.map(row => this.mapRowToTrade(row)),
        total,
        page,
        totalPages,
      };
    } catch (error) {
      console.error('Error finding trades by user ID:', error);
      return {
        trades: [],
        total: 0,
        page,
        totalPages: 0,
      };
    }
  }

  /**
   * Update trade
   */
  async update(id: string, updates: UpdateTradeRequest): Promise<Trade> {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.stopLoss !== undefined) {
        fields.push(`stop_loss = $${paramIndex++}`);
        values.push(updates.stopLoss);
      }

      if (updates.takeProfit !== undefined) {
        fields.push(`take_profit = $${paramIndex++}`);
        values.push(updates.takeProfit);
      }

      if (updates.quantity !== undefined) {
        fields.push(`quantity = $${paramIndex++}`);
        values.push(updates.quantity);
      }

      if (updates.metadata !== undefined) {
        fields.push(`metadata = $${paramIndex++}`);
        values.push(JSON.stringify(updates.metadata));
      }

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      fields.push(`updated_at = NOW()`);
      values.push(id);

      const query = `UPDATE trades SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Trade not found');
      }

      return this.mapRowToTrade(result.rows[0]);
    } catch (error) {
      console.error('Error updating trade:', error);
      throw error;
    }
  }

  /**
   * Update trade status
   */
  async updateStatus(
    id: string,
    status: TradeStatus,
    profitLoss?: string,
    brokerOrderId?: string,
    executedPrice?: string,
    executedAt?: Date
  ): Promise<Trade> {
    try {
      const query = `
        UPDATE trades
        SET status = $1, updated_at = NOW()
        ${profitLoss !== undefined ? ', profit_loss = $2' : ''}
        ${brokerOrderId !== undefined ? ', broker_order_id = $3' : ''}
        ${executedPrice !== undefined ? ', closing_price = $4' : ''}
        ${executedAt !== undefined ? ', executed_at = $5' : ''}
        WHERE id = $6
        RETURNING *
      `;

      const values: any[] = [id];
      let paramIndex = 2;

      if (profitLoss !== undefined) {
        values.splice(1, 0, profitLoss);
        paramIndex++;
      }

      if (brokerOrderId !== undefined) {
        values.splice(paramIndex - 1, 0, brokerOrderId);
        paramIndex++;
      }

      if (executedPrice !== undefined) {
        values.splice(paramIndex - 1, 0, executedPrice);
        paramIndex++;
      }

      if (executedAt !== undefined) {
        values.splice(paramIndex - 1, 0, executedAt);
        paramIndex++;
      }

      values.push(id);

      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Trade not found');
      }

      return this.mapRowToTrade(result.rows[0]);
    } catch (error) {
      console.error('Error updating trade status:', error);
      throw error;
    }
  }

  /**
   * Get open positions for a user
   */
  async getOpenPositions(userId: string, accountType?: 'real' | 'demo'): Promise<Trade[]> {
    try {
      let query = `
        SELECT *
        FROM trades
        WHERE user_id = $1 AND status IN ('executed', 'partially_filled')
      `;

      const values = [userId];

      if (accountType) {
        query += ` AND account_type = $2`;
        values.push(accountType);
      }

      query += ` ORDER BY executed_at ASC`;

      const result = await pool.query(query, values);
      return result.rows.map(row => this.mapRowToTrade(row));
    } catch (error) {
      console.error('Error getting open positions:', error);
      return [];
    }
  }

  /**
   * Get trading statistics for a user
   */
  async getTradingStats(
    userId: string,
    accountType?: 'real' | 'demo',
    days: number = 30
  ): Promise<{
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    totalProfitLoss: string;
    averageWin: string;
    averageLoss: string;
    profitFactor: number;
    totalVolume: string;
    totalCommission: string;
  }> {
    try {
      let query = `
        SELECT
          COUNT(*) as total_trades,
          COUNT(CASE WHEN profit_loss > 0 THEN 1 END) as winning_trades,
          COUNT(CASE WHEN profit_loss < 0 THEN 1 END) as losing_trades,
          COALESCE(SUM(profit_loss), 0) as total_profit_loss,
          COALESCE(SUM(CASE WHEN profit_loss > 0 THEN profit_loss END), 0) as total_wins,
          COALESCE(SUM(CASE WHEN profit_loss < 0 THEN ABS(profit_loss) END), 0) as total_losses,
          COALESCE(SUM(quantity * price), 0) as total_volume,
          COALESCE(SUM(commission), 0) as total_commission
        FROM trades
        WHERE user_id = $1 AND status = 'executed'
          AND executed_at >= NOW() - INTERVAL '${days} days'
      `;

      const values = [userId];

      if (accountType) {
        query += ` AND account_type = $2`;
        values.push(accountType);
      }

      const result = await pool.query(query, values);
      const row = result.rows[0];

      const totalTrades = parseInt(row.total_trades);
      const winningTrades = parseInt(row.winning_trades);
      const losingTrades = parseInt(row.losing_trades);
      const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;
      const averageWin = winningTrades > 0 ? row.total_wins / winningTrades : 0;
      const averageLoss = losingTrades > 0 ? row.total_losses / losingTrades : 0;
      const profitFactor = row.total_losses > 0 ? row.total_wins / row.total_losses : row.total_wins > 0 ? Infinity : 0;

      return {
        totalTrades,
        winningTrades,
        losingTrades,
        winRate,
        totalProfitLoss: row.total_profit_loss.toString(),
        averageWin: averageWin.toString(),
        averageLoss: averageLoss.toString(),
        profitFactor,
        totalVolume: row.total_volume.toString(),
        totalCommission: row.total_commission.toString(),
      };
    } catch (error) {
      console.error('Error getting trading statistics:', error);
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalProfitLoss: '0',
        averageWin: '0',
        averageLoss: '0',
        profitFactor: 0,
        totalVolume: '0',
        totalCommission: '0',
      };
    }
  }

  /**
   * Get daily P&L for a user
   */
  async getDailyPnL(
    userId: string,
    days: number = 30
  ): Promise<Array<{ date: string; pnl: string; trades: number }>> {
    try {
      const query = `
        SELECT
          DATE(executed_at) as date,
          COALESCE(SUM(profit_loss), 0) as pnl,
          COUNT(*) as trades
        FROM trades
        WHERE user_id = $1 AND status = 'executed'
          AND executed_at >= NOW() - INTERVAL '${days} days'
        GROUP BY DATE(executed_at)
        ORDER BY date DESC
      `;

      const result = await pool.query(query, [userId]);

      return result.rows.map(row => ({
        date: row.date,
        pnl: row.pnl.toString(),
        trades: parseInt(row.trades),
      }));
    } catch (error) {
      console.error('Error getting daily P&L:', error);
      return [];
    }
  }

  /**
   * Close a trade
   */
  async closeTrade(
    id: string,
    closePrice?: number,
    reason?: string
  ): Promise<Trade> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get trade details
      const trade = await this.findById(id);
      if (!trade) {
        throw new Error('Trade not found');
      }

      if (trade.status !== TradeStatus.EXECUTED) {
        throw new Error('Cannot close trade that is not executed');
      }

      // Get closing price if not provided
      const finalPrice = closePrice || await this.getCurrentPrice(trade.symbol);
      if (!finalPrice) {
        throw new Error('Unable to get closing price');
      }

      // Calculate profit/loss
      const entryPrice = parseFloat(trade.price);
      const exitPrice = finalPrice;
      const quantity = parseFloat(trade.quantity);

      let profitLoss: number;
      if (trade.side === TradeSide.BUY) {
        profitLoss = (exitPrice - entryPrice) * quantity;
      } else {
        profitLoss = (entryPrice - exitPrice) * quantity;
      }

      // Update trade
      const updateQuery = `
        UPDATE trades
        SET status = $1, profit_loss = $2, closing_price = $3,
            updated_at = NOW(), reason_code = $4
        WHERE id = $5
        RETURNING *
      `;

      const result = await client.query(updateQuery, [
        TradeStatus.CANCELLED, // Use cancelled for closed trades
        profitLoss.toString(),
        exitPrice.toString(),
        reason || 'manual_close',
        id,
      ]);

      await client.query('COMMIT');

      return this.mapRowToTrade(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error closing trade:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get current price for a symbol (simplified implementation)
   */
  private async getCurrentPrice(symbol: string): Promise<number | null> {
    try {
      const query = `
        SELECT close_price
        FROM market_data
        WHERE symbol = $1
        ORDER BY time DESC
        LIMIT 1
      `;

      const result = await pool.query(query, [symbol]);
      return result.rows.length > 0 ? parseFloat(result.rows[0].close_price) : null;
    } catch (error) {
      console.error('Error getting current price:', error);
      return null;
    }
  }

  /**
   * Map database row to Trade object
   */
  private mapRowToTrade(row: any): Trade {
    return {
      id: row.id,
      userId: row.user_id,
      strategyId: row.strategy_id,
      symbol: row.symbol,
      side: row.side as TradeSide,
      quantity: row.quantity,
      price: row.price,
      stopLoss: row.stop_loss,
      takeProfit: row.take_profit,
      status: row.status as TradeStatus,
      profitLoss: row.profit_loss,
      commission: row.commission,
      brokerOrderId: row.broker_order_id,
      executedAt: row.executed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      leverage: row.leverage,
      margin: row.margin,
    };
  }
}

export const tradeModel = new TradeModel();