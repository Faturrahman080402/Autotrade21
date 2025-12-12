"use client";

import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

const statsCards = [
  {
    title: "Total Portfolio Value",
    value: "$125,430.50",
    change: "+12.5%",
    changeType: "positive" as const,
    icon: DollarSign,
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    title: "Today's P&L",
    value: "+$2,340.25",
    change: "+1.87%",
    changeType: "positive" as const,
    icon: TrendingUp,
    bgColor: "bg-green-50 dark:bg-green-900/20",
    iconColor: "text-green-600 dark:text-green-400",
  },
  {
    title: "Active Positions",
    value: "15",
    change: "+2",
    changeType: "positive" as const,
    icon: Activity,
    bgColor: "bg-purple-50 dark:bg-purple-900/20",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
  {
    title: "Win Rate",
    value: "68.4%",
    change: "-2.1%",
    changeType: "negative" as const,
    icon: TrendingDown,
    bgColor: "bg-orange-50 dark:bg-orange-900/20",
    iconColor: "text-orange-600 dark:text-orange-400",
  },
];

const recentTrades = [
  {
    symbol: "AAPL",
    type: "BUY",
    quantity: 50,
    price: 178.45,
    status: "EXECUTED",
    time: "2 min ago",
    pnl: 0,
  },
  {
    symbol: "TSLA",
    type: "SELL",
    quantity: 25,
    price: 245.30,
    status: "EXECUTED",
    time: "15 min ago",
    pnl: 1250.50,
  },
  {
    symbol: "BTC",
    type: "BUY",
    quantity: 0.5,
    price: 43250.00,
    status: "PENDING",
    time: "1 hour ago",
    pnl: 0,
  },
  {
    symbol: "ETH",
    type: "SELL",
    quantity: 2.5,
    price: 2250.75,
    status: "EXECUTED",
    time: "2 hours ago",
    pnl: -340.25,
  },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Trading Dashboard
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Welcome back! Here's your trading overview for today.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className={`${stat.bgColor} rounded-xl p-6 border border-gray-200 dark:border-gray-700`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                    {stat.value}
                  </p>
                  <div className="flex items-center mt-2">
                    {stat.changeType === "positive" ? (
                      <ArrowUpRight className="w-4 h-4 text-green-600 dark:text-green-400 mr-1" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-red-600 dark:text-red-400 mr-1" />
                    )}
                    <span
                      className={`text-sm font-medium ${
                        stat.changeType === "positive"
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {stat.change}
                    </span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-6 h-6 ${stat.iconColor}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Trades
          </h2>
          <div className="space-y-4">
            {recentTrades.map((trade, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      trade.type === "BUY"
                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                        : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                    }`}
                  >
                    {trade.type}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {trade.symbol}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {trade.quantity} × ${trade.price.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        trade.status === "EXECUTED"
                          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                          : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                      }`}
                    >
                      {trade.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {trade.time}
                  </p>
                  {trade.pnl !== 0 && (
                    <p
                      className={`text-sm font-medium mt-1 ${
                        trade.pnl > 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {trade.pnl > 0 ? "+" : ""}${Math.abs(trade.pnl).toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Performance Overview
          </h2>
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Weekly Return
                </span>
                <span className="text-sm font-bold text-green-600 dark:text-green-400">
                  +5.2%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: "65%" }}
                ></div>
              </div>
            </div>

            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Monthly Return
                </span>
                <span className="text-sm font-bold text-green-600 dark:text-green-400">
                  +18.7%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: "82%" }}
                ></div>
              </div>
            </div>

            <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Year to Date
                </span>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                  +124.3%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: "91%" }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}