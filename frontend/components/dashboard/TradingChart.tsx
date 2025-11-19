import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, Time, CandlestickData } from 'lightweight-charts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTradingStore } from '@/lib/store';
import {
  LineChart,
  Candlestick,
  BarChart3,
  Settings,
  Download,
  Maximize2
} from 'lucide-react';

interface ChartDataPoint {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

type ChartType = 'candlestick' | 'line' | 'area';
type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

export function TradingChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | ISeriesApi<'Area'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const [isLoading, setIsLoading] = useState(false);

  const { selectedSymbol, marketData, updateSelectedSymbol } = useTradingStore();

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Initialize chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { color: 'transparent' },
        textColor: '#6b7280',
      },
      grid: {
        vertLines: { color: '#374151' },
        horzLines: { color: '#374151' },
      },
      crosshair: {
        mode: 0,
      },
      rightPriceScale: {
        borderColor: '#374151',
      },
      timeScale: {
        borderColor: '#374151',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // Add volume series
    const volumeSeries = chart.addHistogramSeries({
      color: '#505050',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    chartRef.current = chart;
    volumeSeriesRef.current = volumeSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current) return;

    // Remove existing series
    if (seriesRef.current) {
      chartRef.current.removeSeries(seriesRef.current);
    }

    // Create new series based on chart type
    let series: ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | ISeriesApi<'Area'>;

    switch (chartType) {
      case 'candlestick':
        series = chartRef.current.addCandlestickSeries({
          upColor: '#10b981',
          downColor: '#ef4444',
          borderUpColor: '#10b981',
          borderDownColor: '#ef4444',
          wickUpColor: '#10b981',
          wickDownColor: '#ef4444',
        });
        break;
      case 'line':
        series = chartRef.current.addLineSeries({
          color: '#3b82f6',
          lineWidth: 2,
        });
        break;
      case 'area':
        series = chartRef.current.addAreaSeries({
          topColor: 'rgba(59, 130, 246, 0.3)',
          bottomColor: 'rgba(59, 130, 246, 0.0)',
          lineColor: '#3b82f6',
          lineWidth: 2,
        });
        break;
    }

    seriesRef.current = series;

    // Load data
    loadChartData();
  }, [chartType, timeframe, selectedSymbol]);

  const loadChartData = async () => {
    if (!seriesRef.current || !selectedSymbol) return;

    setIsLoading(true);
    try {
      // Mock data - in real app, fetch from API
      const mockData: ChartDataPoint[] = generateMockData(selectedSymbol, timeframe);

      if (chartType === 'candlestick') {
        (seriesRef.current as ISeriesApi<'Candlestick'>).setData(mockData as CandlestickData[]);
      } else {
        const lineData = mockData.map(d => ({
          time: d.time,
          value: d.close
        }));
        (seriesRef.current as ISeriesApi<'Line'>).setData(lineData);
      }

      // Set volume data
      if (volumeSeriesRef.current) {
        const volumeData = mockData.map(d => ({
          time: d.time,
          value: d.volume || 0,
          color: d.close >= d.open ? '#10b981' : '#ef4444'
        }));
        volumeSeriesRef.current.setData(volumeData);
      }

    } catch (error) {
      console.error('Failed to load chart data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockData = (symbol: string, tf: Timeframe): ChartDataPoint[] => {
    const data: ChartDataPoint[] = [];
    const now = Date.now();
    const intervals = {
      '1m': 60000,
      '5m': 300000,
      '15m': 900000,
      '1h': 3600000,
      '4h': 14400000,
      '1d': 86400000
    };

    const interval = intervals[tf];
    const points = 200;

    let lastPrice = 100 + Math.random() * 900;

    for (let i = points; i >= 0; i--) {
      const time = Math.floor((now - i * interval) / 1000);
      const volatility = 0.01 + Math.random() * 0.02;
      const change = (Math.random() - 0.5) * volatility * lastPrice;

      const open = lastPrice;
      const close = Math.max(1, open + change);
      const high = Math.max(open, close) + Math.random() * volatility * lastPrice;
      const low = Math.min(open, close) - Math.random() * volatility * lastPrice;
      const volume = Math.floor(100000 + Math.random() * 900000);

      data.push({
        time,
        open,
        high,
        low,
        close,
        volume
      });

      lastPrice = close;
    }

    return data;
  };

  const timeframes: { value: Timeframe; label: string }[] = [
    { value: '1m', label: '1m' },
    { value: '5m', label: '5m' },
    { value: '15m', label: '15m' },
    { value: '1h', label: '1h' },
    { value: '4h', label: '4h' },
    { value: '1d', label: '1d' },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <CardTitle>Trading Chart</CardTitle>
            <select
              value={selectedSymbol}
              onChange={(e) => updateSelectedSymbol(e.target.value)}
              className="px-3 py-1 border rounded-md text-sm bg-background"
            >
              <option value="BTC/USDT">BTC/USDT</option>
              <option value="ETH/USDT">ETH/USDT</option>
              <option value="AAPL">AAPL</option>
              <option value="GOOGL">GOOGL</option>
              <option value="TSLA">TSLA</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            {/* Chart Type Selector */}
            <div className="flex items-center border rounded-md">
              <Button
                variant={chartType === 'candlestick' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-r-none"
                onClick={() => setChartType('candlestick')}
              >
                <Candlestick className="h-4 w-4" />
              </Button>
              <Button
                variant={chartType === 'line' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none border-l border-r"
                onClick={() => setChartType('line')}
              >
                <LineChart className="h-4 w-4" />
              </Button>
              <Button
                variant={chartType === 'area' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-l-none"
                onClick={() => setChartType('area')}
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
            </div>

            {/* Timeframe Selector */}
            <div className="flex items-center border rounded-md">
              {timeframes.map((tf) => (
                <Button
                  key={tf.value}
                  variant={timeframe === tf.value ? 'default' : 'ghost'}
                  size="sm"
                  className={`${
                    tf.value === '1d' ? 'rounded-r-none' :
                    tf.value === '1m' ? 'rounded-l-none' :
                    'rounded-none border-l border-r'
                  }`}
                  onClick={() => setTimeframe(tf.value)}
                >
                  {tf.label}
                </Button>
              ))}
            </div>

            {/* Action Buttons */}
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
            <div className="text-sm text-muted-foreground">Loading chart data...</div>
          </div>
        )}
        <div ref={chartContainerRef} className="w-full" style={{ height: '400px' }} />
      </CardContent>
    </Card>
  );
}