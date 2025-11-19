export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
  accountType: 'standard' | 'premium' | 'enterprise' | 'demo';
  isVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  lastLogin?: string;
  kycStatus?: 'not_started' | 'pending' | 'verified' | 'rejected';
}

export interface LoginCredentials {
  email: string;
  password: string;
  twoFactorCode?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  accountType?: 'standard' | 'premium' | 'enterprise';
  agreeToTerms: boolean;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface Wallet {
  id: string;
  type: 'trading' | 'funding';
  currency: string;
  balance: number;
  availableBalance: number;
  frozenBalance: number;
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'trade' | 'transfer' | 'commission';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  description: string;
  createdAt: string;
  completedAt?: string;
}