import React, { useState } from 'react';
import { User, Settings, Bell, Shield, CreditCard, Globe, Moon, Sun } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthStore, useUIStore } from '@/lib/store';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);

  const { user, updateUserProfile } = useAuthStore();
  const { theme, toggleTheme } = useUIStore();

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'account', label: 'Account', icon: Settings },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'preferences', label: 'Preferences', icon: Globe }
  ];

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileTab />;
      case 'account':
        return <AccountTab />;
      case 'notifications':
        return <NotificationsTab />;
      case 'security':
        return <SecurityTab />;
      case 'billing':
        return <BillingTab />;
      case 'preferences':
        return <PreferencesTab />;
      default:
        return <ProfileTab />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-0">
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}

function ProfileTab() {
  const [formData, setFormData] = useState({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1 234 567 8900',
    country: 'United States'
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">First Name</label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Last Name</label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Email Address</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Phone Number</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Country</label>
          <select
            value={formData.country}
            onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option>United States</option>
            <option>United Kingdom</option>
            <option>Canada</option>
            <option>Australia</option>
            <option>Germany</option>
          </select>
        </div>

        <div className="flex justify-end space-x-3">
          <Button variant="outline">Cancel</Button>
          <Button>Save Changes</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AccountTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium mb-2">Account Type</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Current Plan: <span className="font-medium">Pro</span></p>
              <p className="text-xs text-gray-500">Next billing date: Feb 15, 2024</p>
            </div>
            <Button variant="outline">Change Plan</Button>
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium mb-2">Trading Mode</h3>
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input type="radio" name="mode" className="mr-2" defaultChecked />
              <span>Demo Account</span>
            </label>
            <label className="flex items-center">
              <input type="radio" name="mode" className="mr-2" />
              <span>Real Account</span>
            </label>
          </div>
        </div>

        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-medium text-yellow-800 mb-2">Danger Zone</h3>
          <p className="text-sm text-yellow-700 mb-3">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <Button variant="destructive" size="sm">
            Delete Account
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function NotificationsTab() {
  const [preferences, setPreferences] = useState({
    email: true,
    push: true,
    tradeAlerts: true,
    priceAlerts: true,
    strategyAlerts: false,
    riskAlerts: true,
    marketingEmails: false
  });

  const handleToggle = (key: keyof typeof preferences) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="font-medium">Communication Channels</h3>
          <label className="flex items-center justify-between">
            <span>Email Notifications</span>
            <input
              type="checkbox"
              checked={preferences.email}
              onChange={() => handleToggle('email')}
              className="rounded"
            />
          </label>
          <label className="flex items-center justify-between">
            <span>Push Notifications</span>
            <input
              type="checkbox"
              checked={preferences.push}
              onChange={() => handleToggle('push')}
              className="rounded"
            />
          </label>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium">Trading Alerts</h3>
          <label className="flex items-center justify-between">
            <span>Trade Executions</span>
            <input
              type="checkbox"
              checked={preferences.tradeAlerts}
              onChange={() => handleToggle('tradeAlerts')}
              className="rounded"
            />
          </label>
          <label className="flex items-center justify-between">
            <span>Price Alerts</span>
            <input
              type="checkbox"
              checked={preferences.priceAlerts}
              onChange={() => handleToggle('priceAlerts')}
              className="rounded"
            />
          </label>
          <label className="flex items-center justify-between">
            <span>Strategy Alerts</span>
            <input
              type="checkbox"
              checked={preferences.strategyAlerts}
              onChange={() => handleToggle('strategyAlerts')}
              className="rounded"
            />
          </label>
          <label className="flex items-center justify-between">
            <span>Risk Warnings</span>
            <input
              type="checkbox"
              checked={preferences.riskAlerts}
              onChange={() => handleToggle('riskAlerts')}
              className="rounded"
            />
          </label>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium">Marketing</h3>
          <label className="flex items-center justify-between">
            <span>Marketing Emails</span>
            <input
              type="checkbox"
              checked={preferences.marketingEmails}
              onChange={() => handleToggle('marketingEmails')}
              className="rounded"
            />
          </label>
        </div>

        <div className="flex justify-end">
          <Button>Save Preferences</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SecurityTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Security Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium mb-2">Two-Factor Authentication</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
              <p className="text-xs text-green-600">✓ 2FA is enabled</p>
            </div>
            <Button variant="outline" size="sm">Manage</Button>
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium mb-2">Change Password</h3>
          <div className="space-y-3">
            <input
              type="password"
              placeholder="Current password"
              className="w-full px-3 py-2 border rounded-md"
            />
            <input
              type="password"
              placeholder="New password"
              className="w-full px-3 py-2 border rounded-md"
            />
            <input
              type="password"
              placeholder="Confirm new password"
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium mb-2">Active Sessions</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Chrome on macOS • Current</span>
              <span className="text-green-600">Active now</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>iPhone App • San Francisco, CA</span>
              <span className="text-gray-500">2 hours ago</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button>Update Security Settings</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function BillingTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing & Subscription</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium mb-2">Current Plan</h3>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-medium">Pro Plan</p>
              <p className="text-sm text-gray-600">$49/month</p>
            </div>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">Active</span>
          </div>
          <Button variant="outline" size="sm">Change Plan</Button>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium mb-2">Payment Method</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">Visa ending in 4242</p>
              <p className="text-xs text-gray-500">Expires 12/2025</p>
            </div>
            <Button variant="outline" size="sm">Update</Button>
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium mb-2">Billing History</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Pro Plan - January 2024</span>
              <span className="font-medium">$49.00</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Pro Plan - December 2023</span>
              <span className="font-medium">$49.00</span>
            </div>
          </div>
          <Button variant="outline" size="sm" className="mt-3">View All</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PreferencesTab() {
  const { theme, toggleTheme } = useUIStore();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="font-medium">Appearance</h3>
          <label className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              <span>Dark Mode</span>
            </div>
            <input
              type="checkbox"
              checked={theme === 'dark'}
              onChange={toggleTheme}
              className="rounded"
            />
          </label>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium">Language</h3>
          <select className="w-full px-3 py-2 border rounded-md">
            <option>English</option>
            <option>Spanish</option>
            <option>French</option>
            <option>German</option>
          </select>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium">Timezone</h3>
          <select className="w-full px-3 py-2 border rounded-md">
            <option>UTC (Coordinated Universal Time)</option>
            <option>EST (Eastern Standard Time)</option>
            <option>PST (Pacific Standard Time)</option>
            <option>CET (Central European Time)</option>
          </select>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium">Default Chart Settings</h3>
          <div className="space-y-3">
            <select className="w-full px-3 py-2 border rounded-md">
              <option>Candlestick</option>
              <option>Line</option>
              <option>Area</option>
            </select>
            <select className="w-full px-3 py-2 border rounded-md">
              <option>1 Hour</option>
              <option>4 Hours</option>
              <option>1 Day</option>
              <option>1 Week</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button>Save Preferences</Button>
        </div>
      </CardContent>
    </Card>
  );
}