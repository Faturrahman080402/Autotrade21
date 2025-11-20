import Decimal from 'decimal.js';
import { pool } from '../config/database';
import { Trade, TradeSide, AccountType } from '../../../../../backend/shared/types';
import { AIPrediction, PredictionType } from '../../../../../backend/shared/types';

export interface RiskLimits {
  maxDailyLoss: string;
  maxPositionSize: string;
  maxOpenPositions: number;
  maxLeverage: number;
  maxCorrelationExposure: number;
  minConfidenceThreshold: number;
  stopLossPercentage: number;
  takeProfitPercentage: number;
}

export interface RiskAssessment {
  approved: boolean;
  reason?: string;
  adjustedQuantity?: string;
  adjustedStopLoss?: string;
  adjustedTakeProfit?: string;
  riskScore: number;
  warnings: string[];
}

export interface Position {
  symbol: string;
  side: TradeSide;
  quantity: string;
  entryPrice: string;
  currentPrice: string;
  unrealizedPnL: string;
  percentagePnL: number;
  value: string;
}

export interface RiskMetrics {
  totalExposure: string;
  freeMargin: string;
  marginLevel: number;
  dailyPnL: string;
  unrealizedPnL: string;
  maxDrawdown: string;
  var95: string; // Value at Risk 95%
  concentrationRisk: number;
}

export class RiskManager {
  private defaultLimits: RiskLimits = {
    maxDailyLoss: '1000', // $1000
    maxPositionSize: '10000', // $10,000
    maxOpenPositions: 10,
    maxLeverage: 50,
    maxCorrelationExposure: 0.7,
    minConfidenceThreshold: 0.65,
    stopLossPercentage: 0.02, // 2%
    takeProfitPercentage: 0.06, // 6%
  };

  /**
   * Assess trade risk before execution
   */
  async assessTradeRisk(
    userId: string,
    tradeData: {
      symbol: string;
      side: TradeSide;
      quantity: string;
      price?: string;
      stopLoss?: string;
      takeProfit?: string;
      leverage?: number;
      confidence?: number;
    },
    prediction?: AIPrediction
  ): Promise<RiskAssessment> {
    try {
      const warnings: string[] = [];
      let riskScore = 0;
      let approved = true;
      let reason: string | undefined;

      // Get user's current position
      const userLimits = await this.getUserRiskLimits(userId);
      const currentPosition = await this.getUserCurrentPosition(userId);
      const dailyPnL = await this.getDailyPnL(userId);

      // Get current price
      const currentPrice = tradeData.price || await this.getCurrentPrice(tradeData.symbol);
      if (!currentPrice) {
        return {
          approved: false,
          reason: 'Unable to determine current price',
          riskScore: 100,
          warnings: ['Price data unavailable'],
        };
      }

      const tradeValue = new Decimal(tradeData.quantity).mul(currentPrice);

      // Check 1: Position size limit
      if (tradeValue.gt(userLimits.maxPositionSize)) {
        approved = false;
        reason = `Trade size ${tradeValue} exceeds maximum position size ${userLimits.maxPositionSize}`;
        riskScore += 30;
      }

      // Check 2: Maximum open positions
      if (currentPosition.openPositions >= userLimits.maxOpenPositions) {
        approved = false;
        reason = `Maximum open positions (${userLimits.maxOpenPositions}) reached`;
        riskScore += 25;
      }

      // Check 3: Daily loss limit
      const dailyLoss = dailyPnL.startsWith('-') ? new Decimal(dailyPnL).abs() : new Decimal(0);
      if (dailyLoss.gte(userLimits.maxDailyLoss)) {
        approved = false;
        reason = `Daily loss limit exceeded. Current loss: ${dailyLoss}, Limit: ${userLimits.maxDailyLoss}`;
        riskScore += 40;
      }

      // Check 4: Leverage limit
      const leverage = tradeData.leverage || 1;
      if (leverage > userLimits.maxLeverage) {
        warnings.push(`Leverage ${leverage} exceeds recommended maximum ${userLimits.maxLeverage}`);
        riskScore += 15;
      }

      // Check 5: AI prediction confidence
      if (prediction && prediction.confidence < userLimits.minConfidenceThreshold) {
        warnings.push(`AI prediction confidence ${prediction.confidence} below threshold ${userLimits.minConfidenceThreshold}`);
        riskScore += 10;
      }

      // Check 6: Stop loss and take profit validation
      let adjustedStopLoss: string | undefined;
      let adjustedTakeProfit: string | undefined;

      if (!tradeData.stopLoss) {
        // Auto-calculate stop loss
        const stopLossPrice = this.calculateStopLoss(
          currentPrice,
          tradeData.side,
          userLimits.stopLossPercentage
        );
        adjustedStopLoss = stopLossPrice.toString();
        warnings.push('Auto-generated stop loss applied');
        riskScore += 5;
      } else {
        const stopLossPrice = parseFloat(tradeData.stopLoss);
        const stopLossDistance = Math.abs(currentPrice - stopLossPrice) / currentPrice;

        if (stopLossDistance > userLimits.stopLossPercentage * 2) {
          warnings.push('Stop loss is too far from entry price');
          riskScore += 10;
        }

        if (stopLossDistance < userLimits.stopLossPercentage * 0.5) {
          warnings.push('Stop loss is too close to entry price');
          riskScore += 5;
        }
      }

      if (!tradeData.takeProfit) {
        // Auto-calculate take profit
        const takeProfitPrice = this.calculateTakeProfit(
          currentPrice,
          tradeData.side,
          userLimits.takeProfitPercentage
        );
        adjustedTakeProfit = takeProfitPrice.toString();
        warnings.push('Auto-generated take profit applied');
        riskScore += 2;
      }

      // Check 7: Correlation with existing positions
      const correlationRisk = await this.calculateCorrelationRisk(
        userId,
        tradeData.symbol,
        currentPosition.positions
      );
      if (correlationRisk > userLimits.maxCorrelationExposure) {
        warnings.push(`High correlation risk (${(correlationRisk * 100).toFixed(1)}%) with existing positions`);
        riskScore += 20;
      }

      // Check 8: Risk/reward ratio
      const stopLossPrice = parseFloat(tradeData.stopLoss || adjustedStopLoss || '0');
      const takeProfitPrice = parseFloat(tradeData.takeProfit || adjustedTakeProfit || '0');
      if (stopLossPrice > 0 && takeProfitPrice > 0) {
        const riskRewardRatio = this.calculateRiskRewardRatio(
          currentPrice,
          stopLossPrice,
          takeProfitPrice,
          tradeData.side
        );

        if (riskRewardRatio < 1) {
          warnings.push(`Risk/reward ratio (${riskRewardRatio.toFixed(2)}) is below recommended 1:1`);
          riskScore += 15;
        }
      }

      // Check 9: Volatility risk
      const volatility = await this.getSymbolVolatility(tradeData.symbol);
      if (volatility > 0.05) { // 5% volatility threshold
        warnings.push(`High volatility detected (${(volatility * 100).toFixed(1)}%)`);
        riskScore += 10;
      }

      // Final assessment
      if (riskScore > 70) {
        approved = false;
        reason = reason || 'Overall risk score too high';
      }

      return {
        approved,
        reason,
        adjustedQuantity: approved ? tradeData.quantity : undefined,
        adjustedStopLoss,
        adjustedTakeProfit,
        riskScore,
        warnings,
      };
    } catch (error) {
      console.error('Error assessing trade risk:', error);
      return {
        approved: false,
        reason: 'Risk assessment failed',
        riskScore: 100,
        warnings: ['System error during risk assessment'],
      };
    }
  }

  /**
   * Get current risk metrics for a user
   */
  async getRiskMetrics(userId: string): Promise<RiskMetrics> {
    try {
      const position = await this.getUserCurrentPosition(userId);
      const dailyPnL = await this.getDailyPnL(userId);
      const var95 = await this.calculateValueAtRisk(userId, 0.95);

      // Calculate concentration risk
      const concentrationRisk = this.calculateConcentrationRisk(position.positions);

      return {
        totalExposure: position.totalValue,
        freeMargin: position.availableBalance,
        marginLevel: position.marginLevel,
        dailyPnL,
        unrealizedPnL: position.unrealizedPnL,
        maxDrawdown: position.maxDrawdown,
        var95,
        concentrationRisk,
      };
    } catch (error) {
      console.error('Error getting risk metrics:', error);
      return {
        totalExposure: '0',
        freeMargin: '0',
        marginLevel: 0,
        dailyPnL: '0',
        unrealizedPnL: '0',
        maxDrawdown: '0',
        var95: '0',
        concentrationRisk: 0,
      };
    }
  }

  /**
   * Check if user should be liquidated
   */
  async checkLiquidationRisk(userId: string): Promise<{
    liquidationRisk: boolean;
    marginLevel: number;
    warnings: string[];
  }> {
    try {
      const position = await this.getUserCurrentPosition(userId);
      const warnings: string[] = [];

      // Critical margin levels
      if (position.marginLevel < 50) {
        warnings.push('Critical: Margin level below 50%');
        return {
          liquidationRisk: true,
          marginLevel: position.marginLevel,
          warnings,
        };
      }

      if (position.marginLevel < 100) {
        warnings.push('Warning: Margin level below 100%');
      }

      if (position.marginLevel < 150) {
        warnings.push('Caution: Margin level below 150%');
      }

      return {
        liquidationRisk: false,
        marginLevel: position.marginLevel,
        warnings,
      };
    } catch (error) {
      console.error('Error checking liquidation risk:', error);
      return {
        liquidationRisk: true,
        marginLevel: 0,
        warnings: ['Unable to assess liquidation risk'],
      };
    }
  }

  /**
   * Get user-specific risk limits
   */
  private async getUserRiskLimits(userId: string): Promise<RiskLimits> {
    try {
      const query = `
        SELECT account_type, preferences
        FROM users
        WHERE id = $1
      `;

      const result = await pool.query(query, [userId]);

      if (result.rows.length === 0) {
        return this.defaultLimits;
      }

      const user = result.rows[0];
      const preferences = user.preferences || {};

      // Adjust limits based on account type
      let limits = { ...this.defaultLimits };

      switch (user.account_type) {
        case AccountType.PREMIUM:
          limits.maxDailyLoss = '5000';
          limits.maxPositionSize = '50000';
          limits.maxOpenPositions = 20;
          limits.maxLeverage = 100;
          break;
        case AccountType.ENTERPRISE:
          limits.maxDailyLoss = '20000';
          limits.maxPositionSize = '200000';
          limits.maxOpenPositions = 50;
          limits.maxLeverage = 200;
          break;
      }

      // Apply custom user preferences if any
      if (preferences.riskLimits) {
        limits = { ...limits, ...preferences.riskLimits };
      }

      return limits;
    } catch (error) {
      console.error('Error getting user risk limits:', error);
      return this.defaultLimits;
    }
  }

  /**
   * Get user's current position summary
   */
  private async getUserCurrentPosition(userId: string): Promise<{
    positions: Position[];
    totalValue: string;
    unrealizedPnL: string;
    availableBalance: string;
    marginLevel: number;
    openPositions: number;
    maxDrawdown: string;
  }> {
    try {
      const query = `
        SELECT
          t.symbol,
          t.side,
          t.quantity,
          t.price as entry_price,
          COALESCE(md.close_price, t.price) as current_price,
          COALESCE(md.close_price, t.price) - t.price as price_change
        FROM trades t
        LEFT JOIN market_data md ON t.symbol = md.symbol
        WHERE t.user_id = $1 AND t.status = 'executed'
      `;

      const result = await pool.query(query, [userId]);

      const positions: Position[] = [];
      let totalValue = new Decimal(0);
      let unrealizedPnL = new Decimal(0);

      for (const row of result.rows) {
        const entryPrice = new Decimal(row.entry_price);
        const currentPrice = new Decimal(row.current_price);
        const quantity = new Decimal(row.quantity);
        const side = row.side as TradeSide;

        const value = currentPrice.mul(quantity);
        const pnl = side === TradeSide.BUY
          ? (currentPrice.minus(entryPrice)).mul(quantity)
          : (entryPrice.minus(currentPrice)).mul(quantity);

        const percentagePnL = entryPrice.gt(0) ? pnl.div(entryPrice.mul(quantity)).mul(100).toNumber() : 0;

        positions.push({
          symbol: row.symbol,
          side,
          quantity: quantity.toString(),
          entryPrice: entryPrice.toString(),
          currentPrice: currentPrice.toString(),
          unrealizedPnL: pnl.toString(),
          percentagePnL,
          value: value.toString(),
        });

        totalValue = totalValue.plus(value);
        unrealizedPnL = unrealizedPnL.plus(pnl);
      }

      // Get user's available balance
      const balanceQuery = `
        SELECT COALESCE(SUM(available_balance), 0) as balance
        FROM wallets
        WHERE user_id = $1 AND wallet_type = 'trading'
      `;

      const balanceResult = await pool.query(balanceQuery, [userId]);
      const availableBalance = new Decimal(balanceResult.rows[0].balance);

      const marginLevel = totalValue.gt(0)
        ? availableBalance.plus(totalValue).div(totalValue).mul(100).toNumber()
        : 0;

      return {
        positions,
        totalValue: totalValue.toString(),
        unrealizedPnL: unrealizedPnL.toString(),
        availableBalance: availableBalance.toString(),
        marginLevel,
        openPositions: positions.length,
        maxDrawdown: '0', // Would calculate from historical data
      };
    } catch (error) {
      console.error('Error getting user current position:', error);
      return {
        positions: [],
        totalValue: '0',
        unrealizedPnL: '0',
        availableBalance: '0',
        marginLevel: 0,
        openPositions: 0,
        maxDrawdown: '0',
      };
    }
  }

  /**
   * Get daily P&L for user
   */
  private async getDailyPnL(userId: string): Promise<string> {
    try {
      const query = `
        SELECT COALESCE(SUM(profit_loss), 0) as daily_pnl
        FROM trades
        WHERE user_id = $1 AND status = 'executed'
          AND DATE(executed_at) = CURRENT_DATE
      `;

      const result = await pool.query(query, [userId]);
      return result.rows[0].daily_pnl.toString();
    } catch (error) {
      console.error('Error getting daily P&L:', error);
      return '0';
    }
  }

  /**
   * Calculate correlation risk
   */
  private async calculateCorrelationRisk(
    userId: string,
    newSymbol: string,
    existingPositions: Position[]
  ): Promise<number> {
    // Simplified correlation calculation
    // In production, you'd use historical price correlations
    if (existingPositions.length === 0) {
      return 0;
    }

    // Group by base asset (e.g., BTC in BTCUSDT, BTCBUSD)
    const newBaseAsset = this.extractBaseAsset(newSymbol);
    const existingBaseAssets = existingPositions.map(pos => this.extractBaseAsset(pos.symbol));

    const sameAssetCount = existingBaseAssets.filter(asset => asset === newBaseAsset).length;
    return sameAssetCount / Math.max(existingPositions.length, 1);
  }

  /**
   * Extract base asset from trading pair
   */
  private extractBaseAsset(symbol: string): string {
    const usdtPairs = ['USDT', 'BUSD', 'USDC', 'USD'];
    for (const quote of usdtPairs) {
      if (symbol.endsWith(quote)) {
        return symbol.slice(0, -quote.length);
      }
    }
    return symbol;
  }

  /**
   * Calculate Value at Risk (VaR)
   */
  private async calculateValueAtRisk(userId: string, confidence: number): Promise<string> {
    // Simplified VaR calculation
    // In production, you'd use historical simulation or Monte Carlo methods
    const position = await this.getUserCurrentPosition(userId);
    const totalValue = new Decimal(position.totalValue);

    // Assume 2% daily VaR at 95% confidence for most assets
    const varPercentage = 0.02;
    const var95 = totalValue.mul(varPercentage);

    return var95.toString();
  }

  /**
   * Calculate concentration risk
   */
  private calculateConcentrationRisk(positions: Position[]): number {
    if (positions.length === 0) {
      return 0;
    }

    const totalValue = positions.reduce((sum, pos) => sum + parseFloat(pos.value), 0);
    const maxPositionValue = Math.max(...positions.map(pos => parseFloat(pos.value)));

    return maxPositionValue / totalValue;
  }

  /**
   * Calculate stop loss price
   */
  private calculateStopLoss(
    entryPrice: number,
    side: TradeSide,
    percentage: number
  ): number {
    const stopDistance = entryPrice * percentage;

    if (side === TradeSide.BUY) {
      return entryPrice - stopDistance;
    } else {
      return entryPrice + stopDistance;
    }
  }

  /**
   * Calculate take profit price
   */
  private calculateTakeProfit(
    entryPrice: number,
    side: TradeSide,
    percentage: number
  ): number {
    const profitDistance = entryPrice * percentage;

    if (side === TradeSide.BUY) {
      return entryPrice + profitDistance;
    } else {
      return entryPrice - profitDistance;
    }
  }

  /**
   * Calculate risk/reward ratio
   */
  private calculateRiskRewardRatio(
    entryPrice: number,
    stopLoss: number,
    takeProfit: number,
    side: TradeSide
  ): number {
    const risk = Math.abs(entryPrice - stopLoss);
    const reward = Math.abs(takeProfit - entryPrice);

    return reward / risk;
  }

  /**
   * Get symbol volatility
   */
  private async getSymbolVolatility(symbol: string): Promise<number> {
    try {
      const query = `
        SELECT
          STDDEV(close_price) / AVG(close_price) as volatility
        FROM market_data
        WHERE symbol = $1 AND timeframe = '1d'
          AND time >= NOW() - INTERVAL '30 days'
      `;

      const result = await pool.query(query, [symbol]);
      return parseFloat(result.rows[0]?.volatility || '0');
    } catch (error) {
      console.error('Error calculating volatility:', error);
      return 0.02; // Default 2% volatility
    }
  }

  /**
   * Get current price for symbol
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
}

export const riskManager = new RiskManager();