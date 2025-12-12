"use client";

import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Star,
  Clock,
  Activity,
  BarChart3,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

const marketOverview = [
  {
    name: "S&P 500",
    symbol: "SPX",
    price: 4783.45,
    change: 1.2,
    changeAmount: 56.78,
    volume: "2.1B",
    marketCap: "38.2T",
  },
  {
    name: "NASDAQ",
    symbol: "IXIC",
    price: 14972.76,
    change: 1.8,
    changeAmount: 262.45,
    volume: "1.8B",
    marketCap: "25.7T",
  },
  {
    name: "Dow Jones",
    symbol: "DJI",
    price: 37645.33,
    change: 0.8,
    changeAmount: 295.67,
    volume: "890M",
    marketCap: "11.9T",
  },
  {
    name: "Bitcoin",
    symbol: "BTC",
    price: 43250.00,
    change: 3.2,
    changeAmount: 1340.00,
    volume: "28.5B",
    marketCap: "845.2B",
  },
];

const watchlist = [
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    price: 178.45,
    change: 2.1,
    changeAmount: 3.67,
    volume: "456M",
    marketCap: "2.78T",
    isFavorite: true,
  },
  {
    symbol: "MSFT",
    name: "Microsoft",
    price: 378.25,
    change: -0.8,
    changeAmount: -3.05,
    volume: "289M",
    marketCap: "2.81T",
    isFavorite: true,
  },
  {
    symbol: "GOOGL",
    name: "Alphabet",
    price: 142.60,
    change: 1.5,
    changeAmount: 2.10,
    volume: "312M",
    marketCap: "1.78T",
    isFavorite: false,
  },
  {
    symbol: "AMZN",
    name: "Amazon",
    price: 153.38,
    change: 0.9,
    changeAmount: 1.37,
    volume: "198M",
    marketCap: "1.59T",
    isFavorite: false,
  },
  {
    symbol: "TSLA",
    name: "Tesla",
    price: 245.30,
    change: -2.3,
    changeAmount: -5.79,
    volume: "234M",
    marketCap: "779B",
    isFavorite: true,
  },
];

const topGainers = [
  { symbol: "NVDA", name: "NVIDIA", price: 732.45, change: 8.2, changeAmount: 55.67 },
  { symbol: "META", name: "Meta", price: 485.23, change: 6.1, changeAmount: 28.02 },
  { symbol: "AMD", name: "AMD", price: 178.90, change: 5.8, changeAmount: 9.82 },
  { symbol: "NFLX", name: "Netflix", price: 486.81, change: 4.9, changeAmount: 22.74 },
];

const topLosers = [
  { symbol: "BA", name: "Boeing", price: 198.45, change: -8.7, changeAmount: -18.95 },
  { symbol: "DIS", name: "Disney", price: 88.92, change: -5.2, changeAmount: -4.88 },
  { symbol: "INTC", name: "Intel", price: 42.78, change: -4.8, changeAmount: -2.16 },
  { symbol: "VZ", name: "Verizon", price: 38.45, change: -3.9, changeAmount: -1.56 },
];

const marketSectors = [
  { name: "Technology", change: 2.3, color: "bg-blue-500" },
  { name: "Healthcare", change: 1.1, color: "bg-green-500" },
  { name: "Financials", change: -0.8, color: "bg-yellow-500" },
  { name: "Energy", change: 3.2, color: "bg-red-500" },
  { name: "Consumer Discretionary", change: 1.7, color: "bg-purple-500" },
  { name: "Industrials", change: -0.5, color: "bg-orange-500" },
];

export default function MarketData() {
  const [selectedTimeframe, setSelectedTimeframe] = useState("1D");
  const [activeTab, setActiveTab] = useState("overview");

  const timeframes = ["1H", "1D", "1W", "1M", "3M", "1Y", "ALL"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Market Data
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Real-time market data and analysis
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {timeframes.map((timeframe) => (
            <button
              key={timeframe}
              onClick={() => setSelectedTimeframe(timeframe)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                selectedTimeframe === timeframe
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {timeframe}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {marketOverview.map((market) => (
          <div key={market.symbol} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{market.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500">{market.symbol}</p>
              </div>
              <div className={`p-2 rounded-lg ${
                market.change >= 0 ? "bg-green-100 dark:bg-green-900/20" : "bg-red-100 dark:bg-red-900/20"
              }`}>
                {market.change >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                )}
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {market.price.toLocaleString()}
            </p>
            <div className="flex items-center mt-2">
              {market.change >= 0 ? (
                <ArrowUpRight className="w-4 h-4 text-green-600 dark:text-green-400 mr-1" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-red-600 dark:text-red-400 mr-1" />
              )}
              <span className={`text-sm font-medium ${
                market.change >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              }`}>
                {market.change >= 0 ? "+" : ""}{market.change}% ({market.change >= 0 ? "+" : ""}{market.changeAmount})
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Vol: {market.volume}</span>
                <span>MCap: {market.marketCap}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab("watchlist")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === "watchlist"
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Star className="w-4 h-4" />
                    <span>Watchlist</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab("sectors")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === "sectors"
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="w-4 h-4" />
                    <span>Sectors</span>
                  </div>
                </button>
              </nav>
            </div>
            <div className="p-6">
              {activeTab === "watchlist" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Your Watchlist</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-sm font-medium text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                          <th className="pb-3">Symbol</th>
                          <th className="pb-3 text-right">Price</th>
                          <th className="pb-3 text-right">Change</th>
                          <th className="pb-3 text-right">Volume</th>
                          <th className="pb-3 text-right">Market Cap</th>
                          <th className="pb-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {watchlist.map((stock) => (
                          <tr key={stock.symbol} className="text-sm">
                            <td className="py-4">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {stock.symbol}
                                </p>
                                <p className="text-gray-500 dark:text-gray-400 text-xs">
                                  {stock.name}
                                </p>
                              </div>
                            </td>
                            <td className="py-4 text-right font-medium text-gray-900 dark:text-white">
                              ${stock.price}
                            </td>
                            <td className="py-4 text-right">
                              <div className="flex items-center justify-end space-x-1">
                                {stock.change >= 0 ? (
                                  <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                                ) : (
                                  <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                                )}
                                <span className={`font-medium ${
                                  stock.change >= 0
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-red-600 dark:text-red-400"
                                }`}>
                                  {stock.change >= 0 ? "+" : ""}{stock.change}%
                                </span>
                              </div>
                            </td>
                            <td className="py-4 text-right text-gray-600 dark:text-gray-400">
                              {stock.volume}
                            </td>
                            <td className="py-4 text-right text-gray-600 dark:text-gray-400">
                              {stock.marketCap}
                            </td>
                            <td className="py-4 text-right">
                              <button className="text-gray-400 hover:text-yellow-500 transition-colors">
                                <Star className={`w-4 h-4 ${stock.isFavorite ? "fill-current text-yellow-500" : ""}`} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === "sectors" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Market Sectors Performance</h3>
                  <div className="space-y-4">
                    {marketSectors.map((sector) => (
                      <div key={sector.name} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${sector.color}`}></div>
                          <span className="text-gray-900 dark:text-white font-medium">
                            {sector.name}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                sector.change >= 0 ? "bg-green-500" : "bg-red-500"
                              }`}
                              style={{ width: `${Math.abs(sector.change) * 20}%` }}
                            ></div>
                          </div>
                          <span className={`text-sm font-medium w-12 text-right ${
                            sector.change >= 0
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}>
                            {sector.change >= 0 ? "+" : ""}{sector.change}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2 mb-4">
              <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Top Gainers
              </h3>
            </div>
            <div className="space-y-3">
              {topGainers.map((stock) => (
                <div key={stock.symbol} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {stock.symbol}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {stock.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900 dark:text-white">
                      ${stock.price}
                    </p>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">
                      +{stock.change}% (+${stock.changeAmount})
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2 mb-4">
              <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Top Losers
              </h3>
            </div>
            <div className="space-y-3">
              {topLosers.map((stock) => (
                <div key={stock.symbol} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {stock.symbol}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {stock.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900 dark:text-white">
                      ${stock.price}
                    </p>
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">
                      {stock.change}% (-${Math.abs(stock.changeAmount)})
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}