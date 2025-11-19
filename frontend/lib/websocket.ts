import { io, Socket } from 'socket.io-client';
import { useTradingStore, useAuthStore } from '@/lib/store';

export class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    this.connect();
  }

  private connect() {
    const { token } = useAuthStore.getState();

    if (!token) {
      console.warn('No authentication token available for WebSocket connection');
      return;
    }

    this.socket = io(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001', {
      auth: {
        token
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.subscribeToChannels();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.handleReconnect();
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Market data updates
    this.socket.on('market_data', (data) => {
      const { updateMarketData } = useTradingStore.getState();
      updateMarketData(data);
    });

    // Trade updates
    this.socket.on('trade_update', (data) => {
      const { updateActivePosition } = useTradingStore.getState();
      updateActivePosition(data);
    });

    // Portfolio updates
    this.socket.on('portfolio_update', (data) => {
      const { updatePortfolio } = useTradingStore.getState();
      updatePortfolio(data);
    });

    // AI strategy signals
    this.socket.on('ai_signal', (data) => {
      const { addAISignal } = useTradingStore.getState();
      addAISignal(data);
    });

    // Order updates
    this.socket.on('order_update', (data) => {
      const { updateOrder } = useTradingStore.getState();
      updateOrder(data);
    });

    // Notifications
    this.socket.on('notification', (data) => {
      const { addNotification } = useTradingStore.getState();
      addNotification(data);
    });

    // Risk alerts
    this.socket.on('risk_alert', (data) => {
      const { addRiskAlert } = useTradingStore.getState();
      addRiskAlert(data);
    });
  }

  private subscribeToChannels() {
    if (!this.socket) return;

    const { user } = useAuthStore.getState();

    // Subscribe to user-specific channels
    this.socket.emit('subscribe', {
      channels: [
        `user_${user?.id}`,
        'market_data',
        'ai_signals'
      ]
    });

    // Subscribe to selected symbol
    const { selectedSymbol } = useTradingStore.getState();
    if (selectedSymbol) {
      this.subscribeToSymbol(selectedSymbol);
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  // Public methods
  public subscribeToSymbol(symbol: string) {
    if (!this.socket) return;

    this.socket.emit('subscribe_symbol', { symbol });
  }

  public unsubscribeFromSymbol(symbol: string) {
    if (!this.socket) return;

    this.socket.emit('unsubscribe_symbol', { symbol });
  }

  public placeOrder(orderData: any) {
    if (!this.socket) return;

    this.socket.emit('place_order', orderData);
  }

  public cancelOrder(orderId: string) {
    if (!this.socket) return;

    this.socket.emit('cancel_order', { orderId });
  }

  public toggleStrategy(strategyId: string, isActive: boolean) {
    if (!this.socket) return;

    this.socket.emit('toggle_strategy', { strategyId, isActive });
  }

  public updateStrategySettings(strategyId: string, settings: any) {
    if (!this.socket) return;

    this.socket.emit('update_strategy_settings', { strategyId, settings });
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  public isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Singleton instance
export const wsService = new WebSocketService();

// React hook for WebSocket integration
export function useWebSocket() {
  return {
    subscribeToSymbol: wsService.subscribeToSymbol.bind(wsService),
    unsubscribeFromSymbol: wsService.unsubscribeFromSymbol.bind(wsService),
    placeOrder: wsService.placeOrder.bind(wsService),
    cancelOrder: wsService.cancelOrder.bind(wsService),
    toggleStrategy: wsService.toggleStrategy.bind(wsService),
    updateStrategySettings: wsService.updateStrategySettings.bind(wsService),
    isConnected: wsService.isConnected.bind(wsService),
    disconnect: wsService.disconnect.bind(wsService)
  };
}