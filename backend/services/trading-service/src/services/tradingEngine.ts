import { EventEmitter } from 'events';
import { tradeModel } from '../models/Trade';
import { riskManager } from './riskManager';
import { pool } from '../config/database';
import { redis } from '../config/database';
import {
  Trade,
  TradeSide,
  TradeStatus,
  AIStrategy,
  AIPrediction,
  PredictionType,
} from '../../../../../backend/shared/types';

export interface ExecutionRequest {
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
  prediction?: AIPrediction;
  confidence?: number;
}

export interface ExecutionResult {
  success: boolean;
  trade?: Trade;
  error?: string;
  brokerOrderId?: string;
  executedPrice?: number;
  warnings?: string[];
}

export class TradingEngine extends EventEmitter {
  private isRunning: boolean = false;
  private executionQueue: ExecutionRequest[] = [];
  private isProcessingQueue: boolean = false;

  constructor() {
    super();
  }

  /**
   * Initialize the trading engine
   */
  async initialize(): Promise<void> {
    console.log('⚡ Initializing Trading Engine...');

    try {
      // Start processing execution queue
      this.startQueueProcessor();

      // Start monitoring active positions
      this.startPositionMonitoring();

      this.isRunning = true;
      console.log('✅ Trading Engine initialized successfully');
      this.emit('initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Trading Engine:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Stop the trading engine
   */
  async stop(): Promise<void> {
    console.log('🛑 Stopping Trading Engine...');

    try {
      this.isRunning = false;

      // Wait for current processing to complete
      while (this.isProcessingQueue) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log('✅ Trading Engine stopped');
      this.emit('stopped');
    } catch (error) {
      console.error('❌ Error stopping Trading Engine:', error);
      throw error;
    }
  }

  /**
   * Execute a trade
   */
  async executeTrade(request: ExecutionRequest): Promise<ExecutionResult> {
    try {
      console.log(`🎯 Executing trade: ${request.side} ${request.quantity} ${request.symbol}`);

      // Validate trade request
      const validation = await this.validateTradeRequest(request);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      // Risk assessment
      const riskAssessment = await riskManager.assessTradeRisk(
        request.userId,
        {
          symbol: request.symbol,
          side: request.side,
          quantity: request.quantity,
          price: request.price,
          stopLoss: request.stopLoss,
          takeProfit: request.takeProfit,
          leverage: request.leverage,
          confidence: request.confidence,
        },
        request.prediction
      );

      if (!riskAssessment.approved) {
        return {
          success: false,
          error: riskAssessment.reason || 'Trade rejected by risk management',
          warnings: riskAssessment.warnings,
        };
      }

      // Apply risk adjustments
      const adjustedRequest = this.applyRiskAdjustments(request, riskAssessment);

      // Execute trade through broker
      const executionResult = await this.executeThroughBroker(adjustedRequest);

      if (executionResult.success) {
        // Create trade record in database
        const trade = await tradeModel.create({
          userId: request.userId,
          strategyId: request.strategyId,
          symbol: request.symbol,
          side: request.side,
          quantity: adjustedRequest.quantity,
          price: executionResult.executedPrice?.toString() || request.price,
          stopLoss: adjustedRequest.stopLoss,
          takeProfit: adjustedRequest.takeProfit,
          leverage: request.leverage,
          accountType: request.accountType,
          metadata: {
            prediction: request.prediction,
            confidence: request.confidence,
            riskAssessment,
            brokerOrderId: executionResult.brokerOrderId,
          },
        });

        // Update trade with broker information
        if (executionResult.brokerOrderId || executionResult.executedPrice) {
          await tradeModel.updateStatus(
            trade.id,
            TradeStatus.EXECUTED,
            undefined,
            executionResult.brokerOrderId,
            executionResult.executedPrice?.toString(),
            new Date()
          );
        }

        // Update strategy performance if applicable
        if (request.strategyId) {
          await this.updateStrategyPerformance(request.strategyId, trade);
        }

        // Cache the trade for real-time updates
        await this.cacheTrade(trade);

        this.emit('tradeExecuted', trade);

        console.log(`✅ Trade executed successfully: ${trade.id}`);
        return {
          success: true,
          trade,
          brokerOrderId: executionResult.brokerOrderId,
          executedPrice: executionResult.executedPrice,
          warnings: riskAssessment.warnings,
        };
      } else {
        // Trade failed
        this.emit('tradeFailed', { request, error: executionResult.error });
        return executionResult;
      }
    } catch (error) {
      console.error('Error executing trade:', error);
      this.emit('tradeError', { request, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Queue trade for execution
   */
  queueTrade(request: ExecutionRequest): void {
    this.executionQueue.push(request);
    this.emit('tradeQueued', request);
  }

  /**
   * Close all positions for a user
   */
  async closeAllPositions(userId: string, reason: string = 'manual_close_all'): Promise<{
    success: boolean;
    closedTrades: Trade[];
    errors: string[];
  }> {
    try {
      const openPositions = await tradeModel.getOpenPositions(userId);
      const closedTrades: Trade[] = [];
      const errors: string[] = [];

      for (const position of openPositions) {
        try {
          const closedTrade = await tradeModel.closeTrade(position.id, undefined, reason);
          closedTrades.push(closedTrade);
          this.emit('positionClosed', closedTrade);
        } catch (error) {
          errors.push(`Failed to close position ${position.id}: ${error}`);
        }
      }

      return {
        success: errors.length === 0,
        closedTrades,
        errors,
      };
    } catch (error) {
      console.error('Error closing all positions:', error);
      return {
        success: false,
        closedTrades: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Get trading statistics for a user
   */
  async getTradingStats(userId: string, accountType?: 'real' | 'demo'): Promise<any> {
    try {
      const [basicStats, riskMetrics, dailyPnL] = await Promise.all([
        tradeModel.getTradingStats(userId, accountType, 30),
        riskManager.getRiskMetrics(userId),
        tradeModel.getDailyPnL(userId, 30),
      ]);

      return {
        ...basicStats,
        riskMetrics,
        dailyPnL,
      };
    } catch (error) {
      console.error('Error getting trading stats:', error);
      throw error;
    }
  }

  /**
   * Validate trade request
   */
  private async validateTradeRequest(request: ExecutionRequest): Promise<{
    isValid: boolean;
    error?: string;
  }> {
    // Check required fields
    if (!request.userId || !request.symbol || !request.side || !request.quantity) {
      return {
        isValid: false,
        error: 'Missing required fields: userId, symbol, side, quantity',
      };
    }

    // Validate quantity
    const quantity = parseFloat(request.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      return {
        isValid: false,
        error: 'Invalid quantity',
      };
    }

    // Validate side
    if (!Object.values(TradeSide).includes(request.side)) {
      return {
        isValid: false,
        error: 'Invalid trade side',
      };
    }

    // Check if user exists and is active
    const userQuery = await pool.query(
      'SELECT id, is_active FROM users WHERE id = $1',
      [request.userId]
    );

    if (userQuery.rows.length === 0) {
      return {
        isValid: false,
        error: 'User not found',
      };
    }

    if (!userQuery.rows[0].is_active) {
      return {
        isValid: false,
        error: 'User account is not active',
      };
    }

    return { isValid: true };
  }

  /**
   * Apply risk adjustments to trade request
   */
  private applyRiskAdjustments(
    request: ExecutionRequest,
    riskAssessment: any
  ): ExecutionRequest {
    const adjusted = { ...request };

    if (riskAssessment.adjustedQuantity) {
      adjusted.quantity = riskAssessment.adjustedQuantity;
    }

    if (riskAssessment.adjustedStopLoss) {
      adjusted.stopLoss = riskAssessment.adjustedStopLoss;
    }

    if (riskAssessment.adjustedTakeProfit) {
      adjusted.takeProfit = riskAssessment.adjustedTakeProfit;
    }

    return adjusted;
  }

  /**
   * Execute trade through broker
   */
  private async executeThroughBroker(request: ExecutionRequest): Promise<ExecutionResult> {
    try {
      // In a real implementation, you would integrate with actual broker APIs
      // For this example, we'll simulate the execution

      const isDemo = request.accountType === 'demo';

      if (isDemo) {
        // Simulate instant execution for demo accounts
        return await this.simulateExecution(request);
      } else {
        // Real broker execution would go here
        return await this.executeWithRealBroker(request);
      }
    } catch (error) {
      console.error('Error executing through broker:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Broker execution failed',
      };
    }
  }

  /**
   * Simulate trade execution for demo accounts
   */
  private async simulateExecution(request: ExecutionRequest): Promise<ExecutionResult> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));

    // Get current market price
    const currentPrice = await this.getCurrentPrice(request.symbol);

    if (!currentPrice) {
      return {
        success: false,
        error: 'Unable to get current price',
      };
    }

    // Simulate execution with slight price variation
    const priceVariation = (Math.random() - 0.5) * 0.001; // ±0.05%
    const executedPrice = currentPrice * (1 + priceVariation);

    // Generate mock broker order ID
    const brokerOrderId = `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Simulate occasional execution failures (1% chance)
    if (Math.random() < 0.01) {
      return {
        success: false,
        error: 'Simulated execution failure',
      };
    }

    return {
      success: true,
      brokerOrderId,
      executedPrice,
    };
  }

  /**
   * Execute with real broker (placeholder)
   */
  private async executeWithRealBroker(request: ExecutionRequest): Promise<ExecutionResult> {
    // This would integrate with real broker APIs like Binance, Bybit, etc.
    // For now, return a placeholder
    return {
      success: false,
      error: 'Real broker execution not implemented',
    };
  }

  /**
   * Update strategy performance
   */
  private async updateStrategyPerformance(strategyId: string, trade: Trade): Promise<void> {
    try {
      // Update strategy execution count and other metrics
      const updateQuery = `
        UPDATE ai_strategies
        SET run_count = run_count + 1,
            updated_at = NOW()
        WHERE id = $1
      `;

      await pool.query(updateQuery, [strategyId]);
    } catch (error) {
      console.error('Error updating strategy performance:', error);
    }
  }

  /**
   * Cache trade for real-time updates
   */
  private async cacheTrade(trade: Trade): Promise<void> {
    try {
      await redis.setex(
        `trade:${trade.id}`,
        300, // 5 minutes
        JSON.stringify(trade)
      );

      // Add to user's active trades
      await redis.lpush(
        `user_trades:${trade.userId}`,
        trade.id
      );

      // Keep only last 100 trades in the list
      await redis.ltrim(`user_trades:${trade.userId}`, 0, 99);
    } catch (error) {
      console.error('Error caching trade:', error);
    }
  }

  /**
   * Start processing execution queue
   */
  private startQueueProcessor(): void {
    setInterval(async () => {
      if (this.executionQueue.length > 0 && !this.isProcessingQueue) {
        this.isProcessingQueue = true;

        while (this.executionQueue.length > 0) {
          const request = this.executionQueue.shift()!;

          try {
            await this.executeTrade(request);
          } catch (error) {
            console.error('Error processing queued trade:', error);
            this.emit('queueError', { request, error });
          }
        }

        this.isProcessingQueue = false;
      }
    }, 1000); // Process queue every second
  }

  /**
   * Start monitoring active positions
   */
  private startPositionMonitoring(): void {
    setInterval(async () => {
      if (!this.isRunning) return;

      try {
        await this.monitorActivePositions();
      } catch (error) {
        console.error('Error monitoring positions:', error);
      }
    }, 30000); // Monitor every 30 seconds
  }

  /**
   * Monitor active positions for stop loss / take profit
   */
  private async monitorActivePositions(): Promise<void> {
    try {
      // Get all active trades (simplified - would use more efficient queries)
      const activeTradesQuery = `
        SELECT *
        FROM trades
        WHERE status = 'executed'
          AND executed_at >= NOW() - INTERVAL '7 days'
      `;

      const result = await pool.query(activeTradesQuery);

      for (const tradeRow of result.rows) {
        const currentPrice = await this.getCurrentPrice(tradeRow.symbol);

        if (!currentPrice) continue;

        const entryPrice = parseFloat(tradeRow.price);
        const stopLoss = parseFloat(tradeRow.stop_loss || '0');
        const takeProfit = parseFloat(tradeRow.take_profit || '0');
        const side = tradeRow.side as TradeSide;

        let shouldClose = false;
        let closeReason = '';

        // Check stop loss
        if (stopLoss > 0) {
          if ((side === TradeSide.BUY && currentPrice <= stopLoss) ||
              (side === TradeSide.SELL && currentPrice >= stopLoss)) {
            shouldClose = true;
            closeReason = 'stop_loss';
          }
        }

        // Check take profit
        if (takeProfit > 0) {
          if ((side === TradeSide.BUY && currentPrice >= takeProfit) ||
              (side === TradeSide.SELL && currentPrice <= takeProfit)) {
            shouldClose = true;
            closeReason = 'take_profit';
          }
        }

        if (shouldClose) {
          await tradeModel.closeTrade(tradeRow.id, currentPrice, closeReason);
          this.emit('autoClosed', { tradeId: tradeRow.id, reason: closeReason, price: currentPrice });
        }
      }
    } catch (error) {
      console.error('Error monitoring positions:', error);
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

  /**
   * Get engine status
   */
  getStatus(): {
    isRunning: boolean;
    queueLength: number;
    isProcessingQueue: boolean;
  } {
    return {
      isRunning: this.isRunning,
      queueLength: this.executionQueue.length,
      isProcessingQueue: this.isProcessingQueue,
    };
  }
}

export const tradingEngine = new TradingEngine();