import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTradingStore } from '@/lib/store';
import {
  TrendingUp,
  TrendingDown,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Search,
  Filter
} from 'lucide-react';

interface MarketAsset {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  marketCap: number;
  high24h: number;
  low24h: number;
  isFavorite?: boolean;
}

export function MarketData() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'change' | 'volume'>('change');

  const { marketData } = useTradingStore();

  // Mock market data
  const marketAssets: MarketAsset[] = [
    {
      symbol: 'BTC/USDT',
      name: 'Bitcoin',
      price: 43567.89,
      change24h: 1250.45,
      changePercent24h: 2.96,
      volume24h: 28567432900,
      marketCap: 854892000000,
      high24h: 44250.00,
      low24h: 42180.50,
      isFavorite: true
    },
    {
      symbol: 'ETH/USDT',
      name: 'Ethereum',
      price: 2456.78,
      change24h: -45.32,
      changePercent24h: -1.81,
      volume24h: 14567328900,
      marketCap: 295234000000,
      high24h: 2512.30,
      low24h: 2410.20,
      isFavorite: true
    },
    {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      price: 189.45,
      change24h: 2.15,
      changePercent24h: 1.15,
      volume24h: 56789000,
      marketCap: 2950000000000,
      high24h: 191.20,
      low24h: 187.30,
      isFavorite: false
    },
    {
      symbol: 'GOOGL',
      name: 'Alphabet Inc.',
      price: 145.67,
      change24h: -0.89,
      changePercent24h: -0.61,
      volume24h: 23456700,
      marketCap: 1820000000000,
      high24h: 146.80,
      low24h: 144.90,
      isFavorite: false
    },
    {
      symbol: 'TSLA',
      name: 'Tesla Inc.',
      price: 234.56,
      change24h: 8.92,
      changePercent24h: 3.95,
      volume24h: 98765400,
      marketCap: 745000000000,
      high24h: 238.90,
      low24h: 225.40,
      isFavorite: false
    },
    {
      symbol: 'SOL/USDT',
      name: 'Solana',
      price: 98.45,
      change24h: 5.67,
      changePercent24h: 6.11,
      volume24h: 2345678000,
      marketCap: 42345000000,
      high24h: 101.20,
      low24h: 92.80,
      isFavorite: false
    }
  ];

  const categories = [
    { id: 'all', label: 'All Markets' },
    { id: 'crypto', label: 'Crypto' },
    { id: 'stocks', label: 'Stocks' },
    { id: 'forex', label: 'Forex' },
    { id: 'commodities', label: 'Commodities' }
  ];

  const formatCurrency = (amount: number, decimals: number = 2) => {
    if (amount >= 1e12) {
      return `$${(amount / 1e12).toFixed(1)}T`;
    } else if (amount >= 1e9) {
      return `$${(amount / 1e9).toFixed(1)}B`;
    } else if (amount >= 1e6) {
      return `$${(amount / 1e6).toFixed(1)}M`;
    } else {
      return `$${amount.toFixed(decimals)}`;
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (price >= 1) {
      return price.toFixed(2);
    } else {
      return price.toFixed(4);
    }
  };

  const filteredAndSortedAssets = marketAssets
    .filter(asset => {
      const matchesSearch = asset.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           asset.name.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = selectedCategory === 'all' ||
        (selectedCategory === 'crypto' && asset.symbol.includes('/')) ||
        (selectedCategory === 'stocks' && !asset.symbol.includes('/'));

      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price':
          return b.price - a.price;
        case 'change':
          return b.changePercent24h - a.changePercent24h;
        case 'volume':
          return b.volume24h - a.volume24h;
        default:
          return 0;
      }
    });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Market Overview</CardTitle>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Advanced Filter
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search and Category Filter */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.label}
              </Button>
            ))}
          </div>

          {/* Sort Options */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <div className="flex items-center space-x-1">
              {[
                { id: 'change', label: 'Change' },
                { id: 'volume', label: 'Volume' },
                { id: 'price', label: 'Price' },
                { id: 'name', label: 'Name' }
              ].map((sort) => (
                <Button
                  key={sort.id}
                  variant={sortBy === sort.id ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSortBy(sort.id as any)}
                >
                  {sort.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Market Data Table */}
        <div className="space-y-1">
          {filteredAndSortedAssets.map((asset) => (
            <div
              key={asset.symbol}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center space-x-3 flex-1">
                {/* Favorite Star */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Star
                    className={`h-4 w-4 ${
                      asset.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
                    }`}
                  />
                </Button>

                {/* Asset Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm">{asset.symbol}</span>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {asset.name}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4 text-right">
                {/* Price */}
                <div className="min-w-[80px]">
                  <p className="font-medium text-sm">{formatPrice(asset.price)}</p>
                </div>

                {/* 24h Change */}
                <div className="min-w-[80px]">
                  <div className={`flex items-center justify-end space-x-1 ${
                    asset.change24h >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {asset.change24h >= 0 ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : asset.change24h < 0 ? (
                      <ArrowDownRight className="h-3 w-3" />
                    ) : (
                      <Minus className="h-3 w-3" />
                    )}
                    <span className="text-sm font-medium">
                      {asset.changePercent24h >= 0 ? '+' : ''}{asset.changePercent24h.toFixed(2)}%
                    </span>
                  </div>
                </div>

                {/* Volume */}
                <div className="min-w-[70px] hidden md:block">
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(asset.volume24h)}
                  </p>
                </div>

                {/* Market Cap */}
                <div className="min-w-[70px] hidden lg:block">
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(asset.marketCap)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Market Summary */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-3">Market Summary</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Top Gainer</p>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">SOL</span>
                <span className="text-sm text-green-600">+6.11%</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Top Loser</p>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">ETH</span>
                <span className="text-sm text-red-600">-1.81%</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Volume</p>
              <p className="text-sm font-medium">{formatCurrency(45678329000)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active Pairs</p>
              <p className="text-sm font-medium">{marketAssets.length}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}