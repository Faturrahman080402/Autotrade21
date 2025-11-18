-- AI Trading Platform - TimescaleDB Schema for Time-Series Data
-- Optimized for market data, trading metrics, and performance analytics

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Market Data Table (Hypertable)
CREATE TABLE market_data (
    time TIMESTAMP WITH TIME ZONE NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    open_price DECIMAL(20,8),
    high_price DECIMAL(20,8),
    low_price DECIMAL(20,8),
    close_price DECIMAL(20,8),
    volume BIGINT,
    quote_volume DECIMAL(20,8),
    trade_count BIGINT,
    taker_buy_volume BIGINT,
    taker_buy_quote_volume DECIMAL(20,8),
    timeframe VARCHAR(10) NOT NULL,
    exchange VARCHAR(50),
    source VARCHAR(50), -- Data source (api, websocket, etc.)
    quality_score DECIMAL(3,2) DEFAULT 1.0, -- Data quality indicator
    metadata JSONB DEFAULT '{}'
);

-- Create hypertable for market_data (time partitioning)
SELECT create_hypertable('market_data', 'time', 'symbol', 4);

-- Technical Indicators Table (Hypertable)
CREATE TABLE technical_indicators (
    time TIMESTAMP WITH TIME ZONE NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    timeframe VARCHAR(10) NOT NULL,
    indicator_name VARCHAR(50) NOT NULL,
    indicator_data JSONB NOT NULL, -- Flexible storage for different indicator structures
    source VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create hypertable for technical_indicators
SELECT create_hypertable('technical_indicators', 'time', 'symbol', 4);

-- AI Model Predictions History (Hypertable)
CREATE TABLE prediction_history (
    time TIMESTAMP WITH TIME ZONE NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    timeframe VARCHAR(10) NOT NULL,
    model_type VARCHAR(20) NOT NULL,
    prediction_type VARCHAR(10) NOT NULL, -- buy, sell, hold
    confidence DECIMAL(5,4) NOT NULL,
    predicted_price DECIMAL(20,8) NOT NULL,
    actual_price DECIMAL(20,8),
    price_movement DECIMAL(10,8), -- Actual price change after prediction
    accuracy BOOLEAN, -- Whether prediction was correct
    time_horizon INTEGER, -- Prediction horizon in minutes
    features JSONB DEFAULT '{}',
    strategy_id UUID,
    model_version VARCHAR(20),
    training_data_cutoff TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    validated_at TIMESTAMP WITH TIME ZONE
);

-- Create hypertable for prediction_history
SELECT create_hypertable('prediction_history', 'time', 'symbol', 4);

-- Trading Metrics (Hypertable)
CREATE TABLE trading_metrics (
    time TIMESTAMP WITH TIME ZONE NOT NULL,
    user_id UUID NOT NULL,
    symbol VARCHAR(20),
    account_type VARCHAR(10) NOT NULL, -- real, demo

    -- Portfolio Metrics
    portfolio_value DECIMAL(20,8),
    total_exposure DECIMAL(20,8),
    free_margin DECIMAL(20,8),
    used_margin DECIMAL(20,8),
    margin_level DECIMAL(10,2),

    -- Performance Metrics
    daily_pnl DECIMAL(20,8),
    unrealized_pnl DECIMAL(20,8),
    realized_pnl DECIMAL(20,8),
    max_drawdown DECIMAL(20,8),
    sharpe_ratio DECIMAL(10,4),

    -- Position Counts
    open_positions INTEGER DEFAULT 0,
    long_positions INTEGER DEFAULT 0,
    short_positions INTEGER DEFAULT 0,

    -- Trading Activity
    trades_today INTEGER DEFAULT 0,
    volume_today DECIMAL(20,8) DEFAULT 0,
    win_rate_today DECIMAL(5,4) DEFAULT 0,

    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create hypertable for trading_metrics
SELECT create_hypertable('trading_metrics', 'time', 'user_id', 4);

-- System Performance Metrics (Hypertable)
CREATE TABLE system_metrics (
    time TIMESTAMP WITH TIME ZONE NOT NULL,
    service_name VARCHAR(50) NOT NULL,
    instance_id VARCHAR(50),

    -- Application Metrics
    active_users INTEGER DEFAULT 0,
    requests_per_second DECIMAL(10,2) DEFAULT 0,
    response_time_p95 DECIMAL(10,2) DEFAULT 0,
    error_rate DECIMAL(5,4) DEFAULT 0,

    -- Trading Metrics
    trades_per_second DECIMAL(10,2) DEFAULT 0,
    total_trades INTEGER DEFAULT 0,
    total_volume DECIMAL(20,8) DEFAULT 0,

    -- System Resources
    cpu_usage DECIMAL(5,2) DEFAULT 0,
    memory_usage DECIMAL(5,2) DEFAULT 0,
    disk_usage DECIMAL(5,2) DEFAULT 0,
    network_io DECIMAL(20,2) DEFAULT 0,

    -- Database Metrics
    db_connections INTEGER DEFAULT 0,
    db_query_time_p95 DECIMAL(10,2) DEFAULT 0,
    db_slow_queries INTEGER DEFAULT 0,

    -- External API Metrics
    external_api_latency DECIMAL(10,2) DEFAULT 0,
    external_api_errors INTEGER DEFAULT 0,

    metadata JSONB DEFAULT '{}'
);

-- Create hypertable for system_metrics
SELECT create_hypertable('system_metrics', 'time', 'service_name', 2);

-- Market Sentiment Data (Hypertable)
CREATE TABLE market_sentiment (
    time TIMESTAMP WITH TIME ZONE NOT NULL,
    symbol VARCHAR(20) NOT NULL,

    -- Social Media Sentiment
    twitter_sentiment DECIMAL(3,2) DEFAULT 0, -- -1 to 1
    reddit_sentiment DECIMAL(3,2) DEFAULT 0,
    news_sentiment DECIMAL(3,2) DEFAULT 0,

    -- Market Fear & Greed
    fear_greed_index INTEGER, -- 0 to 100

    -- Order Book Metrics
    order_book_imbalance DECIMAL(5,2) DEFAULT 0,
    bid_ask_spread DECIMAL(20,8) DEFAULT 0,
    market_depth_ratio DECIMAL(5,2) DEFAULT 0,

    -- Volume Metrics
    volume_anomaly DECIMAL(5,2) DEFAULT 0, -- Z-score of volume
    large_trades_ratio DECIMAL(5,2) DEFAULT 0,

    -- Price Metrics
    price_momentum DECIMAL(10,8) DEFAULT 0,
    volatility_index DECIMAL(10,8) DEFAULT 0,

    -- Aggregate Sentiment Score
    aggregate_sentiment DECIMAL(3,2) DEFAULT 0, -- -1 to 1
    sentiment_strength DECIMAL(3,2) DEFAULT 0, -- 0 to 1

    source_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create hypertable for market_sentiment
SELECT create_hypertable('market_sentiment', 'time', 'symbol', 4);

-- Risk Metrics (Hypertable)
CREATE TABLE risk_metrics (
    time TIMESTAMP WITH TIME ZONE NOT NULL,
    user_id UUID NOT NULL,
    symbol VARCHAR(20),

    -- Portfolio Risk
    portfolio_var_1d DECIMAL(20,8), -- Value at Risk (1 day)
    portfolio_var_5d DECIMAL(20,8), -- Value at Risk (5 days)
    portfolio_var_30d DECIMAL(20,8), -- Value at Risk (30 days)
    expected_shortfall_1d DECIMAL(20,8), -- ES (1 day)

    -- Position Risk
    max_position_size DECIMAL(20,8),
    position_concentration DECIMAL(5,4), -- Top position as % of portfolio
    correlation_risk DECIMAL(5,4), -- Average correlation between positions

    -- Leverage Risk
    effective_leverage DECIMAL(10,4),
    margin_utilization DECIMAL(5,4),
    leverage_breach_count INTEGER DEFAULT 0,

    -- Market Risk
    beta_exposure DECIMAL(10,8),
    volatility_exposure DECIMAL(10,8),
    sector_concentration DECIMAL(5,4),

    -- Credit Risk
    counterparty_exposure DECIMAL(20,8),
    liquidity_risk_score DECIMAL(5,4),

    risk_score DECIMAL(5,4) DEFAULT 0, -- Overall risk score (0-100)
    risk_level VARCHAR(20) DEFAULT 'low', -- low, medium, high, critical

    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create hypertable for risk_metrics
SELECT create_hypertable('risk_metrics', 'time', 'user_id', 4);

-- Indexes for Performance
CREATE INDEX idx_market_data_symbol_time ON market_data (symbol, time DESC);
CREATE INDEX idx_market_data_timeframe ON market_data (timeframe);
CREATE INDEX idx_market_data_exchange ON market_data (exchange);
CREATE INDEX idx_market_data_symbol_timeframe ON market_data (symbol, timeframe);

CREATE INDEX idx_technical_indicators_symbol_time ON technical_indicators (symbol, time DESC);
CREATE INDEX idx_technical_indicators_indicator ON technical_indicators (indicator_name);
CREATE INDEX idx_technical_indicators_timeframe ON technical_indicators (timeframe);

CREATE INDEX idx_prediction_history_symbol_time ON prediction_history (symbol, time DESC);
CREATE INDEX idx_prediction_history_model_type ON prediction_history (model_type);
CREATE INDEX idx_prediction_history_accuracy ON prediction_history (accuracy);
CREATE INDEX idx_prediction_history_strategy_id ON prediction_history (strategy_id);

CREATE INDEX idx_trading_metrics_user_time ON trading_metrics (user_id, time DESC);
CREATE INDEX idx_trading_metrics_account_type ON trading_metrics (account_type);
CREATE INDEX idx_trading_metrics_portfolio_value ON trading_metrics (portfolio_value DESC);

CREATE INDEX idx_system_metrics_service_time ON system_metrics (service_name, time DESC);
CREATE INDEX idx_system_metrics_cpu_usage ON system_metrics (cpu_usage DESC);
CREATE INDEX idx_system_metrics_error_rate ON system_metrics (error_rate DESC);

CREATE INDEX idx_market_sentiment_symbol_time ON market_sentiment (symbol, time DESC);
CREATE INDEX idx_market_sentiment_aggregate ON market_sentiment (aggregate_sentiment DESC);
CREATE INDEX idx_market_sentiment_fear_greed ON market_sentiment (fear_greed_index DESC);

CREATE INDEX idx_risk_metrics_user_time ON risk_metrics (user_id, time DESC);
CREATE INDEX idx_risk_metrics_risk_score ON risk_metrics (risk_score DESC);
CREATE INDEX idx_risk_metrics_risk_level ON risk_metrics (risk_level);

-- Data Retention Policies
-- Keep 1-minute data for 7 days
SELECT add_retention_policy('market_data', INTERVAL '7 days'),
       add_drop_chunks_policy('market_data', INTERVAL '14 days');

-- Keep 5-minute data for 30 days
SELECT add_retention_policy('technical_indicators', INTERVAL '30 days');

-- Keep hourly prediction history for 1 year
SELECT add_retention_policy('prediction_history', INTERVAL '1 year');

-- Keep daily trading metrics for 5 years
SELECT add_retention_policy('trading_metrics', INTERVAL '5 years');

-- Keep system metrics for 90 days
SELECT add_retention_policy('system_metrics', INTERVAL '90 days');

-- Keep market sentiment for 30 days
SELECT add_retention_policy('market_sentiment', INTERVAL '30 days');

-- Keep risk metrics for 2 years
SELECT add_retention_policy('risk_metrics', INTERVAL '2 years');

-- Continuous Aggregates for Common Queries

-- OHLCV data for different timeframes
CREATE MATERIALIZED VIEW market_data_1h
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS bucket,
    symbol,
    exchange,
    FIRST(open_price, time) AS open,
    MAX(high_price) AS high,
    MIN(low_price) AS low,
    LAST(close_price, time) AS close,
    SUM(volume) AS volume,
    SUM(quote_volume) AS quote_volume
FROM market_data
WHERE timeframe = '1m'
GROUP BY bucket, symbol, exchange;

CREATE MATERIALIZED VIEW market_data_1d
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', time) AS bucket,
    symbol,
    exchange,
    FIRST(open_price, time) AS open,
    MAX(high_price) AS high,
    MIN(low_price) AS low,
    LAST(close_price, time) AS close,
    SUM(volume) AS volume,
    SUM(quote_volume) AS quote_volume
FROM market_data
GROUP BY bucket, symbol, exchange;

-- Daily trading performance
CREATE MATERIALIZED VIEW daily_trading_performance
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', time) AS bucket,
    user_id,
    account_type,
    AVG(portfolio_value) AS avg_portfolio_value,
    MAX(portfolio_value) AS max_portfolio_value,
    MIN(portfolio_value) AS min_portfolio_value,
    SUM(daily_pnl) AS total_daily_pnl,
    AVG(win_rate_today) AS avg_win_rate,
    SUM(trades_today) AS total_trades,
    SUM(volume_today) AS total_volume
FROM trading_metrics
GROUP BY bucket, user_id, account_type;

-- Model accuracy tracking
CREATE MATERIALIZED VIEW model_accuracy_stats
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', time) AS bucket,
    model_type,
    symbol,
    timeframe,
    COUNT(*) AS total_predictions,
    COUNT(*) FILTER (WHERE accuracy = true) AS correct_predictions,
    COUNT(*) FILTER (WHERE accuracy = false) AS incorrect_predictions,
    AVG(confidence) AS avg_confidence,
    AVG(price_movement) AS avg_price_movement,
    (COUNT(*) FILTER (WHERE accuracy = true)::DECIMAL / COUNT(*)) AS accuracy_rate
FROM prediction_history
WHERE accuracy IS NOT NULL
GROUP BY bucket, model_type, symbol, timeframe;

-- Refresh policies for continuous aggregates
SELECT add_continuous_aggregate_policy('market_data_1h',
    start_offset => INTERVAL '1 hour',
    end_offset => INTERVAL '1 minute',
    schedule_interval => INTERVAL '1 hour');

SELECT add_continuous_aggregate_policy('market_data_1d',
    start_offset => INTERVAL '1 day',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 day');

SELECT add_continuous_aggregate_policy('daily_trading_performance',
    start_offset => INTERVAL '1 day',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '6 hours');

SELECT add_continuous_aggregate_policy('model_accuracy_stats',
    start_offset => INTERVAL '1 day',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '6 hours');