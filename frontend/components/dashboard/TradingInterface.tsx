import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTradingStore } from '@/lib/store';
import {
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  TrendingUp,
  Shield,
  Settings,
  Info
} from 'lucide-react';

interface OrderType {
  id: string;
  label: string;
  description: string;
}

interface OrderSide {
  id: 'buy' | 'sell';
  label: string;
  color: string;
  bgColor: string;
}

export function TradingInterface() {
  const [orderType, setOrderType] = useState('market');
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');

  const { selectedSymbol, portfolio, placeOrder } = useTradingStore();

  const orderTypes: OrderType[] = [
    {
      id: 'market',
      label: 'Market',
      description: 'Execute immediately at current price'
    },
    {
      id: 'limit',
      label: 'Limit',
      description: 'Execute when price reaches target'
    },
    {
      id: 'stop',
      label: 'Stop Loss',
      description: 'Execute when price drops below level'
    },
    {
      id: 'stop-limit',
      label: 'Stop Limit',
      description: 'Become limit order when stop price is reached'
    }
  ];

  const orderSides: OrderSide[] = [
    {
      id: 'buy',
      label: 'Buy',
      color: 'text-green-600',
      bgColor: 'bg-green-50 border-green-200'
    },
    {
      id: 'sell',
      label: 'Sell',
      color: 'text-red-600',
      bgColor: 'bg-red-50 border-red-200'
    }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const calculateTotal = () => {
    const amountNum = parseFloat(amount) || 0;
    const priceNum = parseFloat(price) || 0;
    return amountNum * priceNum;
  };

  const calculateRiskReward = () => {
    const entryPrice = parseFloat(price) || 0;
    const stopLossPrice = parseFloat(stopLoss) || 0;
    const takeProfitPrice = parseFloat(takeProfit) || 0;

    if (entryPrice && stopLossPrice && takeProfitPrice) {
      const risk = Math.abs(entryPrice - stopLossPrice);
      const reward = Math.abs(takeProfitPrice - entryPrice);
      return reward / risk;
    }
    return 0;
  };

  const handlePlaceOrder = async () => {
    try {
      await placeOrder({
        symbol: selectedSymbol || 'BTC/USDT',
        type: orderType,
        side: orderSide,
        amount: parseFloat(amount),
        price: orderType === 'market' ? undefined : parseFloat(price),
        stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
        takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
      });

      // Reset form
      setAmount('');
      setPrice('');
      setStopLoss('');
      setTakeProfit('');
    } catch (error) {
      console.error('Failed to place order:', error);
    }
  };

  const availableBalance = portfolio?.availableBalance || 0;
  const total = calculateTotal();
  const riskReward = calculateRiskReward();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Trading Interface</CardTitle>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <Info className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {selectedSymbol || 'BTC/USDT'} • Available: {formatCurrency(availableBalance)}
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Order Side Selection */}
        <div>
          <label className="text-sm font-medium mb-3 block">Order Direction</label>
          <div className="grid grid-cols-2 gap-3">
            {orderSides.map((side) => (
              <Button
                key={side.id}
                variant={orderSide === side.id ? 'default' : 'outline'}
                className={`h-12 flex flex-col space-y-1 ${
                  orderSide === side.id ? side.bgColor : ''
                }`}
                onClick={() => setOrderSide(side.id)}
              >
                <div className="flex items-center space-x-2">
                  {side.id === 'buy' ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                  <span className="font-medium">{side.label}</span>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Order Type Selection */}
        <div>
          <label className="text-sm font-medium mb-3 block">Order Type</label>
          <div className="grid grid-cols-2 gap-2">
            {orderTypes.map((type) => (
              <Button
                key={type.id}
                variant={orderType === type.id ? 'default' : 'outline'}
                size="sm"
                className="h-auto p-3 flex flex-col items-start space-y-1"
                onClick={() => setOrderType(type.id)}
              >
                <span className="font-medium">{type.label}</span>
                <span className="text-xs text-muted-foreground text-left">
                  {type.description}
                </span>
              </Button>
            ))}
          </div>
        </div>

        {/* Amount and Price Inputs */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Amount</label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="absolute right-3 top-2.5 flex flex-col space-y-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setAmount('0.1')}
                >
                  10%
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setAmount('0.25')}
                >
                  25%
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setAmount('0.5')}
                >
                  50%
                </Button>
              </div>
            </div>
          </div>

          {orderType !== 'market' && (
            <div>
              <label className="text-sm font-medium mb-2 block">Price</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        {/* Risk Management */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Risk Management</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Stop Loss</label>
              <input
                type="number"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Take Profit</label>
              <input
                type="number"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {riskReward > 0 && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">Risk/Reward Ratio</span>
              <span className={`text-sm font-bold ${
                riskReward >= 2 ? 'text-green-600' :
                riskReward >= 1.5 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                1:{riskReward.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* Order Summary */}
        {total > 0 && (
          <div className="space-y-3 p-4 bg-muted rounded-lg">
            <h4 className="text-sm font-medium">Order Summary</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Cost</span>
                <span className="font-medium">{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Available Balance</span>
                <span className="font-medium">{formatCurrency(availableBalance)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Remaining Balance</span>
                <span className="font-medium">
                  {formatCurrency(Math.max(0, availableBalance - total))}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Place Order Button */}
        <Button
          className={`w-full h-12 ${
            orderSide === 'buy'
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-red-600 hover:bg-red-700'
          }`}
          onClick={handlePlaceOrder}
          disabled={!amount || parseFloat(amount) <= 0 || total > availableBalance}
        >
          <div className="flex items-center space-x-2">
            {orderSide === 'buy' ? (
              <ArrowUpRight className="h-4 w-4" />
            ) : (
              <ArrowDownRight className="h-4 w-4" />
            )}
            <span>
              {orderSide === 'buy' ? 'Buy' : 'Sell'} {amount || '0'} {selectedSymbol?.split('/')[0] || 'BTC'}
            </span>
          </div>
        </Button>

        {/* Quick Settings */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 text-sm">
              <input type="checkbox" className="rounded" />
              <span>Use leverage</span>
            </label>
            <label className="flex items-center space-x-2 text-sm">
              <input type="checkbox" className="rounded" defaultChecked />
              <span>Confirm orders</span>
            </label>
          </div>
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}