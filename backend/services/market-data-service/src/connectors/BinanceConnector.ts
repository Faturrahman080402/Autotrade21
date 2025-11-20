import WebSocket from 'ws';
import { MarketDataTick, TickerData, OrderBookData, TradeData, BrokerConfig } from '../interfaces/marketData';
import { EventEmitter } from 'events';
import axios from 'axios';
import CCXT from 'ccxt';

export class BinanceConnector extends EventEmitter {
  private config: BrokerConfig;
  private ccxtClient: CCXT;
  private wsConnections: Map<string, WebSocket> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;

  constructor(config: BrokerConfig) {
    super();
    this.config = config;

    // Initialize CCXT client for REST API
    this.ccxtClient = new CCXT.binance({
      apiKey: config.apiKey,
      secret: config.secretKey,
      sandbox: config.isTestnet,
      enableRateLimit: true,
    });
  }

  /**
   * Connect to Binance WebSocket
   */
  async connect(): Promise<void> {
    console.log('🔗 Connecting to Binance WebSocket...');

    try {
      // Test REST API connection
      await this.ccxtClient.loadMarkets();
      console.log('✅ Binance REST API connected');

      // Connect to WebSocket
      await this.connectWebSocket();
      console.log('✅ Binance WebSocket connected');

      this.emit('connected');
    } catch (error) {
      console.error('❌ Failed to connect to Binance:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Disconnect from Binance
   */
  disconnect(): void {
    console.log('🔌 Disconnecting from Binance...');

    // Close all WebSocket connections
    this.wsConnections.forEach((ws, key) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });

    this.wsConnections.clear();
    this.emit('disconnected');
  }

  /**
   * Subscribe to ticker updates for symbols
   */
  async subscribeTickers(symbols: string[]): Promise<void> {
    const streams = symbols.map(symbol => `${symbol.toLowerCase()}@ticker`).join('/');
    const wsUrl = `wss://stream.binance.com:9443/ws/${streams}`;

    try {
      const ws = new WebSocket(wsUrl);

      ws.on('open', () => {
        console.log(`📊 Subscribed to tickers: ${symbols.join(', ')}`);
      });

      ws.on('message', (data: WebSocket.Data) => {
        try {
          const parsed = JSON.parse(data.toString());

          if (parsed.e === '24hrTicker') {
            const ticker: TickerData = {
              symbol: parsed.s,
              price: parseFloat(parsed.c),
              priceChange: parseFloat(parsed.p),
              priceChangePercent: parseFloat(parsed.P),
              volume: parseFloat(parsed.v),
              quoteVolume: parseFloat(parsed.q),
              high24h: parseFloat(parsed.h),
              low24h: parseFloat(parsed.l),
              openTime: new Date(parsed.O),
              closeTime: new Date(parsed.C),
              count: parsed.n,
              exchange: 'binance',
            };

            this.emit('ticker', ticker);
          }
        } catch (error) {
          console.error('Error parsing ticker data:', error);
        }
      });

      ws.on('error', (error) => {
        console.error('Binance ticker WebSocket error:', error);
        this.emit('error', error);
      });

      ws.on('close', () => {
        console.log('Binance ticker WebSocket closed');
        this.handleReconnect('tickers', () => this.subscribeTickers(symbols));
      });

      this.wsConnections.set('tickers', ws);
    } catch (error) {
      console.error('Error subscribing to tickers:', error);
      throw error;
    }
  }

  /**
   * Subscribe to trades for symbols
   */
  async subscribeTrades(symbols: string[]): Promise<void> {
    const streams = symbols.map(symbol => `${symbol.toLowerCase()}@trade`).join('/');
    const wsUrl = `wss://stream.binance.com:9443/ws/${streams}`;

    try {
      const ws = new WebSocket(wsUrl);

      ws.on('open', () => {
        console.log(`💱 Subscribed to trades: ${symbols.join(', ')}`);
      });

      ws.on('message', (data: WebSocket.Data) => {
        try {
          const parsed = JSON.parse(data.toString());

          if (parsed.e === 'trade') {
            const trade: TradeData = {
              symbol: parsed.s,
              timestamp: new Date(parsed.T),
              price: parseFloat(parsed.p),
              quantity: parseFloat(parsed.q),
              side: parsed.m ? 'sell' : 'buy',
              tradeId: parsed.t.toString(),
              exchange: 'binance',
            };

            this.emit('trade', trade);
          }
        } catch (error) {
          console.error('Error parsing trade data:', error);
        }
      });

      ws.on('error', (error) => {
        console.error('Binance trade WebSocket error:', error);
        this.emit('error', error);
      });

      ws.on('close', () => {
        console.log('Binance trade WebSocket closed');
        this.handleReconnect('trades', () => this.subscribeTrades(symbols));
      });

      this.wsConnections.set('trades', ws);
    } catch (error) {
      console.error('Error subscribing to trades:', error);
      throw error;
    }
  }

  /**
   * Subscribe to candlestick data
   */
  async subscribeCandlesticks(symbols: string[], interval: string): Promise<void> {
    const streams = symbols.map(symbol => `${symbol.toLowerCase()}@kline_${interval}`).join('/');
    const wsUrl = `wss://stream.binance.com:9443/ws/${streams}`;

    try {
      const ws = new WebSocket(wsUrl);

      ws.on('open', () => {
        console.log(`📈 Subscribed to candlesticks (${interval}): ${symbols.join(', ')}`);
      });

      ws.on('message', (data: WebSocket.Data) => {
        try {
          const parsed = JSON.parse(data.toString());

          if (parsed.e === 'kline') {
            const kline = parsed.k;
            const candlestick: MarketDataTick = {
              symbol: kline.s,
              timestamp: new Date(kline.t),
              open: parseFloat(kline.o),
              high: parseFloat(kline.h),
              low: parseFloat(kline.l),
              close: parseFloat(kline.c),
              volume: parseFloat(kline.v),
              quoteVolume: parseFloat(kline.q),
              timeframe: interval as any,
              exchange: 'binance',
            };

            this.emit('candlestick', candlestick);

            // Also emit complete candles
            if (kline.x) { // kline.x = true if candle is closed
              this.emit('candlestick_closed', candlestick);
            }
          }
        } catch (error) {
          console.error('Error parsing candlestick data:', error);
        }
      });

      ws.on('error', (error) => {
        console.error('Binance candlestick WebSocket error:', error);
        this.emit('error', error);
      });

      ws.on('close', () => {
        console.log('Binance candlestick WebSocket closed');
        this.handleReconnect(`candlesticks_${interval}`, () => this.subscribeCandlesticks(symbols, interval));
      });

      this.wsConnections.set(`candlesticks_${interval}`, ws);
    } catch (error) {
      console.error('Error subscribing to candlesticks:', error);
      throw error;
    }
  }

  /**
   * Subscribe to order book data
   */
  async subscribeOrderBook(symbol: string, depth: number = 20): Promise<void> {
    const wsUrl = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@depth${depth}`;

    try {
      const ws = new WebSocket(wsUrl);

      ws.on('open', () => {
        console.log(`📋 Subscribed to order book: ${symbol} (depth: ${depth})`);
      });

      ws.on('message', (data: WebSocket.Data) => {
        try {
          const parsed = JSON.parse(data.toString());

          const orderBook: OrderBookData = {
            symbol: parsed.s,
            timestamp: new Date(),
            bids: parsed.b.map(([price, quantity]: [string, string]) => [
              parseFloat(price),
              parseFloat(quantity),
            ]),
            asks: parsed.a.map(([price, quantity]: [string, string]) => [
              parseFloat(price),
              parseFloat(quantity),
            ]),
            exchange: 'binance',
          };

          this.emit('orderbook', orderBook);
        } catch (error) {
          console.error('Error parsing order book data:', error);
        }
      });

      ws.on('error', (error) => {
        console.error('Binance order book WebSocket error:', error);
        this.emit('error', error);
      });

      ws.on('close', () => {
        console.log('Binance order book WebSocket closed');
        this.handleReconnect(`orderbook_${symbol}`, () => this.subscribeOrderBook(symbol, depth));
      });

      this.wsConnections.set(`orderbook_${symbol}`, ws);
    } catch (error) {
      console.error('Error subscribing to order book:', error);
      throw error;
    }
  }

  /**
   * Get historical candlestick data
   */
  async getCandlesticks(
    symbol: string,
    interval: string,
    limit: number = 500,
    startTime?: Date,
    endTime?: Date
  ): Promise<MarketDataTick[]> {
    try {
      const params: any = {
        symbol,
        interval,
        limit,
      };

      if (startTime) params.startTime = startTime.getTime();
      if (endTime) params.endTime = endTime.getTime();

      const klines = await this.ccxtClient.fetchOHLCV(symbol, interval, undefined, limit, params);

      return klines.map(([timestamp, open, high, low, close, volume]: any) => ({
        symbol,
        timestamp: new Date(timestamp),
        open,
        high,
        low,
        close,
        volume,
        timeframe: interval as any,
        exchange: 'binance',
      }));
    } catch (error) {
      console.error('Error fetching historical candlesticks:', error);
      throw error;
    }
  }

  /**
   * Get current ticker data
   */
  async getTicker(symbol: string): Promise<TickerData> {
    try {
      const ticker = await this.ccxtClient.fetchTicker(symbol);

      return {
        symbol: ticker.symbol,
        price: ticker.last || 0,
        priceChange: ticker.change || 0,
        priceChangePercent: ticker.percentage || 0,
        volume: ticker.baseVolume || 0,
        quoteVolume: ticker.quoteVolume || 0,
        high24h: ticker.high || 0,
        low24h: ticker.low || 0,
        openTime: new Date(ticker.openTime || Date.now()),
        closeTime: new Date(ticker.closeTime || Date.now()),
        count: ticker.trades || 0,
        exchange: 'binance',
      };
    } catch (error) {
      console.error('Error fetching ticker:', error);
      throw error;
    }
  }

  /**
   * Get order book snapshot
   */
  async getOrderBook(symbol: string, limit: number = 100): Promise<OrderBookData> {
    try {
      const orderBook = await this.ccxtClient.fetchOrderBook(symbol, limit);

      return {
        symbol,
        timestamp: new Date(),
        bids: orderBook.bids.map(([price, quantity]) => [price, quantity]),
        asks: orderBook.asks.map(([price, quantity]) => [price, quantity]),
        exchange: 'binance',
      };
    } catch (error) {
      console.error('Error fetching order book:', error);
      throw error;
    }
  }

  /**
   * Check if symbol is supported
   */
  async isSymbolSupported(symbol: string): Promise<boolean> {
    try {
      const markets = await this.ccxtClient.loadMarkets();
      return symbol in markets;
    } catch (error) {
      console.error('Error checking symbol support:', error);
      return false;
    }
  }

  /**
   * Get available symbols
   */
  async getSymbols(): Promise<string[]> {
    try {
      await this.ccxtClient.loadMarkets();
      return Object.keys(this.ccxtClient.markets);
    } catch (error) {
      console.error('Error fetching symbols:', error);
      return [];
    }
  }

  /**
   * Connect to WebSocket with proper error handling
   */
  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Test connection with a simple ping
      const testWs = new WebSocket('wss://stream.binance.com:9443/ws/bnbusdt@ticker');

      testWs.on('open', () => {
        testWs.close();
        resolve();
      });

      testWs.on('error', (error) => {
        reject(error);
      });

      setTimeout(() => {
        testWs.close();
        reject(new Error('WebSocket connection timeout'));
      }, 5000);
    });
  }

  /**
   * Handle WebSocket reconnection
   */
  private async handleReconnect(connectionKey: string, reconnectFn: () => Promise<void>): Promise<void> {
    const attempts = this.reconnectAttempts.get(connectionKey) || 0;

    if (attempts < this.maxReconnectAttempts) {
      this.reconnectAttempts.set(connectionKey, attempts + 1);

      console.log(`🔄 Attempting to reconnect ${connectionKey} (${attempts + 1}/${this.maxReconnectAttempts})`);

      setTimeout(async () => {
        try {
          await reconnectFn();
          this.reconnectAttempts.set(connectionKey, 0); // Reset counter on successful reconnection
        } catch (error) {
          console.error(`❌ Failed to reconnect ${connectionKey}:`, error);
          this.handleReconnect(connectionKey, reconnectFn);
        }
      }, this.reconnectDelay);
    } else {
      console.error(`❌ Max reconnection attempts reached for ${connectionKey}`);
      this.emit('maxReconnectAttemptsReached', connectionKey);
    }
  }
}