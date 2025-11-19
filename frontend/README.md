# AutoTrade21 Frontend

A modern, AI-powered trading platform frontend built with Next.js 14, TypeScript, and Tailwind CSS.

## 🚀 Features

- **Real-time Trading Dashboard** - Live market data and portfolio management
- **AI-Powered Strategies** - Automated trading with machine learning
- **Advanced Charting** - Interactive charts with multiple indicators
- **Risk Management** - Sophisticated position sizing and stop-loss features
- **Responsive Design** - Optimized for desktop and mobile devices
- **Real-time Updates** - WebSocket integration for live data
- **Type Safety** - Full TypeScript implementation
- **Modern UI** - Beautiful, intuitive interface with shadcn/ui components

## 🛠 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand
- **Charts**: Lightweight Charts, Recharts
- **Real-time**: Socket.io
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Form Handling**: React Hook Form (planned)

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Redis (for session storage)
- PostgreSQL (optional, for SSR)

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/autotrade21/frontend.git
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local` with your configuration:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3000/api
   NEXT_PUBLIC_WS_URL=ws://localhost:3001
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
frontend/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Authentication routes
│   │   ├── login/
│   │   ├── register/
│   │   └── forgot-password/
│   ├── (dashboard)/              # Protected dashboard routes
│   │   ├── dashboard/
│   │   └── settings/
│   ├── api/                      # API routes
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Landing page
├── components/                   # React components
│   ├── ui/                       # Reusable UI components
│   ├── layout/                   # Layout components
│   └── dashboard/                # Dashboard-specific components
├── lib/                          # Utilities and configurations
│   ├── api.ts                    # API client
│   ├── store.ts                  # Zustand stores
│   ├── utils.ts                  # Utility functions
│   └── websocket.ts              # WebSocket service
├── types/                        # TypeScript type definitions
├── public/                       # Static assets
└── package.json
```

## 🔧 Configuration

### Environment Variables

Key environment variables:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# Authentication
NEXTAUTH_SECRET=your-jwt-secret

# Trading APIs
BINANCE_API_KEY=your-binance-key
BINANCE_SECRET_KEY=your-binance-secret

# Market Data
ALPHA_VANTAGE_API_KEY=your-alpha-vantage-key
```

### API Integration

The app integrates with several backend services:

- **Authentication Service** - JWT-based auth with 2FA
- **Market Data Service** - Real-time price feeds
- **Trading Service** - Order execution and management
- **AI/ML Service** - Strategy signals and predictions
- **Wallet Service** - Portfolio and balance management

## 📊 Components

### Dashboard

- **TradingChart** - Interactive price charts with multiple timeframes
- **TradingInterface** - Order placement and position management
- **PortfolioOverview** - Asset allocation and performance metrics
- **AIStrategies** - Strategy management and performance tracking
- **MarketData** - Real-time market data and watchlists
- **RecentTransactions** - Transaction history and P&L tracking

### Layout

- **Header** - Navigation, search, notifications, user menu
- **Sidebar** - Role-based navigation menu
- **Card**, **Button**, **Dropdown** - Reusable UI components

## 🔌 API Integration

### WebSocket Connection

Real-time data is handled through WebSocket connections:

```typescript
import { useWebSocket } from '@/lib/websocket';

const { subscribeToSymbol, placeOrder } = useWebSocket();

// Subscribe to real-time updates
subscribeToSymbol('BTC/USDT');

// Place a trade
await placeOrder({
  symbol: 'BTC/USDT',
  type: 'market',
  side: 'buy',
  amount: 0.1
});
```

### State Management

Zustand stores manage application state:

```typescript
import { useTradingStore } from '@/lib/store';

const {
  portfolio,
  activePositions,
  selectedSymbol,
  updatePortfolio,
  placeOrder
} = useTradingStore();
```

## 🎨 Styling

The app uses Tailwind CSS with custom design tokens:

- **Colors**: Blue/Purple gradient theme
- **Spacing**: Consistent 8px grid system
- **Typography**: Inter font family
- **Components**: shadcn/ui design system

## 🔒 Security

- **JWT Authentication** - Secure token-based auth
- **CSRF Protection** - Built-in Next.js security
- **XSS Prevention** - Input sanitization and CSP
- **Rate Limiting** - API request throttling
- **HTTPS Enforcement** - Production SSL/TLS

## 📱 Responsive Design

- **Mobile First** - Optimized for touch devices
- **Breakpoints**: sm (640px), md (768px), lg (1024px), xl (1280px)
- **Adaptive Layout** - Sidebar collapses on mobile
- **Touch Gestures** - Swipe navigation support

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

### Environment Setup

1. **Vercel** (Recommended)
   ```bash
   npm i -g vercel
   vercel
   ```

2. **Docker**
   ```bash
   docker build -t autotrade21-frontend .
   docker run -p 3000:3000 autotrade21-frontend
   ```

3. **Static Export**
   ```bash
   npm run build
   npm run export
   ```

### Environment Variables for Production

```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.autotrade21.com
NEXT_PUBLIC_WS_URL=wss://ws.autotrade21.com
NEXTAUTH_URL=https://autotrade21.com
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Test coverage
npm run test:coverage
```

## 📈 Performance

- **Bundle Size**: Optimized with Next.js automatic code splitting
- **Image Optimization**: Next.js Image component with lazy loading
- **Caching**: Static asset caching and API response caching
- **Web Vitals**: Core Web Vitals monitoring included

## 🔧 Development

### Code Quality

```bash
# Linting
npm run lint

# Type checking
npm run type-check

# Formatting
npm run format

# Pre-commit hooks
npm run prepare
```

### Adding New Features

1. Create feature branch: `git checkout -b feature/new-feature`
2. Add components to `components/` directory
3. Add types to `types/` directory
4. Update state in `lib/store.ts`
5. Add tests in `__tests__/` directory
6. Submit pull request

## 📚 Documentation

- **API Documentation**: `/api/docs`
- **Component Storybook**: `/storybook` (planned)
- **Architecture Guide**: `/docs/architecture.md`
- **Contributing Guide**: `/docs/contributing.md`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs.autotrade21.com](https://docs.autotrade21.com)
- **Support Email**: support@autotrade21.com
- **Discord**: [discord.gg/autotrade21](https://discord.gg/autotrade21)
- **GitHub Issues**: [Report issues](https://github.com/autotrade21/frontend/issues)

## 🗺 Roadmap

- [ ] Advanced charting tools
- [ ] Mobile app (React Native)
- [ ] Strategy marketplace
- [ ] Social trading features
- [ ] Advanced analytics dashboard
- [ ] Multi-language support

## 📊 Analytics

- **Google Analytics**: User behavior tracking
- **Sentry**: Error monitoring and performance
- **Hotjar**: User session recordings
- **Mixpanel**: Feature usage analytics

---

Built with ❤️ by the AutoTrade21 team