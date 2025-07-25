# Frontend CLAUDE.md

This file provides guidance for working with the React-based monitoring dashboard frontend for the Golden Nuggets system.

## Overview

The frontend is a React-based monitoring dashboard that provides real-time oversight of the Golden Nuggets prompt optimization system. It offers comprehensive feedback management, operations tracking, cost analytics, and system health monitoring.

## Architecture

### Core Technologies
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite with hot module replacement
- **Styling**: Tailwind CSS with shadcn/ui components
- **Data Fetching**: TanStack Query (React Query) with automated caching and retries
- **State Management**: Zustand for client-side state
- **HTTP Client**: Axios with enhanced error handling and retry logic
- **Charts**: Recharts for analytics visualization
- **Icons**: Lucide React

### Development Commands
- `pnpm dev` - Start development server with hot reloading
- `pnpm build` - Build for production (TypeScript compilation + Vite build)
- `pnpm lint` - Run ESLint
- `pnpm preview` - Preview production build locally

## Key Features

### 1. Real-Time Dashboard (`src/pages/Dashboard.tsx`)
- **System Health**: Live monitoring of backend components (DSPy, Gemini API, database)
- **Statistics Overview**: Total feedback items, pending queue status, active operations
- **Tabbed Interface**: Overview, Feedback Queue, Operations, Analytics
- **Auto-refresh**: Configurable refresh intervals (3-10 seconds) for real-time updates

### 2. Feedback Management
- **Queue Management**: View, filter, and manage pending feedback items
- **CRUD Operations**: Edit feedback content, update ratings, bulk delete operations
- **Feedback Types**: Supports both nugget feedback and missing content feedback
- **Usage Tracking**: Monitor feedback item usage counts and processing status

### 3. Operations Monitoring
- **Live Progress**: Real-time optimization progress tracking with step-by-step updates
- **Historical Runs**: View completed optimization runs with success rates and performance metrics
- **Quick Actions**: Manual optimization triggers and system controls

### 4. Cost Analytics
- **Cost Tracking**: Monitor API costs, token usage, and optimization expenses
- **Trend Analysis**: Historical cost breakdown and performance trends
- **Financial Reporting**: Daily, monthly cost summaries with visual charts

## File Structure

```
src/
├── components/
│   ├── analytics/          # Cost analytics and historical performance
│   │   ├── CostAnalytics.tsx
│   │   └── HistoricalViews.tsx
│   ├── common/             # Shared components
│   │   └── AdvancedFilters.tsx
│   ├── dashboard/          # Dashboard-specific widgets
│   │   ├── QuickActionsPanel.tsx
│   │   └── SystemHealthWidget.tsx
│   ├── export/             # Data export functionality
│   │   └── DataExporter.tsx
│   ├── feedback/           # Feedback management components
│   │   ├── BulkDeleteFeedbackDialog.tsx
│   │   ├── DeleteFeedbackDialog.tsx
│   │   ├── EditFeedbackDialog.tsx
│   │   └── FeedbackQueueTable.tsx
│   ├── layout/             # Layout and responsive utilities
│   │   ├── Layout.tsx
│   │   └── ResponsiveContainer.tsx
│   ├── operations/         # Operations monitoring
│   │   └── OperationsProgress.tsx
│   └── ui/                 # shadcn/ui components
│       ├── alert.tsx
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       ├── progress.tsx
│       ├── select.tsx
│       ├── sheet.tsx
│       ├── table.tsx
│       └── tabs.tsx
├── hooks/                  # Custom React hooks
├── lib/                    # Core utilities
│   ├── api.ts             # API client with retry logic
│   ├── queryClient.ts     # TanStack Query configuration
│   └── utils.ts           # Utility functions
├── pages/                  # Page components
│   └── Dashboard.tsx      # Main dashboard page
└── types/                  # TypeScript type definitions
    └── index.ts           # Core types and interfaces
```

## API Integration

### Backend Communication
The frontend communicates with the backend via a robust API client (`src/lib/api.ts`) that includes:

- **Error Handling**: Comprehensive error categorization and user-friendly messages
- **Retry Logic**: Automatic retries for network failures and server errors
- **Type Safety**: Full TypeScript integration with backend API schemas
- **Caching**: TanStack Query integration for optimal data fetching

### Key API Endpoints
- `/monitor/health` - System health monitoring
- `/dashboard/stats` - Dashboard statistics
- `/feedback/*` - Feedback management operations
- `/optimization/*` - Operations and progress tracking
- `/costs/*` - Cost analytics and reporting
- `/export/*` - Data export functionality

### Environment Configuration
- `VITE_API_BASE_URL` - Backend API URL (defaults to `http://localhost:7532`)

## Component Guidelines

### Data Fetching Pattern
```typescript
// Use TanStack Query for all API calls
const { data, isLoading, error } = useQuery({
  queryKey: ['key'],
  queryFn: () => apiClient.getData(),
  refetchInterval: 5000, // Auto-refresh
  staleTime: 2000,
});
```

### Error Handling
```typescript
// API errors are typed and include retry information
if (error) {
  return (
    <Alert variant="destructive">
      <AlertDescription>{error.message}</AlertDescription>
    </Alert>
  );
}
```

### Responsive Design
- Use `ResponsiveContainer` and `ResponsiveStack` for consistent responsive behavior
- Mobile-first approach with Tailwind responsive classes
- Tab content adapts to screen size with emoji fallbacks

## Testing Strategy

### Unit Testing (Vitest)
- Test component logic and user interactions
- Mock API calls and test error states
- Snapshot testing for UI consistency

### Integration Testing
- Test API integration with mock backends
- Verify data flow between components
- Test responsive behavior at different screen sizes

## Performance Considerations

### Optimization Techniques
- **Query Caching**: TanStack Query caches API responses automatically
- **Stale While Revalidate**: Background updates keep data fresh
- **Lazy Loading**: Components load on demand
- **Debounced Inputs**: Prevent excessive API calls during user input

### Real-Time Updates
- Configurable refresh intervals based on data criticality
- Automatic pause/resume based on tab visibility
- Efficient re-rendering with React Query's selector system

## Development Guidelines

### Code Style
- Follow existing TypeScript patterns
- Use functional components with hooks
- Maintain consistent import organization
- Use shadcn/ui components for consistency

### State Management
- Use TanStack Query for server state
- Use Zustand for client-side state when needed
- Avoid prop drilling with context when appropriate

### Error Boundaries
- Implement error boundaries for robust error handling
- Provide fallback UI for component failures
- Log errors for debugging and monitoring

## Deployment

### Build Process
1. TypeScript compilation with type checking
2. Vite bundling with optimization
3. Static asset optimization
4. Bundle analysis for performance monitoring

### Environment Variables
- Development: `.env.local`
- Production: Set `VITE_API_BASE_URL` to backend URL

## Common Development Tasks

### Adding New Components
1. Create component in appropriate directory
2. Export from index files for clean imports
3. Add TypeScript types in `src/types/index.ts`
4. Write unit tests for component logic

### API Integration
1. Add new endpoint to `src/lib/api.ts`
2. Define TypeScript types for request/response
3. Create TanStack Query hook in component
4. Handle loading and error states

### Styling
- Use Tailwind classes consistently
- Leverage shadcn/ui components
- Maintain responsive design principles
- Follow existing color and spacing patterns