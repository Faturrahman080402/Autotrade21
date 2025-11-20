import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTradingStore } from '@/lib/store';
import {
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Filter,
  Download,
  Eye
} from 'lucide-react';

interface Transaction {
  id: string;
  timestamp: string;
  type: 'buy' | 'sell' | 'deposit' | 'withdrawal';
  symbol: string;
  amount: number;
  price: number;
  total: number;
  status: 'completed' | 'pending' | 'failed';
  fee?: number;
  strategy?: string;
}

export function RecentTransactions() {
  const { recentTransactions } = useTradingStore();

  // Mock transaction data
  const transactions: Transaction[] = [
    {
      id: '1',
      timestamp: '2024-01-15T10:45:00Z',
      type: 'buy',
      symbol: 'BTC/USDT',
      amount: 0.025,
      price: 43567.89,
      total: 1089.20,
      status: 'completed',
      fee: 2.72,
      strategy: 'Neural Trend Master'
    },
    {
      id: '2',
      timestamp: '2024-01-15T10:30:00Z',
      type: 'sell',
      symbol: 'ETH/USDT',
      amount: 0.5,
      price: 2456.78,
      total: 1228.39,
      status: 'completed',
      fee: 3.07,
      strategy: 'Quantum Scalper'
    },
    {
      id: '3',
      timestamp: '2024-01-15T09:15:00Z',
      type: 'buy',
      symbol: 'SOL/USDT',
      amount: 10,
      price: 98.45,
      total: 984.50,
      status: 'completed',
      fee: 2.46
    },
    {
      id: '4',
      timestamp: '2024-01-15T08:30:00Z',
      type: 'deposit',
      symbol: 'USDT',
      amount: 5000,
      price: 1,
      total: 5000,
      status: 'completed'
    },
    {
      id: '5',
      timestamp: '2024-01-15T07:45:00Z',
      type: 'sell',
      symbol: 'AAPL',
      amount: 50,
      price: 189.45,
      total: 9472.50,
      status: 'pending',
      fee: 23.68
    },
    {
      id: '6',
      timestamp: '2024-01-15T06:20:00Z',
      type: 'buy',
      symbol: 'GOOGL',
      amount: 30,
      price: 145.67,
      total: 4370.10,
      status: 'failed'
    }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatTime = (timestamp: string) => {
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
    } else {
      return `${diffDays}d ago`;
    }
  };

  const getStatusColor = (status: Transaction['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'buy':
        return <ArrowUpRight className="h-4 w-4 text-green-600" />;
      case 'sell':
        return <ArrowDownRight className="h-4 w-4 text-red-600" />;
      case 'deposit':
        return <ArrowUpRight className="h-4 w-4 text-blue-600" />;
      case 'withdrawal':
        return <ArrowDownRight className="h-4 w-4 text-orange-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTypeColor = (type: Transaction['type']) => {
    switch (type) {
      case 'buy':
        return 'text-green-600';
      case 'sell':
        return 'text-red-600';
      case 'deposit':
        return 'text-blue-600';
      case 'withdrawal':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  const calculatePnL = (transaction: Transaction) => {
    // This is a simplified P&L calculation
    // In a real app, you'd track the original buy price
    if (transaction.type === 'sell') {
      return Math.random() > 0.5 ? 125.50 : -45.20; // Mock P&L
    }
    return 0;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recent Transactions</CardTitle>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-1">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                {/* Transaction Type Icon */}
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  {getTypeIcon(transaction.type)}
                </div>

                {/* Transaction Details */}
                <div>
                  <div className="flex items-center space-x-2">
                    <span className={`font-medium capitalize ${getTypeColor(transaction.type)}`}>
                      {transaction.type}
                    </span>
                    <span className="text-sm font-medium">{transaction.symbol}</span>
                    {transaction.strategy && (
                      <span className="text-xs text-muted-foreground">
                        via {transaction.strategy}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatTime(transaction.timestamp)}</span>
                    <span>•</span>
                    <span>{transaction.amount} @ {formatCurrency(transaction.price)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4 text-right">
                {/* Total Amount */}
                <div>
                  <p className="font-medium">{formatCurrency(transaction.total)}</p>
                  {transaction.fee && (
                    <p className="text-xs text-muted-foreground">Fee: {formatCurrency(transaction.fee)}</p>
                  )}
                </div>

                {/* P&L for sells */}
                {transaction.type === 'sell' && transaction.status === 'completed' && (
                  <div>
                    <p className={`text-sm font-medium ${
                      calculatePnL(transaction) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {calculatePnL(transaction) >= 0 ? '+' : ''}{formatCurrency(calculatePnL(transaction))}
                    </p>
                  </div>
                )}

                {/* Status */}
                <div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(transaction.status)}`}>
                    {transaction.status}
                  </span>
                </div>

                {/* Actions */}
                <Button variant="ghost" size="sm">
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="pt-4 border-t mt-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{transactions.length}</p>
              <p className="text-xs text-muted-foreground">Total Transactions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {transactions.filter(t => t.status === 'completed').length}
              </p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {transactions.filter(t => t.status === 'pending').length}
              </p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">
                {formatCurrency(
                  transactions
                    .filter(t => t.status === 'completed')
                    .reduce((sum, t) => sum + t.total, 0)
                )}
              </p>
              <p className="text-xs text-muted-foreground">Total Volume</p>
            </div>
          </div>
        </div>

        {/* View All Link */}
        <div className="pt-4 text-center">
          <Button variant="outline" className="w-full">
            View All Transactions
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}