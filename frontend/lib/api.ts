import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Try to refresh token
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data.data;
          localStorage.setItem('access_token', accessToken);
          if (newRefreshToken) {
            localStorage.setItem('refresh_token', newRefreshToken);
          }

          // Retry the original request
          error.config.headers.Authorization = `Bearer ${accessToken}`;
          return api.request(error.config);
        } catch (refreshError) {
          // Refresh failed, redirect to login
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/auth/login';
        }
      } else {
        // No refresh token, redirect to login
        localStorage.removeItem('access_token');
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post('/api/v1/auth/login', { email, password });
    return response.data;
  },

  register: async (userData: any) => {
    const response = await api.post('/api/v1/auth/register', userData);
    return response.data;
  },

  logout: async (userId: string) => {
    const response = await api.post('/api/v1/auth/logout', { userId });
    return response.data;
  },

  refreshToken: async (refreshToken: string) => {
    const response = await api.post('/api/v1/auth/refresh', { refreshToken });
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/api/v1/auth/profile');
    return response.data;
  },

  enable2FA: async () => {
    const response = await api.post('/api/v1/auth/2fa/setup');
    return response.data;
  },

  verify2FA: async (tempToken: string, verificationCode: string) => {
    const response = await api.post('/api/v1/auth/2fa/enable', {
      tempToken,
      verificationCode,
    });
    return response.data;
  },

  disable2FA: async (password: string, twoFactorCode?: string) => {
    const response = await api.post('/api/v1/auth/2fa/disable', {
      password,
      twoFactorCode,
    });
    return response.data;
  },
};

// Wallet API
export const walletAPI = {
  getOverview: async () => {
    const response = await api.get('/api/v1/wallets/overview');
    return response.data;
  },

  getWallets: async () => {
    const response = await api.get('/api/v1/wallets');
    return response.data;
  },

  getTransactions: async (page = 1, limit = 20, filters = {}) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters,
    });
    const response = await api.get(`/api/v1/wallets/transactions?${params}`);
    return response.data;
  },

  transferFunds: async (transferData: any) => {
    const response = await api.post('/api/v1/wallets/transfer', transferData);
    return response.data;
  },

  freezeFunds: async (walletId: string, amount: string, reason?: string) => {
    const response = await api.post('/api/v1/wallets/freeze', {
      walletId,
      amount,
      reason,
    });
    return response.data;
  },

  unfreezeFunds: async (walletId: string, amount: string, reason?: string) => {
    const response = await api.post('/api/v1/wallets/unfreeze', {
      walletId,
      amount,
      reason,
    });
    return response.data;
  },
};

// Trading API
export const tradingAPI = {
  getTrades: async (page = 1, limit = 20, filters = {}) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters,
    });
    const response = await api.get(`/api/v1/trading/trades?${params}`);
    return response.data;
  },

  getOpenPositions: async () => {
    const response = await api.get('/api/v1/trading/positions');
    return response.data;
  },

  executeTrade: async (tradeData: any) => {
    const response = await api.post('/api/v1/trading/execute', tradeData);
    return response.data;
  },

  closeTrade: async (tradeId: string, reason?: string) => {
    const response = await api.post(`/api/v1/trading/close/${tradeId}`, { reason });
    return response.data;
  },

  closeAllPositions: async (reason?: string) => {
    const response = await api.post('/api/v1/trading/close-all', { reason });
    return response.data;
  },

  getTradingStats: async (accountType?: 'real' | 'demo') => {
    const params = accountType ? `?accountType=${accountType}` : '';
    const response = await api.get(`/api/v1/trading/stats${params}`);
    return response.data;
  },

  getRiskMetrics: async () => {
    const response = await api.get('/api/v1/trading/risk-metrics');
    return response.data;
  },

  getDailyPnL: async (days = 30) => {
    const response = await api.get(`/api/v1/trading/daily-pnl?days=${days}`);
    return response.data;
  },
};

// Market Data API
export const marketAPI = {
  getSymbols: async () => {
    const response = await api.get('/api/v1/market/symbols');
    return response.data;
  },

  getTicker: async (symbol: string) => {
    const response = await api.get(`/api/v1/market/ticker/${symbol}`);
    return response.data;
  },

  getCandlesticks: async (symbol: string, timeframe: string, limit = 500) => {
    const response = await api.get(
      `/api/v1/market/candlesticks/${symbol}?timeframe=${timeframe}&limit=${limit}`
    );
    return response.data;
  },

  getOrderBook: async (symbol: string) => {
    const response = await api.get(`/api/v1/market/orderbook/${symbol}`);
    return response.data;
  },

  getRecentTrades: async (symbol: string, limit = 50) => {
    const response = await api.get(
      `/api/v1/market/trades/${symbol}?limit=${limit}`
    );
    return response.data;
  },
};

// AI Strategy API
export const aiAPI = {
  getStrategies: async () => {
    const response = await api.get('/api/v1/ai/strategies');
    return response.data;
  },

  getStrategy: async (strategyId: string) => {
    const response = await api.get(`/api/v1/ai/strategies/${strategyId}`);
    return response.data;
  },

  createStrategy: async (strategyData: any) => {
    const response = await api.post('/api/v1/ai/strategies', strategyData);
    return response.data;
  },

  updateStrategy: async (strategyId: string, strategyData: any) => {
    const response = await api.put(`/api/v1/ai/strategies/${strategyId}`, strategyData);
    return response.data;
  },

  deleteStrategy: async (strategyId: string) => {
    const response = await api.delete(`/api/v1/ai/strategies/${strategyId}`);
    return response.data;
  },

  activateStrategy: async (strategyId: string) => {
    const response = await api.post(`/api/v1/ai/strategies/${strategyId}/activate`);
    return response.data;
  },

  deactivateStrategy: async (strategyId: string) => {
    const response = await api.post(`/api/v1/ai/strategies/${strategyId}/deactivate`);
    return response.data;
  },

  getPredictions: async (symbol: string, timeframe?: string) => {
    const params = timeframe ? `?timeframe=${timeframe}` : '';
    const response = await api.get(`/api/v1/ai/predictions/${symbol}${params}`);
    return response.data;
  },

  backtestStrategy: async (strategyId: string, backtestData: any) => {
    const response = await api.post(`/api/v1/ai/strategies/${strategyId}/backtest`, backtestData);
    return response.data;
  },

  getModelAccuracy: async (days = 30) => {
    const response = await api.get(`/api/v1/ai/accuracy?days=${days}`);
    return response.data;
  },
};

// Notification API
export const notificationAPI = {
  getNotifications: async (page = 1, limit = 20) => {
    const response = await api.get(
      `/api/v1/notifications?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  markAsRead: async (notificationId: string) => {
    const response = await api.patch(`/api/v1/notifications/${notificationId}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await api.patch('/api/v1/notifications/read-all');
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await api.get('/api/v1/notifications/unread-count');
    return response.data;
  },

  getSettings: async () => {
    const response = await api.get('/api/v1/notifications/settings');
    return response.data;
  },

  updateSettings: async (settings: any) => {
    const response = await api.put('/api/v1/notifications/settings', settings);
    return response.data;
  },
};

// Admin API
export const adminAPI = {
  getUsers: async (page = 1, limit = 20, filters = {}) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters,
    });
    const response = await api.get(`/api/v1/admin/users?${params}`);
    return response.data;
  },

  getUser: async (userId: string) => {
    const response = await api.get(`/api/v1/admin/users/${userId}`);
    return response.data;
  },

  updateUser: async (userId: string, userData: any) => {
    const response = await api.put(`/api/v1/admin/users/${userId}`, userData);
    return response.data;
  },

  suspendUser: async (userId: string, reason: string) => {
    const response = await api.post(`/api/v1/admin/users/${userId}/suspend`, { reason });
    return response.data;
  },

  activateUser: async (userId: string) => {
    const response = await api.post(`/api/v1/admin/users/${userId}/activate`);
    return response.data;
  },

  getSystemStats: async () => {
    const response = await api.get('/api/v1/admin/stats');
    return response.data;
  },

  getAuditLogs: async (page = 1, limit = 50, filters = {}) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters,
    });
    const response = await api.get(`/api/v1/admin/audit-logs?${params}`);
    return response.data;
  },
};

export default api;