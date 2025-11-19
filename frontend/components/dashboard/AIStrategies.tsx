import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTradingStore } from '@/lib/store';
import {
  Bot,
  Play,
  Pause,
  Settings,
  TrendingUp,
  TrendingDown,
  Activity,
  Brain,
  Zap,
  Target,
  Shield,
  ChevronRight
} from 'lucide-react';

interface AIStrategy {
  id: string;
  name: string;
  description: string;
  type: 'trend' | 'momentum' | 'mean_reversion' | 'arbitrage';
  status: 'active' | 'paused' | 'testing' | 'profitable' | 'loss';
  performance: {
    totalReturn: number;
    winRate: number;
    trades: number;
    accuracy: number;
  };
  risk: 'low' | 'medium' | 'high';
  confidence: number;
  lastSignal?: {
    type: 'buy' | 'sell' | 'hold';
    strength: number;
    timestamp: string;
  };
}

export function AIStrategies() {
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const { aiStrategies, updateStrategy } = useTradingStore();

  // Mock AI strategies data
  const strategies: AIStrategy[] = [
    {
      id: '1',
      name: 'Neural Trend Master',
      description: 'LSTM-based trend following with multi-timeframe analysis',
      type: 'trend',
      status: 'active',
      performance: {
        totalReturn: 23.5,
        winRate: 68.5,
        trades: 156,
        accuracy: 72.3
      },
      risk: 'medium',
      confidence: 87,
      lastSignal: {
        type: 'buy',
        strength: 0.82,
        timestamp: '2024-01-15T10:30:00Z'
      }
    },
    {
      id: '2',
      name: 'Quantum Scalper',
      description: 'High-frequency momentum detection with microstructure analysis',
      type: 'momentum',
      status: 'profitable',
      performance: {
        totalReturn: 18.2,
        winRate: 64.2,
        trades: 423,
        accuracy: 68.7
      },
      risk: 'high',
      confidence: 92,
      lastSignal: {
        type: 'sell',
        strength: 0.75,
        timestamp: '2024-01-15T10:45:00Z'
      }
    },
    {
      id: '3',
      name: 'Mean Reversion Pro',
      description: 'Statistical arbitrage with Bollinger Band deviation',
      type: 'mean_reversion',
      status: 'testing',
      performance: {
        totalReturn: 5.8,
        winRate: 71.2,
        trades: 89,
        accuracy: 69.1
      },
      risk: 'low',
      confidence: 65,
      lastSignal: {
        type: 'hold',
        strength: 0.45,
        timestamp: '2024-01-15T09:15:00Z'
      }
    },
    {
      id: '4',
      name: 'Cross Market Arbitrage',
      description: 'Triangular arbitrage detection across multiple exchanges',
      type: 'arbitrage',
      status: 'paused',
      performance: {
        totalReturn: 12.1,
        winRate: 89.7,
        trades: 67,
        accuracy: 91.2
      },
      risk: 'low',
      confidence: 78,
      lastSignal: {
        type: 'buy',
        strength: 0.91,
        timestamp: '2024-01-15T08:30:00Z'
      }
    }
  ];

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getStatusColor = (status: AIStrategy['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'profitable':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'testing':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'paused':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'loss':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRiskColor = (risk: AIStrategy['risk']) => {
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
  };

  const getTypeIcon = (type: AIStrategy['type']) => {
    switch (type) {
      case 'trend':
        return <TrendingUp className="h-4 w-4" />;
      case 'momentum':
        return <Zap className="h-4 w-4" />;
      case 'mean_reversion':
        return <Activity className="h-4 w-4" />;
      case 'arbitrage':
        return <Target className="h-4 w-4" />;
      default:
        return <Brain className="h-4 w-4" />;
    }
  };

  const handleToggleStrategy = (strategyId: string, currentStatus: AIStrategy['status']) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    updateStrategy(strategyId, { status: newStatus });
  };

  const getSignalColor = (type: 'buy' | 'sell' | 'hold') => {
    switch (type) {
      case 'buy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'sell':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'hold':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>AI Trading Strategies</CardTitle>
          <Button variant="outline" size="sm">
            <Bot className="h-4 w-4 mr-2" />
            Create New
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {strategies.map((strategy) => (
          <div
            key={strategy.id}
            className={`border rounded-lg p-4 space-y-3 transition-colors ${
              selectedStrategy === strategy.id ? 'border-blue-200 bg-blue-50' : 'hover:bg-muted/50'
            }`}
            onClick={() => setSelectedStrategy(strategy.id)}
          >
            {/* Strategy Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  {getTypeIcon(strategy.type)}
                </div>
                <div>
                  <h4 className="font-medium">{strategy.name}</h4>
                  <p className="text-xs text-muted-foreground">{strategy.description}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(strategy.status)}`}>
                  {strategy.status}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleStrategy(strategy.id, strategy.status);
                  }}
                >
                  {strategy.status === 'active' ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-4 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Return</p>
                <p className={`text-sm font-medium ${
                  strategy.performance.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatPercent(strategy.performance.totalReturn)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Win Rate</p>
                <p className="text-sm font-medium">{strategy.performance.winRate.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Trades</p>
                <p className="text-sm font-medium">{strategy.performance.trades}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Confidence</p>
                <div className="flex items-center space-x-1">
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        strategy.confidence >= 80 ? 'bg-green-500' :
                        strategy.confidence >= 60 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${strategy.confidence}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium">{strategy.confidence}%</span>
                </div>
              </div>
            </div>

            {/* Risk and Last Signal */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="h-3 w-3 text-muted-foreground" />
                <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(strategy.risk)}`}>
                  {strategy.risk} risk
                </span>
              </div>

              {strategy.lastSignal && (
                <div className="flex items-center space-x-2">
                  <div className={`px-2 py-1 rounded text-xs font-medium border ${getSignalColor(strategy.lastSignal.type)}`}>
                    {strategy.lastSignal.type.toUpperCase()}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {strategy.lastSignal.strength.toFixed(2)} strength
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm">
                  <Activity className="h-4 w-4 mr-1" />
                  Performance
                </Button>
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4 mr-1" />
                  Settings
                </Button>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        ))}

        {/* Overall Performance Summary */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-3">Overall AI Performance</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">+22.4%</p>
              <p className="text-xs text-muted-foreground">Total Return</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">68.2%</p>
              <p className="text-xs text-muted-foreground">Average Win Rate</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}