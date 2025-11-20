import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  Wallet,
  TrendingUp,
  Settings,
  Users,
  Menu,
  X,
  Shield,
  Bot,
  Home,
  Activity,
  Bell,
  LogOut
} from 'lucide-react';
import { useUIStore } from '@/lib/store';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/Button';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
  requiresAuth?: boolean;
  adminOnly?: boolean;
}

const navigation: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <Home className="h-5 w-5" />,
  },
  {
    label: 'Trading',
    href: '/trading',
    icon: <BarChart3 className="h-5 w-5" />,
    requiresAuth: true,
  },
  {
    label: 'Portfolio',
    href: '/portfolio',
    icon: <Wallet className="h-5 w-5" />,
    requiresAuth: true,
  },
  {
    label: 'AI Strategies',
    href: '/ai-strategies',
    icon: <Bot className="h-5 w-5" />,
    requiresAuth: true,
  },
  {
    label: 'Analytics',
    href: '/analytics',
    icon: <TrendingUp className="h-5 w-5" />,
    requiresAuth: true,
  },
  {
    label: 'Activity',
    href: '/activity',
    icon: <Activity className="h-5 w-5" />,
    requiresAuth: true,
  },
];

const adminNavigation: NavItem[] = [
  {
    label: 'Admin',
    href: '/admin',
    icon: <Users className="h-5 w-5" />,
    requiresAuth: true,
    adminOnly: true,
  },
  {
    label: 'Security',
    href: '/security',
    icon: <Shield className="h-5 w-5" />,
    requiresAuth: true,
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: <Settings className="h-5 w-5" />,
    requiresAuth: true,
  },
];

export function Sidebar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const { user, isAuthenticated } = useAuthStore();

  const isAdmin = user?.accountType === 'enterprise';

  const filteredNavigation = navigation.filter(item => {
    if (item.requiresAuth && !isAuthenticated) return false;
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });

  const filteredAdminNavigation = adminNavigation.filter(item => {
    if (item.requiresAuth && !isAuthenticated) return false;
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });

  const handleLogout = () => {
    // Implement logout logic
    useAuthStore.getState().logout();
  };

  return (
    <>
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col w-64 bg-background border-r transition-transform duration-300 ease-in-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A21</span>
            </div>
            <span className="font-bold text-xl">AutoTrade21</span>
          </Link>

          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* User Info */}
        {isAuthenticated && user && (
          <div className="p-4 border-b">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-medium">
                  {user.firstName?.[0] || user.email[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.firstName || user.email}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user.accountType.charAt(0).toUpperCase() + user.accountType.slice(1)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Main Navigation */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Trading
            </h3>
            <ul className="space-y-1">
              {filteredNavigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
                        isActive ? "bg-accent text-accent-foreground" : "text-foreground"
                      )}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.icon}
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-xs">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Admin Navigation */}
          {isAdmin && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Administration
              </h3>
              <ul className="space-y-1">
                {filteredAdminNavigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
                          isActive ? "bg-accent text-accent-foreground" : "text-foreground"
                        )}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {item.icon}
                        <span className="flex-1">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t">
          {isAuthenticated ? (
            <div className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Bell className="h-5 w-5 mr-3" />
                Notifications
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-red-600 hover:text-red-700"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5 mr-3" />
                Logout
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Settings className="h-5 w-5 mr-3" />
                Settings
              </Button>
              <Button
                asChild
                className="w-full"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Link href="/auth/login">Login</Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setMobileMenuOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>
    </>
  );
}