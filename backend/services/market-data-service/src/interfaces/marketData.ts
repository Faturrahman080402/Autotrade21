import { TimeFrame } from '../../../../shared/types';

export interface MarketDataTick {
  symbol: string;
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quoteVolume?: number;
  timeframe: TimeFrame;
  exchange: string;
}

export interface TickerData {
  symbol: string;
  price: number;
  priceChange: number;
  priceChangePercent: number;
  volume: number;
  quoteVolume: number;
  high24h: number;
  low24h: number;
  openTime: Date;
  closeTime: Date;
  count: number;
  exchange: string;
}

export interface OrderBookData {
  symbol: string;
  timestamp: Date;
  bids: Array<[price: number, quantity: number]>;
  asks: Array<[price: number, quantity: number]>;
  exchange: string;
}

export interface TradeData {
  symbol: string;
  timestamp: Date;
  price: number;
  quantity: number;
  side: 'buy' | 'sell';
  tradeId: string;
  exchange: string;
}

export interface MarketDataStream {
  type: 'ticker' | 'trade' | 'orderbook' | 'candlestick';
  symbol: string;
  exchange: string;
  data: TickerData | TradeData | OrderBookData | MarketDataTick;
  timestamp: Date;
}

export interface BrokerConfig {
  name: string;
  apiKey?: string;
  secretKey?: string;
  isTestnet: boolean;
  rateLimits: {
    requests: number;
    windowMs: number;
  };
  supportedSymbols: string[];
  endpoints: {
    rest: string;
    ws?: string;
  };
}

export interface DataProcessorConfig {
  symbols: string[];
  timeframes: TimeFrame[];
  exchanges: string[];
  bufferSize: number;
  processingInterval: number;
  enableTechnicalIndicators: boolean;
}

export interface TechnicalIndicator {
  name: string;
  data: Record<string, number>;
  timestamp: Date;
}

export interface MarketSentiment {
  symbol: string;
  timestamp: Date;
  fearGreedIndex?: number;
  volumeAnomaly?: number;
  priceMomentum?: number;
  volatilityIndex?: number;
  socialSentiment?: number;
}