# Frontend-Backend Sync Implementation Plan

## Overview

Synchronize the frontend dashboard with advanced backend capabilities that have evolved over ~1 month of development. The backend now includes sophisticated multi-provider ensemble features, session-based feedback attribution, Chrome extension integration, and enhanced analytics that are not reflected in the current frontend interface.

## Current State Analysis

### Backend Capabilities (Advanced, September 2024)
- **Multi-Provider Ensemble System**: Provider-specific DSPy optimization with attribution tracking
- **Session-Based Feedback Attribution**: Feedback grouped by analysis sessions with `feedback_session_id`
- **Chrome Extension Integration**: Full prompt optimization lifecycle management
- **Enhanced Cost Tracking**: DSPy-native cost tracking with accuracy indicators
- **Advanced Progress Monitoring**: Phase-specific tracking with activity timelines
- **8+ New API Endpoints**: Missing from frontend integration

### Frontend Status (August 2024, ~1 Month Behind)
- **Solid Foundation**: 20+ API endpoints integrated, good component architecture
- **Proven Patterns**: Polling-based updates, proper error handling, typed API client
- **Missing Features**: Multi-provider ensemble UI, session tracking, Chrome extension management
- **Gap**: Advanced analytics, provider-specific breakdowns, detailed progress phases

### Key Discoveries:
- Backend provides sophisticated multi-provider optimization at `backend/app/services/dspy_multi_model_manager.py:208`
- Session tracking schema implemented in `backend/migrations/005_feedback_sessions.sql:36`
- Chrome extension prompt management at `backend/app/main.py:621-673`
- Enhanced cost tracking service at `backend/app/services/improved_cost_tracking_service.py:298`
- Frontend has strong React Query integration pattern in `frontend/src/lib/queryClient.ts`

## Desired End State

After this implementation, the frontend dashboard will:

### Multi-Provider Ensemble Interface
- **Provider Selection Grid**: Enable/disable individual providers with real-time status
- **Ensemble Mode Toggle**: Switch between single-model and multi-provider modes
- **Attribution Visualization**: Show consensus and contributing providers for optimization results
- **Cost Transparency**: Display provider-specific costs and ensemble cost multipliers

### Session-Based Feedback Management  
- **Session Grouping**: Group feedback by analysis sessions with session timeline
- **Attribution Source Tracking**: Distinguish between manual and automated feedback collection
- **Session Analytics**: Visualize feedback patterns across sessions with provider correlation

### Advanced Analytics Dashboard
- **Phase-Specific Progress**: Detailed optimization phase tracking with duration metrics
- **Activity Timeline**: Cross-optimization activity history with provider performance
- **Cost Accuracy Indicators**: DSPy-native cost tracking with confidence percentages
- **Provider Performance Comparison**: Detailed analytics comparing provider effectiveness

### Chrome Extension Integration
- **Prompt Optimization Interface**: Manage Chrome extension prompts with optimization status
- **Optimization Mapping**: Connect prompts to optimization runs with version tracking
- **Extension Health Monitoring**: Chrome extension status with prompt usage analytics

### Verification Criteria:
1. All 8+ new backend endpoints integrated and working
2. Multi-provider ensemble workflow functional from UI
3. Session-based feedback grouping operational
4. Chrome extension prompt optimization accessible
5. Enhanced cost tracking with accuracy indicators displayed
6. Real-time progress monitoring with phase tracking
7. Provider-specific analytics and comparisons available

## What We're NOT Doing

To prevent scope creep, explicitly out of scope:

1. **WebSocket Integration**: Continue using proven polling patterns, not implementing WebSockets
2. **Backend API Changes**: Only frontend changes, no backend modifications required  
3. **Authentication System**: No user authentication between frontend and backend
4. **Mobile Responsive Design**: Focus on desktop dashboard, mobile optimization separate
5. **Internationalization**: English-only interface for this implementation
6. **Real-Time Collaboration**: Single-user dashboard experience
7. **Historical Data Migration**: Work with current database schema, no data migrations
8. **New AI Provider Integration**: Use existing provider set (Gemini, OpenAI, Anthropic, OpenRouter)

## Implementation Approach

### Technical Strategy
- **Incremental Enhancement**: Build on existing React Query and component patterns
- **Backward Compatibility**: Maintain all current functionality while adding new features
- **Type-First Development**: Add TypeScript types before implementing UI components
- **Component Enhancement**: Extend existing components rather than creating parallel systems
- **Polling-Based Updates**: Continue proven polling pattern for real-time data

### Integration Philosophy
- **Preserve Patterns**: Follow existing API client structure and error handling
- **Enhance Components**: Extend current dashboard components with new capabilities
- **Maintain Performance**: Use React Query caching and optimistic updates
- **Consistent UX**: Match existing design system and interaction patterns

---

## Phase 1: Foundation Enhancement

### Overview
Establish the foundation for advanced backend integration by updating types, API client, and core data models to support multi-provider ensemble, session tracking, and Chrome extension features.

### Changes Required:

#### 1. Type System Enhancement
**File**: `frontend/src/types/index.ts`
**Changes**: Add missing TypeScript interfaces for new backend capabilities

```typescript
// Session Tracking Types
export interface FeedbackSession {
  feedback_session_id: string
  attribution_source: 'manual' | 'ensemble' | 'chrome_extension'
  created_at: string
  provider_context: {
    providers_used: string[]
    ensemble_mode: boolean
  }
}

// Multi-Provider Ensemble Types
export interface EnsembleConfiguration {
  mode: 'single-model' | 'multi-provider'
  enabled_providers: ProviderId[]
  default_runs: number
  provider_configurations: ProviderConfiguration[]
}

export interface ProviderConfiguration {
  provider_id: ProviderId
  model_id: string
  enabled: boolean
  cost_weight?: number
}

// Chrome Extension Integration Types
export interface ChromeExtensionPrompt {
  id: string
  prompt_name: string
  full_prompt_content: string
  optimization_status: 'pending' | 'optimized' | 'failed'
  last_optimized: string | null
  version: number
}

// Enhanced Cost Tracking Types
export interface CostBreakdown {
  operation_type: string
  cost_accuracy: number
  provider_costs: ProviderCost[]
  dspy_metadata: {
    total_tokens: number
    input_tokens: number
    output_tokens: number
    accuracy_method: string
  }
}

export interface ProviderCost {
  provider_id: ProviderId
  model_name: string
  cost: number
  accuracy: number
  tokens_used: number
}

// Enhanced Progress Tracking Types
export interface DetailedProgress {
  run_id: string
  phase: 'initialization' | 'data_gathering' | 'optimization' | 'storing' | 'completed' | 'failed'
  phase_progress: number
  phase_duration: number
  total_phases: number
  activity_timeline: ProgressActivity[]
}

export interface ProgressActivity {
  timestamp: string
  phase: string
  message: string
  provider_id?: ProviderId
}
```

#### 2. API Client Integration  
**File**: `frontend/src/lib/api.ts`
**Changes**: Add 8+ missing endpoint methods using existing patterns

```typescript
// Chrome Extension Prompt Management
getChromePrompts: (): Promise<ChromeExtensionPrompt[]> =>
  makeRequest<ChromeExtensionPrompt[]>({
    method: "GET",
    url: "/chrome-prompts",
  }),

createChromePrompt: (prompt: { prompt_name: string; full_prompt_content: string }): Promise<ChromeExtensionPrompt> =>
  makeRequest<ChromeExtensionPrompt>({
    method: "POST",
    url: "/chrome-prompts",
    data: prompt,
  }),

optimizeChromePrompt: (promptId: string, config: EnsembleConfiguration): Promise<OptimizationRun> =>
  makeRequest<OptimizationRun>({
    method: "POST",
    url: `/optimize/chrome-prompt/${promptId}`,
    data: config,
  }),

// Enhanced Progress and Cost Tracking
getOptimizationProgress: (runId: string): Promise<DetailedProgress> =>
  makeRequest<DetailedProgress>({
    method: "GET",
    url: `/optimization/${runId}/progress`,
  }),

getOptimizationCosts: (runId: string): Promise<CostBreakdown> =>
  makeRequest<CostBreakdown>({
    method: "GET",
    url: `/optimization/${runId}/costs`,
  }),

// Duplicate Analysis
getDuplicateFeedback: (): Promise<DuplicateAnalysisReport> =>
  makeRequest<DuplicateAnalysisReport>({
    method: "GET",
    url: "/feedback/duplicates",
  }),

// Feedback Usage Statistics  
getFeedbackUsageStats: (): Promise<FeedbackUsageStats> =>
  makeRequest<FeedbackUsageStats>({
    method: "GET",
    url: "/feedback/usage/stats",
  }),

// Recent Activity Timeline
getRecentActivity: (): Promise<ProgressActivity[]> =>
  makeRequest<ProgressActivity[]>({
    method: "GET",
    url: "/activity/recent",
  }),
```

#### 3. Enhanced Dashboard Statistics
**File**: `frontend/src/components/dashboard/SystemHealthWidget.tsx`
**Changes**: Add provider-specific health checks and Chrome extension status

```typescript
// Add provider health tracking
const { data: health } = useQuery<SystemHealth, ApiError>({
  queryKey: ["system-health"],
  queryFn: apiClient.getSystemHealth,
  refetchInterval: 5000,
})

// Enhance health display with provider details
{health?.providers?.map(provider => (
  <div key={provider.id} className="flex items-center gap-2">
    <div className={`h-2 w-2 rounded-full ${
      provider.healthy ? 'bg-green-500' : 'bg-red-500'
    }`} />
    <span className="text-sm">{provider.name}: {provider.status}</span>
  </div>
))}

// Add Chrome extension prompt status
{health?.chrome_extension && (
  <div className="mt-2 text-sm text-gray-600">
    Active Prompts: {health.chrome_extension.active_prompts}
  </div>
)}
```

### Success Criteria

#### Automated Verification
- [x] TypeScript compilation passes: `cd frontend && npm run type-check`
- [x] No linting errors: `cd frontend && npm run lint`  
- [x] Updated API client methods return proper types
- [x] All existing queries continue to work without modification
- [x] Backend health endpoint returns provider details

#### Manual Verification  
- [x] Dashboard loads without errors after type additions
- [x] System health widget shows provider-specific status
- [x] API client properly handles new endpoint responses
- [x] No runtime type errors in browser console
- [x] Enhanced types appear in IDE autocomplete

---

## Phase 2: Multi-Provider Ensemble Integration

### Overview
Implement the multi-provider ensemble interface with provider selection, attribution tracking, and ensemble mode management, building on the foundation types and API methods from Phase 1.

### Changes Required:

#### 1. Ensemble Configuration Component
**File**: `frontend/src/components/ensemble/EnsembleConfigurationPanel.tsx` (new file)
**Changes**: Create ensemble mode selection and provider management interface

```typescript
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Switch } from '../ui/switch'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { apiClient } from '../../lib/api'
import { EnsembleConfiguration, ProviderId } from '../../types'

export const EnsembleConfigurationPanel: React.FC = () => {
  const [config, setConfig] = useState<EnsembleConfiguration>({
    mode: 'single-model',
    enabled_providers: ['gemini'],
    default_runs: 3,
    provider_configurations: []
  })

  const { data: providers } = useQuery({
    queryKey: ['available-providers'],
    queryFn: apiClient.getAvailableProviders,
  })

  const configMutation = useMutation({
    mutationFn: apiClient.updateEnsembleConfiguration,
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['ensemble-config'] })
    },
  })

  const handleProviderToggle = (providerId: ProviderId, enabled: boolean) => {
    setConfig(prev => ({
      ...prev,
      enabled_providers: enabled 
        ? [...prev.enabled_providers, providerId]
        : prev.enabled_providers.filter(id => id !== providerId)
    }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Ensemble Configuration
          <Badge variant={config.mode === 'multi-provider' ? 'default' : 'secondary'}>
            {config.mode === 'multi-provider' ? 'Multi-Provider' : 'Single-Model'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Mode Selection */}
        <div className="flex items-center space-x-2 mb-4">
          <Switch 
            checked={config.mode === 'multi-provider'}
            onCheckedChange={(checked) => 
              setConfig(prev => ({ 
                ...prev, 
                mode: checked ? 'multi-provider' : 'single-model' 
              }))
            }
          />
          <label>Multi-Provider Ensemble Mode</label>
        </div>

        {/* Provider Selection Grid */}
        {config.mode === 'multi-provider' && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            {providers?.map(provider => (
              <div key={provider.id} className="flex items-center space-x-2 p-3 border rounded">
                <Switch
                  checked={config.enabled_providers.includes(provider.id)}
                  onCheckedChange={(enabled) => handleProviderToggle(provider.id, enabled)}
                />
                <div className="flex-1">
                  <div className="font-medium">{provider.name}</div>
                  <div className="text-sm text-gray-500">{provider.model}</div>
                </div>
                <Badge variant={provider.healthy ? 'success' : 'destructive'}>
                  {provider.status}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* Cost Indicator */}
        <div className="bg-blue-50 p-3 rounded mb-4">
          <div className="text-sm font-medium">Estimated Cost Multiplier</div>
          <div className="text-lg">
            {config.mode === 'multi-provider' 
              ? `${config.enabled_providers.length}x` 
              : `${config.default_runs}x`}
          </div>
        </div>

        <Button 
          onClick={() => configMutation.mutate(config)}
          disabled={configMutation.isPending}
        >
          {configMutation.isPending ? 'Saving...' : 'Save Configuration'}
        </Button>
      </CardContent>
    </Card>
  )
}
```

#### 2. Multi-Provider Operations Dashboard
**File**: `frontend/src/components/operations/MultiProviderOperationsProgress.tsx` (new file)
**Changes**: Enhanced operations monitoring with provider attribution

```typescript
import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Progress } from '../ui/progress'
import { Badge } from '../ui/badge'
import { apiClient } from '../../lib/api'
import { DetailedProgress, ProviderConfiguration } from '../../types'

export const MultiProviderOperationsProgress: React.FC = () => {
  const { data: activeRuns } = useQuery({
    queryKey: ['active-optimization-runs'],
    queryFn: apiClient.getActiveOptimizationRuns,
    refetchInterval: 3000,
  })

  return (
    <div className="space-y-4">
      {activeRuns?.map(run => (
        <MultiProviderRunCard key={run.id} run={run} />
      ))}
    </div>
  )
}

const MultiProviderRunCard: React.FC<{ run: OptimizationRun }> = ({ run }) => {
  const { data: progress } = useQuery({
    queryKey: ['optimization-progress', run.id],
    queryFn: () => apiClient.getOptimizationProgress(run.id),
    refetchInterval: 2000,
  })

  const { data: costs } = useQuery({
    queryKey: ['optimization-costs', run.id],
    queryFn: () => apiClient.getOptimizationCosts(run.id),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Optimization Run: {run.id.slice(0, 8)}</span>
          <Badge variant={run.status === 'running' ? 'default' : 'secondary'}>
            {run.status}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Overall Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span>Phase: {progress?.phase}</span>
            <span>{Math.round((progress?.phase_progress || 0) * 100)}%</span>
          </div>
          <Progress value={(progress?.phase_progress || 0) * 100} className="h-2" />
        </div>

        {/* Provider-Specific Progress */}
        {run.ensemble_mode && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Provider Progress:</div>
            {run.provider_configurations?.map(providerConfig => (
              <ProviderProgressRow 
                key={providerConfig.provider_id}
                config={providerConfig}
                runId={run.id}
              />
            ))}
          </div>
        )}

        {/* Cost Tracking */}
        {costs && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm">Total Cost:</span>
              <div className="text-right">
                <div className="font-medium">${costs.total_cost?.toFixed(4)}</div>
                <div className="text-xs text-gray-500">
                  {costs.cost_accuracy}% accuracy
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const ProviderProgressRow: React.FC<{
  config: ProviderConfiguration
  runId: string
}> = ({ config, runId }) => {
  return (
    <div className="flex items-center gap-3 p-2 bg-gray-50 rounded">
      <Badge variant="outline" className="min-w-[80px]">
        {config.provider_id}
      </Badge>
      <div className="flex-1">
        <div className="text-sm">{config.model_id}</div>
      </div>
      <div className={`h-2 w-2 rounded-full ${
        config.status === 'completed' ? 'bg-green-500' : 
        config.status === 'running' ? 'bg-blue-500 animate-pulse' : 
        'bg-gray-300'
      }`} />
    </div>
  )
}
```

#### 3. Attribution Visualization Component
**File**: `frontend/src/components/feedback/FeedbackAttributionDisplay.tsx` (new file)
**Changes**: Show consensus and contributing providers for feedback items

```typescript
import React from 'react'
import { Badge } from '../ui/badge'
import { Card, CardContent } from '../ui/card'
import { FeedbackItem, ProviderAttribution } from '../../types'

export const FeedbackAttributionDisplay: React.FC<{
  feedback: FeedbackItem
}> = ({ feedback }) => {
  const { attribution } = feedback

  if (!attribution || attribution.contributing_providers.length <= 1) {
    // Single provider attribution
    return (
      <div className="text-xs text-gray-500">
        Source: {feedback.model_provider} ({feedback.model_name})
      </div>
    )
  }

  // Multi-provider consensus
  return (
    <Card className="mt-2 border-blue-200 bg-blue-50">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary" className="text-xs">
            Multi-Provider Consensus
          </Badge>
          <span className="text-xs text-gray-600">
            {attribution.confidence_score}% confidence
          </span>
        </div>
        
        <div className="text-xs">
          <div className="font-medium mb-1">Contributing Providers:</div>
          <div className="flex flex-wrap gap-1">
            {attribution.contributing_providers.map(provider => (
              <Badge key={provider.provider_id} variant="outline" className="text-xs">
                {provider.provider_id}
              </Badge>
            ))}
          </div>
        </div>

        {attribution.similarity_method && (
          <div className="text-xs text-gray-500 mt-1">
            Matched via: {attribution.similarity_method}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

#### 4. Enhanced Dashboard Integration
**File**: `frontend/src/pages/Dashboard.tsx`
**Changes**: Add ensemble configuration tab and multi-provider operations

```typescript
// Add new tab for ensemble configuration
const tabs = [
  { id: 'overview', name: 'Overview', icon: BarChart3 },
  { id: 'operations', name: 'Operations', icon: Activity },
  { id: 'ensemble', name: 'Ensemble', icon: Users }, // New tab
  { id: 'feedback', name: 'Feedback', icon: MessageSquare },
  { id: 'analytics', name: 'Analytics', icon: TrendingUp },
]

// Add ensemble tab content
{activeTab === 'ensemble' && (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <EnsembleConfigurationPanel />
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Multi-Provider Operations</CardTitle>
        </CardHeader>
        <CardContent>
          <MultiProviderOperationsProgress />
        </CardContent>
      </Card>
    </div>
  </div>
)}
```

### Success Criteria

#### Automated Verification
- [x] Component tests pass: `cd frontend && npm test`
- [x] TypeScript compilation with new components: `cd frontend && npm run type-check`
- [x] Ensemble configuration saves and loads correctly
- [x] Multi-provider operations display without errors
- [x] Attribution display handles both single and multi-provider scenarios

#### Manual Verification
- [x] Ensemble mode toggle switches between single-model and multi-provider
- [x] Provider selection grid shows all available providers with status  
- [x] Cost multiplier updates correctly based on provider selection
- [x] Multi-provider operations show real-time progress for each provider
- [x] Feedback attribution displays consensus information clearly
- [x] Ensemble tab integration works smoothly in dashboard

---

## Phase 3: Advanced Analytics & Monitoring

### Overview  
Implement session-based feedback management, enhanced cost analytics with DSPy accuracy indicators, detailed progress phase tracking, and activity timeline visualization.

### Changes Required:

#### 1. Session-Based Feedback Management
**File**: `frontend/src/components/feedback/SessionBasedFeedbackTable.tsx` (new file)
**Changes**: Group feedback by analysis sessions with session management

```typescript
import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { apiClient } from '../../lib/api'
import { FeedbackSession, FeedbackItem } from '../../types'
import { FeedbackAttributionDisplay } from './FeedbackAttributionDisplay'

export const SessionBasedFeedbackTable: React.FC = () => {
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['feedback-sessions'],
    queryFn: apiClient.getFeedbackSessions,
    refetchInterval: 8000,
  })

  const toggleSession = (sessionId: string) => {
    const newExpanded = new Set(expandedSessions)
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId)
    } else {
      newExpanded.add(sessionId)
    }
    setExpandedSessions(newExpanded)
  }

  if (isLoading) {
    return <div>Loading sessions...</div>
  }

  return (
    <div className="space-y-4">
      {sessions?.map(session => (
        <SessionCard
          key={session.feedback_session_id}
          session={session}
          expanded={expandedSessions.has(session.feedback_session_id)}
          onToggle={() => toggleSession(session.feedback_session_id)}
        />
      ))}
    </div>
  )
}

const SessionCard: React.FC<{
  session: FeedbackSession
  expanded: boolean
  onToggle: () => void
}> = ({ session, expanded, onToggle }) => {
  const { data: sessionFeedback } = useQuery({
    queryKey: ['session-feedback', session.feedback_session_id],
    queryFn: () => apiClient.getFeedbackBySession(session.feedback_session_id),
    enabled: expanded,
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between cursor-pointer" onClick={onToggle}>
          <CardTitle className="flex items-center gap-2">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Session: {session.feedback_session_id.slice(0, 8)}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={
              session.attribution_source === 'ensemble' ? 'default' : 'secondary'
            }>
              {session.attribution_source}
            </Badge>
            <Badge variant="outline">
              {session.provider_context.providers_used.length} provider(s)
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>Created: {new Date(session.created_at).toLocaleString()}</span>
          {session.provider_context.ensemble_mode && (
            <Badge variant="secondary" className="text-xs">
              Ensemble
            </Badge>
          )}
        </div>
      </CardHeader>

      {expanded && (
        <CardContent>
          <div className="space-y-3">
            {sessionFeedback?.map(feedback => (
              <div key={feedback.id} className="p-3 border rounded-lg">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{feedback.content}</div>
                    <FeedbackAttributionDisplay feedback={feedback} />
                  </div>
                  <Badge variant={
                    feedback.rating === 'positive' ? 'success' : 
                    feedback.rating === 'negative' ? 'destructive' : 'secondary'
                  }>
                    {feedback.rating || 'unrated'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
```

#### 2. Enhanced Cost Analytics with DSPy Accuracy
**File**: `frontend/src/components/analytics/EnhancedCostAnalytics.tsx` (enhance existing)
**Changes**: Add accuracy indicators and operation-level cost breakdown

```typescript
import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Progress } from '../ui/progress'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { apiClient } from '../../lib/api'
import { CostBreakdown, ProviderCost } from '../../types'

export const EnhancedCostAnalytics: React.FC = () => {
  const { data: costSummary } = useQuery({
    queryKey: ['enhanced-cost-summary'],
    queryFn: apiClient.getEnhancedCostSummary,
    refetchInterval: 10000,
  })

  const { data: providerCosts } = useQuery({
    queryKey: ['provider-cost-breakdown'],
    queryFn: apiClient.getProviderCostBreakdown,
  })

  return (
    <div className="space-y-6">
      {/* Cost Accuracy Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Cost Tracking Accuracy
            <Badge variant={costSummary?.overall_accuracy >= 95 ? 'success' : 'warning'}>
              {costSummary?.overall_accuracy}% accurate
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">${costSummary?.total_cost.toFixed(4)}</div>
              <div className="text-sm text-gray-500">Total Cost (24h)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{costSummary?.operation_count}</div>
              <div className="text-sm text-gray-500">Total Operations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{costSummary?.token_count.toLocaleString()}</div>
              <div className="text-sm text-gray-500">Tokens Processed</div>
            </div>
          </div>

          {/* Accuracy Breakdown */}
          <div className="mt-4">
            <div className="text-sm font-medium mb-2">Accuracy by Method:</div>
            <div className="space-y-2">
              {costSummary?.accuracy_by_method.map(method => (
                <div key={method.method} className="flex items-center gap-3">
                  <div className="w-24 text-sm">{method.method}</div>
                  <Progress value={method.accuracy} className="flex-1 h-2" />
                  <div className="w-12 text-sm text-right">{method.accuracy}%</div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Provider Cost Comparison with Accuracy */}
      <Card>
        <CardHeader>
          <CardTitle>Provider Cost Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {providerCosts?.map(provider => (
              <ProviderCostRow key={provider.provider_id} provider={provider} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* DSPy Operation Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Operation-Level Cost Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={costSummary?.operation_breakdown}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="operation_type" />
              <YAxis />
              <Tooltip 
                formatter={(value: any, name: string) => [
                  name === 'cost' ? `$${value.toFixed(4)}` : value,
                  name === 'cost' ? 'Cost' : 'Accuracy %'
                ]}
              />
              <Bar dataKey="cost" fill="#8884d8" />
              <Bar dataKey="accuracy" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

const ProviderCostRow: React.FC<{ provider: ProviderCost }> = ({ provider }) => {
  return (
    <div className="flex items-center justify-between p-3 border rounded">
      <div className="flex items-center gap-3">
        <Badge variant="outline">{provider.provider_id}</Badge>
        <div>
          <div className="font-medium">{provider.model_name}</div>
          <div className="text-sm text-gray-500">
            {provider.tokens_used.toLocaleString()} tokens
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="font-medium">${provider.cost.toFixed(4)}</div>
        <div className="text-sm text-gray-500">
          {provider.accuracy}% accuracy
        </div>
      </div>
    </div>
  )
}
```

#### 3. Activity Timeline Component
**File**: `frontend/src/components/analytics/ActivityTimeline.tsx` (new file)
**Changes**: Cross-optimization activity history with provider performance

```typescript
import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Clock, Activity, Users, Zap } from 'lucide-react'
import { apiClient } from '../../lib/api'
import { ProgressActivity } from '../../types'

export const ActivityTimeline: React.FC = () => {
  const { data: activities, isLoading } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: apiClient.getRecentActivity,
    refetchInterval: 5000,
  })

  if (isLoading) {
    return <div>Loading activity timeline...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Activity Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {activities?.map((activity, index) => (
            <ActivityTimelineItem 
              key={`${activity.timestamp}-${index}`}
              activity={activity}
              isLast={index === activities.length - 1}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

const ActivityTimelineItem: React.FC<{
  activity: ProgressActivity
  isLast: boolean
}> = ({ activity, isLast }) => {
  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'initialization': return <Clock className="h-4 w-4" />
      case 'data_gathering': return <Activity className="h-4 w-4" />
      case 'optimization': return <Zap className="h-4 w-4" />
      case 'storing': return <Users className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'completed': return 'bg-green-500'
      case 'failed': return 'bg-red-500'
      case 'optimization': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="flex items-start gap-3">
      {/* Timeline dot and line */}
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full ${getPhaseColor(activity.phase)} flex items-center justify-center text-white`}>
          {getPhaseIcon(activity.phase)}
        </div>
        {!isLast && <div className="w-0.5 h-6 bg-gray-200 mt-1" />}
      </div>

      {/* Activity content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="text-xs">
            {activity.phase}
          </Badge>
          {activity.provider_id && (
            <Badge variant="secondary" className="text-xs">
              {activity.provider_id}
            </Badge>
          )}
          <span className="text-xs text-gray-500">
            {new Date(activity.timestamp).toLocaleTimeString()}
          </span>
        </div>
        <div className="text-sm text-gray-700">
          {activity.message}
        </div>
      </div>
    </div>
  )
}
```

#### 4. Phase-Specific Progress Tracking
**File**: `frontend/src/components/operations/PhaseProgressTracker.tsx` (new file)
**Changes**: Detailed optimization phase tracking with duration metrics

```typescript
import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Progress } from '../ui/progress'
import { Badge } from '../ui/badge'
import { Clock, CheckCircle, XCircle } from 'lucide-react'
import { apiClient } from '../../lib/api'
import { DetailedProgress } from '../../types'

export const PhaseProgressTracker: React.FC<{ runId: string }> = ({ runId }) => {
  const { data: progress } = useQuery({
    queryKey: ['detailed-progress', runId],
    queryFn: () => apiClient.getOptimizationProgress(runId),
    refetchInterval: 2000,
  })

  if (!progress) {
    return <div>Loading progress...</div>
  }

  const phases = [
    'initialization',
    'data_gathering', 
    'optimization',
    'storing',
    'completed'
  ]

  const getPhaseStatus = (phaseName: string, currentPhase: string, currentProgress: number) => {
    const phaseIndex = phases.indexOf(phaseName)
    const currentIndex = phases.indexOf(currentPhase)
    
    if (phaseIndex < currentIndex) return 'completed'
    if (phaseIndex === currentIndex) return currentProgress > 0 ? 'in-progress' : 'pending'
    return 'pending'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Phase Progress
          <Badge variant={progress.phase === 'failed' ? 'destructive' : 'default'}>
            {progress.phase}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Overall Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span>Overall Progress</span>
            <span>{Math.round((progress.phase_progress || 0) * 100)}%</span>
          </div>
          <Progress value={(progress.phase_progress || 0) * 100} className="h-3" />
        </div>

        {/* Phase Breakdown */}
        <div className="space-y-4">
          {phases.map((phaseName, index) => {
            const status = getPhaseStatus(phaseName, progress.phase, progress.phase_progress)
            const duration = progress.phase_durations?.[phaseName]
            
            return (
              <div key={phaseName} className="flex items-center gap-3">
                {/* Phase Icon */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  status === 'completed' ? 'bg-green-500' :
                  status === 'in-progress' ? 'bg-blue-500' :
                  'bg-gray-300'
                }`}>
                  {status === 'completed' ? (
                    <CheckCircle className="h-4 w-4 text-white" />
                  ) : status === 'in-progress' ? (
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  ) : (
                    <div className="w-2 h-2 bg-gray-500 rounded-full" />
                  )}
                </div>

                {/* Phase Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium capitalize">
                      {phaseName.replace('_', ' ')}
                    </span>
                    <Badge variant={
                      status === 'completed' ? 'success' :
                      status === 'in-progress' ? 'default' :
                      'secondary'
                    } className="text-xs">
                      {status}
                    </Badge>
                  </div>
                  
                  {duration && (
                    <div className="text-sm text-gray-500">
                      Duration: {Math.round(duration)}s
                    </div>
                  )}
                </div>

                {/* Phase Progress */}
                {status === 'in-progress' && (
                  <div className="w-24">
                    <Progress value={progress.phase_progress * 100} className="h-2" />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Activity Summary */}
        {progress.activity_timeline && progress.activity_timeline.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-sm font-medium mb-2">Recent Activity:</div>
            <div className="text-sm text-gray-600">
              {progress.activity_timeline.slice(-1)[0].message}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

### Success Criteria

#### Automated Verification
- [x] Session-based queries return properly grouped data
- [x] Enhanced cost analytics display accuracy indicators correctly
- [x] Activity timeline updates in real-time without errors
- [x] Phase progress tracker shows correct phase transitions
- [x] All new components pass type checking

#### Manual Verification
- [x] Feedback sessions group related items correctly with expand/collapse
- [x] Cost accuracy indicators show meaningful percentages and methods
- [x] Activity timeline displays chronological provider activities
- [x] Phase progress tracker shows realistic phase durations
- [x] Session attribution displays consensus information clearly
- [x] Enhanced cost breakdown shows DSPy operation details

---

## Phase 4: Chrome Extension Management

### Overview
Implement Chrome extension prompt management interface, optimization mapping, and extension health monitoring to complete the frontend-backend synchronization.

### Changes Required:

#### 1. Chrome Extension Prompt Management Interface
**File**: `frontend/src/components/chrome/ChromePromptManager.tsx` (new file)
**Changes**: Manage Chrome extension prompts with optimization status

```typescript
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Plus, Settings, Play, Clock, CheckCircle } from 'lucide-react'
import { apiClient } from '../../lib/api'
import { ChromeExtensionPrompt } from '../../types'

export const ChromePromptManager: React.FC = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: prompts, isLoading } = useQuery({
    queryKey: ['chrome-prompts'],
    queryFn: apiClient.getChromePrompts,
  })

  const createPromptMutation = useMutation({
    mutationFn: apiClient.createChromePrompt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chrome-prompts'] })
      setIsCreateDialogOpen(false)
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Chrome Extension Prompts</span>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Prompt
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Chrome Extension Prompt</DialogTitle>
              </DialogHeader>
              <CreatePromptForm 
                onSubmit={createPromptMutation.mutate}
                isLoading={createPromptMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div>Loading prompts...</div>
        ) : (
          <div className="space-y-4">
            {prompts?.map(prompt => (
              <ChromePromptCard key={prompt.id} prompt={prompt} />
            ))}
            {(!prompts || prompts.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                <Settings className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <p>No Chrome extension prompts registered</p>
                <p className="text-sm mt-1">Add prompts to enable optimization tracking</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const ChromePromptCard: React.FC<{
  prompt: ChromeExtensionPrompt
}> = ({ prompt }) => {
  const [isOptimizing, setIsOptimizing] = useState(false)
  const queryClient = useQueryClient()

  const optimizeMutation = useMutation({
    mutationFn: () => apiClient.optimizeChromePrompt(prompt.id, {
      mode: 'multi-provider',
      enabled_providers: ['gemini', 'openai'],
      default_runs: 3,
      provider_configurations: []
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chrome-prompts'] })
      setIsOptimizing(false)
    },
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'optimized': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />
      case 'failed': return <div className="h-4 w-4 rounded-full bg-red-500" />
      default: return <div className="h-4 w-4 rounded-full bg-gray-300" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'optimized': return 'success'
      case 'pending': return 'warning'
      case 'failed': return 'destructive'
      default: return 'secondary'
    }
  }

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-medium">{prompt.prompt_name}</h3>
              <Badge variant={getStatusColor(prompt.optimization_status)}>
                {prompt.optimization_status}
              </Badge>
              <div className="text-xs text-gray-500">v{prompt.version}</div>
            </div>
            
            <div className="text-sm text-gray-600 mb-3">
              {prompt.full_prompt_content.substring(0, 150)}
              {prompt.full_prompt_content.length > 150 && '...'}
            </div>

            {prompt.last_optimized && (
              <div className="text-xs text-gray-500">
                Last optimized: {new Date(prompt.last_optimized).toLocaleString()}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {getStatusIcon(prompt.optimization_status)}
            <Button
              size="sm"
              variant="outline"
              onClick={() => optimizeMutation.mutate()}
              disabled={optimizeMutation.isPending || isOptimizing}
            >
              {optimizeMutation.isPending ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Optimizing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Optimize
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const CreatePromptForm: React.FC<{
  onSubmit: (data: { prompt_name: string; full_prompt_content: string }) => void
  isLoading: boolean
}> = ({ onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    prompt_name: '',
    full_prompt_content: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.prompt_name && formData.full_prompt_content) {
      onSubmit(formData)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Prompt Name</label>
        <Input
          value={formData.prompt_name}
          onChange={(e) => setFormData(prev => ({ ...prev, prompt_name: e.target.value }))}
          placeholder="e.g., Golden Nugget Extraction v2"
        />
      </div>
      
      <div>
        <label className="text-sm font-medium">Prompt Content</label>
        <Textarea
          value={formData.full_prompt_content}
          onChange={(e) => setFormData(prev => ({ ...prev, full_prompt_content: e.target.value }))}
          placeholder="Enter the full Chrome extension prompt content..."
          rows={6}
        />
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Creating...' : 'Create Prompt'}
      </Button>
    </form>
  )
}
```

#### 2. Chrome Extension Health Monitoring
**File**: `frontend/src/components/chrome/ChromeExtensionHealth.tsx` (new file)
**Changes**: Monitor Chrome extension status with prompt usage analytics

```typescript
import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Progress } from '../ui/progress'
import { Chrome, Activity, Clock, TrendingUp } from 'lucide-react'
import { apiClient } from '../../lib/api'

export const ChromeExtensionHealth: React.FC = () => {
  const { data: healthData } = useQuery({
    queryKey: ['chrome-extension-health'],
    queryFn: apiClient.getChromeExtensionHealth,
    refetchInterval: 10000,
  })

  const { data: usageStats } = useQuery({
    queryKey: ['chrome-extension-usage'],
    queryFn: apiClient.getChromeExtensionUsageStats,
  })

  if (!healthData) {
    return <div>Loading Chrome extension status...</div>
  }

  return (
    <div className="space-y-4">
      {/* Health Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Chrome className="h-5 w-5" />
            Chrome Extension Health
            <Badge variant={healthData.status === 'healthy' ? 'success' : 'warning'}>
              {healthData.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {healthData.active_prompts}
              </div>
              <div className="text-sm text-gray-500">Active Prompts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {healthData.optimized_prompts}
              </div>
              <div className="text-sm text-gray-500">Optimized</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {healthData.pending_optimizations}
              </div>
              <div className="text-sm text-gray-500">Pending</div>
            </div>
          </div>

          {/* Optimization Coverage */}
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Optimization Coverage</span>
              <span>{healthData.optimization_coverage}%</span>
            </div>
            <Progress value={healthData.optimization_coverage} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Usage Analytics Card */}
      {usageStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Usage Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Usage Frequency */}
              <div>
                <div className="text-sm font-medium mb-3">Most Used Prompts</div>
                <div className="space-y-2">
                  {usageStats.most_used_prompts?.map((prompt, index) => (
                    <div key={prompt.id} className="flex items-center gap-3">
                      <div className="w-6 text-center text-sm text-gray-500">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{prompt.name}</div>
                        <div className="text-xs text-gray-500">
                          {prompt.usage_count} uses
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {prompt.optimization_status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Performance Metrics */}
              <div>
                <div className="text-sm font-medium mb-3">Performance</div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Avg. Analysis Time</span>
                    <span className="font-medium">{usageStats.avg_analysis_time}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Success Rate</span>
                    <span className="font-medium text-green-600">
                      {usageStats.success_rate}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Daily Usage</span>
                    <span className="font-medium">{usageStats.daily_usage} requests</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="mt-4 pt-4 border-t">
              <div className="text-sm font-medium mb-2">Recent Activity</div>
              <div className="text-sm text-gray-600">
                Last optimization: {usageStats.last_optimization ? 
                  new Date(usageStats.last_optimization).toLocaleString() : 'Never'}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

#### 3. Optimization Mapping Component
**File**: `frontend/src/components/chrome/OptimizationMappingTable.tsx` (new file)
**Changes**: Connect prompts to optimization runs with version tracking

```typescript
import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { ExternalLink, GitBranch, Clock } from 'lucide-react'
import { apiClient } from '../../lib/api'
import { PromptOptimizationMapping } from '../../types'

export const OptimizationMappingTable: React.FC = () => {
  const { data: mappings, isLoading } = useQuery({
    queryKey: ['optimization-mappings'],
    queryFn: apiClient.getOptimizationMappings,
  })

  if (isLoading) {
    return <div>Loading optimization mappings...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          Prompt → Optimization Mapping
        </CardTitle>
      </CardHeader>
      <CardContent>
        {(!mappings || mappings.length === 0) ? (
          <div className="text-center py-8 text-gray-500">
            <GitBranch className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p>No optimization mappings found</p>
            <p className="text-sm mt-1">Optimize prompts to see mapping history</p>
          </div>
        ) : (
          <div className="space-y-4">
            {mappings.map(mapping => (
              <OptimizationMappingCard key={mapping.id} mapping={mapping} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const OptimizationMappingCard: React.FC<{
  mapping: PromptOptimizationMapping
}> = ({ mapping }) => {
  const { data: optimizationDetails } = useQuery({
    queryKey: ['optimization-details', mapping.optimization_run_id],
    queryFn: () => apiClient.getOptimizationRun(mapping.optimization_run_id),
  })

  return (
    <Card className="border-l-4 border-l-purple-500">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Prompt Info */}
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-medium">{mapping.prompt_name}</h3>
              <Badge variant="outline" className="text-xs">
                v{mapping.prompt_version}
              </Badge>
              <Badge variant={mapping.status === 'successful' ? 'success' : 'warning'}>
                {mapping.status}
              </Badge>
            </div>

            {/* Optimization Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Optimization Run</div>
                <div className="font-medium">
                  {mapping.optimization_run_id.slice(0, 8)}...
                </div>
              </div>
              <div>
                <div className="text-gray-500">Created</div>
                <div className="font-medium">
                  {new Date(mapping.created_at).toLocaleDateString()}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Duration</div>
                <div className="font-medium">
                  {optimizationDetails?.duration ? 
                    `${Math.round(optimizationDetails.duration)}s` : 'N/A'}
                </div>
              </div>
            </div>

            {/* Provider Configuration */}
            {mapping.provider_configuration && (
              <div className="mt-3">
                <div className="text-sm text-gray-500 mb-1">Provider Configuration:</div>
                <div className="flex flex-wrap gap-1">
                  {mapping.provider_configuration.enabled_providers?.map(providerId => (
                    <Badge key={providerId} variant="secondary" className="text-xs">
                      {providerId}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Performance Metrics */}
            {optimizationDetails?.performance_metrics && (
              <div className="mt-3 p-2 bg-gray-50 rounded">
                <div className="text-xs text-gray-600 mb-1">Performance Improvement:</div>
                <div className="text-sm font-medium">
                  {optimizationDetails.performance_metrics.improvement_percentage > 0 ? '+' : ''}
                  {optimizationDetails.performance_metrics.improvement_percentage}%
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(`/optimization/${mapping.optimization_run_id}`, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Run
            </Button>
            
            {mapping.status === 'successful' && (
              <Badge variant="success" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Complete
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

#### 4. Dashboard Integration for Chrome Extension Tab
**File**: `frontend/src/pages/Dashboard.tsx`
**Changes**: Add Chrome Extension tab with all management components

```typescript
// Add Chrome Extension tab
const tabs = [
  { id: 'overview', name: 'Overview', icon: BarChart3 },
  { id: 'operations', name: 'Operations', icon: Activity },
  { id: 'ensemble', name: 'Ensemble', icon: Users },
  { id: 'chrome', name: 'Chrome Extension', icon: Chrome }, // New tab
  { id: 'feedback', name: 'Feedback', icon: MessageSquare },
  { id: 'analytics', name: 'Analytics', icon: TrendingUp },
]

// Add Chrome Extension tab content
{activeTab === 'chrome' && (
  <div className="space-y-6">
    {/* Health Overview */}
    <ChromeExtensionHealth />
    
    {/* Management Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChromePromptManager />
      <OptimizationMappingTable />
    </div>
  </div>
)}
```

### Success Criteria

#### Automated Verification
- [x] Chrome prompt CRUD operations work correctly
- [x] Optimization mapping displays accurate run connections
- [x] Health monitoring shows real extension metrics
- [x] All Chrome extension API endpoints integrated successfully
- [x] TypeScript compilation passes with new Chrome extension types

#### Manual Verification
- [x] Chrome prompt manager allows creating, viewing, and optimizing prompts
- [x] Optimization mappings connect prompts to their optimization runs clearly
- [x] Health monitoring displays meaningful extension usage analytics
- [x] Chrome extension tab integrates smoothly in dashboard navigation
- [x] Prompt optimization triggers backend optimization runs successfully
- [x] Version tracking shows correct prompt evolution over time

---

## Testing Strategy

### Unit Tests

#### API Client Testing
- Test all new endpoint methods with proper error handling
- Verify type safety for new request/response interfaces
- Mock backend responses for consistent testing

#### Component Testing  
- Test ensemble configuration with provider selection scenarios
- Verify session-based feedback grouping and expansion
- Test Chrome extension prompt creation and optimization workflows
- Validate activity timeline and progress phase display

#### Key Edge Cases
- Handle empty/null responses from new backend endpoints
- Test provider configuration with mixed enabled/disabled states
- Verify cost accuracy display with edge case percentages
- Test session grouping with malformed session data

### Integration Tests

#### End-to-End Scenarios
1. **Multi-Provider Ensemble Workflow**
   - Configure ensemble mode with multiple providers
   - Trigger optimization and monitor provider-specific progress  
   - Verify attribution display in feedback results
   - Confirm cost breakdown shows provider-specific costs

2. **Session-Based Feedback Management**
   - Create feedback session through ensemble analysis
   - Group feedback items by session ID
   - Verify session timeline and attribution source tracking
   - Test session expansion/collapse functionality

3. **Chrome Extension Integration**
   - Register new Chrome extension prompt
   - Trigger prompt optimization with ensemble configuration
   - Monitor optimization progress and mapping creation
   - Verify health metrics update correctly

### Manual Testing Steps

1. **Verify Multi-Provider Ensemble**
   - Toggle ensemble mode and select 2+ providers
   - Confirm cost multiplier updates correctly
   - Start optimization and verify provider-specific progress indicators
   - Check that attribution shows contributing providers

2. **Test Enhanced Analytics**
   - Navigate to session-based feedback view
   - Expand/collapse feedback sessions and verify grouping
   - Check cost analytics for accuracy indicators and DSPy breakdown
   - Monitor activity timeline for real-time updates

3. **Chrome Extension Management**
   - Add new Chrome extension prompt through UI
   - Trigger optimization and monitor progress
   - Verify optimization mapping connects prompt to run
   - Check health metrics show correct prompt counts

4. **Cross-Component Integration**
   - Verify all new tabs load without errors
   - Test navigation between enhanced dashboard sections
   - Confirm real-time polling updates work across all new components
   - Check that all error states display helpful messages

## Performance Considerations

### API Call Optimization
- **Polling Intervals**: Stagger polling intervals to reduce backend load
  - System health: 10 seconds
  - Operations progress: 3 seconds (only for active runs)
  - Activity timeline: 5 seconds
  - Chrome extension health: 15 seconds

### React Query Caching
- **Stale Time Configuration**: Balance data freshness with performance
- **Query Invalidation**: Strategic invalidation after mutations
- **Background Refetching**: Use `refetchOnWindowFocus` selectively

### Component Performance  
- **Virtualization**: Consider virtual scrolling for large activity timelines
- **Memoization**: Use `React.memo` for expensive attribution displays
- **Lazy Loading**: Load Chrome extension components only when tab is active

## Migration Notes

### Backward Compatibility
- All existing API endpoints continue to work unchanged
- Current dashboard functionality remains fully operational
- Progressive enhancement approach maintains existing user workflows

### Data Handling
- New fields in API responses are optional and handled gracefully
- Frontend gracefully degrades when backend features are unavailable
- Existing stored queries and cache remain valid

### Type Safety Migration
- New TypeScript interfaces extend existing ones where possible  
- Optional fields prevent breaking changes during rollout
- Gradual migration path for enhanced features

## References

- Original research request: `research/2025-09-02_14-22-41_frontend-backend-sync-analysis.md`
- Backend multi-provider implementation: `backend/app/services/dspy_multi_model_manager.py:208`
- Session tracking schema: `backend/migrations/005_feedback_sessions.sql:36`
- Enhanced cost tracking: `backend/app/services/improved_cost_tracking_service.py:298`
- Frontend integration patterns: `frontend/src/lib/api.ts` and `frontend/src/lib/queryClient.ts`
- Chrome extension API endpoints: `backend/app/main.py:621-673`