-- AI Trading Platform - PostgreSQL Database Schema
-- Core tables for users, wallets, trades, and configurations

-- Enums
CREATE TYPE account_type_enum AS ENUM ('standard', 'premium', 'enterprise', 'demo');
CREATE TYPE kyc_status_enum AS ENUM ('not_started', 'pending', 'verified', 'rejected', 'requires_additional_info');
CREATE TYPE wallet_type_enum AS ENUM ('trading', 'funding', 'escrow', 'bonus');
CREATE TYPE trade_side_enum AS ENUM ('buy', 'sell');
CREATE TYPE trade_status_enum AS ENUM ('pending', 'executed', 'cancelled', 'failed', 'partially_filled');
CREATE TYPE strategy_type_enum AS ENUM ('trend_following', 'mean_reversion', 'momentum', 'breakout', 'custom');
CREATE TYPE risk_level_enum AS ENUM ('conservative', 'moderate', 'aggressive');
CREATE TYPE model_type_enum AS ENUM ('lstm', 'gru', 'transformer', 'ensemble');
CREATE TYPE technical_indicator_enum AS ENUM ('sma', 'ema', 'rsi', 'macd', 'bollinger_bands', 'stochastic', 'atr', 'volume_profile', 'vwap');
CREATE TYPE prediction_type_enum AS ENUM ('buy', 'sell', 'hold');
CREATE TYPE transaction_type_enum AS ENUM ('deposit', 'withdrawal', 'trade_profit', 'trade_loss', 'commission', 'bonus', 'transfer');
CREATE TYPE transaction_status_enum AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
CREATE TYPE asset_type_enum AS ENUM ('crypto', 'forex', 'stock', 'commodity', 'index');
CREATE TYPE broker_permission_enum AS ENUM ('read', 'trade', 'withdraw');
CREATE TYPE notification_type_enum AS ENUM ('trade_executed', 'trade_closed', 'price_alert', 'strategy_alert', 'account_alert', 'system_alert');
CREATE TYPE log_severity_enum AS ENUM ('info', 'warning', 'error', 'critical');

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    avatar_url TEXT,
    account_type account_type_enum DEFAULT 'standard',
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    kyc_status kyc_status_enum DEFAULT 'not_started',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    date_of_birth DATE,
    country VARCHAR(2), -- ISO 3166-1 alpha-2
    state_province VARCHAR(100),
    city VARCHAR(100),
    address TEXT,
    postal_code VARCHAR(20),
    referral_code VARCHAR(50),
    referred_by UUID REFERENCES users(id),
    preferences JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}'
);

-- Wallets Table
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_type wallet_type_enum NOT NULL,
    balance DECIMAL(20,8) DEFAULT 0,
    available_balance DECIMAL(20,8) DEFAULT 0,
    frozen_balance DECIMAL(20,8) DEFAULT 0,
    currency VARCHAR(10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}',
    UNIQUE(user_id, wallet_type, currency)
);

-- AI Strategies Table
CREATE TABLE ai_strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type strategy_type_enum NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    performance JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_run TIMESTAMP WITH TIME ZONE,
    run_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0
);

-- Trades Table
CREATE TABLE trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    strategy_id UUID REFERENCES ai_strategies(id),
    symbol VARCHAR(20) NOT NULL,
    side trade_side_enum NOT NULL,
    quantity DECIMAL(20,8) NOT NULL,
    price DECIMAL(20,8) NOT NULL,
    stop_loss DECIMAL(20,8),
    take_profit DECIMAL(20,8),
    status trade_status_enum DEFAULT 'pending',
    profit_loss DECIMAL(20,8),
    commission DECIMAL(20,8),
    broker_order_id VARCHAR(100),
    executed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    account_type VARCHAR(10) DEFAULT 'real',
    leverage DECIMAL(5,2) DEFAULT 1,
    margin DECIMAL(20,8),
    closing_price DECIMAL(20,8),
    reason_code VARCHAR(50),
    metadata JSONB DEFAULT '{}'
);

-- AI Predictions Table
CREATE TABLE ai_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(20) NOT NULL,
    timeframe VARCHAR(10) NOT NULL,
    prediction prediction_type_enum NOT NULL,
    confidence DECIMAL(5,4) NOT NULL,
    predicted_price DECIMAL(20,8) NOT NULL,
    current_price DECIMAL(20,8) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    model_type model_type_enum NOT NULL,
    features JSONB DEFAULT '[]',
    stop_loss DECIMAL(20,8),
    take_profit DECIMAL(20,8),
    time_to_expiration INTEGER,
    is_validated BOOLEAN DEFAULT FALSE,
    actual_outcome prediction_type_enum,
    validation_timestamp TIMESTAMP WITH TIME ZONE,
    strategy_id UUID REFERENCES ai_strategies(id)
);

-- Transactions Table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    type transaction_type_enum NOT NULL,
    amount DECIMAL(20,8) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    status transaction_status_enum DEFAULT 'pending',
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    external_id VARCHAR(255), -- For payment gateway reference
    fee DECIMAL(20,8) DEFAULT 0,
    exchange_rate DECIMAL(20,8),
    related_trade_id UUID REFERENCES trades(id),
    related_transaction_id UUID REFERENCES transactions(id)
);

-- Broker Configurations Table
CREATE TABLE broker_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    api_key_encrypted TEXT NOT NULL,
    secret_key_encrypted TEXT NOT NULL,
    is_testnet BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    supported_assets asset_type_enum[] DEFAULT '{}',
    permissions broker_permission_enum[] DEFAULT '{read}',
    rate_limits JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_connected TIMESTAMP WITH TIME ZONE,
    connection_status VARCHAR(20) DEFAULT 'disconnected',
    metadata JSONB DEFAULT '{}'
);

-- Notifications Table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type_enum NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    priority VARCHAR(20) DEFAULT 'normal',
    delivery_channels JSONB DEFAULT '[]' -- ['in_app', 'email', 'push', 'sms']
);

-- Audit Logs Table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    severity log_severity_enum DEFAULT 'info',
    session_id VARCHAR(255),
    request_id VARCHAR(255)
);

-- API Keys Table
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    key_prefix VARCHAR(20) NOT NULL,
    permissions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    last_used TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    usage_count INTEGER DEFAULT 0,
    rate_limit INTEGER DEFAULT 1000, -- requests per hour
    ip_whitelist TEXT[],
    metadata JSONB DEFAULT '{}'
);

-- User Sessions Table
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token_hash VARCHAR(255) NOT NULL UNIQUE,
    refresh_token_hash VARCHAR(255) NOT NULL UNIQUE,
    device_info JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- Trading Pairs/Symbols Table
CREATE TABLE trading_symbols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(20) NOT NULL UNIQUE,
    base_asset VARCHAR(20) NOT NULL,
    quote_asset VARCHAR(20) NOT NULL,
    asset_type asset_type_enum NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    min_quantity DECIMAL(20,8) DEFAULT 0,
    max_quantity DECIMAL(20,8) DEFAULT 0,
    quantity_precision INTEGER DEFAULT 8,
    price_precision INTEGER DEFAULT 8,
    min_notional DECIMAL(20,8) DEFAULT 0,
    tick_size DECIMAL(20,8),
    multiplier DECIMAL(20,8) DEFAULT 1,
    contract_size DECIMAL(20,8) DEFAULT 1,
    settlement_type VARCHAR(20), -- 'cash', 'physical'
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System Configuration Table
CREATE TABLE system_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    category VARCHAR(100),
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    version INTEGER DEFAULT 1
);

-- Maintenance Windows Table
CREATE TABLE maintenance_windows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    affected_services JSONB DEFAULT '[]',
    severity VARCHAR(20) DEFAULT 'medium',
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at);

CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_wallets_currency ON wallets(currency);
CREATE INDEX idx_wallets_type ON wallets(wallet_type);

CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_symbol ON trades(symbol);
CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_trades_executed_at ON trades(executed_at);
CREATE INDEX idx_trades_created_at ON trades(created_at);
CREATE INDEX idx_trades_account_type ON trades(account_type);

CREATE INDEX idx_ai_strategies_user_id ON ai_strategies(user_id);
CREATE INDEX idx_ai_strategies_is_active ON ai_strategies(is_active);
CREATE INDEX idx_ai_strategies_type ON ai_strategies(type);

CREATE INDEX idx_predictions_symbol ON ai_predictions(symbol);
CREATE INDEX idx_predictions_timeframe ON ai_predictions(timeframe);
CREATE INDEX idx_predictions_timestamp ON ai_predictions(timestamp);
CREATE INDEX idx_predictions_model_type ON ai_predictions(model_type);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_severity ON audit_logs(severity);

CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_is_active ON user_sessions(is_active);

-- Triggers for Updated At
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_strategies_updated_at BEFORE UPDATE ON ai_strategies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trades_updated_at BEFORE UPDATE ON trades
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_broker_configs_updated_at BEFORE UPDATE ON broker_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_windows_updated_at BEFORE UPDATE ON maintenance_windows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();