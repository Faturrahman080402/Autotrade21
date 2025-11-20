import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, TrendingUp, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useAuthStore } from '@/lib/store';
import { RegisterData } from '@/types/user';
import { handleApiError, validators } from '@/lib/utils';

export default function RegisterPage() {
  const [formData, setFormData] = useState<RegisterData>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    accountType: 'demo',
    acceptTerms: false,
    marketingConsent: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<RegisterData>>({});
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
    const newErrors: Partial<RegisterData> = {};

    if (!validators.email(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!validators.password(formData.password)) {
      newErrors.password = 'Password must be at least 8 characters long';
    }

    if (!formData.firstName) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'You must accept the terms and conditions';
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
        id: Date.now().toString(),
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        accountType: formData.accountType,
        isEmailVerified: false,
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
            marketingEmails: formData.marketingConsent
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
          plan: formData.accountType === 'demo' ? 'free' : 'basic',
          status: 'active',
          features: formData.accountType === 'demo'
            ? ['demo_trading']
            : ['real_time_data', 'basic_strategies'],
          limits: {
            maxActiveStrategies: formData.accountType === 'demo' ? 1 : 3,
            maxApiCallsPerDay: formData.accountType === 'demo' ? 100 : 1000,
            maxHistoricalDataDays: formData.accountType === 'demo' ? 7 : 30,
            realTimeData: formData.accountType !== 'demo',
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
      setErrors({ email: apiError.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof RegisterData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value
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
            <h1 className="text-3xl font-bold tracking-tight mb-2">Create your account</h1>
            <p className="text-muted-foreground">
              Start your AI-powered trading journey today
            </p>
          </div>

          {/* Registration Form */}
          <Card>
            <CardHeader>
              <CardTitle>Sign Up</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Account Type */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Account Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="relative">
                      <input
                        type="radio"
                        name="accountType"
                        value="demo"
                        checked={formData.accountType === 'demo'}
                        onChange={handleInputChange('accountType')}
                        className="peer sr-only"
                      />
                      <div className="p-3 border-2 rounded-lg cursor-pointer text-center transition-colors peer-checked:border-blue-500 peer-checked:bg-blue-50">
                        <div className="font-medium">Demo</div>
                        <div className="text-xs text-muted-foreground">Free trial</div>
                      </div>
                    </label>
                    <label className="relative">
                      <input
                        type="radio"
                        name="accountType"
                        value="real"
                        checked={formData.accountType === 'real'}
                        onChange={handleInputChange('accountType')}
                        className="peer sr-only"
                      />
                      <div className="p-3 border-2 rounded-lg cursor-pointer text-center transition-colors peer-checked:border-blue-500 peer-checked:bg-blue-50">
                        <div className="font-medium">Real</div>
                        <div className="text-xs text-muted-foreground">Live trading</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium mb-2">
                      First Name
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={handleInputChange('firstName')}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.firstName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="First name"
                      disabled={isLoading}
                    />
                    {errors.firstName && (
                      <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium mb-2">
                      Last Name
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={handleInputChange('lastName')}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Last name (optional)"
                      disabled={isLoading}
                    />
                  </div>
                </div>

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
                      placeholder="Create a strong password"
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

                {/* Terms and Marketing */}
                <div className="space-y-3">
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      checked={formData.acceptTerms}
                      onChange={handleInputChange('acceptTerms')}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1"
                    />
                    <span className="ml-2 text-sm text-gray-600">
                      I agree to the{' '}
                      <Link href="/terms" className="text-blue-600 hover:text-blue-700">
                        Terms and Conditions
                      </Link>{' '}
                      and{' '}
                      <Link href="/privacy" className="text-blue-600 hover:text-blue-700">
                        Privacy Policy
                      </Link>
                    </span>
                  </label>

                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      checked={formData.marketingConsent}
                      onChange={handleInputChange('marketingConsent')}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1"
                    />
                    <span className="ml-2 text-sm text-gray-600">
                      I'd like to receive trading tips and updates via email
                    </span>
                  </label>
                </div>

                {errors.acceptTerms && (
                  <p className="text-sm text-red-600">{errors.acceptTerms}</p>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>

              {/* Sign In Link */}
              <div className="text-center mt-6">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <Link
                    href="/auth/login"
                    className="font-medium text-blue-600 hover:text-blue-700"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* What You Get */}
          <div className="mt-8 bg-blue-50 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-3">
              {formData.accountType === 'demo' ? 'Demo Account Includes:' : 'Real Account Includes:'}
            </h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-center">
                <Check className="h-4 w-4 mr-2 text-blue-600" />
                {formData.accountType === 'demo' ? '$100,000 virtual money' : 'Real money trading'}
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 mr-2 text-blue-600" />
                {formData.accountType === 'demo' ? '1 AI trading strategy' : 'Up to 3 AI trading strategies'}
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 mr-2 text-blue-600" />
                {formData.accountType === 'demo' ? '30 days historical data' : 'Real-time market data'}
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 mr-2 text-blue-600" />
                Basic portfolio analytics
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 mr-2 text-blue-600" />
                Email notifications
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}