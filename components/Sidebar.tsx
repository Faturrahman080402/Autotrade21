"use client";

import {
  LayoutDashboard,
  TrendingUp,
  Briefcase,
  BarChart3,
  Settings,
  HelpCircle,
} from "lucide-react";

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const navigationItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "trading",
    label: "Trading",
    icon: TrendingUp,
  },
  {
    id: "portfolio",
    label: "Portfolio",
    icon: Briefcase,
  },
  {
    id: "markets",
    label: "Markets",
    icon: BarChart3,
  },
];

const bottomItems = [
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
  },
  {
    id: "help",
    label: "Help",
    icon: HelpCircle,
  },
];

export default function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          AutoTrade21
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Automated Trading Platform
        </p>
      </div>

      <nav className="flex-1 px-4 pb-4">
        <div className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700 pt-4">
        <div className="space-y-1">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}