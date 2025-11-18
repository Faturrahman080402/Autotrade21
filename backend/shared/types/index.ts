// Core type definitions for AI Trading Platform

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
  accountType: AccountType;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  kycStatus: KYCStatus;
}

export enum AccountType {
  STANDARD = 'standard',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
  DEMO = 'demo'
}

export enum KYCStatus {
  NOT_STARTED = 'not_started',
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  REQUIRES_ADDITIONAL_INFO = 'requires_additional_info'
}

export interface Wallet {
  id: string;
  userId: string;
  walletType: WalletType;
  balance: string;
  availableBalance: string;
  frozenBalance: string;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum WalletType {
  TRADING = 'trading',
  FUNDING = 'funding',
  ESCROW = 'escrow',
  BONUS = 'bonus'
}

export interface Trade {
  id: string;
  userId: string;
  strategyId?: string;
  symbol: string;
  side: TradeSide;
  quantity: string;
  price: string;
  stopLoss?: string;
  takeProfit?: string;
  status: TradeStatus;
  profitLoss?: string;
  commission: string;
  brokerOrderId?: string;
  executedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  leverage?: number;
  margin?: string;
  accountType: 'real' | 'demo';
}

export enum TradeSide {
  BUY = 'buy',
  SELL = 'sell'
}

export enum TradeStatus {
  PENDING = 'pending',
  EXECUTED = 'executed',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
  PARTIALLY_FILLED = 'partially_filled'
}

export interface MarketData {
  symbol: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  closePrice: string;
  volume: string;
  timestamp: Date;
  timeframe: TimeFrame;
  exchange: string;
}

export enum TimeFrame {
  M1 = '1m',
  M5 = '5m',
  M15 = '15m',
  M30 = '30m',
  H1 = '1h',
  H4 = '4h',
  D1 = '1d',
  W1 = '1w',
  MN1 = '1M'
}

export interface AIStrategy {
  id: string;
  userId: string;
  name: string;
  description?: string;
  type: StrategyType;
  config: StrategyConfig;
  isActive: boolean;
  isPublic: boolean;
  performance: StrategyPerformance;
  createdAt: Date;
  updatedAt: Date;
}

export enum StrategyType {
  TREND_FOLLOWING = 'trend_following',
  MEAN_REVERSION = 'mean_reversion',
  MOMENTUM = 'momentum',
  BREAKOUT = 'breakout',
  CUSTOM = 'custom'
}

export interface StrategyConfig {
  symbols: string[];
  timeframes: TimeFrame[];
  riskLevel: RiskLevel;
  positionSize: number;
  maxOpenPositions: number;
  stopLossPercentage: number;
  takeProfitPercentage: number;
  maxDailyLoss: string;
  leverage: number;
  aiModelConfig: AIModelConfig;
}

export enum RiskLevel {
  CONSERVATIVE = 'conservative',
  MODERATE = 'moderate',
  AGGRESSIVE = 'aggressive'
}

export interface AIModelConfig {
  models: ModelType[];
  confidenceThreshold: number;
  predictionInterval: number;
  ensembleWeights: Record<ModelType, number>;
  features: TechnicalIndicator[];
}

export enum ModelType {
  LSTM = 'lstm',
  GRU = 'gru',
  TRANSFORMER = 'transformer',
  ENSEMBLE = 'ensemble'
}

export enum TechnicalIndicator {
  SMA = 'sma',
  EMA = 'ema',
  RSI = 'rsi',
  MACD = 'macd',
  BOLLINGER_BANDS = 'bollinger_bands',
  STOCHASTIC = 'stochastic',
  ATR = 'atr',
  VOLUME_PROFILE = 'volume_profile',
  VWAP = 'vwap'
}

export interface StrategyPerformance {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalProfitLoss: string;
  maxDrawdown: string;
  sharpeRatio: number;
  averageWin: string;
  averageLoss: string;
  profitFactor: number;
  daysTraded: number;
}

export interface AIPrediction {
  id: string;
  symbol: string;
  timeframe: TimeFrame;
  prediction: PredictionType;
  confidence: number;
  predictedPrice: string;
  currentPrice: string;
  timestamp: Date;
  modelType: ModelType;
  features: FeatureData[];
  stopLoss?: string;
  takeProfit?: string;
  timeToExpiration: number;
}

export enum PredictionType {
  BUY = 'buy',
  SELL = 'sell',
  HOLD = 'hold'
}

export interface FeatureData {
  name: string;
  value: number;
  weight: number;
}

export interface Transaction {
  id: string;
  userId: string;
  walletId: string;
  type: TransactionType;
  amount: string;
  currency: string;
  status: TransactionStatus;
  description?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  TRADE_PROFIT = 'trade_profit',
  TRADE_LOSS = 'trade_loss',
  COMMISSION = 'commission',
  BONUS = 'bonus',
  TRANSFER = 'transfer'
}

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface BrokerConfig {
  name: string;
  apiKey: string;
  secretKey: string;
  isTestnet: boolean;
  isActive: boolean;
  supportedAssets: AssetType[];
  permissions: BrokerPermission[];
  rateLimits: RateLimit[];
}

export enum AssetType {
  CRYPTO = 'crypto',
  FOREX = 'forex',
  STOCK = 'stock',
  COMMODITY = 'commodity',
  INDEX = 'index'
}

export enum BrokerPermission {
  READ = 'read',
  TRADE = 'trade',
  WITHDRAW = 'withdraw'
}

export interface RateLimit {
  endpoint: string;
  requests: number;
  windowMs: number;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: Date;
  readAt?: Date;
}

export enum NotificationType {
  TRADE_EXECUTED = 'trade_executed',
  TRADE_CLOSED = 'trade_closed',
  PRICE_ALERT = 'price_alert',
  STRATEGY_ALERT = 'strategy_alert',
  ACCOUNT_ALERT = 'account_alert',
  SYSTEM_ALERT = 'system_alert'
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
  requestId: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface WebSocketMessage {
  type: string;
  channel: string;
  data: any;
  timestamp: Date;
}

export interface ChartData {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TradingSignal {
  id: string;
  symbol: string;
  action: PredictionType;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  timeframe: TimeFrame;
  strategy: string;
  timestamp: Date;
  expiresAt: Date;
}

export interface RiskMetrics {
  portfolioValue: string;
  totalExposure: string;
  freeMargin: string;
  marginLevel: number;
  dailyPnL: string;
  unrealizedPnL: string;
  maxDrawdown: string;
  var: string; // Value at Risk
  sharpeRatio: number;
  beta: number;
  alpha: number;
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  severity: LogSeverity;
}

export enum LogSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export interface SystemMetrics {
  activeUsers: number;
  totalTrades: number;
  totalVolume: string;
  systemLoad: number;
  memoryUsage: number;
  cpuUsage: number;
  diskUsage: number;
  networkLatency: number;
  errorRate: number;
  uptime: number;
  timestamp: Date;
}