import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AutoTrade21 - AI Trading Platform',
  description: 'Professional AI-powered trading platform with real-time market analysis, automated trading strategies, and advanced risk management.',
  keywords: 'AI trading, algorithmic trading, cryptocurrency, forex, stocks, automated trading, trading platform',
  authors: [{ name: 'AutoTrade21 Team' }],
  creator: 'AutoTrade21',
  publisher: 'AutoTrade21',
  format: 'wide',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://autotrade21.com',
    title: 'AutoTrade21 - AI Trading Platform',
    description: 'Professional AI-powered trading platform with real-time market analysis, automated trading strategies, and advanced risk management.',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AutoTrade21 - AI Trading Platform',
    description: 'Professional AI-powered trading platform with real-time market analysis, automated trading strategies, and advanced risk management.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}