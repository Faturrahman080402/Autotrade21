export interface Trade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  entryPrice: number;
  exitPrice?: number;
  currentPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  status: 'pending' | 'executed' | 'cancelled' | 'closed';
  profitLoss?: number;
  commission: number;
  leverage: number;
  margin: number;
  createdAt: string;
  executedAt?: string;
  closedAt?: string;
  strategyId?: string;
}

export interface Position {
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  unrealizedPnLPercentage: number;
  value: number;
  tradeId: string;
}

export interface OrderRequest {
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  quantity: number;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
  leverage?: number;
  accountType: 'real' | 'demo';
  strategyId?: string;
}

export interface TradingStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalProfitLoss: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  totalVolume: number;
  totalCommission: number;
  maxDrawdown: number;
  sharpeRatio: number;
}

export interface RiskMetrics {
  totalExposure: number;
  freeMargin: number;
  marginLevel: number;
  dailyPnL: number;
  unrealizedPnL: number;
  maxDrawdown: number;
  var95: number;
  concentrationRisk: number;
  liquidationRisk: boolean;
}

export interface MarketData {
  symbol: string;
  price: number;
  priceChange: number;
  priceChangePercent: number;
  volume: number;
  quoteVolume: number;
  high24h: number;
  low24h: number;
  open24h: number;
  lastUpdate: string;
}

export interface Candlestick {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderBook {
  symbol: string;
  bids: [number, number][];
  asks: [number, number][];
  timestamp: number;
}

export interface TechnicalIndicator {
  name: string;
  value: number;
  timestamp: number;
}

export interface TimeFrame {
  label: string;
  value: string;
  seconds: number;
}

export const TIMEFRAMES: TimeFrame[] = [
  { label: '1m', value: '1m', seconds: 60 },
  { label: '5m', value: '5m', seconds: 300 },
  { label: '15m', value: '15m', seconds: 900 },
  { label: '30m', value: '30m', seconds: 1800 },
  { label: '1h', value: '1h', seconds: 3600 },
  { label: '4h', value: '4h', seconds: 14400 },
  { label: '1d', value: '1d', seconds: 86400 },
  { label: '1w', value: '1w', seconds: 604800 },
];

export const POPULAR_SYMBOLS = [
  'BTCUSDT',
  'ETHUSDT',
  'BNBUSDT',
  'ADAUSDT',
  'XRPUSDT',
  'SOLUSDT',
  'DOTUSDT',
  'DOGEUSDT',
  'AVAXUSDT',
  'MATICUSDT',
  'LINKUSDT',
  'UNIUSDT',
];