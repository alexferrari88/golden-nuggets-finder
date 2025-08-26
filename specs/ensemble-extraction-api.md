# Ensemble Extraction API Specifications

## Table of Contents
- [API Overview](#api-overview)
- [Type Definitions](#type-definitions)
- [Service Interfaces](#service-interfaces)
- [Message Passing API](#message-passing-api)
- [Storage Schema Changes](#storage-schema-changes)
- [Configuration API](#configuration-api)
- [Provider Extensions](#provider-extensions)
- [Backend API Changes](#backend-api-changes)
- [Backwards Compatibility](#backwards-compatibility)

## API Overview

This document defines all interface changes, new services, and data structures required for the ensemble golden nuggets extraction system. All changes maintain backwards compatibility with the existing single-extraction system.

**Design Principles:**
- Extend existing interfaces rather than replace them
- Maintain backwards compatibility at all levels
- Use discriminated unions for different extraction result types
- Follow existing codebase patterns and conventions

## Type Definitions

### Core Ensemble Types

#### Enhanced Nugget Types
**File**: `src/shared/types.ts`

```typescript
// Base nugget (existing) 
interface BaseGoldenNugget {
  type: GoldenNuggetType;
  startContent: string;
  endContent: string;
}

// Enhanced nugget with ensemble metadata
interface EnsembleNugget extends BaseGoldenNugget {
  confidence: number; // 0-1 based on model agreement
  runsSupportingThis: number; // How many runs extracted this
  totalRuns: number; // Total runs performed
  sourceProvider?: ProviderId; // Which provider extracted this (consortium mode)
  runId?: string; // Unique identifier for source run
}

// Consortium nugget with cross-model consensus
interface ConsensusNugget extends EnsembleNugget {
  modelAgreement: {
    total: number; // Total extractions for this nugget
    sources: ProviderId[]; // Which providers agreed
    agreementLevel: 'high' | 'medium' | 'low';
    crossModelConfidence: number; // Agreement across different models (0-1)
  };
}

// Final ranked nugget with quality scoring
interface RankedNugget extends ConsensusNugget {
  qualityScore: number; // 0-1 composite quality score
  rankingFactors: {
    confidence: number; // Direct model confidence
    crossModelAgreement: number; // Cross-model consensus strength
    typePreference: number; // User type preference weighting
    uniqueness: number; // Semantic uniqueness score
  };
}

// Discriminated union for different nugget types
type GoldenNuggetVariant = BaseGoldenNugget | EnsembleNugget | ConsensusNugget | RankedNugget;
```

#### Response Type Hierarchy
```typescript
// Base response (existing - unchanged)
interface GoldenNuggetsResponse {
  golden_nuggets: BaseGoldenNugget[];
}

// Ensemble response with metadata
interface EnsembleExtractionResult {
  golden_nuggets: EnsembleNugget[];
  metadata: EnsembleMetadata;
}

// Consortium response with cross-model data
interface ConsortiumExtractionResult extends EnsembleExtractionResult {
  golden_nuggets: ConsensusNugget[];
  metadata: EnsembleMetadata & ConsortiumMetadata;
}

// Quality-ranked response
interface QualityRankedResult extends ConsortiumExtractionResult {
  golden_nuggets: RankedNugget[];
  metadata: EnsembleMetadata & ConsortiumMetadata & QualityMetadata;
}

// Discriminated union for different response types
type ExtractionResult = 
  | { type: 'single'; data: GoldenNuggetsResponse }
  | { type: 'ensemble'; data: EnsembleExtractionResult }
  | { type: 'consortium'; data: ConsortiumExtractionResult }
  | { type: 'quality-ranked'; data: QualityRankedResult };
```

#### Metadata Types
```typescript
// Base ensemble metadata
interface EnsembleMetadata {
  totalRuns: number;
  consensusReached: number; // Number of nuggets after consensus
  duplicatesRemoved: number;
  averageResponseTime: number; // ms
  extractionMode: 'single' | 'ensemble' | 'consortium' | 'quality-ranked';
  timestamp: string; // ISO timestamp
}

// Consortium-specific metadata
interface ConsortiumMetadata {
  providersUsed: ProviderId[];
  crossModelAgreement: number; // 0-1 overall agreement rate
  providerPerformance: Record<ProviderId, ProviderPerformance>;
  semanticDeduplicationStats: {
    originalCount: number;
    afterDeduplication: number;
    similarityThreshold: number;
  };
}

// Quality ranking metadata
interface QualityMetadata {
  qualityThreshold: number; // User's quality threshold
  rankingMetric: 'R@P50' | 'R@P70' | 'R@P90';
  originalCount: number; // Before quality filtering
  afterQualityFilter: number; // After quality filtering
  averageQualityScore: number; // Average of displayed nuggets
}

// Provider performance tracking
interface ProviderPerformance {
  successfulRuns: number;
  totalRuns: number;
  averageResponseTime: number;
  uniqueContributions: number; // Nuggets only this provider found
  reliabilityScore: number; // Based on success rate and response time
}
```

### Configuration Types

#### Extraction Mode Configuration
```typescript
// User-configurable extraction modes
interface ExtractionModeConfig {
  name: 'fast' | 'balanced' | 'comprehensive' | 'custom';
  providers: number; // How many providers to use
  runsPerProvider: number; // Runs per provider
  consensusThreshold: number; // Minimum agreement required
  qualityThreshold: number; // Minimum quality score (0.1-0.9)
  parallelExecution: boolean;
  enableSemanticDeduplication: boolean;
  estimatedTime: string; // Human-readable estimate
  estimatedCost: string; // Human-readable cost estimate
}

// Built-in extraction modes
const EXTRACTION_MODES: Record<string, ExtractionModeConfig> = {
  fast: {
    name: 'fast',
    providers: 1,
    runsPerProvider: 1,
    consensusThreshold: 1,
    qualityThreshold: 0.3,
    parallelExecution: true,
    enableSemanticDeduplication: false,
    estimatedTime: '~5 seconds',
    estimatedCost: '$0.003'
  },
  balanced: {
    name: 'balanced',
    providers: 2,
    runsPerProvider: 2,
    consensusThreshold: 2,
    qualityThreshold: 0.5,
    parallelExecution: true,
    enableSemanticDeduplication: true,
    estimatedTime: '~15 seconds',
    estimatedCost: '$0.012'
  },
  comprehensive: {
    name: 'comprehensive',
    providers: 4,
    runsPerProvider: 3,
    consensusThreshold: 2,
    qualityThreshold: 0.3,
    parallelExecution: true,
    enableSemanticDeduplication: true,
    estimatedTime: '~30 seconds',
    estimatedCost: '$0.036'
  }
};

// User preferences for ensemble extraction
interface EnsemblePreferences {
  defaultExtractionMode: keyof typeof EXTRACTION_MODES;
  customModeConfig?: ExtractionModeConfig;
  precisionRecallBalance: number; // 0.1 (recall) to 0.9 (precision)
  typePreferences: Record<GoldenNuggetType, number>; // 0.1-2.0 weighting
  maxMonthlyCost: number; // Budget limit in USD
  enableCostWarnings: boolean;
}
```

## Service Interfaces

### Core Ensemble Services

#### EnsembleExtractor Interface
**File**: `src/background/services/ensemble-extractor.ts`

```typescript
interface EnsembleExtractionOptions {
  runs: number; // Number of runs to perform (1-10)
  temperature: number; // LLM temperature (0.0-2.0)
  parallelExecution: boolean; // Execute runs in parallel
  consensusMethod: 'majority' | 'weighted' | 'confidence-based';
  timeoutPerRun: number; // Milliseconds
}

interface EnsembleExtractorInterface {
  /**
   * Extract golden nuggets using ensemble approach with single provider
   */
  extractWithEnsemble(
    content: string,
    prompt: string,
    provider: LLMProvider,
    options?: Partial<EnsembleExtractionOptions>
  ): Promise<EnsembleExtractionResult>;

  /**
   * Get default options for ensemble extraction
   */
  getDefaultOptions(): EnsembleExtractionOptions;

  /**
   * Estimate cost and time for ensemble extraction
   */
  estimateExtraction(
    contentLength: number,
    provider: LLMProvider,
    options: EnsembleExtractionOptions
  ): Promise<{
    estimatedCost: number;
    estimatedTime: number;
    confidence: number; // Confidence in estimate
  }>;
}
```

#### ConsortiumExtractor Interface
**File**: `src/background/services/consortium-extractor.ts`

```typescript
interface ConsortiumExtractionOptions {
  providers: LLMProvider[]; // Providers to use
  runsPerProvider: number; // Runs per provider
  consensusThreshold: number; // Minimum models that must agree
  enableSemanticDeduplication: boolean;
  similarityThreshold: number; // For deduplication (0.1-1.0)
  maxParallelRequests: number; // Rate limiting
  timeoutPerProvider: number; // Milliseconds
}

interface ConsortiumExtractorInterface {
  /**
   * Extract golden nuggets using consortium approach with multiple providers
   */
  extractWithConsortium(
    content: string,
    prompt: string,
    providers: LLMProvider[],
    options?: Partial<ConsortiumExtractionOptions>
  ): Promise<ConsortiumExtractionResult>;

  /**
   * Get available providers for consortium extraction
   */
  getAvailableProviders(): Promise<LLMProvider[]>;

  /**
   * Estimate cost and time for consortium extraction
   */
  estimateConsortium(
    contentLength: number,
    providers: LLMProvider[],
    options: ConsortiumExtractionOptions
  ): Promise<{
    totalEstimatedCost: number;
    totalEstimatedTime: number;
    providerBreakdown: Record<ProviderId, {
      cost: number;
      time: number;
    }>;
  }>;

  /**
   * Validate consortium configuration
   */
  validateConfiguration(
    providers: LLMProvider[],
    options: ConsortiumExtractionOptions
  ): Promise<{
    isValid: boolean;
    warnings: string[];
    errors: string[];
  }>;
}
```

#### QualityRanker Interface
**File**: `src/background/services/quality-ranker.ts`

```typescript
interface QualityRankingOptions {
  metric: 'R@P50' | 'R@P70' | 'R@P90'; // Research-recommended metrics
  userQualityThreshold: number; // 0.1-0.9 range
  typePreferences: Record<GoldenNuggetType, number>; // User type weightings
  enableUniquenessBonus: boolean; // Boost unique content
  maxResults?: number; // Optional result limit
}

interface QualityRankerInterface {
  /**
   * Rank and filter nuggets based on quality criteria
   */
  rankNuggets(
    nuggets: ConsensusNugget[],
    options: QualityRankingOptions
  ): Promise<RankedNugget[]>;

  /**
   * Calculate quality score for a single nugget
   */
  calculateQualityScore(
    nugget: ConsensusNugget,
    context: ConsensusNugget[],
    options: QualityRankingOptions
  ): number;

  /**
   * Get quality score explanation for transparency
   */
  explainQualityScore(nugget: RankedNugget): {
    totalScore: number;
    breakdown: {
      confidence: number;
      crossModelAgreement: number;
      typePreference: number;
      uniqueness: number;
    };
    explanation: string;
  };
}
```

#### SemanticDeduplicator Interface
**File**: `src/background/services/semantic-deduplicator.ts`

```typescript
interface DeduplicationOptions {
  similarityThreshold: number; // 0.1-1.0, research recommends 0.8
  algorithm: 'simple' | 'embedding' | 'hybrid';
  preserveHighConfidence: boolean; // Keep high-confidence duplicates
  groupByType: boolean; // Only deduplicate within same type
}

interface DeduplicationResult {
  deduplicatedNuggets: EnsembleNugget[];
  duplicateGroups: {
    representative: EnsembleNugget;
    duplicates: EnsembleNugget[];
    similarityScores: number[];
  }[];
  statistics: {
    originalCount: number;
    finalCount: number;
    reductionPercentage: number;
    processingTime: number;
  };
}

interface SemanticDeduplicatorInterface {
  /**
   * Remove semantically similar nuggets
   */
  deduplicate(
    nuggets: EnsembleNugget[],
    options?: Partial<DeduplicationOptions>
  ): Promise<DeduplicationResult>;

  /**
   * Calculate semantic similarity between two nuggets
   */
  calculateSimilarity(nugget1: EnsembleNugget, nugget2: EnsembleNugget): Promise<number>;

  /**
   * Preview deduplication without applying changes
   */
  previewDeduplication(
    nuggets: EnsembleNugget[],
    options: DeduplicationOptions
  ): Promise<{
    groupCount: number;
    estimatedReduction: number;
    potentialDuplicates: Array<{
      nugget1: EnsembleNugget;
      nugget2: EnsembleNugget;
      similarity: number;
    }>;
  }>;
}
```

### Service Orchestration

#### ExtractionOrchestrator Interface
**File**: `src/background/services/extraction-orchestrator.ts`

```typescript
interface ExtractionRequest {
  content: string;
  prompt: string;
  mode: keyof typeof EXTRACTION_MODES | 'custom';
  customConfig?: ExtractionModeConfig;
  typeFilter?: TypeFilterOptions;
  userPreferences: EnsemblePreferences;
  analysisId: string;
  budgetLimit?: number; // Optional cost limit for this extraction
}

interface ExtractionOrchestatorInterface {
  /**
   * Main entry point for all extraction types
   */
  extract(request: ExtractionRequest): Promise<ExtractionResult>;

  /**
   * Estimate cost and time before extraction
   */
  estimate(request: Omit<ExtractionRequest, 'analysisId'>): Promise<{
    cost: number;
    time: number;
    confidence: number;
    breakdown: {
      providerCosts: Record<ProviderId, number>;
      operationTimes: Record<string, number>;
    };
  }>;

  /**
   * Validate extraction request
   */
  validate(request: ExtractionRequest): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>;

  /**
   * Cancel ongoing extraction
   */
  cancel(analysisId: string): Promise<boolean>;

  /**
   * Get extraction progress
   */
  getProgress(analysisId: string): Promise<ExtractionProgress>;
}

interface ExtractionProgress {
  analysisId: string;
  stage: 'initializing' | 'extracting' | 'consensus' | 'ranking' | 'complete' | 'error';
  step: number;
  totalSteps: number;
  currentOperation: string;
  providersCompleted: ProviderId[];
  providersRunning: ProviderId[];
  estimatedTimeRemaining: number; // milliseconds
  costsIncurred: number; // USD so far
}
```

## Message Passing API

### Enhanced Message Types
**File**: `src/shared/types.ts`

```typescript
// Add to existing MESSAGE_TYPES
export const MESSAGE_TYPES = {
  // ... existing types ...
  
  // Enhanced extraction types
  ANALYZE_CONTENT_ENSEMBLE: 'analyze_content_ensemble',
  ANALYZE_CONTENT_CONSORTIUM: 'analyze_content_consortium',
  
  // Progress tracking
  ENSEMBLE_PROGRESS_UPDATE: 'ensemble_progress_update',
  CONSORTIUM_PROGRESS_UPDATE: 'consortium_progress_update',
  EXTRACTION_STAGE_COMPLETE: 'extraction_stage_complete',
  
  // Configuration
  GET_EXTRACTION_MODES: 'get_extraction_modes',
  SET_EXTRACTION_PREFERENCES: 'set_extraction_preferences',
  GET_EXTRACTION_PREFERENCES: 'get_extraction_preferences',
  
  // Estimation and validation
  ESTIMATE_EXTRACTION_COST: 'estimate_extraction_cost',
  VALIDATE_EXTRACTION_CONFIG: 'validate_extraction_config',
  
  // Control
  CANCEL_EXTRACTION: 'cancel_extraction',
  GET_EXTRACTION_PROGRESS: 'get_extraction_progress'
} as const;

// Request message types
interface EnsembleAnalysisRequest extends BaseMessage {
  type: typeof MESSAGE_TYPES.ANALYZE_CONTENT_ENSEMBLE;
  content: string;
  promptId: string;
  url: string;
  analysisId: string;
  extractionOptions: {
    mode: keyof typeof EXTRACTION_MODES;
    customConfig?: Partial<ExtractionModeConfig>;
  };
  typeFilter?: TypeFilterOptions;
  budgetLimit?: number;
}

interface ConsortiumAnalysisRequest extends BaseMessage {
  type: typeof MESSAGE_TYPES.ANALYZE_CONTENT_CONSORTIUM;
  content: string;
  promptId: string;
  url: string;
  analysisId: string;
  consortiumOptions: {
    providers: ProviderId[];
    runsPerProvider: number;
    consensusThreshold: number;
    qualityThreshold: number;
  };
  typeFilter?: TypeFilterOptions;
  budgetLimit?: number;
}

interface ExtractionProgressUpdate extends BaseMessage {
  type: typeof MESSAGE_TYPES.ENSEMBLE_PROGRESS_UPDATE | typeof MESSAGE_TYPES.CONSORTIUM_PROGRESS_UPDATE;
  analysisId: string;
  progress: ExtractionProgress;
}

interface CostEstimationRequest extends BaseMessage {
  type: typeof MESSAGE_TYPES.ESTIMATE_EXTRACTION_COST;
  content: string;
  extractionMode: keyof typeof EXTRACTION_MODES;
  customConfig?: ExtractionModeConfig;
}

// Response message types
interface EnsembleAnalysisResponse extends BaseResponse {
  type: 'ensemble' | 'consortium' | 'quality-ranked';
  data?: ExtractionResult['data'];
  metadata?: {
    analysisId: string;
    totalCost: number;
    totalTime: number;
    providersUsed: ProviderId[];
  };
}

interface CostEstimationResponse extends BaseResponse {
  data?: {
    estimatedCost: number;
    estimatedTime: number;
    confidence: number; // 0-1 confidence in estimate
    breakdown: {
      providerCosts: Record<ProviderId, number>;
      operationTimes: Record<string, number>;
    };
    warnings?: string[]; // Cost or time warnings
  };
}

interface ExtractionPreferencesResponse extends BaseResponse {
  data?: EnsemblePreferences;
}
```

### Message Handler Extensions
**File**: `src/background/message-handler.ts`

```typescript
// Add to MessageHandler class
export class MessageHandler {
  private extractionOrchestrator = new ExtractionOrchestrator();
  
  // Enhanced message handling
  async handleMessage(
    request: MessagingRequest,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessagingResponse) => void
  ): Promise<void> {
    switch (request.type) {
      // ... existing cases ...
      
      case MESSAGE_TYPES.ANALYZE_CONTENT_ENSEMBLE:
        await this.handleEnsembleAnalysis(request, sender, sendResponse);
        break;
        
      case MESSAGE_TYPES.ANALYZE_CONTENT_CONSORTIUM:
        await this.handleConsortiumAnalysis(request, sender, sendResponse);
        break;
        
      case MESSAGE_TYPES.ESTIMATE_EXTRACTION_COST:
        await this.handleCostEstimation(request, sender, sendResponse);
        break;
        
      case MESSAGE_TYPES.GET_EXTRACTION_PREFERENCES:
        await this.handleGetPreferences(request, sender, sendResponse);
        break;
        
      case MESSAGE_TYPES.SET_EXTRACTION_PREFERENCES:
        await this.handleSetPreferences(request, sender, sendResponse);
        break;
        
      case MESSAGE_TYPES.CANCEL_EXTRACTION:
        await this.handleCancelExtraction(request, sender, sendResponse);
        break;
    }
  }
  
  private async handleEnsembleAnalysis(
    request: EnsembleAnalysisRequest,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: EnsembleAnalysisResponse) => void
  ): Promise<void> {
    try {
      // Setup progress tracking
      this.setupProgressTracking(request.analysisId, sender.tab?.id);
      
      // Create extraction request
      const extractionRequest: ExtractionRequest = {
        content: request.content,
        prompt: await this.getProcessedPrompt(request.promptId, request.url),
        mode: request.extractionOptions.mode,
        customConfig: request.extractionOptions.customConfig,
        typeFilter: request.typeFilter,
        userPreferences: await this.getUserPreferences(),
        analysisId: request.analysisId,
        budgetLimit: request.budgetLimit
      };
      
      // Execute extraction
      const result = await this.extractionOrchestrator.extract(extractionRequest);
      
      // Send results
      sendResponse({
        success: true,
        type: result.type,
        data: result.data,
        metadata: {
          analysisId: request.analysisId,
          totalCost: this.calculateTotalCost(result),
          totalTime: this.calculateTotalTime(result),
          providersUsed: this.getProvidersUsed(result)
        }
      });
      
    } catch (error) {
      console.error('Ensemble analysis failed:', error);
      sendResponse({
        success: false,
        error: (error as Error).message
      });
    }
  }
}
```

## Storage Schema Changes

### Chrome Extension Storage

#### Enhanced Configuration Storage
**File**: `src/shared/storage.ts`

```typescript
// Add to existing STORAGE_KEYS
export const STORAGE_KEYS = {
  // ... existing keys ...
  
  // Ensemble configuration
  EXTRACTION_PREFERENCES: 'extraction_preferences',
  CUSTOM_EXTRACTION_MODES: 'custom_extraction_modes',
  EXTRACTION_HISTORY: 'extraction_history',
  COST_TRACKING: 'cost_tracking',
  PERFORMANCE_METRICS: 'performance_metrics'
} as const;

// Enhanced storage schema
interface ExtensionStorageSchema extends ExistingStorageSchema {
  // Ensemble preferences
  [STORAGE_KEYS.EXTRACTION_PREFERENCES]: EnsemblePreferences;
  
  // Custom modes created by user
  [STORAGE_KEYS.CUSTOM_EXTRACTION_MODES]: Record<string, ExtractionModeConfig>;
  
  // Historical extractions for analytics
  [STORAGE_KEYS.EXTRACTION_HISTORY]: ExtractionHistoryEntry[];
  
  // Cost tracking data
  [STORAGE_KEYS.COST_TRACKING]: CostTrackingData;
  
  // Performance metrics
  [STORAGE_KEYS.PERFORMANCE_METRICS]: PerformanceMetricsData;
}

interface ExtractionHistoryEntry {
  analysisId: string;
  timestamp: string;
  url: string;
  contentLength: number;
  extractionMode: string;
  providersUsed: ProviderId[];
  totalCost: number;
  totalTime: number;
  resultCount: number;
  userSatisfaction?: number; // 1-5 rating if provided
}

interface CostTrackingData {
  monthlyBudget: number;
  currentMonthSpend: number;
  lastResetDate: string;
  costsByProvider: Record<ProviderId, number>;
  costsByMode: Record<string, number>;
  projectedMonthlySpend: number;
}

interface PerformanceMetricsData {
  averageExtractionTime: Record<string, number>; // By mode
  averageExtractionsPerDay: number;
  successRates: Record<ProviderId, number>;
  userSatisfactionByMode: Record<string, number>;
  lastCalculated: string;
}
```

#### Enhanced Storage Services

**File**: `src/shared/storage/ensemble-preferences-storage.ts`

```typescript
export class EnsemblePreferencesStorage {
  
  static async getPreferences(): Promise<EnsemblePreferences> {
    const stored = await chrome.storage.sync.get(STORAGE_KEYS.EXTRACTION_PREFERENCES);
    return stored[STORAGE_KEYS.EXTRACTION_PREFERENCES] || this.getDefaultPreferences();
  }
  
  static async setPreferences(preferences: EnsemblePreferences): Promise<void> {
    await chrome.storage.sync.set({
      [STORAGE_KEYS.EXTRACTION_PREFERENCES]: preferences
    });
  }
  
  static async updatePreference<K extends keyof EnsemblePreferences>(
    key: K,
    value: EnsemblePreferences[K]
  ): Promise<void> {
    const current = await this.getPreferences();
    await this.setPreferences({
      ...current,
      [key]: value
    });
  }
  
  private static getDefaultPreferences(): EnsemblePreferences {
    return {
      defaultExtractionMode: 'balanced',
      precisionRecallBalance: 0.5,
      typePreferences: {
        'tool': 1.0,
        'media': 1.0,
        'aha! moments': 1.0,
        'analogy': 1.0,
        'model': 1.0
      },
      maxMonthlyCost: 25, // $25/month default budget
      enableCostWarnings: true
    };
  }
}
```

**File**: `src/shared/storage/cost-tracking-storage.ts`

```typescript
export class CostTrackingStorage {
  
  static async recordExtraction(
    analysisId: string,
    cost: number,
    providersUsed: ProviderId[],
    mode: string
  ): Promise<void> {
    const costData = await this.getCostTrackingData();
    const now = new Date();
    
    // Check if we need to reset monthly tracking
    const lastReset = new Date(costData.lastResetDate);
    if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
      costData.currentMonthSpend = 0;
      costData.lastResetDate = now.toISOString();
    }
    
    // Update spend tracking
    costData.currentMonthSpend += cost;
    
    // Update provider costs
    for (const provider of providersUsed) {
      costData.costsByProvider[provider] = (costData.costsByProvider[provider] || 0) + (cost / providersUsed.length);
    }
    
    // Update mode costs
    costData.costsByMode[mode] = (costData.costsByMode[mode] || 0) + cost;
    
    // Update projected spend (simple linear projection)
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    costData.projectedMonthlySpend = (costData.currentMonthSpend / dayOfMonth) * daysInMonth;
    
    await this.saveCostTrackingData(costData);
    
    // Check budget warnings
    if (costData.projectedMonthlySpend > costData.monthlyBudget * 0.8) {
      await this.triggerBudgetWarning(costData);
    }
  }
  
  static async getCostTrackingData(): Promise<CostTrackingData> {
    const stored = await chrome.storage.local.get(STORAGE_KEYS.COST_TRACKING);
    return stored[STORAGE_KEYS.COST_TRACKING] || this.getDefaultCostData();
  }
  
  private static getDefaultCostData(): CostTrackingData {
    return {
      monthlyBudget: 25,
      currentMonthSpend: 0,
      lastResetDate: new Date().toISOString(),
      costsByProvider: {},
      costsByMode: {},
      projectedMonthlySpend: 0
    };
  }
}
```

### Backend Database Schema Changes

#### Enhanced Feedback Schema
**File**: Database migration `005_add_ensemble_support.sql`

```sql
-- Extend existing feedback table for ensemble support
ALTER TABLE feedback ADD COLUMN extraction_mode VARCHAR(50) DEFAULT 'single';
ALTER TABLE feedback ADD COLUMN providers_used TEXT; -- JSON array of provider IDs
ALTER TABLE feedback ADD COLUMN consensus_metadata TEXT; -- JSON metadata about consensus
ALTER TABLE feedback ADD COLUMN extraction_cost DECIMAL(10,6); -- Cost in USD
ALTER TABLE feedback ADD COLUMN response_time INTEGER; -- milliseconds

-- New table for detailed extraction runs
CREATE TABLE extraction_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    analysis_id VARCHAR(255) NOT NULL,
    provider_id VARCHAR(50) NOT NULL,
    run_number INTEGER NOT NULL,
    raw_response TEXT,
    normalized_response TEXT,
    response_time INTEGER,
    cost DECIMAL(10,6),
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (analysis_id) REFERENCES feedback(analysis_id),
    INDEX idx_analysis_id (analysis_id),
    INDEX idx_provider_id (provider_id)
);

-- New table for consensus results
CREATE TABLE consensus_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    analysis_id VARCHAR(255) NOT NULL,
    nugget_type VARCHAR(50) NOT NULL,
    start_content TEXT NOT NULL,
    end_content TEXT NOT NULL,
    confidence_score DECIMAL(4,3), -- 0.000-1.000
    model_agreement INTEGER, -- Number of models that agreed
    total_extractions INTEGER, -- Total extractions for this nugget
    quality_score DECIMAL(4,3),
    is_displayed BOOLEAN DEFAULT TRUE, -- Whether shown to user
    user_feedback VARCHAR(50), -- 'positive', 'negative', 'neutral'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (analysis_id) REFERENCES feedback(analysis_id),
    INDEX idx_analysis_id (analysis_id),
    INDEX idx_nugget_type (nugget_type),
    INDEX idx_confidence (confidence_score),
    INDEX idx_quality (quality_score)
);

-- New table for cost tracking
CREATE TABLE cost_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id VARCHAR(255), -- Hashed user identifier
    analysis_id VARCHAR(255) NOT NULL,
    extraction_mode VARCHAR(50) NOT NULL,
    providers_used TEXT, -- JSON array
    total_cost DECIMAL(10,6),
    cost_breakdown TEXT, -- JSON object with per-provider costs
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_extraction_mode (extraction_mode),
    INDEX idx_timestamp (timestamp)
);
```

#### Enhanced Backend API Types
**File**: `backend/app/models.py`

```python
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime

class EnsembleExtractionRun(BaseModel):
    analysis_id: str
    provider_id: str
    run_number: int
    raw_response: str
    normalized_response: str
    response_time: int  # milliseconds
    cost: float  # USD
    success: bool = True
    error_message: Optional[str] = None

class ConsensusResult(BaseModel):
    analysis_id: str
    nugget_type: str
    start_content: str
    end_content: str
    confidence_score: float = Field(ge=0.0, le=1.0)
    model_agreement: int
    total_extractions: int
    quality_score: float = Field(ge=0.0, le=1.0)
    is_displayed: bool = True
    user_feedback: Optional[str] = None

class EnsembleFeedback(BaseModel):
    # Extends existing Feedback model
    analysis_id: str
    user_rating: int = Field(ge=1, le=5)
    feedback_type: str
    content: str
    
    # New ensemble fields
    extraction_mode: str = 'single'
    providers_used: List[str] = []
    consensus_metadata: Dict[str, Any] = {}
    extraction_cost: float = 0.0
    response_time: int = 0  # milliseconds
    
    # Related data
    extraction_runs: List[EnsembleExtractionRun] = []
    consensus_results: List[ConsensusResult] = []

class CostTrackingEntry(BaseModel):
    user_id: str
    analysis_id: str
    extraction_mode: str
    providers_used: List[str]
    total_cost: float
    cost_breakdown: Dict[str, float]  # provider_id -> cost
    timestamp: datetime
```

## Configuration API

### User Configuration Interface

#### Extraction Mode Manager
**File**: `src/background/services/extraction-mode-manager.ts`

```typescript
interface ExtractionModeManagerInterface {
  /**
   * Get all available extraction modes (built-in + custom)
   */
  getAvailableModes(): Promise<Record<string, ExtractionModeConfig>>;
  
  /**
   * Get specific extraction mode configuration
   */
  getMode(modeName: string): Promise<ExtractionModeConfig | null>;
  
  /**
   * Create custom extraction mode
   */
  createCustomMode(name: string, config: ExtractionModeConfig): Promise<void>;
  
  /**
   * Update existing custom mode
   */
  updateCustomMode(name: string, config: Partial<ExtractionModeConfig>): Promise<void>;
  
  /**
   * Delete custom mode
   */
  deleteCustomMode(name: string): Promise<void>;
  
  /**
   * Validate mode configuration
   */
  validateModeConfig(config: ExtractionModeConfig): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>;
  
  /**
   * Get cost and time estimates for mode
   */
  estimateMode(
    config: ExtractionModeConfig,
    contentLength: number
  ): Promise<{
    cost: number;
    time: number;
    confidence: number;
  }>;
}

export class ExtractionModeManager implements ExtractionModeManagerInterface {
  async getAvailableModes(): Promise<Record<string, ExtractionModeConfig>> {
    const customModes = await chrome.storage.sync.get(STORAGE_KEYS.CUSTOM_EXTRACTION_MODES);
    return {
      ...EXTRACTION_MODES,
      ...(customModes[STORAGE_KEYS.CUSTOM_EXTRACTION_MODES] || {})
    };
  }
  
  async createCustomMode(name: string, config: ExtractionModeConfig): Promise<void> {
    const validation = await this.validateModeConfig(config);
    if (!validation.isValid) {
      throw new Error(`Invalid mode configuration: ${validation.errors.join(', ')}`);
    }
    
    const customModes = await chrome.storage.sync.get(STORAGE_KEYS.CUSTOM_EXTRACTION_MODES);
    const modes = customModes[STORAGE_KEYS.CUSTOM_EXTRACTION_MODES] || {};
    
    modes[name] = { ...config, name: 'custom' };
    
    await chrome.storage.sync.set({
      [STORAGE_KEYS.CUSTOM_EXTRACTION_MODES]: modes
    });
  }
  
  async validateModeConfig(config: ExtractionModeConfig): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Validate providers count
    if (config.providers < 1 || config.providers > 4) {
      errors.push('Providers count must be between 1 and 4');
    }
    
    // Validate runs per provider
    if (config.runsPerProvider < 1 || config.runsPerProvider > 10) {
      errors.push('Runs per provider must be between 1 and 10');
    }
    
    // Validate thresholds
    if (config.consensusThreshold < 1 || config.consensusThreshold > config.providers * config.runsPerProvider) {
      errors.push('Consensus threshold must be between 1 and total runs');
    }
    
    if (config.qualityThreshold < 0.1 || config.qualityThreshold > 0.9) {
      errors.push('Quality threshold must be between 0.1 and 0.9');
    }
    
    // Performance warnings
    const totalRuns = config.providers * config.runsPerProvider;
    if (totalRuns > 12) {
      warnings.push('High number of total runs may result in slow performance and high costs');
    }
    
    const estimatedCost = this.estimateCost(totalRuns);
    if (estimatedCost > 0.10) {
      warnings.push(`High estimated cost per analysis: $${estimatedCost.toFixed(3)}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
```

## Provider Extensions

### Enhanced Provider Interface

#### Optional Ensemble Support
**File**: `src/shared/types/providers.ts`

```typescript
// Extend existing LLMProvider interface (backwards compatible)
export interface LLMProvider {
  readonly providerId: ProviderId;
  readonly modelName: string;
  
  // Existing methods (unchanged)
  extractGoldenNuggets(content: string, prompt: string): Promise<GoldenNuggetsResponse>;
  validateApiKey(): Promise<boolean>;
  
  // New optional methods for ensemble support
  extractGoldenNuggetsEnsemble?(
    content: string,
    prompt: string,
    runs: number,
    options?: {
      temperature?: number;
      parallelExecution?: boolean;
      progressCallback?: (progress: { completed: number; total: number }) => void;
    }
  ): Promise<EnsembleExtractionResult>;
  
  getCapabilities?(): ProviderCapabilities;
  getCostEstimate?(contentLength: number, runs?: number): Promise<number>;
  getPerformanceMetrics?(): Promise<ProviderPerformanceMetrics>;
}

interface ProviderCapabilities {
  supportsEnsemble: boolean;
  maxConcurrentRequests: number;
  supportsStreaming: boolean;
  supportsConfidenceScoring: boolean;
  optimalTemperatureRange: { min: number; max: number };
  strengthCategories: GoldenNuggetType[]; // Types this provider excels at
}

interface ProviderPerformanceMetrics {
  averageResponseTime: number; // milliseconds
  successRate: number; // 0-1
  costPerRun: number; // USD
  reliabilityScore: number; // 0-1 composite score
  lastUpdated: string; // ISO timestamp
}
```

#### Provider-Specific Adaptations
**File**: `src/shared/providers/enhanced-gemini-provider.ts`

```typescript
export class EnhancedGeminiProvider extends GeminiDirectProvider {
  
  getCapabilities(): ProviderCapabilities {
    return {
      supportsEnsemble: true,
      maxConcurrentRequests: 3,
      supportsStreaming: false,
      supportsConfidenceScoring: true,
      optimalTemperatureRange: { min: 0.0, max: 1.0 },
      strengthCategories: ['tool', 'model'] // Gemini excels at structured analysis
    };
  }
  
  async extractGoldenNuggetsEnsemble(
    content: string,
    prompt: string,
    runs: number,
    options?: {
      temperature?: number;
      parallelExecution?: boolean;
      progressCallback?: (progress: { completed: number; total: number }) => void;
    }
  ): Promise<EnsembleExtractionResult> {
    
    const temperature = options?.temperature ?? 0.7;
    const parallel = options?.parallelExecution ?? true;
    
    if (parallel) {
      // Execute runs in parallel
      const extractionPromises = Array(runs).fill(null).map(async (_, index) => {
        const result = await this.extractGoldenNuggets(content, prompt);
        options?.progressCallback?.({ completed: index + 1, total: runs });
        return result;
      });
      
      const results = await Promise.allSettled(extractionPromises);
      const successful = results
        .filter((r): r is PromiseFulfilledResult<GoldenNuggetsResponse> => r.status === 'fulfilled')
        .map(r => r.value);
        
      return this.buildEnsembleResult(successful, runs);
      
    } else {
      // Execute runs sequentially 
      const results: GoldenNuggetsResponse[] = [];
      
      for (let i = 0; i < runs; i++) {
        try {
          const result = await this.extractGoldenNuggets(content, prompt);
          results.push(result);
          options?.progressCallback?.({ completed: i + 1, total: runs });
        } catch (error) {
          console.warn(`Run ${i + 1} failed:`, error);
        }
      }
      
      return this.buildEnsembleResult(results, runs);
    }
  }
  
  private buildEnsembleResult(
    results: GoldenNuggetsResponse[], 
    totalRuns: number
  ): EnsembleExtractionResult {
    // Implementation of ensemble result building
    // This would include consensus logic, confidence scoring, etc.
    // (Implementation details provided in other service interfaces above)
  }
  
  async getCostEstimate(contentLength: number, runs: number = 1): Promise<number> {
    // Gemini-specific cost calculation
    const baseTokens = Math.ceil(contentLength / 4); // Rough token estimate
    const costPerToken = 0.000002; // Current Gemini pricing (approximate)
    return baseTokens * costPerToken * runs;
  }
}
```

## Backend API Changes

### Enhanced DSPy Integration

#### Multi-Model Optimization Support
**File**: `backend/app/services/ensemble_optimization_service.py`

```python
from typing import List, Dict, Any, Optional
import dspy
from .base_optimization_service import BaseOptimizationService

class EnsembleOptimizationService(BaseOptimizationService):
    
    def __init__(self):
        super().__init__()
        self.ensemble_models = {
            'gemini': dspy.LM('gemini/gemini-2.5-flash'),
            'anthropic': dspy.LM('anthropic/claude-sonnet-4-20250514'),
            'openai': dspy.LM('openai/gpt-4.1-mini'),
            'openrouter': dspy.LM('openrouter/gpt-4.1-mini')
        }
    
    async def optimize_ensemble_prompts(
        self,
        provider_feedback: Dict[str, List[Any]],
        minimum_feedback_threshold: int = 50
    ) -> Dict[str, str]:
        """
        Optimize prompts for each provider based on their specific feedback
        """
        optimized_prompts = {}
        
        for provider_id, feedback_data in provider_feedback.items():
            if len(feedback_data) < minimum_feedback_threshold:
                continue
                
            print(f"Optimizing prompts for {provider_id} with {len(feedback_data)} feedback entries")
            
            # Configure DSPy for this specific provider
            dspy.settings.configure(lm=self.ensemble_models.get(provider_id))
            
            # Convert feedback to training examples
            trainset = self._convert_ensemble_feedback_to_examples(feedback_data, provider_id)
            
            if len(trainset) < 10:
                print(f"Insufficient training data for {provider_id} ({len(trainset)} examples)")
                continue
            
            # Provider-specific optimization
            optimizer = self._get_optimizer_for_provider(provider_id)
            
            try:
                optimized_program = optimizer.compile(
                    student=self._create_ensemble_extractor(provider_id),
                    trainset=trainset,
                    max_bootstrapped_demos=min(len(trainset), 8),
                    max_labeled_demos=min(len(trainset), 16)
                )
                
                # Extract optimized prompt
                optimized_prompt = self._extract_prompt_from_program(optimized_program)
                optimized_prompts[provider_id] = optimized_prompt
                
                print(f"Successfully optimized prompt for {provider_id}")
                
            except Exception as e:
                print(f"Optimization failed for {provider_id}: {e}")
                
        return optimized_prompts
    
    def _convert_ensemble_feedback_to_examples(
        self, 
        feedback_data: List[Any], 
        provider_id: str
    ) -> List[dspy.Example]:
        """
        Convert ensemble feedback data to DSPy training examples
        """
        examples = []
        
        for feedback in feedback_data:
            # Focus on negative feedback for improvement
            if feedback.get('user_rating', 3) < 3:  # Below average rating
                
                # Extract consensus results for this provider
                provider_results = [
                    result for result in feedback.get('consensus_results', [])
                    if provider_id in result.get('contributing_providers', [])
                ]
                
                if provider_results:
                    example = dspy.Example(
                        content=feedback['content'],
                        golden_nuggets=provider_results,
                        provider_id=provider_id,
                        negative_feedback=True,
                        improvement_suggestions=feedback.get('correction_text', '')
                    )
                    examples.append(example)
            
            # Also include positive examples for balanced training
            elif feedback.get('user_rating', 3) >= 4:  # High rating
                provider_results = [
                    result for result in feedback.get('consensus_results', [])
                    if provider_id in result.get('contributing_providers', [])
                ]
                
                if provider_results:
                    example = dspy.Example(
                        content=feedback['content'],
                        golden_nuggets=provider_results,
                        provider_id=provider_id,
                        negative_feedback=False
                    )
                    examples.append(example)
                    
        return examples
    
    def _get_optimizer_for_provider(self, provider_id: str) -> dspy.teleprompt.Teleprompter:
        """
        Get provider-specific optimizer based on model characteristics
        """
        if provider_id == 'gemini':
            # Gemini works well with bootstrap few-shot
            return dspy.BootstrapFewShot(metric=self._ensemble_quality_metric)
        elif provider_id == 'anthropic':
            # Claude benefits from more sophisticated reasoning
            return dspy.MIPRO(metric=self._ensemble_quality_metric, num_candidates=8)
        elif provider_id in ['openai', 'openrouter']:
            # OpenAI models work well with bootstrap
            return dspy.BootstrapFewShot(metric=self._ensemble_quality_metric)
        else:
            # Default optimizer
            return dspy.BootstrapFewShot(metric=self._ensemble_quality_metric)
    
    def _ensemble_quality_metric(self, example, pred, trace=None) -> float:
        """
        Custom metric for ensemble quality evaluation
        """
        # Score based on:
        # 1. Number of high-quality nuggets
        # 2. Diversity of nugget types  
        # 3. Confidence levels
        # 4. User feedback if available
        
        quality_score = 0.0
        
        if hasattr(pred, 'golden_nuggets'):
            nuggets = pred.golden_nuggets
            
            # Base score from number of nuggets (up to optimal count)
            optimal_count = 8
            count_score = min(len(nuggets), optimal_count) / optimal_count
            quality_score += count_score * 0.3
            
            # Diversity score (different types)
            unique_types = set(nugget.get('type') for nugget in nuggets)
            diversity_score = min(len(unique_types), 5) / 5  # Max 5 types
            quality_score += diversity_score * 0.2
            
            # Confidence score (if available)
            if any('confidence' in nugget for nugget in nuggets):
                avg_confidence = sum(
                    nugget.get('confidence', 0.5) for nugget in nuggets
                ) / len(nuggets)
                quality_score += avg_confidence * 0.3
            
            # Length/detail score (prefer substantial content)
            avg_length = sum(
                len(nugget.get('startContent', '')) for nugget in nuggets
            ) / len(nuggets) if nuggets else 0
            
            length_score = min(avg_length / 100, 1.0)  # Normalize to 0-1
            quality_score += length_score * 0.2
        
        return quality_score
```

### Enhanced Cost Tracking API
**File**: `backend/app/routes/cost_tracking.py`

```python
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
from ..models import CostTrackingEntry, EnsembleFeedback
from ..services.cost_tracking_service import CostTrackingService

router = APIRouter(prefix="/api/cost-tracking", tags=["cost-tracking"])

@router.post("/record")
async def record_extraction_cost(
    entry: CostTrackingEntry,
    service: CostTrackingService = Depends()
) -> Dict[str, str]:
    """
    Record cost for an ensemble extraction
    """
    try:
        await service.record_cost(entry)
        return {"status": "success", "message": "Cost recorded"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user/{user_id}/monthly")
async def get_monthly_costs(
    user_id: str,
    month: Optional[int] = None,
    year: Optional[int] = None,
    service: CostTrackingService = Depends()
) -> Dict[str, Any]:
    """
    Get monthly cost breakdown for user
    """
    costs = await service.get_monthly_costs(user_id, month, year)
    return {
        "user_id": user_id,
        "period": f"{year or datetime.now().year}-{month or datetime.now().month:02d}",
        "total_cost": costs["total"],
        "breakdown_by_provider": costs["by_provider"],
        "breakdown_by_mode": costs["by_mode"],
        "extraction_count": costs["count"],
        "average_cost_per_extraction": costs["average"]
    }

@router.get("/user/{user_id}/projected")
async def get_projected_monthly_cost(
    user_id: str,
    service: CostTrackingService = Depends()
) -> Dict[str, float]:
    """
    Get projected monthly cost based on usage patterns
    """
    projection = await service.calculate_monthly_projection(user_id)
    return {
        "current_month_spend": projection["current"],
        "projected_monthly_total": projection["projected"],
        "days_remaining": projection["days_remaining"],
        "daily_average": projection["daily_average"]
    }

@router.get("/analytics/provider-performance")
async def get_provider_performance_analytics(
    days: int = 30,
    service: CostTrackingService = Depends()
) -> Dict[str, Any]:
    """
    Get provider performance and cost analytics
    """
    analytics = await service.get_provider_analytics(days)
    return {
        "period_days": days,
        "provider_performance": analytics["performance"],
        "cost_efficiency": analytics["cost_efficiency"],
        "user_satisfaction": analytics["satisfaction"],
        "recommendation": analytics["recommendation"]
    }
```

## Backwards Compatibility

### Compatibility Strategy

#### Interface Compatibility
```typescript
// Existing code continues to work unchanged
const provider = await createProvider(config);
const result = await provider.extractGoldenNuggets(content, prompt);
// This still works exactly as before

// New ensemble functionality is additive
const ensembleResult = await ensembleExtractor.extractWithEnsemble(
  content, 
  prompt, 
  provider, 
  { runs: 3 }
);
// New functionality doesn't break existing code
```

#### Message Type Compatibility
```typescript
// Existing message types unchanged
MESSAGE_TYPES.ANALYZE_CONTENT // Still works
MESSAGE_TYPES.ANALYSIS_COMPLETE // Still works

// New message types added
MESSAGE_TYPES.ANALYZE_CONTENT_ENSEMBLE // New
MESSAGE_TYPES.CONSORTIUM_PROGRESS_UPDATE // New

// Response format is backwards compatible
interface AnalysisResponse {
  success: boolean;
  error?: string;
  data?: GoldenNuggetsResponse | EnsembleExtractionResult; // Union type
}
```

#### Storage Compatibility
```typescript
// Existing storage keys unchanged
STORAGE_KEYS.API_KEYS // Still works
STORAGE_KEYS.USER_PROMPTS // Still works

// New storage keys added
STORAGE_KEYS.EXTRACTION_PREFERENCES // New
STORAGE_KEYS.COST_TRACKING // New

// Default values ensure graceful degradation
const preferences = await EnsemblePreferencesStorage.getPreferences();
// Returns defaults if not set, doesn't break existing functionality
```

### Migration Strategy

#### Gradual Feature Rollout
```typescript
// Feature flags for controlled rollout
interface FeatureFlags {
  enableEnsembleExtraction: boolean;
  enableConsortiumMode: boolean;
  enableQualityRanking: boolean;
  defaultToEnsembleForNewUsers: boolean;
}

// Runtime feature checking
function shouldUseEnsemble(user: User, flags: FeatureFlags): boolean {
  if (!flags.enableEnsembleExtraction) return false;
  if (flags.defaultToEnsembleForNewUsers && user.isNewUser) return true;
  return user.preferences?.enableEnsemble ?? false;
}
```

#### Data Migration
```typescript
// Migrate existing user data to new schema
async function migrateUserDataToEnsemble(userId: string): Promise<void> {
  const existingPrefs = await storage.getUserPreferences(userId);
  
  const ensemblePrefs: EnsemblePreferences = {
    defaultExtractionMode: 'balanced', // Safe default
    precisionRecallBalance: 0.5, // Neutral balance
    typePreferences: {
      // Convert existing type filters to preferences
      'tool': existingPrefs.typeFilter?.includes('tool') ? 1.2 : 1.0,
      'media': existingPrefs.typeFilter?.includes('media') ? 1.2 : 1.0,
      // ... other types
    },
    maxMonthlyCost: 25, // Default budget
    enableCostWarnings: true
  };
  
  await EnsemblePreferencesStorage.setPreferences(ensemblePrefs);
}
```

### Deprecation Timeline

#### Phase 1 (Months 1-3): Additive Only
- All new functionality added alongside existing
- No changes to existing APIs
- Optional ensemble features with feature flags

#### Phase 2 (Months 4-6): Gradual Migration  
- Ensemble becomes default for new users
- Existing users get migration prompts
- Performance comparison data collection

#### Phase 3 (Months 7-12): Full Integration
- Ensemble becomes default for all users
- Single extraction available as "fast mode"
- Legacy API endpoints deprecated (but functional)

#### Long-term (12+ months): Optimization
- Remove legacy single-extraction code paths
- Optimize for ensemble-first architecture
- Advanced features like adaptive routing

---

*This API specification provides complete interface definitions for implementing the ensemble extraction system while maintaining full backwards compatibility with the existing codebase.*