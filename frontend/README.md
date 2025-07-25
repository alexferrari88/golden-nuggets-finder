# Golden Nuggets Dashboard Frontend

A comprehensive monitoring and management dashboard for the Golden Nuggets content optimization system. This React-based web application provides real-time insights into feedback processing, system health, cost analytics, and optimization operations.

## 🎯 Overview

The Golden Nuggets Dashboard is designed to monitor and manage an AI-powered content optimization system that:
- Processes user feedback on content nuggets
- Uses DSPy for prompt optimization 
- Integrates with Google Gemini API
- Tracks costs and performance metrics
- Manages feedback queues and processing workflows

## ✨ Key Features

### 📊 **Real-time Dashboard**
- Live system health monitoring
- Pending feedback queue management  
- Active optimization tracking
- Performance metrics and alerts

### 📈 **Analytics & Reporting**
- Cost analysis with daily breakdowns
- Historical performance trends
- API usage and token consumption tracking
- Success rate monitoring

### ⚡ **Operations Management**
- Real-time optimization progress tracking
- Manual optimization triggers
- Feedback queue processing
- System health diagnostics

### 📋 **Feedback Management**
- Comprehensive feedback queue table
- Nugget and missing content feedback tracking
- Usage statistics and processing history
- Advanced filtering and search

## 🛠️ Tech Stack

### Core Framework
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server

### UI & Styling
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality React component library
- **Radix UI** - Headless UI primitives
- **Lucide React** - Icon library

### State & Data Management
- **TanStack Query** - Server state management and caching
- **Zustand** - Client state management
- **Axios** - HTTP client with retry logic

### Charts & Visualization
- **Recharts** - Data visualization library

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and pnpm
- Backend API running (defaults to `http://localhost:7532`)

### Installation

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Environment Configuration**
   Create a `.env.local` file (optional):
   ```env
   VITE_API_BASE_URL=http://localhost:7532
   ```

3. **Start development server**
   ```bash
   pnpm dev
   ```

   The dashboard will be available at `http://localhost:5173`

### Available Scripts

- `pnpm dev` - Start development server with hot reloading
- `pnpm build` - Build for production (runs TypeScript check first)  
- `pnpm preview` - Preview production build
- `pnpm lint` - Run ESLint

## 📁 Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── analytics/       # Cost and performance analytics
│   ├── common/          # Shared utility components
│   ├── dashboard/       # Dashboard-specific widgets  
│   ├── export/          # Data export functionality
│   ├── feedback/        # Feedback management components
│   ├── layout/          # Layout and responsive containers
│   ├── operations/      # Operations progress tracking
│   └── ui/              # shadcn/ui components
├── hooks/               # Custom React hooks (currently empty)
├── lib/                 # Utilities and configurations
│   ├── api.ts          # API client with retry logic
│   ├── queryClient.ts  # TanStack Query configuration
│   └── utils.ts        # Utility functions
├── pages/               # Application pages
│   └── Dashboard.tsx   # Main dashboard page
└── types/               # TypeScript type definitions
    └── index.ts        # API response types
```

## 🔧 Key Components

### Dashboard Overview
- **SystemHealthWidget** - Real-time system status monitoring
- **QuickActionsPanel** - Manual control buttons for operations
- **OperationsProgress** - Live optimization tracking with logs

### Feedback Management  
- **FeedbackQueueTable** - Comprehensive feedback queue with filtering
- **BulkDeleteFeedbackDialog** - Batch deletion of multiple feedback items
- **DeleteFeedbackDialog** - Individual feedback item deletion
- **EditFeedbackDialog** - Edit feedback content and metadata
- **AdvancedFilters** - Advanced filtering and search capabilities
- Supports both nugget feedback and missing content feedback
- Real-time updates with configurable refresh intervals

### Data Export
- **DataExporter** - Export feedback and analytics data to various formats

### Analytics
- **CostAnalytics** - Financial tracking with daily breakdowns
- **HistoricalViews** - Performance trends and success rates
- Interactive charts with cost per mode analysis

## 🔄 Data Flow

1. **Dashboard loads** → Fetches system stats and health status
2. **Real-time updates** → Components auto-refresh using configurable intervals  
3. **User interactions** → Quick actions trigger backend operations
4. **Live monitoring** → Progress tracking updates in real-time
5. **Analytics** → Cost and performance data visualization

## 🌐 API Integration

The frontend communicates with the backend through a robust API client featuring:
- **Automatic retry logic** with exponential backoff
- **Error handling** with user-friendly messages  
- **Request timeout** management (15s default)
- **Response caching** via TanStack Query

### Key API Endpoints
- `/monitor/health` - System health status
- `/dashboard/stats` - Dashboard statistics
- `/feedback/pending` - Pending feedback queue
- `/optimization/*` - Operations and progress tracking
- `/costs/*` - Financial analytics and reporting

## 🎨 Design System

Built with a Notion-inspired minimalistic design featuring:
- Clean, consistent typography
- Subtle shadows and rounded corners
- Responsive grid layouts
- Status indicators with emoji icons
- Professional color palette

## 📱 Responsive Design

Fully responsive design optimized for:
- **Desktop** - Full dashboard experience with multi-column layouts
- **Tablet** - Adaptive layouts with collapsible sections
- **Mobile** - Optimized navigation with icon-based tabs

## 🔒 Error Handling

Comprehensive error handling includes:
- Network error detection and retry logic
- User-friendly error messages
- Graceful fallbacks for failed requests
- Loading states and skeleton screens

## 🧪 Development Tips

- **Hot Reloading** - Changes reflect immediately during development
- **TypeScript** - Full type safety with comprehensive type definitions
- **Component Library** - Use shadcn/ui components for consistency
- **API Mocking** - Backend must be running for full functionality

## 📊 Performance Features

- **Optimized Re-renders** - Smart component updates with React Query
- **Configurable Refresh** - Adjustable polling intervals per component
- **Request Deduplication** - Automatic caching prevents duplicate API calls
- **Progressive Loading** - Skeleton states during data fetching

---

For backend setup and API documentation, see the main project README or backend directory documentation.