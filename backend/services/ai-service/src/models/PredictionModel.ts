import * as tf from '@tensorflow/tfjs-node';
import { pool } from '../config/database';
import {
  AIPrediction,
  PredictionType,
  ModelType,
  TimeFrame,
  TechnicalIndicator,
} from '../../../../../backend/shared/types';

export interface ModelConfig {
  sequenceLength: number;
  featureCount: number;
  hiddenUnits: number[];
  dropoutRate: number;
  learningRate: number;
  batchSize: number;
  epochs: number;
  validationSplit: number;
}

export interface TrainingData {
  features: number[][];
  labels: number[];
  timestamps: Date[];
}

export interface ModelMetrics {
  loss: number;
  mae: number;
  mse: number;
  accuracy?: number;
  precision?: number;
  recall?: number;
}

export class PredictionModel {
  protected model: tf.LayersModel | null = null;
  protected config: ModelConfig;
  protected modelType: ModelType;
  protected symbol: string;
  protected timeframe: TimeFrame;
  protected isTrained: boolean = false;

  constructor(
    modelType: ModelType,
    symbol: string,
    timeframe: TimeFrame,
    config: Partial<ModelConfig> = {}
  ) {
    this.modelType = modelType;
    this.symbol = symbol;
    this.timeframe = timeframe;

    this.config = {
      sequenceLength: 60,
      featureCount: 10,
      hiddenUnits: [128, 64, 32],
      dropoutRate: 0.2,
      learningRate: 0.001,
      batchSize: 32,
      epochs: 100,
      validationSplit: 0.2,
      ...config,
    };
  }

  /**
   * Build the model architecture
   */
  protected buildModel(): tf.LayersModel {
    switch (this.modelType) {
      case ModelType.LSTM:
        return this.buildLSTMModel();
      case ModelType.GRU:
        return this.buildGRUModel();
      case ModelType.TRANSFORMER:
        return this.buildTransformerModel();
      default:
        throw new Error(`Unsupported model type: ${this.modelType}`);
    }
  }

  /**
   * Build LSTM model
   */
  private buildLSTMModel(): tf.LayersModel {
    const model = tf.sequential();

    // Input layer
    model.add(tf.layers.lstm({
      units: this.config.hiddenUnits[0],
      returnSequences: true,
      inputShape: [this.config.sequenceLength, this.config.featureCount],
      dropout: this.config.dropoutRate,
      recurrentDropout: this.config.dropoutRate,
    }));

    // Hidden layers
    for (let i = 1; i < this.config.hiddenUnits.length; i++) {
      model.add(tf.layers.lstm({
        units: this.config.hiddenUnits[i],
        returnSequences: i < this.config.hiddenUnits.length - 1,
        dropout: this.config.dropoutRate,
        recurrentDropout: this.config.dropoutRate,
      }));
    }

    // Output layer
    model.add(tf.layers.dense({
      units: 3, // [buy, sell, hold probabilities]
      activation: 'softmax',
    }));

    // Compile model
    model.compile({
      optimizer: tf.train.adam(this.config.learningRate),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy', 'mae', 'mse'],
    });

    return model;
  }

  /**
   * Build GRU model
   */
  private buildGRUModel(): tf.LayersModel {
    const model = tf.sequential();

    // Input layer
    model.add(tf.layers.gru({
      units: this.config.hiddenUnits[0],
      returnSequences: true,
      inputShape: [this.config.sequenceLength, this.config.featureCount],
      dropout: this.config.dropoutRate,
      recurrentDropout: this.config.dropoutRate,
    }));

    // Hidden layers
    for (let i = 1; i < this.config.hiddenUnits.length; i++) {
      model.add(tf.layers.gru({
        units: this.config.hiddenUnits[i],
        returnSequences: i < this.config.hiddenUnits.length - 1,
        dropout: this.config.dropoutRate,
        recurrentDropout: this.config.dropoutRate,
      }));
    }

    // Output layer
    model.add(tf.layers.dense({
      units: 3, // [buy, sell, hold probabilities]
      activation: 'softmax',
    }));

    // Compile model
    model.compile({
      optimizer: tf.train.adam(this.config.learningRate),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy', 'mae', 'mse'],
    });

    return model;
  }

  /**
   * Build Transformer model
   */
  private buildTransformerModel(): tf.LayersModel {
    const model = tf.sequential();

    // Input projection
    model.add(tf.layers.dense({
      units: 256,
      inputShape: [this.config.sequenceLength, this.config.featureCount],
      activation: 'relu',
    }));

    // Multi-head attention (simplified)
    model.add(tf.layers.multiHeadAttention({
      numHeads: 8,
      keyDim: 32,
    }));

    // Feed-forward network
    model.add(tf.layers.dense({ units: 256, activation: 'relu' }));
    model.add(tf.layers.dropout({ rate: this.config.dropoutRate }));

    // Global pooling
    model.add(tf.layers.globalAveragePooling1d());

    // Output layers
    model.add(tf.layers.dense({ units: 128, activation: 'relu' }));
    model.add(tf.layers.dropout({ rate: this.config.dropoutRate }));
    model.add(tf.layers.dense({
      units: 3, // [buy, sell, hold probabilities]
      activation: 'softmax',
    }));

    // Compile model
    model.compile({
      optimizer: tf.train.adam(this.config.learningRate),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy', 'mae', 'mse'],
    });

    return model;
  }

  /**
   * Prepare training data
   */
  async prepareTrainingData(
    symbol: string,
    timeframe: TimeFrame,
    startDate: Date,
    endDate: Date
  ): Promise<TrainingData> {
    try {
      // Fetch historical data and indicators from TimescaleDB
      const query = `
        SELECT
          time,
          open_price,
          high_price,
          low_price,
          close_price,
          volume,
          quote_volume
        FROM market_data
        WHERE symbol = $1
          AND timeframe = $2
          AND time >= $3
          AND time <= $4
        ORDER BY time ASC
      `;

      const result = await pool.query(query, [symbol, timeframe, startDate, endDate]);

      if (result.rows.length < this.config.sequenceLength + 1) {
        throw new Error(`Insufficient data: need at least ${this.config.sequenceLength + 1} records`);
      }

      // Extract features and labels
      const features: number[][] = [];
      const labels: number[] = [];
      const timestamps: Date[] = [];

      for (let i = 0; i < result.rows.length; i++) {
        const row = result.rows[i];

        // Build feature vector
        const feature = [
          parseFloat(row.open_price || '0'),
          parseFloat(row.high_price || '0'),
          parseFloat(row.low_price || '0'),
          parseFloat(row.close_price || '0'),
          parseInt(row.volume || '0'),
          parseFloat(row.quote_volume || '0'),
          // Add technical indicators (simplified for example)
          this.calculateSMA(result.rows, i, 20),
          this.calculateEMA(result.rows, i, 12),
          this.calculateRSI(result.rows, i, 14),
          this.calculateMACD(result.rows, i),
        ];

        features.push(feature);
        timestamps.push(new Date(row.time));

        // Create labels (buy=1, hold=2, sell=0)
        if (i < result.rows.length - 1) {
          const currentPrice = parseFloat(row.close_price || '0');
          const nextPrice = parseFloat(result.rows[i + 1].close_price || '0');
          const priceChange = (nextPrice - currentPrice) / currentPrice;

          // Label based on price movement threshold
          const threshold = 0.001; // 0.1%
          if (priceChange > threshold) {
            labels.push(1); // Buy
          } else if (priceChange < -threshold) {
            labels.push(0); // Sell
          } else {
            labels.push(2); // Hold
          }
        }
      }

      // Create sequences
      const sequenceFeatures: number[][][] = [];
      const sequenceLabels: number[] = [];

      for (let i = 0; i <= features.length - this.config.sequenceLength; i++) {
        const sequence = features.slice(i, i + this.config.sequenceLength);
        sequenceFeatures.push(sequence);

        if (i + this.config.sequenceLength < labels.length) {
          sequenceLabels.push(labels[i + this.config.sequenceLength - 1]);
        }
      }

      return {
        features: sequenceFeatures.map(seq => seq.flat()),
        labels: sequenceLabels,
        timestamps: timestamps.slice(this.config.sequenceLength - 1),
      };
    } catch (error) {
      console.error('Error preparing training data:', error);
      throw new Error('Failed to prepare training data');
    }
  }

  // Simplified technical indicator calculations
  private calculateSMA(data: any[], index: number, period: number): number {
    if (index < period - 1) return 0;
    const sum = data.slice(index - period + 1, index + 1)
      .reduce((acc, row) => acc + parseFloat(row.close_price || '0'), 0);
    return sum / period;
  }

  private calculateEMA(data: any[], index: number, period: number): number {
    if (index === 0) return parseFloat(data[0].close_price || '0');
    const multiplier = 2 / (period + 1);
    const prevEMA = this.calculateEMA(data, index - 1, period);
    const currentPrice = parseFloat(data[index].close_price || '0');
    return (currentPrice * multiplier) + (prevEMA * (1 - multiplier));
  }

  private calculateRSI(data: any[], index: number, period: number): number {
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

  private calculateMACD(data: any[], index: number): number {
    // Simplified MACD calculation
    const ema12 = this.calculateEMA(data, index, 12);
    const ema26 = this.calculateEMA(data, index, 26);
    return ema12 - ema26;
  }

  /**
   * Train the model
   */
  async train(
    trainingData: TrainingData,
    onEpochEnd?: (epoch: number, logs: any) => void
  ): Promise<ModelMetrics> {
    try {
      console.log(`🚀 Training ${this.modelType} model for ${this.symbol} ${this.timeframe}`);

      // Build model if not already built
      if (!this.model) {
        this.model = this.buildModel();
      }

      // Prepare tensors
      const featuresTensor = tf.tensor4d(
        trainingData.features,
        [trainingData.features.length, this.config.sequenceLength, this.config.featureCount, 1]
      );

      const labelsTensor = tf.oneHot(
        tf.tensor1d(trainingData.labels, 'int32'),
        3
      ) as tf.Tensor2D;

      // Train model
      const history = await this.model.fit(featuresTensor, labelsTensor, {
        epochs: this.config.epochs,
        batchSize: this.config.batchSize,
        validationSplit: this.config.validationSplit,
        shuffle: true,
        callbacks: {
          onEpochEnd: onEpochEnd,
        },
      });

      // Get final metrics
      const finalLoss = history.history.loss[history.history.loss.length - 1];
      const finalMAE = history.history.mae[history.history.mae.length - 1];
      const finalMSE = history.history.mse[history.history.mse.length - 1];
      const finalAccuracy = history.history.accuracy?.[history.history.accuracy.length - 1] || 0;

      this.isTrained = true;

      // Clean up tensors
      featuresTensor.dispose();
      labelsTensor.dispose();

      const metrics: ModelMetrics = {
        loss: finalLoss,
        mae: finalMAE,
        mse: finalMSE,
        accuracy: finalAccuracy,
      };

      console.log(`✅ Training completed. Loss: ${finalLoss.toFixed(4)}, Accuracy: ${(finalAccuracy * 100).toFixed(2)}%`);

      return metrics;
    } catch (error) {
      console.error('Error training model:', error);
      throw new Error('Failed to train model');
    }
  }

  /**
   * Make prediction
   */
  async predict(features: number[][]): Promise<{
    prediction: PredictionType;
    confidence: number;
    probabilities: Record<PredictionType, number>;
  }> {
    if (!this.model || !this.isTrained) {
      throw new Error('Model must be trained before making predictions');
    }

    try {
      // Prepare input tensor
      const inputTensor = tf.tensor4d(
        [features.flat()],
        [1, this.config.sequenceLength, this.config.featureCount, 1]
      );

      // Make prediction
      const prediction = this.model.predict(inputTensor) as tf.Tensor2D;
      const probabilities = await prediction.data();

      // Clean up tensors
      inputTensor.dispose();
      prediction.dispose();

      // Get predictions for buy, sell, hold
      const sellProb = probabilities[0];
      const buyProb = probabilities[1];
      const holdProb = probabilities[2];

      // Determine prediction and confidence
      const maxProb = Math.max(sellProb, buyProb, holdProb);
      let predictionType: PredictionType;
      let confidence: number;

      if (maxProb === sellProb) {
        predictionType = PredictionType.SELL;
        confidence = sellProb;
      } else if (maxProb === buyProb) {
        predictionType = PredictionType.BUY;
        confidence = buyProb;
      } else {
        predictionType = PredictionType.HOLD;
        confidence = holdProb;
      }

      return {
        prediction: predictionType,
        confidence,
        probabilities: {
          [PredictionType.SELL]: sellProb,
          [PredictionType.BUY]: buyProb,
          [PredictionType.HOLD]: holdProb,
        },
      };
    } catch (error) {
      console.error('Error making prediction:', error);
      throw new Error('Failed to make prediction');
    }
  }

  /**
   * Save model metadata
   */
  async saveModelMetadata(metrics: ModelMetrics): Promise<void> {
    if (!this.isTrained) {
      throw new Error('No trained model to save');
    }

    try {
      // Store model metadata in database
      const query = `
        INSERT INTO ai_models (
          model_type, symbol, timeframe, model_config,
          training_metrics, created_at, is_active
        ) VALUES ($1, $2, $3, $4, $5, NOW(), true)
        ON CONFLICT (model_type, symbol, timeframe)
        DO UPDATE SET
          model_config = EXCLUDED.model_config,
          training_metrics = EXCLUDED.training_metrics,
          updated_at = NOW(),
          is_active = true
      `;

      await pool.query(query, [
        this.modelType,
        this.symbol,
        this.timeframe,
        JSON.stringify(this.config),
        JSON.stringify(metrics),
      ]);

      console.log(`💾 Saved ${this.modelType} model metadata for ${this.symbol} ${this.timeframe}`);
    } catch (error) {
      console.error('Error saving model metadata:', error);
      throw new Error('Failed to save model metadata');
    }
  }

  /**
   * Get model info
   */
  getModelInfo(): {
    modelType: ModelType;
    symbol: string;
    timeframe: TimeFrame;
    config: ModelConfig;
    isTrained: boolean;
  } {
    return {
      modelType: this.modelType,
      symbol: this.symbol,
      timeframe: this.timeframe,
      config: this.config,
      isTrained: this.isTrained,
    };
  }

  /**
   * Dispose of model to free memory
   */
  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
      this.isTrained = false;
    }
  }
}