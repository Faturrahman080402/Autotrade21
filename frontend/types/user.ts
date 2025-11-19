export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  accountType: 'demo' | 'real' | 'enterprise';
  avatar?: string;
  phone?: string;
  country?: string;
  isEmailVerified: boolean;
  isTwoFactorEnabled: boolean;
  preferences: UserPreferences;
  subscription: Subscription;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface UserPreferences {
  language: string;
  timezone: string;
  currency: string;
  notifications: NotificationPreferences;
  trading: TradingPreferences;
  ui: UIPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  tradeAlerts: boolean;
  priceAlerts: boolean;
  strategyAlerts: boolean;
  riskAlerts: boolean;
  marketingEmails: boolean;
}

export interface TradingPreferences {
  defaultOrderType: 'market' | 'limit' | 'stop';
  defaultTimeframe: string;
  showChartOnMobile: boolean;
  confirmOrders: boolean;
  autoRefresh: boolean;
  darkMode: boolean;
}

export interface UIPreferences {
  sidebarCollapsed: boolean;
  chartType: 'candlestick' | 'line' | 'area';
  theme: 'light' | 'dark' | 'auto';
  density: 'compact' | 'normal' | 'comfortable';
}

export interface Subscription {
  plan: 'free' | 'basic' | 'premium' | 'enterprise';
  status: 'active' | 'inactive' | 'cancelled' | 'expired';
  startDate?: string;
  endDate?: string;
  features: string[];
  limits: SubscriptionLimits;
}

export interface SubscriptionLimits {
  maxActiveStrategies: number;
  maxApiCallsPerDay: number;
  maxHistoricalDataDays: number;
  realTimeData: boolean;
  advancedFeatures: boolean;
  prioritySupport: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  accountType: 'demo' | 'real';
  acceptTerms: boolean;
  marketingConsent?: boolean;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface UpdatePasswordRequest {
  currentPassword?: string;
  newPassword: string;
  token?: string;
}

export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface TwoFactorVerify {
  token: string;
  backupCode?: string;
}