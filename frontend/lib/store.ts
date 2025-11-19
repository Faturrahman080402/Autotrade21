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

interface TradingState {
  selectedSymbol: string;
  selectedTimeframe: string;
  tradeMode: 'real' | 'demo';
  setSelectedSymbol: (symbol: string) => void;
  setSelectedTimeframe: (timeframe: string) => void;
  setTradeMode: (mode: 'real' | 'demo') => void;
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
    (set) => ({
      selectedSymbol: 'BTCUSDT',
      selectedTimeframe: '1h',
      tradeMode: 'demo',
      setSelectedSymbol: (selectedSymbol) => set({ selectedSymbol }),
      setSelectedTimeframe: (selectedTimeframe) => set({ selectedTimeframe }),
      setTradeMode: (tradeMode) => set({ tradeMode }),
    }),
    {
      name: 'trading-storage',
      storage: createJSONStorage(() => localStorage),
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