import Decimal from 'decimal.js';
import { pool } from '../config/database';
import { TimeFrame } from '../../../../shared/types';
import { MarketDataTick, TickerData, OrderBookData, TradeData } from '../interfaces/marketData';

export class MarketDataModel {
  /**
   * Store candlestick data in TimescaleDB
   */
  async storeCandlestick(candlestick: MarketDataTick): Promise<void> {
    try {
      const query = `
        INSERT INTO market_data (
          time, symbol, open_price, high_price, low_price, close_price,
          volume, quote_volume, timeframe, exchange, quality_score
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (time, symbol, timeframe, exchange) DO UPDATE SET
          open_price = EXCLUDED.open_price,
          high_price = EXCLUDED.high_price,
          low_price = EXCLUDED.low_price,
          close_price = EXCLUDED.close_price,
          volume = EXCLUDED.volume,
          quote_volume = EXCLUDED.quote_volume,
          quality_score = EXCLUDED.quality_score
      `;

      const values = [
        candlestick.timestamp,
        candlestick.symbol,
        candlestick.open,
        candlestick.high,
        candlestick.low,
        candlestick.close,
        candlestick.volume,
        candlestick.quoteVolume || 0,
        candlestick.timeframe,
        candlestick.exchange,
        1.0, // Default quality score
      ];

      await pool.query(query, values);
    } catch (error) {
      console.error('Error storing candlestick data:', error);
      throw new Error('Failed to store candlestick data');
    }
  }

  /**
   * Store multiple candlesticks efficiently
   */
  async storeCandlesticksBatch(candlesticks: MarketDataTick[]): Promise<void> {
    if (candlesticks.length === 0) return;

    try {
      const query = `
        INSERT INTO market_data (
          time, symbol, open_price, high_price, low_price, close_price,
          volume, quote_volume, timeframe, exchange, quality_score
        ) VALUES ${candlesticks.map((_, index) =>
          `($${index * 11 + 1}, $${index * 11 + 2}, $${index * 11 + 3}, $${index * 11 + 4}, $${index * 11 + 5}, $${index * 11 + 6}, $${index * 11 + 7}, $${index * 11 + 8}, $${index * 11 + 9}, $${index * 11 + 10}, $${index * 11 + 11})`
        ).join(', ')}
        ON CONFLICT (time, symbol, timeframe, exchange) DO UPDATE SET
          open_price = EXCLUDED.open_price,
          high_price = EXCLUDED.high_price,
          low_price = EXCLUDED.low_price,
          close_price = EXCLUDED.close_price,
          volume = EXCLUDED.volume,
          quote_volume = EXCLUDED.quote_volume,
          quality_score = EXCLUDED.quality_score
      `;

      const values: any[] = [];
      candlesticks.forEach(candlestick => {
        values.push(
          candlestick.timestamp,
          candlestick.symbol,
          candlestick.open,
          candlestick.high,
          candlestick.low,
          candlestick.close,
          candlestick.volume,
          candlestick.quoteVolume || 0,
          candlestick.timeframe,
          candlestick.exchange,
          1.0
        );
      });

      await pool.query(query, values);
    } catch (error) {
      console.error('Error storing candlesticks batch:', error);
      throw new Error('Failed to store candlesticks batch');
    }
  }

  /**
   * Get candlestick data for analysis
   */
  async getCandlesticks(
    symbol: string,
    timeframe: TimeFrame,
    startDate: Date,
    endDate: Date,
    limit?: number
  ): Promise<MarketDataTick[]> {
    try {
      let query = `
        SELECT time, symbol, open_price, high_price, low_price, close_price,
               volume, quote_volume, timeframe, exchange
        FROM market_data
        WHERE symbol = $1 AND timeframe = $2 AND time >= $3 AND time <= $4
        ORDER BY time ASC
      `;

      const values = [symbol, timeframe, startDate, endDate];

      if (limit) {
        query += ` LIMIT $5`;
        values.push(limit);
      }

      const result = await pool.query(query, values);

      return result.rows.map(row => ({
        symbol: row.symbol,
        timestamp: row.time,
        open: parseFloat(row.open_price),
        high: parseFloat(row.high_price),
        low: parseFloat(row.low_price),
        close: parseFloat(row.close_price),
        volume: parseInt(row.volume),
        quoteVolume: parseFloat(row.quote_volume),
        timeframe: row.timeframe as TimeFrame,
        exchange: row.exchange,
      }));
    } catch (error) {
      console.error('Error getting candlesticks:', error);
      throw new Error('Failed to get candlestick data');
    }
  }

  /**
   * Get latest candlestick for a symbol and timeframe
   */
  async getLatestCandlestick(
    symbol: string,
    timeframe: TimeFrame,
    exchange: string = 'binance'
  ): Promise<MarketDataTick | null> {
    try {
      const query = `
        SELECT time, symbol, open_price, high_price, low_price, close_price,
               volume, quote_volume, timeframe, exchange
        FROM market_data
        WHERE symbol = $1 AND timeframe = $2 AND exchange = $3
        ORDER BY time DESC
        LIMIT 1
      `;

      const result = await pool.query(query, [symbol, timeframe, exchange]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        symbol: row.symbol,
        timestamp: row.time,
        open: parseFloat(row.open_price),
        high: parseFloat(row.high_price),
        low: parseFloat(row.low_price),
        close: parseFloat(row.close_price),
        volume: parseInt(row.volume),
        quoteVolume: parseFloat(row.quote_volume),
        timeframe: row.timeframe as TimeFrame,
        exchange: row.exchange,
      };
    } catch (error) {
      console.error('Error getting latest candlestick:', error);
      throw new Error('Failed to get latest candlestick');
    }
  }

  /**
   * Store technical indicator data
   */
  async storeTechnicalIndicator(
    symbol: string,
    timeframe: TimeFrame,
    indicatorName: string,
    indicatorData: Record<string, number>,
    source: string = 'system'
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO technical_indicators (
          time, symbol, timeframe, indicator_name, indicator_data, source
        ) VALUES (NOW(), $1, $2, $3, $4, $5)
      `;

      await pool.query(query, [
        symbol,
        timeframe,
        indicatorName,
        JSON.stringify(indicatorData),
        source,
      ]);
    } catch (error) {
      console.error('Error storing technical indicator:', error);
      throw new Error('Failed to store technical indicator');
    }
  }

  /**
   * Get technical indicators for a symbol
   */
  async getTechnicalIndicators(
    symbol: string,
    timeframe: TimeFrame,
    indicatorName?: string,
    limit: number = 100
  ): Promise<any[]> {
    try {
      let query = `
        SELECT time, symbol, timeframe, indicator_name, indicator_data, source
        FROM technical_indicators
        WHERE symbol = $1 AND timeframe = $2
      `;

      const values = [symbol, timeframe];
      let paramIndex = 3;

      if (indicatorName) {
        query += ` AND indicator_name = $${paramIndex++}`;
        values.push(indicatorName);
      }

      query += ` ORDER BY time DESC LIMIT $${paramIndex}`;
      values.push(limit);

      const result = await pool.query(query, values);

      return result.rows.map(row => ({
        time: row.time,
        symbol: row.symbol,
        timeframe: row.timeframe,
        indicatorName: row.indicator_name,
        indicatorData: row.indicator_data,
        source: row.source,
      }));
    } catch (error) {
      console.error('Error getting technical indicators:', error);
      throw new Error('Failed to get technical indicators');
    }
  }

  /**
   * Store market sentiment data
   */
  async storeMarketSentiment(
    symbol: string,
    sentimentData: {
      fearGreedIndex?: number;
      volumeAnomaly?: number;
      priceMomentum?: number;
      volatilityIndex?: number;
      socialSentiment?: number;
    }
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO market_sentiment (
          symbol, fear_greed_index, volume_anomaly, price_momentum,
          volatility_index, social_sentiment, aggregate_sentiment, sentiment_strength
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;

      // Calculate aggregate sentiment
      const values = Object.values(sentimentData).filter(v => v !== undefined);
      const aggregateSentiment = values.length > 0
        ? values.reduce((sum, val) => sum + val!, 0) / values.length
        : 0;

      await pool.query(query, [
        symbol,
        sentimentData.fearGreedIndex,
        sentimentData.volumeAnomaly,
        sentimentData.priceMomentum,
        sentimentData.volatilityIndex,
        sentimentData.socialSentiment,
        aggregateSentiment,
        Math.abs(aggregateSentiment), // Strength as absolute value
      ]);
    } catch (error) {
      console.error('Error storing market sentiment:', error);
      throw new Error('Failed to store market sentiment');
    }
  }

  /**
   * Get available symbols in the database
   */
  async getAvailableSymbols(): Promise<string[]> {
    try {
      const query = `
        SELECT DISTINCT symbol
        FROM market_data
        WHERE time >= NOW() - INTERVAL '24 hours'
        ORDER BY symbol
      `;

      const result = await pool.query(query);
      return result.rows.map(row => row.symbol);
    } catch (error) {
      console.error('Error getting available symbols:', error);
      return [];
    }
  }

  /**
   * Get market data statistics for a symbol
   */
  async getMarketDataStats(
    symbol: string,
    timeframe: TimeFrame,
    hours: number = 24
  ): Promise<{
    count: number;
    avgVolume: number;
    maxPrice: number;
    minPrice: number;
    priceChange: number;
    priceChangePercent: number;
  }> {
    try {
      const query = `
        SELECT
          COUNT(*) as count,
          AVG(volume) as avg_volume,
          MAX(high_price) as max_price,
          MIN(low_price) as min_price,
          FIRST_VALUE(close_price) OVER (ORDER BY time ASC) as first_close,
          FIRST_VALUE(close_price) OVER (ORDER BY time DESC) as last_close
        FROM market_data
        WHERE symbol = $1 AND timeframe = $2
          AND time >= NOW() - INTERVAL '${hours} hours'
      `;

      const result = await pool.query(query, [symbol, timeframe]);

      if (result.rows.length === 0) {
        return {
          count: 0,
          avgVolume: 0,
          maxPrice: 0,
          minPrice: 0,
          priceChange: 0,
          priceChangePercent: 0,
        };
      }

      const row = result.rows[0];
      const firstClose = parseFloat(row.first_close) || 0;
      const lastClose = parseFloat(row.last_close) || 0;
      const priceChange = lastClose - firstClose;
      const priceChangePercent = firstClose > 0 ? (priceChange / firstClose) * 100 : 0;

      return {
        count: parseInt(row.count),
        avgVolume: parseFloat(row.avg_volume) || 0,
        maxPrice: parseFloat(row.max_price) || 0,
        minPrice: parseFloat(row.min_price) || 0,
        priceChange,
        priceChangePercent,
      };
    } catch (error) {
      console.error('Error getting market data statistics:', error);
      throw new Error('Failed to get market data statistics');
    }
  }

  /**
   * Clean up old market data based on retention policy
   */
  async cleanupOldData(): Promise<number> {
    try {
      // Delete 1-minute data older than 7 days
      const result1m = await pool.query(`
        DELETE FROM market_data
        WHERE timeframe = '1m' AND time < NOW() - INTERVAL '7 days'
      `);

      // Delete 5-minute data older than 30 days
      const result5m = await pool.query(`
        DELETE FROM market_data
        WHERE timeframe = '5m' AND time < NOW() - INTERVAL '30 days'
      `);

      // Delete technical indicators older than 90 days
      const resultIndicators = await pool.query(`
        DELETE FROM technical_indicators
        WHERE time < NOW() - INTERVAL '90 days'
      `);

      // Delete sentiment data older than 30 days
      const resultSentiment = await pool.query(`
        DELETE FROM market_sentiment
        WHERE time < NOW() - INTERVAL '30 days'
      `);

      const totalDeleted = (result1m.rowCount || 0) +
                          (result5m.rowCount || 0) +
                          (resultIndicators.rowCount || 0) +
                          (resultSentiment.rowCount || 0);

      return totalDeleted;
    } catch (error) {
      console.error('Error cleaning up old data:', error);
      return 0;
    }
  }
}

export const marketDataModel = new MarketDataModel();