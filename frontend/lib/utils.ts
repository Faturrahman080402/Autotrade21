import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { useState, useEffect } from 'react'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Currency formatting
export const formatCurrency = (amount: number, currency = 'USD', decimals = 2) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
};

// Format large numbers
export const formatNumber = (num: number) => {
  if (num >= 1e12) return `${(num / 1e12).toFixed(1)}T`;
  if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toFixed(0);
};

// Percentage formatting
export const formatPercent = (value: number, decimals = 2) => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
};

// Format price based on magnitude
export const formatPrice = (price: number, decimals = 2) => {
  if (price >= 1000) {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  } else if (price >= 1) {
    return price.toFixed(decimals);
  } else {
    return price.toFixed(Math.max(4, decimals));
  }
};

// Time formatting
export const formatTime = (timestamp: string | Date) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
};

// Debounce hook
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Local storage helpers
export const storage = {
  get: (key: string) => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error getting item from localStorage: ${key}`, error);
      return null;
    }
  },

  set: (key: string, value: any) => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting item in localStorage: ${key}`, error);
    }
  },

  remove: (key: string) => {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing item from localStorage: ${key}`, error);
    }
  },

  clear: () => {
    try {
      window.localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage', error);
    }
  }
};

// Color utilities
export const colors = {
  getProfitLossColor: (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-muted-foreground';
  },

  getProfitLossBgColor: (value: number) => {
    if (value > 0) return 'bg-green-50 border-green-200';
    if (value < 0) return 'bg-red-50 border-red-200';
    return 'bg-gray-50 border-gray-200';
  },

  getRiskColor: (risk: 'low' | 'medium' | 'high') => {
    switch (risk) {
      case 'low':
        return 'text-green-600 bg-green-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'high':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  }
};

// Validation helpers
export const validators = {
  email: (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },

  password: (password: string) => {
    return password.length >= 8;
  },

  phone: (phone: string) => {
    const re = /^\+?[\d\s-()]+$/;
    return re.test(phone);
  },

  amount: (amount: string) => {
    const num = parseFloat(amount);
    return !isNaN(num) && num > 0;
  },

  symbol: (symbol: string) => {
    return symbol.length >= 1 && symbol.length <= 20;
  }
};

// Chart colors
export const chartColors = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  grid: '#e5e7eb',
  text: '#6b7280'
};

// Trading utilities
export const tradingUtils = {
  calculatePnL: (entryPrice: number, exitPrice: number, quantity: number, side: 'buy' | 'sell') => {
    if (side === 'buy') {
      return (exitPrice - entryPrice) * quantity;
    } else {
      return (entryPrice - exitPrice) * quantity;
    }
  },

  calculatePnLPercent: (entryPrice: number, exitPrice: number, side: 'buy' | 'sell') => {
    if (side === 'buy') {
      return ((exitPrice - entryPrice) / entryPrice) * 100;
    } else {
      return ((entryPrice - exitPrice) / entryPrice) * 100;
    }
  },

  calculatePositionSize: (accountBalance: number, riskPercent: number, entryPrice: number, stopLoss: number) => {
    const riskAmount = accountBalance * (riskPercent / 100);
    const riskPerShare = Math.abs(entryPrice - stopLoss);
    return riskAmount / riskPerShare;
  },

  calculateRiskReward: (entryPrice: number, takeProfit: number, stopLoss: number, side: 'buy' | 'sell') => {
    const risk = Math.abs(entryPrice - stopLoss);
    const reward = Math.abs(takeProfit - entryPrice);
    return reward / risk;
  }
};

// Error handling
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const handleApiError = (error: any) => {
  if (error.response) {
    // API error
    const { status, data } = error.response;
    throw new AppError(data.message || 'API Error', status, data.code);
  } else if (error.request) {
    // Network error
    throw new AppError('Network error. Please check your connection.', 0);
  } else {
    // Other error
    throw new AppError(error.message || 'An unexpected error occurred.', 500);
  }
};

// Constants
export const APP_CONFIG = {
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
  APP_NAME: 'AutoTrade21',
  APP_VERSION: '1.0.0',
  SUPPORTED_SYMBOLS: [
    'BTC/USDT',
    'ETH/USDT',
    'SOL/USDT',
    'AAPL',
    'GOOGL',
    'TSLA',
    'MSFT'
  ],
  TIMEFRAMES: [
    '1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'
  ]
};