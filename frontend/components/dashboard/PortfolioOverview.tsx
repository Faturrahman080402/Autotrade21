import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTradingStore } from '@/lib/store';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface AssetAllocation {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

export function PortfolioOverview() {
  const { portfolio, performance, activePositions } = useTradingStore();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  // Mock asset allocation data
  const assetAllocation: AssetAllocation[] = [
    { name: 'Bitcoin', value: 45000, percentage: 45, color: '#f7931a' },
    { name: 'Ethereum', value: 25000, percentage: 25, color: '#627eea' },
    { name: 'Stocks', value: 20000, percentage: 20, color: '#10b981' },
    { name: 'Cash', value: 10000, percentage: 10, color: '#6b7280' },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(data.value)}
          </p>
          <p className="text-sm">{data.percentage}%</p>
        </div>
      );
    }
    return null;
  };

  const performanceMetrics = [
    {
      label: 'Total Return',
      value: formatPercent(performance?.totalReturn || 0),
      change: performance?.totalReturn || 0,
      icon: TrendingUp
    },
    {
      label: 'Daily Return',
      value: formatPercent(performance?.dailyChange || 0),
      change: performance?.dailyChange || 0,
      icon: Activity
    },
    {
      label: 'Win Rate',
      value: '68.5%',
      change: 2.3,
      icon: Percent
    },
    {
      label: 'Risk Score',
      value: 'Medium',
      change: -0.5,
      icon: DollarSign
    }
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Portfolio Overview</CardTitle>
            <CardDescription>
              {formatCurrency(portfolio?.totalValue || 0)} Total Value
            </CardDescription>
          </div>
          <Button variant="outline" size="sm">
            View Details
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Asset Allocation Chart */}
        <div>
          <h4 className="text-sm font-medium mb-4">Asset Allocation</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={assetAllocation}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {assetAllocation.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Asset Allocation Legend */}
        <div className="space-y-2">
          {assetAllocation.map((asset) => (
            <div key={asset.name} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: asset.color }}
                />
                <span className="text-sm">{asset.name}</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{formatCurrency(asset.value)}</p>
                <p className="text-xs text-muted-foreground">{asset.percentage}%</p>
              </div>
            </div>
          ))}
        </div>

        {/* Performance Metrics */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Performance Metrics</h4>
          <div className="grid grid-cols-2 gap-3">
            {performanceMetrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <div key={metric.label} className="flex items-center space-x-2">
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">{metric.label}</p>
                    <p className="text-sm font-medium">{metric.value}</p>
                  </div>
                  {metric.change !== 0 && (
                    <div className={`flex items-center text-xs ${
                      metric.change > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {metric.change > 0 ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                      {formatPercent(Math.abs(metric.change))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="pt-4 border-t">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Active Positions</p>
              <p className="text-lg font-semibold">{activePositions?.length || 0}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Available Balance</p>
              <p className="text-lg font-semibold">
                {formatCurrency(portfolio?.availableBalance || 0)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}