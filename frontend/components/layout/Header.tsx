import React, { useState } from 'react';
import { Bell, Menu, Search, Moon, Sun, Globe } from 'lucide-react';
import { useUIStore } from '@/lib/store';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { useNotificationStore } from '@/lib/store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';

export function Header() {
  const { theme, setTheme, sidebarOpen, setSidebarOpen } = useUIStore();
  const { user, isAuthenticated } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const [searchQuery, setSearchQuery] = useState('');

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement search functionality
    console.log('Searching for:', searchQuery);
  };

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4 lg:px-6 gap-4">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Logo */}
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">A21</span>
          </div>
          <span className="font-bold text-xl hidden sm:block">AutoTrade21</span>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-md mx-4">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search symbols, strategies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-muted border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </form>
        </div>

        {/* Right side actions */}
        <div className="flex items-center space-x-2">
          {/* Account Type Toggle */}
          {isAuthenticated && (
            <div className="flex items-center bg-muted rounded-lg p-1">
              <Button
                variant="ghost"
                size="sm"
                className={`px-3 py-1 text-xs font-medium ${user?.accountType === 'demo' ? 'bg-background' : ''}`}
              >
                Demo
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`px-3 py-1 text-xs font-medium ${user?.accountType === 'real' ? 'bg-background' : ''}`}
              >
                Real
              </Button>
            </div>
          )}

          {/* Notifications */}
          {isAuthenticated && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="font-medium">Notifications</h3>
                  <span className="text-sm text-muted-foreground">
                    {unreadCount} unread
                  </span>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {unreadCount > 0 ? (
                    <div className="p-4 text-sm text-muted-foreground text-center">
                      You have {unreadCount} unread notifications
                    </div>
                  ) : (
                    <div className="p-4 text-sm text-muted-foreground text-center">
                      No notifications
                    </div>
                  )}
                </div>
                <div className="p-2 border-t">
                  <DropdownMenuItem className="w-full justify-center">
                    View all notifications
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Theme Toggle */}
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          {/* Language */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Globe className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>English</DropdownMenuItem>
              <DropdownMenuItem>Español</DropdownMenuItem>
              <DropdownMenuItem>Français</DropdownMenuItem>
              <DropdownMenuItem>Deutsch</DropdownMenuItem>
              <DropdownMenuItem>中文</DropdownMenuItem>
              <DropdownMenuItem>日本語</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {user.firstName?.[0] || user.email[0].toUpperCase()}
                    </span>
                  </div>
                  <span className="hidden sm:block text-sm font-medium">
                    {user.firstName || user.email}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="p-4 border-b">
                  <p className="text-sm font-medium">{user.firstName || user.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {user.accountType.charAt(0).toUpperCase() + user.accountType.slice(1)}
                  </p>
                </div>
                <DropdownMenuItem>
                  <a href="/profile" className="w-full">
                    Profile
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <a href="/settings" className="w-full">
                    Settings
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-red-600">
                  <button onClick={() => useAuthStore.getState().logout()} className="w-full text-left">
                    Logout
                  </button>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center space-x-2">
              <Button>
                <a href="/auth/login">Login</a>
              </Button>
              <Button variant="outline">
                <a href="/auth/register">Sign Up</a>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}