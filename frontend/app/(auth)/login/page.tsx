import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, TrendingUp, Shield, BarChart3, Bot } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useAuthStore } from '@/lib/store';
import { LoginCredentials } from '@/types/user';
import { handleApiError, validators } from '@/lib/utils';

export default function LoginPage() {
  const [formData, setFormData] = useState<LoginCredentials>({
    email: '',
    password: '',
    rememberMe: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<LoginCredentials>>({});
  const [isLoading, setIsLoading] = useState(false);

  const { login, isAuthenticated } = useAuthStore();
  const router = useRouter();

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const validateForm = (): boolean => {
    const newErrors: Partial<LoginCredentials> = {};

    if (!validators.email(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      // Mock API call for now
      const mockUser = {
        id: '1',
        email: formData.email,
        firstName: 'John',
        lastName: 'Doe',
        accountType: 'demo' as const,
        isEmailVerified: true,
        isTwoFactorEnabled: false,
        preferences: {
          language: 'en',
          timezone: 'UTC',
          currency: 'USD',
          notifications: {
            email: true,
            push: true,
            tradeAlerts: true,
            priceAlerts: true,
            strategyAlerts: true,
            riskAlerts: true,
            marketingEmails: false
          },
          trading: {
            defaultOrderType: 'market',
            defaultTimeframe: '1h',
            showChartOnMobile: true,
            confirmOrders: true,
            autoRefresh: true,
            darkMode: false
          },
          ui: {
            sidebarCollapsed: false,
            chartType: 'candlestick',
            theme: 'light',
            density: 'normal'
          }
        },
        subscription: {
          plan: 'basic',
          status: 'active',
          features: ['real_time_data', 'basic_strategies'],
          limits: {
            maxActiveStrategies: 3,
            maxApiCallsPerDay: 1000,
            maxHistoricalDataDays: 30,
            realTimeData: true,
            advancedFeatures: false,
            prioritySupport: false
          }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const mockTokens = {
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
        expiresIn: 3600,
        tokenType: 'Bearer'
      };

      login(mockUser, mockTokens.accessToken, mockTokens.refreshToken);
      router.push('/dashboard');

    } catch (error) {
      const apiError = handleApiError(error);
      setErrors({ password: apiError.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof LoginCredentials) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Background Pattern */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-20 h-72 w-72 rounded-full bg-blue-200 blur-3xl" />
          <div className="absolute bottom-20 right-20 h-72 w-72 rounded-full bg-purple-200 blur-3xl" />
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="h-12 w-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <span className="ml-3 text-2xl font-bold">AutoTrade21</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome back</h1>
            <p className="text-muted-foreground">
              Sign in to your AI-powered trading account
            </p>
          </div>

          {/* Login Form */}
          <Card>
            <CardHeader>
              <CardTitle>Sign In</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange('email')}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your email"
                    disabled={isLoading}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleInputChange('password')}
                      className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.password ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter your password"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                  )}
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.rememberMe}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        rememberMe: e.target.checked
                      }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-600">Remember me</span>
                  </label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Forgot password?
                  </Link>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>

              {/* Demo Account */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800 mb-2">
                  <strong>Demo Account:</strong>
                </p>
                <p className="text-xs text-blue-600">
                  Email: demo@autotrade21.com
                  <br />
                  Password: demo123456
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Sign Up Link */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link
                href="/auth/register"
                className="font-medium text-blue-600 hover:text-blue-700"
              >
                Sign up for free
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="mt-16 bg-muted/50 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-center text-2xl font-bold mb-8">
              Why Choose AutoTrade21?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Bot className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold mb-2">AI-Powered Trading</h3>
                <p className="text-sm text-muted-foreground">
                  Advanced machine learning algorithms analyze markets and execute trades automatically
                </p>
              </div>
              <div className="text-center">
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold mb-2">Risk Management</h3>
                <p className="text-sm text-muted-foreground">
                  Sophisticated risk controls protect your capital with stop-loss and position sizing
                </p>
              </div>
              <div className="text-center">
                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold mb-2">Real-Time Analytics</h3>
                <p className="text-sm text-muted-foreground">
                  Live market data and comprehensive analytics help you make informed decisions
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}