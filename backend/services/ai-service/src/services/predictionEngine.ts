import { EventEmitter } from 'events';
import { PredictionModel, ModelMetrics } from '../models/PredictionModel';
import { pool } from '../config/database';
import { redis } from '../config/database';
import {
  AIPrediction,
  PredictionType,
  ModelType,
  TimeFrame,
  AIStrategy,
} from '../../../../../backend/shared/types';

export interface PredictionConfig {
  symbols: string[];
  timeframes: TimeFrame[];
  modelTypes: ModelType[];
  predictionInterval: number; // minutes
  confidenceThreshold: number;
  ensembleWeights: Record<ModelType, number>;
  enableRetraining: boolean;
  retrainingInterval: number; // hours
}

export interface EnsemblePrediction {
  symbol: string;
  timeframe: TimeFrame;
  prediction: PredictionType;
  confidence: number;
  modelPredictions: Array<{
    modelType: ModelType;
    prediction: PredictionType;
    confidence: number;
  }>;
  ensembleWeights: Record<ModelType, number>;
  timestamp: Date;
}

export class PredictionEngine extends EventEmitter {
  private models: Map<string, PredictionModel> = new Map();
  private config: PredictionConfig;
  private predictionInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(config: PredictionConfig) {
    super();
    this.config = config;
  }

  /**
   * Initialize the prediction engine
   */
  async initialize(): Promise<void> {
    console.log('🧠 Initializing AI Prediction Engine...');

    try {
      // Create models for each symbol, timeframe, and model type
      for (const symbol of this.config.symbols) {
        for (const timeframe of this.config.timeframes) {
          for (const modelType of this.config.modelTypes) {
            const modelKey = `${modelType}_${symbol}_${timeframe}`;
            const model = new PredictionModel(modelType, symbol, timeframe);
            this.models.set(modelKey, model);
          }
        }
      }

      // Load existing models if available
      await this.loadExistingModels();

      // Start prediction generation
      this.startPredictionGeneration();

      // Start retraining if enabled
      if (this.config.enableRetraining) {
        this.startRetrainingScheduler();
      }

      this.isRunning = true;
      console.log('✅ AI Prediction Engine initialized successfully');
      this.emit('initialized');
    } catch (error) {
      console.error('❌ Failed to initialize AI Prediction Engine:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Stop the prediction engine
   */
  async stop(): Promise<void> {
    console.log('🛑 Stopping AI Prediction Engine...');

    try {
      // Clear prediction interval
      if (this.predictionInterval) {
        clearInterval(this.predictionInterval);
        this.predictionInterval = null;
      }

      // Dispose of all models
      for (const model of this.models.values()) {
        model.dispose();
      }
      this.models.clear();

      this.isRunning = false;
      console.log('✅ AI Prediction Engine stopped');
      this.emit('stopped');
    } catch (error) {
      console.error('❌ Error stopping AI Prediction Engine:', error);
      throw error;
    }
  }

  /**
   * Generate predictions for all configured models
   */
  async generateAllPredictions(): Promise<EnsemblePrediction[]> {
    const ensemblePredictions: EnsemblePrediction[] = [];

    try {
      console.log('🔮 Generating predictions...');

      for (const symbol of this.config.symbols) {
        for (const timeframe of this.config.timeframes) {
          const prediction = await this.generateEnsemblePrediction(symbol, timeframe);
          if (prediction) {
            ensemblePredictions.push(prediction);
            await this.savePrediction(prediction);
          }
        }
      }

      console.log(`✅ Generated ${ensemblePredictions.length} predictions`);
      this.emit('predictionsGenerated', ensemblePredictions);

      return ensemblePredictions;
    } catch (error) {
      console.error('Error generating predictions:', error);
      this.emit('error', error);
      return [];
    }
  }

  /**
   * Generate ensemble prediction for a specific symbol and timeframe
   */
  async generateEnsemblePrediction(
    symbol: string,
    timeframe: TimeFrame
  ): Promise<EnsemblePrediction | null> {
    try {
      const modelPredictions: Array<{
        modelType: ModelType;
        prediction: PredictionType;
        confidence: number;
      }> = [];

      // Get predictions from all models
      for (const modelType of this.config.modelTypes) {
        const modelKey = `${modelType}_${symbol}_${timeframe}`;
        const model = this.models.get(modelKey);

        if (model) {
          try {
            const modelInfo = model.getModelInfo();
            if (modelInfo.isTrained) {
              // Get latest features for prediction
              const features = await this.getLatestFeatures(symbol, timeframe, modelInfo.config.sequenceLength);
              const prediction = await model.predict(features);

              modelPredictions.push({
                modelType,
                prediction: prediction.prediction,
                confidence: prediction.confidence,
              });
            }
          } catch (error) {
            console.error(`Error predicting with ${modelType} model for ${symbol}:`, error);
          }
        }
      }

      if (modelPredictions.length === 0) {
        return null;
      }

      // Calculate ensemble prediction
      const ensemblePrediction = this.calculateEnsemblePrediction(
        modelPredictions,
        this.config.ensembleWeights
      );

      return {
        symbol,
        timeframe,
        prediction: ensemblePrediction.prediction,
        confidence: ensemblePrediction.confidence,
        modelPredictions,
        ensembleWeights: this.config.ensembleWeights,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error(`Error generating ensemble prediction for ${symbol} ${timeframe}:`, error);
      return null;
    }
  }

  /**
   * Calculate ensemble prediction from individual model predictions
   */
  private calculateEnsemblePrediction(
    modelPredictions: Array<{
      modelType: ModelType;
      prediction: PredictionType;
      confidence: number;
    }>,
    weights: Record<ModelType, number>
  ): { prediction: PredictionType; confidence: number } {
    // Weighted voting
    const votes: Record<PredictionType, number> = {
      [PredictionType.BUY]: 0,
      [PredictionType.SELL]: 0,
      [PredictionType.HOLD]: 0,
    };

    let totalWeight = 0;

    for (const modelPred of modelPredictions) {
      const weight = weights[modelPred.modelType] || 1;
      const weightedConfidence = modelPred.confidence * weight;

      votes[modelPred.prediction] += weightedConfidence;
      totalWeight += weightedConfidence;
    }

    // Find prediction with highest weighted vote
    let maxVotes = 0;
    let bestPrediction = PredictionType.HOLD;

    for (const [prediction, votesCount] of Object.entries(votes)) {
      if (votesCount > maxVotes) {
        maxVotes = votesCount;
        bestPrediction = prediction as PredictionType;
      }
    }

    // Calculate confidence as normalized votes
    const confidence = totalWeight > 0 ? maxVotes / totalWeight : 0;

    return {
      prediction: bestPrediction,
      confidence,
    };
  }

  /**
   * Get latest features for prediction
   */
  private async getLatestFeatures(
    symbol: string,
    timeframe: TimeFrame,
    sequenceLength: number
  ): Promise<number[][]> {
    try {
      const query = `
        SELECT
          open_price,
          high_price,
          low_price,
          close_price,
          volume,
          quote_volume
        FROM market_data
        WHERE symbol = $1 AND timeframe = $2
        ORDER BY time DESC
        LIMIT $3
      `;

      const result = await pool.query(query, [symbol, timeframe, sequenceLength]);

      if (result.rows.length < sequenceLength) {
        throw new Error(`Insufficient data for prediction: need ${sequenceLength}, got ${result.rows.length}`);
      }

      // Reverse to get chronological order
      const rows = result.rows.reverse();

      // Create feature sequences
      const features: number[][] = [];
      for (const row of rows) {
        const feature = [
          parseFloat(row.open_price || '0'),
          parseFloat(row.high_price || '0'),
          parseFloat(row.low_price || '0'),
          parseFloat(row.close_price || '0'),
          parseInt(row.volume || '0'),
          parseFloat(row.quote_volume || '0'),
          // Add technical indicators (simplified)
          this.calculateSimpleSMA(rows, rows.indexOf(row), 20),
          this.calculateSimpleEMA(rows, rows.indexOf(row), 12),
          this.calculateSimpleRSI(rows, rows.indexOf(row), 14),
          this.calculateSimpleMACD(rows, rows.indexOf(row)),
        ];
        features.push(feature);
      }

      return features;
    } catch (error) {
      console.error('Error getting latest features:', error);
      throw error;
    }
  }

  // Simplified indicator calculations for features
  private calculateSimpleSMA(data: any[], index: number, period: number): number {
    if (index < period - 1) return 0;
    const sum = data.slice(index - period + 1, index + 1)
      .reduce((acc, row) => acc + parseFloat(row.close_price || '0'), 0);
    return sum / period;
  }

  private calculateSimpleEMA(data: any[], index: number, period: number): number {
    if (index === 0) return parseFloat(data[0].close_price || '0');
    const multiplier = 2 / (period + 1);
    const prevEMA = this.calculateSimpleEMA(data, index - 1, period);
    const currentPrice = parseFloat(data[index].close_price || '0');
    return (currentPrice * multiplier) + (prevEMA * (1 - multiplier));
  }

  private calculateSimpleRSI(data: any[], index: number, period: number): number {
    if (index < period) return 50;

    let gains = 0, losses = 0;
    for (let i = index - period + 1; i <= index; i++) {
      const change = parseFloat(data[i].close_price || '0') - parseFloat(data[i - 1].close_price || '0');
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private calculateSimpleMACD(data: any[], index: number): number {
    const ema12 = this.calculateSimpleEMA(data, index, 12);
    const ema26 = this.calculateSimpleEMA(data, index, 26);
    return ema12 - ema26;
  }

  /**
   * Save prediction to database
   */
  private async savePrediction(prediction: EnsemblePrediction): Promise<void> {
    try {
      const query = `
        INSERT INTO ai_predictions (
          symbol, timeframe, prediction, confidence, predicted_price,
          current_price, timestamp, model_type, ensemble_weights,
          confidence_threshold, strategy_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `;

      // Get current price (simplified)
      const currentPrice = await this.getCurrentPrice(prediction.symbol);

      await pool.query(query, [
        prediction.symbol,
        prediction.timeframe,
        prediction.prediction,
        prediction.confidence,
        currentPrice, // Simplified: using current price as predicted price
        currentPrice,
        prediction.timestamp,
        ModelType.ENSEMBLE, // Store as ensemble type
        JSON.stringify(prediction.ensembleWeights),
        this.config.confidenceThreshold,
        null, // strategy_id would be set for strategy-specific predictions
      ]);

      // Cache latest prediction in Redis
      await redis.setex(
        `prediction:${prediction.symbol}:${prediction.timeframe}`,
        300, // 5 minutes cache
        JSON.stringify(prediction)
      );
    } catch (error) {
      console.error('Error saving prediction:', error);
    }
  }

  /**
   * Get current price for a symbol
   */
  private async getCurrentPrice(symbol: string): Promise<number> {
    try {
      const query = `
        SELECT close_price
        FROM market_data
        WHERE symbol = $1
        ORDER BY time DESC
        LIMIT 1
      `;

      const result = await pool.query(query, [symbol]);
      return parseFloat(result.rows[0]?.close_price || '0');
    } catch (error) {
      console.error('Error getting current price:', error);
      return 0;
    }
  }

  /**
   * Get recent predictions for a symbol
   */
  async getRecentPredictions(
    symbol: string,
    timeframe: TimeFrame,
    limit: number = 10
  ): Promise<AIPrediction[]> {
    try {
      const query = `
        SELECT *
        FROM ai_predictions
        WHERE symbol = $1 AND timeframe = $2
        ORDER BY timestamp DESC
        LIMIT $3
      `;

      const result = await pool.query(query, [symbol, timeframe, limit]);

      return result.rows.map(row => ({
        id: row.id,
        symbol: row.symbol,
        timeframe: row.timeframe,
        prediction: row.prediction,
        confidence: parseFloat(row.confidence),
        predictedPrice: parseFloat(row.predicted_price),
        currentPrice: parseFloat(row.current_price),
        timestamp: row.timestamp,
        modelType: row.model_type,
        features: row.features,
        stopLoss: parseFloat(row.stop_loss),
        takeProfit: parseFloat(row.take_profit),
        timeToExpiration: row.time_to_expiration,
      }));
    } catch (error) {
      console.error('Error getting recent predictions:', error);
      return [];
    }
  }

  /**
   * Load existing models from database
   */
  private async loadExistingModels(): Promise<void> {
    try {
      const query = `
        SELECT model_type, symbol, timeframe, model_config, training_metrics
        FROM ai_models
        WHERE is_active = true
        ORDER BY created_at DESC
      `;

      const result = await pool.query(query);

      for (const row of result.rows) {
        const modelKey = `${row.model_type}_${row.symbol}_${row.timeframe}`;
        const model = this.models.get(modelKey);

        if (model) {
          // Note: In a full implementation, you would load the actual model weights
          // For this example, we just mark models as trained if they exist in database
          console.log(`📂 Found existing model: ${modelKey}`);
        }
      }
    } catch (error) {
      console.error('Error loading existing models:', error);
    }
  }

  /**
   * Start prediction generation
   */
  private startPredictionGeneration(): void {
    const intervalMs = this.config.predictionInterval * 60 * 1000; // Convert minutes to milliseconds

    this.predictionInterval = setInterval(async () => {
      try {
        await this.generateAllPredictions();
      } catch (error) {
        console.error('Error in prediction generation cycle:', error);
        this.emit('error', error);
      }
    }, intervalMs);

    console.log(`🔄 Started prediction generation every ${this.config.predictionInterval} minutes`);
  }

  /**
   * Start retraining scheduler
   */
  private startRetrainingScheduler(): void {
    const intervalMs = this.config.retrainingInterval * 60 * 60 * 1000; // Convert hours to milliseconds

    setInterval(async () => {
      try {
        await this.retrainModels();
      } catch (error) {
        console.error('Error in model retraining cycle:', error);
      }
    }, intervalMs);

    console.log(`🔄 Started model retraining every ${this.config.retrainingInterval} hours`);
  }

  /**
   * Retrain models with latest data
   */
  private async retrainModels(): Promise<void> {
    console.log('🔄 Starting model retraining...');

    try {
      for (const [modelKey, model] of this.models) {
        try {
          const modelInfo = model.getModelInfo();

          // Get training data for last 3 months
          const endDate = new Date();
          const startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);

          const trainingData = await model.prepareTrainingData(
            modelInfo.symbol,
            modelInfo.timeframe,
            startDate,
            endDate
          );

          const metrics = await model.train(trainingData);
          await model.saveModelMetadata(metrics);

          console.log(`✅ Retrained model: ${modelKey}`);
        } catch (error) {
          console.error(`Error retraining model ${modelKey}:`, error);
        }
      }
    } catch (error) {
      console.error('Error in retraining process:', error);
    }
  }

  /**
   * Get prediction accuracy statistics
   */
  async getAccuracyStats(days: number = 30): Promise<{
    totalPredictions: number;
    correctPredictions: number;
    accuracy: number;
    byModelType: Record<ModelType, { correct: number; total: number; accuracy: number }>;
  }> {
    try {
      const query = `
        SELECT
          model_type,
          COUNT(*) as total,
          COUNT(CASE WHEN actual_outcome = prediction THEN 1 END) as correct
        FROM ai_predictions
        WHERE timestamp >= NOW() - INTERVAL '${days} days'
          AND actual_outcome IS NOT NULL
        GROUP BY model_type
      `;

      const result = await pool.query(query);

      let totalPredictions = 0;
      let correctPredictions = 0;
      const byModelType: Record<ModelType, { correct: number; total: number; accuracy: number }> = {} as any;

      for (const row of result.rows) {
        const modelType = row.model_type as ModelType;
        const total = parseInt(row.total);
        const correct = parseInt(row.correct);
        const accuracy = total > 0 ? correct / total : 0;

        byModelType[modelType] = { correct, total, accuracy };
        totalPredictions += total;
        correctPredictions += correct;
      }

      const overallAccuracy = totalPredictions > 0 ? correctPredictions / totalPredictions : 0;

      return {
        totalPredictions,
        correctPredictions,
        accuracy: overallAccuracy,
        byModelType,
      };
    } catch (error) {
      console.error('Error getting accuracy stats:', error);
      return {
        totalPredictions: 0,
        correctPredictions: 0,
        accuracy: 0,
        byModelType: {} as any,
      };
    }
  }
}