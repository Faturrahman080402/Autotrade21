"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Clock, Settings } from "lucide-react";

const popularPairs = [
  { symbol: "BTC/USD", price: 43250.00, change: 2.3, volume: "2.1B" },
  { symbol: "ETH/USD", price: 2250.75, change: -1.2, volume: "1.8B" },
  { symbol: "AAPL", price: 178.45, change: 0.8, volume: "456M" },
  { symbol: "TSLA", price: 245.30, change: -2.1, volume: "234M" },
  { symbol: "GOOGL", price: 142.60, change: 1.5, volume: "312M" },
  { symbol: "MSFT", price: 378.25, change: 0.3, volume: "289M" },
];

const orderBook = {
  buy: [
    { price: 43248.50, amount: 0.5, total: 21624.25 },
    { price: 43248.00, amount: 1.2, total: 51897.60 },
    { price: 43247.75, amount: 0.8, total: 34598.20 },
    { price: 43247.25, amount: 2.1, total: 90819.23 },
    { price: 43246.80, amount: 1.5, total: 64870.20 },
  ],
  sell: [
    { price: 43251.00, amount: 0.3, total: 12975.30 },
    { price: 43251.50, amount: 0.7, total: 30276.05 },
    { price: 43252.00, amount: 1.0, total: 43252.00 },
    { price: 43252.75, amount: 1.8, total: 77854.95 },
    { price: 43253.20, amount: 0.9, total: 38927.88 },
  ],
};

export default function TradingInterface() {
  const [selectedPair, setSelectedPair] = useState("BTC/USD");
  const [orderType, setOrderType] = useState("market");
  const [tradeSide, setTradeSide] = useState("buy");
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");

  const selectedPairData = popularPairs.find(pair => pair.symbol === selectedPair);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Trading Interface
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Execute trades and monitor market activity
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Popular Trading Pairs
              </h2>
              <Settings className="w-5 h-5 text-gray-400" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {popularPairs.map((pair) => (
                <button
                  key={pair.symbol}
                  onClick={() => setSelectedPair(pair.symbol)}
                  className={`p-4 rounded-lg border transition-all ${
                    selectedPair === pair.symbol
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {pair.symbol}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Vol: {pair.volume}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900 dark:text-white">
                        ${pair.price.toLocaleString()}
                      </p>
                      <div className={`flex items-center ${
                        pair.change >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                      }`}>
                        {pair.change >= 0 ? (
                          <TrendingUp className="w-3 h-3 mr-1" />
                        ) : (
                          <TrendingDown className="w-3 h-3 mr-1" />
                        )}
                        <span className="text-sm">
                          {Math.abs(pair.change)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Order Book - {selectedPair}
              </h2>
              <Clock className="w-5 h-5 text-gray-400" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-green-600 dark:text-green-400 mb-3">
                  Buy Orders
                </h3>
                <div className="space-y-2">
                  {orderBook.buy.map((order, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-gray-900 dark:text-white font-mono">
                        ${order.price.toFixed(2)}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400 font-mono">
                        {order.amount}
                      </span>
                      <span className="text-gray-500 dark:text-gray-500 font-mono">
                        ${order.total.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-red-600 dark:text-red-400 mb-3">
                  Sell Orders
                </h3>
                <div className="space-y-2">
                  {orderBook.sell.map((order, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-gray-900 dark:text-white font-mono">
                        ${order.price.toFixed(2)}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400 font-mono">
                        {order.amount}
                      </span>
                      <span className="text-gray-500 dark:text-gray-500 font-mono">
                        ${order.total.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Place Order
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Trading Pair
                </label>
                <input
                  type="text"
                  value={selectedPair}
                  readOnly
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Order Type
                </label>
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="market">Market Order</option>
                  <option value="limit">Limit Order</option>
                  <option value="stop">Stop Loss</option>
                  <option value="stop-limit">Stop Limit</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Order Side
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setTradeSide("buy")}
                    className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                      tradeSide === "buy"
                        ? "bg-green-600 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    Buy
                  </button>
                  <button
                    onClick={() => setTradeSide("sell")}
                    className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                      tradeSide === "sell"
                        ? "bg-red-600 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    Sell
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {orderType === "limit" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Price
                  </label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Est. Total</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    ${amount && selectedPairData ? (parseFloat(amount) * selectedPairData.price).toLocaleString() : "0.00"}
                  </span>
                </div>
                <div className="flex justify-between text-sm mb-4">
                  <span className="text-gray-600 dark:text-gray-400">Available Balance</span>
                  <span className="font-medium text-gray-900 dark:text-white">$25,000.00</span>
                </div>
                <button
                  className={`w-full py-3 rounded-lg font-medium transition-colors ${
                    tradeSide === "buy"
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-red-600 hover:bg-red-700 text-white"
                  }`}
                >
                  {tradeSide === "buy" ? "Place Buy Order" : "Place Sell Order"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}