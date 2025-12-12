"use client";

import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Filter,
} from "lucide-react";

const holdings = [
  {
    symbol: "BTC",
    name: "Bitcoin",
    quantity: 2.5,
    avgPrice: 38500.00,
    currentPrice: 43250.00,
    value: 108125.00,
    change: 12.35,
    changeAmount: 11875.00,
    allocation: 86.2,
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    quantity: 15.0,
    avgPrice: 1980.00,
    currentPrice: 2250.75,
    value: 33761.25,
    change: 13.68,
    changeAmount: 4061.25,
    allocation: 26.9,
  },
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    quantity: 50,
    avgPrice: 165.30,
    currentPrice: 178.45,
    value: 8922.50,
    change: 7.96,
    changeAmount: 657.50,
    allocation: 7.1,
  },
  {
    symbol: "TSLA",
    name: "Tesla Inc.",
    quantity: 25,
    avgPrice: 265.80,
    currentPrice: 245.30,
    value: 6132.50,
    change: -7.71,
    changeAmount: -512.50,
    allocation: 4.9,
  },
  {
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    quantity: 30,
    avgPrice: 135.20,
    currentPrice: 142.60,
    value: 4278.00,
    change: 5.47,
    changeAmount: 222.00,
    allocation: 3.4,
  },
];

const transactions = [
  {
    id: "TX001",
    date: "2024-01-15",
    type: "BUY",
    symbol: "BTC",
    quantity: 1.5,
    price: 39850.00,
    total: 59775.00,
    status: "COMPLETED",
  },
  {
    id: "TX002",
    date: "2024-01-14",
    type: "SELL",
    symbol: "ETH",
    quantity: 5.0,
    price: 2230.50,
    total: 11152.50,
    status: "COMPLETED",
  },
  {
    id: "TX003",
    date: "2024-01-13",
    type: "BUY",
    symbol: "AAPL",
    quantity: 20,
    price: 172.80,
    total: 3456.00,
    status: "COMPLETED",
  },
  {
    id: "TX004",
    date: "2024-01-12",
    type: "BUY",
    symbol: "TSLA",
    quantity: 10,
    price: 258.30,
    total: 2583.00,
    status: "PENDING",
  },
];

const portfolioStats = {
  totalValue: 161218.25,
  totalGain: 16000.25,
  totalReturn: 11.02,
  dayChange: 2.34,
  dayGain: 3705.50,
};

export default function Portfolio() {
  const [activeTab, setActiveTab] = useState("holdings");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Portfolio
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage your investments and track performance
          </p>
        </div>
        <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
          <Download className="w-4 h-4" />
          <span>Export</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <p className="text-blue-100 text-sm font-medium">Total Portfolio Value</p>
          <p className="text-2xl font-bold mt-2">
            ${portfolioStats.totalValue.toLocaleString()}
          </p>
          <div className="flex items-center mt-2">
            <ArrowUpRight className="w-4 h-4 mr-1" />
            <span className="text-sm">+{portfolioStats.dayChange}% today</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Gain/Loss</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
            +${portfolioStats.totalGain.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {portfolioStats.totalReturn}% return
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Today's Gain/Loss</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
            +${portfolioStats.dayGain.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {portfolioStats.dayChange}% change
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Positions</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
            {holdings.length}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            4 profitable, 1 loss
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("holdings")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "holdings"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              Holdings ({holdings.length})
            </button>
            <button
              onClick={() => setActiveTab("transactions")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "transactions"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              Transactions ({transactions.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "holdings" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Your Holdings
                </h3>
                <button className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  <Filter className="w-4 h-4" />
                  <span>Filter</span>
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm font-medium text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                      <th className="pb-3">Asset</th>
                      <th className="pb-3 text-right">Quantity</th>
                      <th className="pb-3 text-right">Avg. Price</th>
                      <th className="pb-3 text-right">Current Price</th>
                      <th className="pb-3 text-right">Total Value</th>
                      <th className="pb-3 text-right">Gain/Loss</th>
                      <th className="pb-3 text-right">Allocation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {holdings.map((holding) => (
                      <tr key={holding.symbol} className="text-sm">
                        <td className="py-4">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {holding.symbol}
                            </p>
                            <p className="text-gray-500 dark:text-gray-400">
                              {holding.name}
                            </p>
                          </div>
                        </td>
                        <td className="py-4 text-right text-gray-900 dark:text-white">
                          {holding.quantity}
                        </td>
                        <td className="py-4 text-right text-gray-900 dark:text-white">
                          ${holding.avgPrice.toLocaleString()}
                        </td>
                        <td className="py-4 text-right text-gray-900 dark:text-white">
                          ${holding.currentPrice.toLocaleString()}
                        </td>
                        <td className="py-4 text-right font-medium text-gray-900 dark:text-white">
                          ${holding.value.toLocaleString()}
                        </td>
                        <td className="py-4 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            {holding.change >= 0 ? (
                              <ArrowUpRight className="w-4 h-4 text-green-600 dark:text-green-400" />
                            ) : (
                              <ArrowDownRight className="w-4 h-4 text-red-600 dark:text-red-400" />
                            )}
                            <span
                              className={`font-medium ${
                                holding.change >= 0
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              {holding.change >= 0 ? "+" : ""}{holding.changeAmount.toLocaleString()}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 text-right text-gray-900 dark:text-white">
                          {holding.allocation}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "transactions" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Transaction History
                </h3>
                <button className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  <Filter className="w-4 h-4" />
                  <span>Filter</span>
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm font-medium text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                      <th className="pb-3">Date</th>
                      <th className="pb-3">Type</th>
                      <th className="pb-3">Asset</th>
                      <th className="pb-3 text-right">Quantity</th>
                      <th className="pb-3 text-right">Price</th>
                      <th className="pb-3 text-right">Total</th>
                      <th className="pb-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {transactions.map((transaction) => (
                      <tr key={transaction.id} className="text-sm">
                        <td className="py-4 text-gray-900 dark:text-white">
                          {transaction.date}
                        </td>
                        <td className="py-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              transaction.type === "BUY"
                                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                                : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                            }`}
                          >
                            {transaction.type}
                          </span>
                        </td>
                        <td className="py-4 font-medium text-gray-900 dark:text-white">
                          {transaction.symbol}
                        </td>
                        <td className="py-4 text-right text-gray-900 dark:text-white">
                          {transaction.quantity}
                        </td>
                        <td className="py-4 text-right text-gray-900 dark:text-white">
                          ${transaction.price.toLocaleString()}
                        </td>
                        <td className="py-4 text-right font-medium text-gray-900 dark:text-white">
                          ${transaction.total.toLocaleString()}
                        </td>
                        <td className="py-4 text-right">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              transaction.status === "COMPLETED"
                                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                                : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                            }`}
                          >
                            {transaction.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}