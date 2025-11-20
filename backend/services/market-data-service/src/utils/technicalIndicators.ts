import { MarketDataTick } from '../interfaces/marketData';

export interface IndicatorData {
  sma: Record<string, number>;
  ema: Record<string, number>;
  rsi: Record<string, number>;
  macd: Record<string, number>;
  bollingerBands: Record<string, number>;
  stochastic: Record<string, number>;
  atr: Record<string, number>;
}

/**
 * Calculate Simple Moving Average (SMA)
 */
export function calculateSMA(data: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val, 0);
    sma.push(sum / period);
  }
  return sma;
}

/**
 * Calculate Exponential Moving Average (EMA)
 */
export function calculateEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);

  // Start with SMA for first EMA value
  const initialSMA = data.slice(0, period).reduce((acc, val) => acc + val, 0) / period;
  ema.push(initialSMA);

  for (let i = period; i < data.length; i++) {
    const currentEMA = (data[i] * multiplier) + (ema[ema.length - 1] * (1 - multiplier));
    ema.push(currentEMA);
  }

  return ema;
}

/**
 * Calculate Relative Strength Index (RSI)
 */
export function calculateRSI(data: number[], period: number = 14): number[] {
  const rsi: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  for (let i = period - 1; i < gains.length; i++) {
    const avgGain = gains.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val, 0) / period;
    const avgLoss = losses.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val, 0) / period;

    const rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
    rsi.push(100 - (100 / (1 + rs)));
  }

  return rsi;
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 */
export function calculateMACD(
  data: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { macd: number[]; signal: number[]; histogram: number[] } {
  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);

  // Align the arrays
  const startIndex = slowPeriod - fastPeriod;
  const macdLine: number[] = [];

  for (let i = 0; i < fastEMA.length - startIndex; i++) {
    macdLine.push(fastEMA[i + startIndex] - slowEMA[i]);
  }

  const signalLine = calculateEMA(macdLine, signalPeriod);
  const histogram: number[] = [];

  for (let i = 0; i < signalLine.length; i++) {
    histogram.push(macdLine[i + signalPeriod - 1] - signalLine[i]);
  }

  return {
    macd: macdLine,
    signal: signalLine,
    histogram,
  };
}

/**
 * Calculate Bollinger Bands
 */
export function calculateBollingerBands(
  data: number[],
  period: number = 20,
  stdDev: number = 2
): { upper: number[]; middle: number[]; lower: number[] } {
  const sma = calculateSMA(data, period);
  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const mean = sma[i - period + 1];

    const variance = slice.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / period;
    const standardDeviation = Math.sqrt(variance);

    upper.push(mean + (standardDeviation * stdDev));
    lower.push(mean - (standardDeviation * stdDev));
  }

  return {
    upper,
    middle: sma,
    lower,
  };
}

/**
 * Calculate Stochastic Oscillator
 */
export function calculateStochastic(
  highs: number[],
  lows: number[],
  closes: number[],
  kPeriod: number = 14,
  dPeriod: number = 3
): { k: number[]; d: number[] } {
  const kValues: number[] = [];

  for (let i = kPeriod - 1; i < closes.length; i++) {
    const highestHigh = Math.max(...highs.slice(i - kPeriod + 1, i + 1));
    const lowestLow = Math.min(...lows.slice(i - kPeriod + 1, i + 1));

    const k = ((closes[i] - lowestLow) / (highestHigh - lowestLow)) * 100;
    kValues.push(k);
  }

  const dValues = calculateSMA(kValues, dPeriod);

  return {
    k: kValues,
    d: dValues,
  };
}

/**
 * Calculate Average True Range (ATR)
 */
export function calculateATR(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 14
): number[] {
  const trueRanges: number[] = [];

  for (let i = 1; i < highs.length; i++) {
    const tr1 = highs[i] - lows[i];
    const tr2 = Math.abs(highs[i] - closes[i - 1]);
    const tr3 = Math.abs(lows[i] - closes[i - 1]);

    trueRanges.push(Math.max(tr1, tr2, tr3));
  }

  return calculateSMA(trueRanges, period);
}

/**
 * Calculate all technical indicators for candlestick data
 */
export function calculateTechnicalIndicators(candlesticks: MarketDataTick[]): IndicatorData {
  if (candlesticks.length < 50) {
    throw new Error('Insufficient data for technical indicator calculation');
  }

  const closes = candlesticks.map(c => c.close);
  const highs = candlesticks.map(c => c.high);
  const lows = candlesticks.map(c => c.low);

  const latestIndex = candlesticks.length - 1;

  // Calculate indicators
  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, 50);
  const sma200 = calculateSMA(closes, 200);

  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const ema50 = calculateEMA(closes, 50);

  const rsi = calculateRSI(closes, 14);
  const macd = calculateMACD(closes);
  const bollingerBands = calculateBollingerBands(closes, 20, 2);
  const stochastic = calculateStochastic(highs, lows, closes, 14, 3);
  const atr = calculateATR(highs, lows, closes, 14);

  // Extract latest values
  const indicators: IndicatorData = {
    sma: {
      sma20: sma20[sma20.length - 1] || 0,
      sma50: sma50[sma50.length - 1] || 0,
      sma200: sma200[sma200.length - 1] || 0,
    },
    ema: {
      ema12: ema12[ema12.length - 1] || 0,
      ema26: ema26[ema26.length - 1] || 0,
      ema50: ema50[ema50.length - 1] || 0,
    },
    rsi: {
      rsi14: rsi[rsi.length - 1] || 50,
    },
    macd: {
      macd: macd.macd[macd.macd.length - 1] || 0,
      signal: macd.signal[macd.signal.length - 1] || 0,
      histogram: macd.histogram[macd.histogram.length - 1] || 0,
    },
    bollingerBands: {
      upper: bollingerBands.upper[bollingerBands.upper.length - 1] || 0,
      middle: bollingerBands.middle[bollingerBands.middle.length - 1] || 0,
      lower: bollingerBands.lower[bollingerBands.lower.length - 1] || 0,
      bandwidth: 0,
    },
    stochastic: {
      k: stochastic.k[stochastic.k.length - 1] || 50,
      d: stochastic.d[stochastic.d.length - 1] || 50,
    },
    atr: {
      atr14: atr[atr.length - 1] || 0,
    },
  };

  // Calculate derived indicators
  const bbMiddle = indicators.bollingerBands.middle;
  const bbBandwidth = bbMiddle > 0
    ? ((indicators.bollingerBands.upper - indicators.bollingerBands.lower) / bbMiddle) * 100
    : 0;
  indicators.bollingerBands.bandwidth = bbBandwidth;

  // Calculate Bollinger Band position (%B)
  const bbPercent = (indicators.bollingerBands.upper - indicators.bollingerBands.lower) > 0
    ? ((closes[latestIndex] - indicators.bollingerBands.lower) /
       (indicators.bollingerBands.upper - indicators.bollingerBands.lower)) * 100
    : 50;
  indicators.bollingerBands.percentB = bbPercent;

  return indicators;
}

/**
 * Calculate custom indicators
 */
export function calculateCustomIndicators(candlesticks: MarketDataTick[]): Record<string, number> {
  const closes = candlesticks.map(c => c.close);
  const volumes = candlesticks.map(c => c.volume);

  const latestIndex = candlesticks.length - 1;
  const currentPrice = closes[latestIndex];

  // Price momentum
  const momentum5 = closes.length > 5 ? (currentPrice - closes[latestIndex - 5]) / closes[latestIndex - 5] * 100 : 0;
  const momentum10 = closes.length > 10 ? (currentPrice - closes[latestIndex - 10]) / closes[latestIndex - 10] * 100 : 0;

  // Volume analysis
  const avgVolume20 = volumes.slice(-20).reduce((sum, vol) => sum + vol, 0) / Math.min(20, volumes.length);
  const volumeRatio = avgVolume20 > 0 ? volumes[latestIndex] / avgVolume20 : 1;

  // Price volatility (20-day standard deviation)
  const returns = [];
  for (let i = 1; i < Math.min(closes.length, 21); i++) {
    returns.push((closes[latestIndex - i + 1] - closes[latestIndex - i]) / closes[latestIndex - i]);
  }
  const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance) * Math.sqrt(252) * 100; // Annualized volatility

  // Support and resistance levels (simplified)
  const recentHighs = [];
  const recentLows = [];

  for (let i = Math.max(0, latestIndex - 20); i <= latestIndex; i++) {
    if (candlesticks[i].high > Math.max(...candlesticks.slice(Math.max(0, i - 5), i).map(c => c.high))) {
      recentHighs.push(candlesticks[i].high);
    }
    if (candlesticks[i].low < Math.min(...candlesticks.slice(Math.max(0, i - 5), i).map(c => c.low))) {
      recentLows.push(candlesticks[i].low);
    }
  }

  const nearestResistance = recentHighs.length > 0 ? Math.max(...recentHighs) : currentPrice * 1.1;
  const nearestSupport = recentLows.length > 0 ? Math.min(...recentLows) : currentPrice * 0.9;

  return {
    momentum5,
    momentum10,
    volumeRatio,
    volatility,
    nearestResistance,
    nearestSupport,
    supportDistance: ((currentPrice - nearestSupport) / currentPrice) * 100,
    resistanceDistance: ((nearestResistance - currentPrice) / currentPrice) * 100,
  };
}

/**
 * Get trading signals based on indicators
 */
export function getTradingSignals(indicators: IndicatorData): {
  trend: 'bullish' | 'bearish' | 'neutral';
  strength: 'strong' | 'moderate' | 'weak';
  signals: string[];
} {
  const signals: string[] = [];
  let bullishScore = 0;
  let bearishScore = 0;

  // SMA signals
  if (indicators.sma.sma20 > indicators.sma.sma50) {
    bullishScore++;
    signals.push('Price above 50-day SMA (bullish)');
  } else {
    bearishScore++;
    signals.push('Price below 50-day SMA (bearish)');
  }

  if (indicators.sma.sma50 > indicators.sma.sma200) {
    bullishScore++;
    signals.push('50-day SMA above 200-day SMA (bullish trend)');
  } else {
    bearishScore++;
    signals.push('50-day SMA below 200-day SMA (bearish trend)');
  }

  // EMA signals
  if (indicators.ema.ema12 > indicators.ema.ema26) {
    bullishScore++;
    signals.push('Fast EMA above slow EMA (bullish momentum)');
  } else {
    bearishScore++;
    signals.push('Fast EMA below slow EMA (bearish momentum)');
  }

  // RSI signals
  if (indicators.rsi.rsi14 < 30) {
    bullishScore++;
    signals.push('RSI oversold (bullish reversal potential)');
  } else if (indicators.rsi.rsi14 > 70) {
    bearishScore++;
    signals.push('RSI overbought (bearish reversal potential)');
  }

  // MACD signals
  if (indicators.macd.histogram > 0) {
    bullishScore++;
    signals.push('MACD histogram positive (bullish)');
  } else {
    bearishScore++;
    signals.push('MACD histogram negative (bearish)');
  }

  // Bollinger Bands signals
  const bbPercent = (indicators.bollingerBands as any).percentB || 50;
  if (bbPercent < 20) {
    bullishScore++;
    signals.push('Price below lower Bollinger Band (oversold)');
  } else if (bbPercent > 80) {
    bearishScore++;
    signals.push('Price above upper Bollinger Band (overbought)');
  }

  // Stochastic signals
  if (indicators.stochastic.k < 20 && indicators.stochastic.d < 20) {
    bullishScore++;
    signals.push('Stochastic oversold (bullish)');
  } else if (indicators.stochastic.k > 80 && indicators.stochastic.d > 80) {
    bearishScore++;
    signals.push('Stochastic overbought (bearish)');
  }

  // Determine overall trend and strength
  const scoreDiff = bullishScore - bearishScore;

  let trend: 'bullish' | 'bearish' | 'neutral';
  let strength: 'strong' | 'moderate' | 'weak';

  if (scoreDiff > 2) {
    trend = 'bullish';
    strength = scoreDiff >= 4 ? 'strong' : 'moderate';
  } else if (scoreDiff < -2) {
    trend = 'bearish';
    strength = scoreDiff <= -4 ? 'strong' : 'moderate';
  } else {
    trend = 'neutral';
    strength = 'weak';
  }

  return { trend, strength, signals };
}