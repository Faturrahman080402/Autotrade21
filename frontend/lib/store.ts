import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '../types/user';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
}

interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

interface Portfolio {
  totalValue: number;
  availableBalance: number;
  usedBalance: number;
  pnl24h: number;
  pnlPercent: number;
}

interface Performance {
  totalReturn: number;
  dailyChange: number;
  dailyPnL: number;
  dailyPnLPercent: number;
  riskLevel: 'low' | 'medium' | 'high';
}

interface ActivePosition {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  amount: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
}

interface AIStrategy {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'paused' | 'testing';
  performance: {
    totalReturn: number;
    winRate: number;
    accuracy: number;
  };
  isActive: boolean;
}

interface TradingState {
  selectedSymbol: string;
  selectedTimeframe: string;
  tradeMode: 'real' | 'demo';
  portfolio: Portfolio | null;
  performance: Performance | null;
  activePositions: ActivePosition[];
  aiStrategies: AIStrategy[];
  marketData: Record<string, any>;
  recentTransactions: any[];

  setSelectedSymbol: (symbol: string) => void;
  setSelectedTimeframe: (timeframe: string) => void;
  setTradeMode: (mode: 'real' | 'demo') => void;
  updatePortfolio: (portfolio: Partial<Portfolio>) => void;
  updatePerformance: (performance: Partial<Performance>) => void;
  updateActivePosition: (position: ActivePosition) => void;
  addAIStrategy: (strategy: AIStrategy) => void;
  updateStrategy: (id: string, updates: Partial<AIStrategy>) => void;
  addAISignal: (signal: any) => void;
  addTransaction: (transaction: any) => void;
  refreshData: () => void;
  placeOrder: (order: any) => Promise<void>;
}

interface NotificationState {
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    timestamp: Date;
    read: boolean;
  }>;
  unreadCount: number;
  addNotification: (notification: Omit<NotificationState['notifications'][0], 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

interface WebSocketState {
  connected: boolean;
  lastPrice: Record<string, number>;
  marketData: Record<string, any>;
  tradeUpdates: any[];
  setConnected: (connected: boolean) => void;
  updatePrice: (symbol: string, price: number) => void;
  updateMarketData: (symbol: string, data: any) => void;
  addTradeUpdate: (trade: any) => void;
  clearTradeUpdates: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: (user, accessToken, refreshToken) => {
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        set({ user, isAuthenticated: true });
      },
      logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        set({ user: null, isAuthenticated: false });
      },
      setUser: (user) => set({ user }),
      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      }),
    }
  )
);

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: 'dark',
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'ui-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export const useTradingStore = create<TradingState>()(
  persist(
    (set, get) => ({
      selectedSymbol: 'BTC/USDT',
      selectedTimeframe: '1h',
      tradeMode: 'demo',
      portfolio: null,
      performance: null,
      activePositions: [],
      aiStrategies: [],
      marketData: {},
      recentTransactions: [],

      setSelectedSymbol: (selectedSymbol) => set({ selectedSymbol }),
      setSelectedTimeframe: (selectedTimeframe) => set({ selectedTimeframe }),
      setTradeMode: (tradeMode) => set({ tradeMode }),

      updatePortfolio: (portfolio) => {
        set((state) => ({
          portfolio: state.portfolio ? { ...state.portfolio, ...portfolio } : portfolio as Portfolio
        }));
      },

      updatePerformance: (performance) => {
        set((state) => ({
          performance: state.performance ? { ...state.performance, ...performance } : performance as Performance
        }));
      },

      updateActivePosition: (position) => {
        set((state) => {
          const existingIndex = state.activePositions.findIndex(p => p.id === position.id);
          if (existingIndex >= 0) {
            const updated = [...state.activePositions];
            updated[existingIndex] = position;
            return { activePositions: updated };
          } else {
            return { activePositions: [...state.activePositions, position] };
          }
        });
      },

      addAIStrategy: (strategy) => {
        set((state) => ({
          aiStrategies: [...state.aiStrategies, strategy]
        }));
      },

      updateStrategy: (id, updates) => {
        set((state) => ({
          aiStrategies: state.aiStrategies.map(strategy =>
            strategy.id === id ? { ...strategy, ...updates } : strategy
          )
        }));
      },

      addAISignal: (signal) => {
        console.log('AI Signal received:', signal);
        // Handle AI signals
      },

      addTransaction: (transaction) => {
        set((state) => ({
          recentTransactions: [transaction, ...state.recentTransactions].slice(0, 50)
        }));
      },

      refreshData: async () => {
        // Fetch fresh data from API
        try {
          // Mock data for now
          set((state) => ({
            portfolio: {
              totalValue: 100000,
              availableBalance: 25000,
              usedBalance: 75000,
              pnl24h: 1250,
              pnlPercent: 1.25
            },
            performance: {
              totalReturn: 23.5,
              dailyChange: 1.25,
              dailyPnL: 1250,
              dailyPnLPercent: 1.25,
              riskLevel: 'medium'
            }
          }));
        } catch (error) {
          console.error('Failed to refresh data:', error);
        }
      },

      placeOrder: async (order) => {
        try {
          // Place order via API
          console.log('Placing order:', order);
          // Add to recent transactions
          get().addTransaction({
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            type: order.side,
            symbol: order.symbol,
            amount: order.amount,
            price: order.price,
            total: order.amount * (order.price || 0),
            status: 'completed'
          });
        } catch (error) {
          console.error('Failed to place order:', error);
          throw error;
        }
      },
    }),
    {
      name: 'trading-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedSymbol: state.selectedSymbol,
        selectedTimeframe: state.selectedTimeframe,
        tradeMode: state.tradeMode
      })
    }
  )
);

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  addNotification: (notification) => {
    const id = Date.now().toString();
    const timestamp = new Date();
    const newNotification = { ...notification, id, timestamp, read: false };

    set((state) => ({
      notifications: [newNotification, ...state.notifications].slice(0, 50),
      unreadCount: state.unreadCount + 1,
    }));
  },
  markAsRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },
  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },
  clearNotifications: () => {
    set({ notifications: [], unreadCount: 0 });
  },
}));

export const useWebSocketStore = create<WebSocketState>((set) => ({
  connected: false,
  lastPrice: {},
  marketData: {},
  tradeUpdates: [],
  setConnected: (connected) => set({ connected }),
  updatePrice: (symbol, price) => {
    set((state) => ({
      lastPrice: { ...state.lastPrice, [symbol]: price },
    }));
  },
  updateMarketData: (symbol, data) => {
    set((state) => ({
      marketData: { ...state.marketData, [symbol]: data },
    }));
  },
  addTradeUpdate: (trade) => {
    set((state) => ({
      tradeUpdates: [trade, ...state.tradeUpdates].slice(0, 100),
    }));
  },
  clearTradeUpdates: () => {
    set({ tradeUpdates: [] });
  },
}));

// Derived stores for computed values
export const useDerivedStore = () => {
  const user = useAuthStore((state) => state.user);
  const tradeMode = useTradingStore((state) => state.tradeMode);
  const selectedSymbol = useTradingStore((state) => state.selectedSymbol);

  return {
    isDemoAccount: tradeMode === 'demo',
    isRealAccount: tradeMode === 'real',
    currentUser: user,
    hasActiveSubscription: user?.accountType !== 'standard',
    currentSymbolPrice: useWebSocketStore((state) => state.lastPrice[selectedSymbol]),
  };
};