import { EventEmitter } from 'events';
import { BinanceConnector } from '../connectors/BinanceConnector';
import { marketDataModel } from '../models/MarketData';
import { redis } from '../config/database';
import {
  MarketDataTick,
  TickerData,
  OrderBookData,
  TradeData,
  BrokerConfig,
  DataProcessorConfig,
} from '../interfaces/marketData';
import { TimeFrame } from '../../../../shared/types';
import { calculateTechnicalIndicators } from '../utils/technicalIndicators';

export class MarketDataCollector extends EventEmitter {
  private connectors: Map<string, BinanceConnector> = new Map();
  private subscriptions: Map<string, any> = new Map();
  private config: DataProcessorConfig;
  private buffers: Map<string, MarketDataTick[]> = new Map();
  private processingIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: DataProcessorConfig) {
    super();
    this.config = config;
  }

  /**
   * Initialize the market data collector
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing Market Data Collector...');

    try {
      // Initialize Binance connector
      const binanceConfig: BrokerConfig = {
        name: 'binance',
        apiKey: process.env.BINANCE_API_KEY,
        secretKey: process.env.BINANCE_SECRET_KEY,
        isTestnet: process.env.NODE_ENV !== 'production',
        rateLimits: {
          requests: 1200,
          windowMs: 60000,
        },
        supportedSymbols: this.config.symbols,
        endpoints: {
          rest: 'https://api.binance.com',
          ws: 'wss://stream.binance.com:9443',
        },
      };

      const binanceConnector = new BinanceConnector(binanceConfig);
      this.connectors.set('binance', binanceConnector);

      // Set up event listeners
      this.setupConnectorListeners(binanceConnector);

      // Connect to exchange
      await binanceConnector.connect();

      // Subscribe to data streams
      await this.setupSubscriptions();

      // Start processing intervals
      this.startProcessingIntervals();

      console.log('✅ Market Data Collector initialized successfully');
      this.emit('initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Market Data Collector:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Stop the market data collector
   */
  async stop(): Promise<void> {
    console.log('🛑 Stopping Market Data Collector...');

    try {
      // Clear processing intervals
      this.processingIntervals.forEach(interval => clearInterval(interval));
      this.processingIntervals.clear();

      // Disconnect all connectors
      this.connectors.forEach(connector => connector.disconnect());
      this.connectors.clear();

      // Clear buffers
      this.buffers.clear();

      console.log('✅ Market Data Collector stopped');
      this.emit('stopped');
    } catch (error) {
      console.error('❌ Error stopping Market Data Collector:', error);
      throw error;
    }
  }

  /**
   * Set up event listeners for connector events
   */
  private setupConnectorListeners(connector: BinanceConnector): void {
    connector.on('ticker', (ticker: TickerData) => {
      this.handleTickerData(ticker);
    });

    connector.on('trade', (trade: TradeData) => {
      this.handleTradeData(trade);
    });

    connector.on('candlestick', (candlestick: MarketDataTick) => {
      this.handleCandlestickData(candlestick);
    });

    connector.on('candlestick_closed', (candlestick: MarketDataTick) => {
      this.handleClosedCandlestick(candlestick);
    });

    connector.on('orderbook', (orderbook: OrderBookData) => {
      this.handleOrderBookData(orderbook);
    });

    connector.on('error', (error: Error) => {
      console.error('Connector error:', error);
      this.emit('error', error);
    });

    connector.on('connected', () => {
      console.log('✅ Connector connected');
      this.emit('connectorConnected');
    });

    connector.on('disconnected', () => {
      console.log('❌ Connector disconnected');
      this.emit('connectorDisconnected');
    });
  }

  /**
   * Set up data subscriptions
   */
  private async setupSubscriptions(): Promise<void> {
    const connector = this.connectors.get('binance');
    if (!connector) return;

    try {
      // Subscribe to tickers for all symbols
      await connector.subscribeTickers(this.config.symbols);

      // Subscribe to trades for all symbols
      await connector.subscribeTrades(this.config.symbols);

      // Subscribe to candlesticks for each timeframe
      for (const timeframe of this.config.timeframes) {
        const ccxtTimeframe = this.convertTimeframe(timeframe);
        await connector.subscribeCandlesticks(this.config.symbols, ccxtTimeframe);
      }

      // Subscribe to order books for major symbols
      const majorSymbols = this.config.symbols.slice(0, 5); // Limit to top 5
      for (const symbol of majorSymbols) {
        await connector.subscribeOrderBook(symbol, 20);
      }

      // Store subscription info
      this.subscriptions.set('binance', {
        symbols: this.config.symbols,
        timeframes: this.config.timeframes,
      });

      console.log(`📊 Subscribed to ${this.config.symbols.length} symbols with ${this.config.timeframes.length} timeframes`);
    } catch (error) {
      console.error('❌ Failed to set up subscriptions:', error);
      throw error;
    }
  }

  /**
   * Start processing intervals for buffering and analysis
   */
  private startProcessingIntervals(): void {
    // Buffer processing interval
    const bufferInterval = setInterval(() => {
      this.processBuffers();
    }, this.config.processingInterval);

    this.processingIntervals.set('buffer', bufferInterval);

    // Historical data sync interval (every 5 minutes)
    const syncInterval = setInterval(() => {
      this.syncHistoricalData();
    }, 5 * 60 * 1000);

    this.processingIntervals.set('sync', syncInterval);

    // Cleanup interval (every hour)
    const cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000);

    this.processingIntervals.set('cleanup', cleanupInterval);
  }

  /**
   * Handle ticker data
   */
  private async handleTickerData(ticker: TickerData): Promise<void> {
    try {
      // Cache latest ticker data in Redis
      await redis.setex(
        `ticker:${ticker.symbol}:${ticker.exchange}`,
        60, // Cache for 1 minute
        JSON.stringify(ticker)
      );

      // Emit to subscribers
      this.emit('ticker', ticker);

      // Store in buffer for processing
      this.addToBuffer('ticker', {
        symbol: ticker.symbol,
        timestamp: ticker.closeTime,
        open: ticker.price,
        high: ticker.high24h,
        low: ticker.low24h,
        close: ticker.price,
        volume: ticker.volume,
        quoteVolume: ticker.quoteVolume,
        timeframe: '1m', // Use 1m for ticker data
        exchange: ticker.exchange,
      });
    } catch (error) {
      console.error('Error handling ticker data:', error);
    }
  }

  /**
   * Handle trade data
   */
  private async handleTradeData(trade: TradeData): Promise<void> {
    try {
      // Cache latest trade in Redis
      await redis.setex(
        `trade:${trade.symbol}:${trade.exchange}`,
        30, // Cache for 30 seconds
        JSON.stringify(trade)
      );

      // Emit to subscribers
      this.emit('trade', trade);

      // Update real-time price tracking
      await redis.setex(
        `price:${trade.symbol}:${trade.exchange}`,
        60,
        trade.price.toString()
      );
    } catch (error) {
      console.error('Error handling trade data:', error);
    }
  }

  /**
   * Handle candlestick data
   */
  private async handleCandlestickData(candlestick: MarketDataTick): Promise<void> {
    try {
      // Cache latest candlestick in Redis
      const cacheKey = `candlestick:${candlestick.symbol}:${candlestick.timeframe}:${candlestick.exchange}`;
      await redis.setex(cacheKey, 300, JSON.stringify(candlestick)); // Cache for 5 minutes

      // Emit to subscribers
      this.emit('candlestick', candlestick);

      // Store in buffer for processing
      this.addToBuffer(candlestick.timeframe, candlestick);
    } catch (error) {
      console.error('Error handling candlestick data:', error);
    }
  }

  /**
   * Handle closed candlesticks (finalized candles)
   */
  private async handleClosedCandlestick(candlestick: MarketDataTick): Promise<void> {
    try {
      // Store immediately in database
      await marketDataModel.storeCandlestick(candlestick);

      // Calculate technical indicators
      if (this.config.enableTechnicalIndicators) {
        await this.calculateAndStoreIndicators(candlestick.symbol, candlestick.timeframe);
      }

      // Emit closed candlestick event
      this.emit('candlestick_closed', candlestick);

      console.log(`💾 Stored closed candlestick: ${candlestick.symbol} ${candlestick.timeframe}`);
    } catch (error) {
      console.error('Error handling closed candlestick:', error);
    }
  }

  /**
   * Handle order book data
   */
  private async handleOrderBookData(orderbook: OrderBookData): Promise<void> {
    try {
      // Cache order book in Redis
      const cacheKey = `orderbook:${orderbook.symbol}:${orderbook.exchange}`;
      await redis.setex(cacheKey, 10, JSON.stringify(orderbook)); // Cache for 10 seconds

      // Emit to subscribers
      this.emit('orderbook', orderbook);

      // Calculate spread and market depth
      const bestBid = orderbook.bids[0]?.[0] || 0;
      const bestAsk = orderbook.asks[0]?.[0] || 0;
      const spread = bestAsk - bestBid;
      const spreadPercent = bestBid > 0 ? (spread / bestBid) * 100 : 0;

      // Cache spread data
      await redis.setex(
        `spread:${orderbook.symbol}:${orderbook.exchange}`,
        60,
        JSON.stringify({ spread, spreadPercent, bestBid, bestAsk })
      );
    } catch (error) {
      console.error('Error handling order book data:', error);
    }
  }

  /**
   * Add data to buffer
   */
  private addToBuffer(timeframe: string, data: MarketDataTick): void {
    const bufferKey = `${data.symbol}:${timeframe}`;

    if (!this.buffers.has(bufferKey)) {
      this.buffers.set(bufferKey, []);
    }

    const buffer = this.buffers.get(bufferKey)!;
    buffer.push(data);

    // Limit buffer size
    if (buffer.length > this.config.bufferSize) {
      buffer.shift();
    }
  }

  /**
   * Process buffers and store data in database
   */
  private async processBuffers(): Promise<void> {
    try {
      const allCandlesticks: MarketDataTick[] = [];

      // Collect all buffered data
      this.buffers.forEach((buffer, key) => {
        if (buffer.length > 0) {
          allCandlesticks.push(...buffer);
          buffer.length = 0; // Clear buffer
        }
      });

      // Store in database in batches
      if (allCandlesticks.length > 0) {
        await marketDataModel.storeCandlesticksBatch(allCandlesticks);
        console.log(`💾 Stored ${allCandlesticks.length} candlesticks in database`);
      }
    } catch (error) {
      console.error('Error processing buffers:', error);
    }
  }

  /**
   * Calculate and store technical indicators
   */
  private async calculateAndStoreIndicators(symbol: string, timeframe: string): Promise<void> {
    try {
      // Get recent candlesticks for indicator calculation
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours

      const candlesticks = await marketDataModel.getCandlesticks(
        symbol,
        timeframe as TimeFrame,
        startDate,
        endDate,
        500 // Get enough data for indicators
      );

      if (candlesticks.length < 50) {
        return; // Not enough data for indicators
      }

      // Calculate technical indicators
      const indicators = calculateTechnicalIndicators(candlesticks);

      // Store each indicator
      for (const [indicatorName, indicatorData] of Object.entries(indicators)) {
        await marketDataModel.storeTechnicalIndicator(
          symbol,
          timeframe as TimeFrame,
          indicatorName,
          indicatorData
        );
      }

      console.log(`📈 Calculated and stored ${Object.keys(indicators).length} indicators for ${symbol} ${timeframe}`);
    } catch (error) {
      console.error('Error calculating indicators:', error);
    }
  }

  /**
   * Sync historical data
   */
  private async syncHistoricalData(): Promise<void> {
    try {
      const connector = this.connectors.get('binance');
      if (!connector) return;

      console.log('🔄 Syncing historical data...');

      for (const symbol of this.config.symbols) {
        for (const timeframe of this.config.timeframes) {
          // Get the latest candlestick from database
          const latest = await marketDataModel.getLatestCandlestick(symbol, timeframe);

          const startDate = latest ? new Date(latest.timestamp.getTime() + 60000) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          const endDate = new Date();

          if (startDate < endDate) {
            const ccxtTimeframe = this.convertTimeframe(timeframe);
            const candlesticks = await connector.getCandlesticks(symbol, ccxtTimeframe, 500, startDate, endDate);

            if (candlesticks.length > 0) {
              await marketDataModel.storeCandlesticksBatch(candlesticks);
              console.log(`📥 Synced ${candlesticks.length} historical candlesticks for ${symbol} ${timeframe}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error syncing historical data:', error);
    }
  }

  /**
   * Cleanup old data and connections
   */
  private async cleanup(): Promise<void> {
    try {
      console.log('🧹 Cleaning up old data...');

      // Clean old market data
      const deletedRecords = await marketDataModel.cleanupOldData();
      if (deletedRecords > 0) {
        console.log(`🗑️  Deleted ${deletedRecords} old records`);
      }

      // Clean Redis cache
      const keys = await redis.keys('ticker:*');
      if (keys.length > 1000) {
        // Keep only recent 500 keys
        const keysToDelete = keys.slice(500);
        await redis.del(keysToDelete);
        console.log(`🗑️  Cleaned ${keysToDelete.length} Redis keys`);
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  /**
   * Convert TimeFrame enum to CCXT timeframe format
   */
  private convertTimeframe(timeframe: TimeFrame): string {
    const mapping: Record<TimeFrame, string> = {
      [TimeFrame.M1]: '1m',
      [TimeFrame.M5]: '5m',
      [TimeFrame.M15]: '15m',
      [TimeFrame.M30]: '30m',
      [TimeFrame.H1]: '1h',
      [TimeFrame.H4]: '4h',
      [TimeFrame.D1]: '1d',
      [TimeFrame.W1]: '1w',
      [TimeFrame.MN1]: '1M',
    };

    return mapping[timeframe] || '1m';
  }

  /**
   * Get connector by exchange name
   */
  getConnector(exchange: string): BinanceConnector | undefined {
    return this.connectors.get(exchange);
  }

  /**
   * Get current subscriptions
   */
  getSubscriptions(): Map<string, any> {
    return new Map(this.subscriptions);
  }

  /**
   * Get buffer status
   */
  getBufferStatus(): Array<{ key: string; size: number }> {
    const status: Array<{ key: string; size: number }> = [];
    this.buffers.forEach((buffer, key) => {
      status.push({ key, size: buffer.length });
    });
    return status;
  }
}