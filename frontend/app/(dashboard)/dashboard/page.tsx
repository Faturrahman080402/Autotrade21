import React from 'react';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Activity, Bot, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTradingStore } from '@/lib/store';
import { PortfolioOverview } from '@/components/dashboard/PortfolioOverview';
import { TradingChart } from '@/components/dashboard/TradingChart';
import { TradingInterface } from '@/components/dashboard/TradingInterface';
import { AIStrategies } from '@/components/dashboard/AIStrategies';
import { MarketData } from '@/components/dashboard/MarketData';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';

export default function DashboardPage() {
  const {
    portfolio,
    activePositions,
    aiStrategies,
    marketData,
    performance,
    refreshData
  } = useTradingStore();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Trading Dashboard</h1>
              <p className="text-muted-foreground">
                Real-time market data and AI-powered trading insights
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={refreshData}>
                <Activity className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
              <Button>
                <Bot className="h-4 w-4 mr-2" />
                AI Assistant
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Portfolio Value */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Portfolio Value</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(portfolio?.totalValue || 0)}
                  </p>
                  <p className={`text-sm ${performance?.dailyChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercent(performance?.dailyChange || 0)}
                  </p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Today's P&L */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Today's P&L</p>
                  <p className={`text-2xl font-bold ${performance?.dailyPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(performance?.dailyPnL || 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatPercent(performance?.dailyPnLPercent || 0)}
                  </p>
                </div>
                <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                  performance?.dailyPnL >= 0 ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {performance?.dailyPnL >= 0 ? (
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  ) : (
                    <TrendingDown className="h-6 w-6 text-red-600" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Positions */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Positions</p>
                  <p className="text-2xl font-bold">{activePositions?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">
                    {activePositions?.filter(pos => pos.side === 'long').length || 0} Long,
                    {' '}{activePositions?.filter(pos => pos.side === 'short').length || 0} Short
                  </p>
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Strategies Active */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">AI Strategies</p>
                  <p className="text-2xl font-bold">{aiStrategies?.filter(s => s.isActive).length || 0}</p>
                  <p className="text-sm text-muted-foreground">
                    {aiStrategies?.filter(s => s.status === 'profitable').length || 0} Profitable
                  </p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Bot className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alert */}
        {performance?.riskLevel === 'high' && (
          <Card variant="outlined" className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-900">High Risk Alert</p>
                  <p className="text-sm text-red-700">
                    Your current risk level is elevated. Consider reducing position sizes.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Chart and Trading */}
          <div className="lg:col-span-2 space-y-6">
            {/* Trading Chart */}
            <TradingChart />

            {/* Trading Interface */}
            <TradingInterface />
          </div>

          {/* Right Column - Portfolio, AI, Market Data */}
          <div className="space-y-6">
            {/* Portfolio Overview */}
            <PortfolioOverview />

            {/* AI Strategies */}
            <AIStrategies />

            {/* Market Data */}
            <MarketData />
          </div>
        </div>

        {/* Bottom Row - Recent Transactions */}
        <div className="mt-6">
          <RecentTransactions />
        </div>
      </div>
    </div>
  );
}