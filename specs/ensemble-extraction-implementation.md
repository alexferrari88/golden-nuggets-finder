# Ensemble Extraction Implementation Guide

## Table of Contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Phase 1: Multi-Run Ensemble](#phase-1-multi-run-ensemble-2-3-weeks)
- [Phase 2: Multi-Model Consortium](#phase-2-multi-model-consortium-3-4-weeks)
- [Phase 3: Adaptive Precision Controls](#phase-3-adaptive-precision-controls-2-weeks)
- [Phase 4: Advanced Optimization](#phase-4-advanced-optimization-3-months)
- [Testing Strategy](#testing-strategy)
- [Migration Plan](#migration-plan)
- [Quality Assurance](#quality-assurance)

## Overview

This guide provides step-by-step implementation instructions for the ensemble golden nuggets extraction system. Each phase builds incrementally on the existing codebase, allowing for continuous validation and user feedback.

**Implementation Philosophy**: Build on existing strengths, validate improvements at each phase, maintain backwards compatibility.

## Prerequisites

### Technical Requirements
- Existing multi-provider system (✅ Already implemented)
- Chrome extension development environment
- Node.js/TypeScript development setup
- Backend API for feedback integration

### Knowledge Requirements
- Understanding of current provider system (`src/background/services/provider-factory.ts`)
- Familiarity with message passing system (`src/background/message-handler.ts`)
- Understanding of response normalization (`src/background/services/response-normalizer.ts`)

### Code Analysis Required
Before starting, review these key files:
- `src/shared/types/providers.ts` - Provider interface definitions
- `src/background/message-handler.ts:588` - Current extraction call
- `src/background/services/response-normalizer.ts` - Response processing
- `src/background/type-filter-service.ts` - Current type filtering

## Phase 1: Multi-Run Ensemble (2-3 weeks)

### Goal
Implement single-provider ensemble extraction to validate the approach with minimal complexity and risk.

### Week 1: Core Ensemble Service

#### Step 1.1: Create Ensemble Extractor Service
**File**: `src/background/services/ensemble-extractor.ts`

```typescript
import type { LLMProvider, GoldenNuggetsResponse } from '../../shared/types/providers';
import { normalize } from './response-normalizer';

interface EnsembleExtractionOptions {
  runs: number;
  temperature: number;
  parallelExecution: boolean;
}

interface EnsembleNugget {
  type: string;
  startContent: string;
  endContent: string;
  confidence: number; // 0-1 based on agreement
  runsSupportingThis: number; // How many runs extracted this
  totalRuns: number; // Total runs performed
}

interface EnsembleExtractionResult {
  golden_nuggets: EnsembleNugget[];
  metadata: {
    totalRuns: number;
    consensusReached: number;
    duplicatesRemoved: number;
    averageResponseTime: number;
  };
}

export class EnsembleExtractor {
  
  async extractWithEnsemble(
    content: string,
    prompt: string,
    provider: LLMProvider,
    options: EnsembleExtractionOptions = {
      runs: 3,
      temperature: 0.7,
      parallelExecution: true
    }
  ): Promise<EnsembleExtractionResult> {
    
    console.log(`Starting ensemble extraction with ${options.runs} runs for provider ${provider.providerId}`);
    
    const startTime = performance.now();
    
    // Execute multiple runs in parallel
    const extractionPromises = Array(options.runs).fill(null).map((_, runIndex) => 
      this.executeRunWithErrorHandling(content, prompt, provider, runIndex)
    );
    
    const extractions = await Promise.allSettled(extractionPromises);
    const successfulExtractions = extractions
      .filter((result): result is PromiseFulfilledResult<GoldenNuggetsResponse> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value);
    
    const responseTime = performance.now() - startTime;
    
    console.log(`Completed ${successfulExtractions.length}/${options.runs} successful extractions in ${responseTime}ms`);
    
    // Build consensus from successful extractions
    return this.buildConsensus(successfulExtractions, {
      totalRuns: options.runs,
      successfulRuns: successfulExtractions.length,
      averageResponseTime: responseTime / options.runs
    });
  }
  
  private async executeRunWithErrorHandling(
    content: string,
    prompt: string,
    provider: LLMProvider,
    runIndex: number
  ): Promise<GoldenNuggetsResponse> {
    try {
      console.log(`Executing run ${runIndex + 1} for ${provider.providerId}`);
      
      const rawResponse = await provider.extractGoldenNuggets(content, prompt);
      return normalize(rawResponse, provider.providerId);
      
    } catch (error) {
      console.error(`Run ${runIndex + 1} failed for ${provider.providerId}:`, error);
      // Return empty response rather than failing entire ensemble
      return { golden_nuggets: [] };
    }
  }
  
  private async buildConsensus(
    extractions: GoldenNuggetsResponse[],
    metadata: { totalRuns: number; successfulRuns: number; averageResponseTime: number }
  ): Promise<EnsembleExtractionResult> {
    
    if (extractions.length === 0) {
      return {
        golden_nuggets: [],
        metadata: {
          totalRuns: metadata.totalRuns,
          consensusReached: 0,
          duplicatesRemoved: 0,
          averageResponseTime: metadata.averageResponseTime
        }
      };
    }
    
    // Step 1: Flatten all nuggets from all runs
    const allNuggets = extractions.flatMap(extraction => 
      extraction.golden_nuggets.map(nugget => ({
        ...nugget,
        runId: Math.random().toString(36).substr(2, 9) // Track source
      }))
    );
    
    // Step 2: Group by semantic similarity (simplified for Phase 1)
    const nuggetGroups = this.groupBySimilarity(allNuggets);
    
    // Step 3: Apply majority voting and confidence scoring
    const consensusNuggets = nuggetGroups.map(group => ({
      type: group[0].type,
      startContent: group[0].startContent,
      endContent: group[0].endContent,
      confidence: group.length / metadata.successfulRuns,
      runsSupportingThis: group.length,
      totalRuns: metadata.totalRuns
    }));
    
    // Step 4: Sort by confidence (highest first)
    const sortedNuggets = consensusNuggets.sort((a, b) => b.confidence - a.confidence);
    
    return {
      golden_nuggets: sortedNuggets,
      metadata: {
        totalRuns: metadata.totalRuns,
        consensusReached: sortedNuggets.length,
        duplicatesRemoved: allNuggets.length - sortedNuggets.length,
        averageResponseTime: metadata.averageResponseTime
      }
    };
  }
  
  private groupBySimilarity(nuggets: any[]): any[][] {
    // Simplified similarity grouping for Phase 1
    // Groups nuggets by exact type and similar startContent
    const groups: any[][] = [];
    
    for (const nugget of nuggets) {
      const existingGroup = groups.find(group => 
        group[0].type === nugget.type && 
        this.calculateSimpleSimilarity(group[0].startContent, nugget.startContent) > 0.8
      );
      
      if (existingGroup) {
        existingGroup.push(nugget);
      } else {
        groups.push([nugget]);
      }
    }
    
    return groups;
  }
  
  private calculateSimpleSimilarity(text1: string, text2: string): number {
    // Simplified similarity for Phase 1 - just check overlap
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const intersection = words1.filter(word => words2.includes(word));
    const union = new Set([...words1, ...words2]);
    
    return intersection.length / union.size;
  }
}
```

#### Step 1.2: Update Provider Interface (Optional for Phase 1)
**File**: `src/shared/types/providers.ts`

Add optional ensemble method to existing interface:
```typescript
export interface LLMProvider {
  readonly providerId: ProviderId;
  readonly modelName: string;
  extractGoldenNuggets(content: string, prompt: string): Promise<GoldenNuggetsResponse>;
  validateApiKey(): Promise<boolean>;
  
  // New: Optional ensemble support
  extractGoldenNuggetsEnsemble?(
    content: string, 
    prompt: string, 
    runs: number
  ): Promise<EnsembleExtractionResult>;
}
```

### Week 2: Integration with Message Handler

#### Step 2.1: Add Ensemble Message Types
**File**: `src/shared/types.ts`

```typescript
// Add to MESSAGE_TYPES enum
export const MESSAGE_TYPES = {
  // ... existing types ...
  
  // New ensemble types
  ANALYZE_CONTENT_ENSEMBLE: 'analyze_content_ensemble',
  ENSEMBLE_EXTRACTION_PROGRESS: 'ensemble_extraction_progress',
  ENSEMBLE_CONSENSUS_COMPLETE: 'ensemble_consensus_complete',
} as const;

// New request type
export interface EnsembleAnalysisRequest extends BaseMessage {
  type: typeof MESSAGE_TYPES.ANALYZE_CONTENT_ENSEMBLE;
  content: string;
  promptId: string;
  url: string;
  analysisId?: string;
  ensembleOptions?: {
    runs: number;
    mode: 'fast' | 'balanced' | 'comprehensive';
  };
  typeFilter?: TypeFilterOptions;
}

// Enhanced response with ensemble data
export interface EnsembleAnalysisResponse extends BaseResponse {
  data?: EnsembleExtractionResult & {
    providerMetadata: any;
  };
}
```

#### Step 2.2: Update Message Handler
**File**: `src/background/message-handler.ts`

Add ensemble handling to existing `MessageHandler` class:
```typescript
// Add import
import { EnsembleExtractor } from './services/ensemble-extractor';

export class MessageHandler {
  private ensembleExtractor = new EnsembleExtractor();
  
  // Add to handleMessage switch statement
  case MESSAGE_TYPES.ANALYZE_CONTENT_ENSEMBLE:
    await this.handleAnalyzeContentEnsemble(request, sender, sendResponse);
    break;
  
  // New handler method
  private async handleAnalyzeContentEnsemble(
    request: EnsembleAnalysisRequest,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: EnsembleAnalysisResponse) => void,
  ): Promise<void> {
    try {
      const analysisId = request.analysisId || generateAnalysisId();
      
      // Get prompt and validate persona (same as existing)
      const prompts = await storage.getPrompts();
      const prompt = prompts.find((p) => p.id === request.promptId);
      
      if (!prompt) {
        sendResponse({ success: false, error: "Prompt not found" });
        return;
      }
      
      // Send enhanced progress: ensemble extraction starting
      this.sendProgressMessage(
        MESSAGE_TYPES.ENSEMBLE_EXTRACTION_PROGRESS,
        1,
        `Starting ensemble extraction (${request.ensembleOptions?.runs || 3} runs)`,
        analysisId,
        request.source || 'context-menu',
        sender.tab?.id,
      );
      
      // Get provider configuration
      const providerConfig = await MessageHandler.getSelectedProvider();
      const provider = await createProvider(providerConfig);
      
      // Process prompt (same as existing system)
      let processedPrompt = this.replaceSourcePlaceholder(prompt.prompt, request.url);
      processedPrompt = await this.replacePersonaPlaceholder(processedPrompt);
      
      // Apply type filtering if specified
      if (request.typeFilter && request.typeFilter.selectedTypes.length > 0) {
        processedPrompt = generateFilteredPrompt(
          processedPrompt,
          request.typeFilter.selectedTypes,
        );
      }
      
      // Send progress: consensus building
      this.sendProgressMessage(
        MESSAGE_TYPES.ENSEMBLE_EXTRACTION_PROGRESS,
        2,
        'Building consensus across runs',
        analysisId,
        request.source || 'context-menu', 
        sender.tab?.id,
      );
      
      // Execute ensemble extraction
      const ensembleOptions = {
        runs: request.ensembleOptions?.runs || 3,
        temperature: 0.7,
        parallelExecution: true
      };
      
      const result = await this.ensembleExtractor.extractWithEnsemble(
        request.content,
        processedPrompt,
        provider,
        ensembleOptions
      );
      
      // Send progress: processing results  
      this.sendProgressMessage(
        MESSAGE_TYPES.ENSEMBLE_CONSENSUS_COMPLETE,
        3,
        'Processing ensemble results',
        analysisId,
        request.source || 'context-menu',
        sender.tab?.id,
      );
      
      // Add provider metadata
      const resultWithMetadata = {
        ...result,
        providerMetadata: {
          providerId: provider.providerId,
          modelName: provider.modelName,
          ensembleRuns: ensembleOptions.runs,
          consensusMethod: 'majority-voting-v1'
        }
      };
      
      // Send results to content script
      if (sender.tab?.id) {
        await chrome.tabs.sendMessage(sender.tab.id, {
          type: MESSAGE_TYPES.ANALYSIS_COMPLETE,
          data: resultWithMetadata,
        });
      }
      
      sendResponse({ success: true, data: resultWithMetadata });
      
    } catch (error) {
      console.error("Ensemble analysis failed:", error);
      sendResponse({ success: false, error: (error as Error).message });
    }
  }
}
```

### Week 3: UI Integration and Testing

#### Step 3.1: Add Ensemble Option to Context Menu
**File**: `src/entrypoints/background.ts`

Update context menu creation to include ensemble option:
```typescript
// Add to existing context menu creation
const ensembleMenuId = chrome.contextMenus.create({
  id: 'ensemble_analysis',
  title: '🎯 Ensemble Analysis (3 runs)',
  contexts: ['page', 'selection'],
  parentId: 'parent'
});

// Add to click handler
case 'ensemble_analysis':
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content-scripts/content.js']
  });
  
  await chrome.tabs.sendMessage(tab.id, {
    type: MESSAGE_TYPES.ANALYZE_CONTENT_ENSEMBLE,
    promptId: 'default',
    ensembleOptions: { runs: 3, mode: 'balanced' }
  });
  break;
```

#### Step 3.2: Enhance Progress Display
**File**: `src/content/ui/notifications.ts`

Update progress display for ensemble operations:
```typescript
// Add ensemble-specific progress messages
const ENSEMBLE_PROGRESS_MESSAGES = {
  1: (runs: number) => `🎯 Starting ensemble extraction (${runs} runs)`,
  2: (runs: number) => `🧮 Building consensus across ${runs} runs`,
  3: (consensus: number) => `✨ Processed ${consensus} consensus nuggets`
};

// Update existing progress handler to support ensemble messages
function updateEnsembleProgress(message: AnalysisProgressMessage) {
  if (message.type === MESSAGE_TYPES.ENSEMBLE_EXTRACTION_PROGRESS) {
    const progressText = ENSEMBLE_PROGRESS_MESSAGES[message.step](
      message.ensembleRuns || 3
    );
    updateProgressDisplay(progressText, message.step, 3);
  }
}
```

#### Step 3.3: Display Confidence Scores
**File**: `src/content/ui/sidebar.ts`

Enhance nugget display to show confidence:
```typescript
// Update nugget rendering to include confidence
function renderNuggetWithConfidence(nugget: EnsembleNugget): string {
  const confidenceStars = '⭐'.repeat(Math.ceil(nugget.confidence * 5));
  const agreementText = `${nugget.runsSupportingThis}/${nugget.totalRuns} runs agreed`;
  
  return `
    <div class="nugget-item" data-confidence="${nugget.confidence}">
      <div class="nugget-type">${getTypeEmoji(nugget.type)} ${nugget.type}</div>
      <div class="nugget-content">${nugget.startContent}...</div>
      <div class="nugget-confidence">
        <span class="confidence-stars">${confidenceStars}</span>
        <span class="confidence-text">(${agreementText})</span>
      </div>
    </div>
  `;
}
```

### Testing Phase 1

#### Unit Tests
**File**: `src/background/services/ensemble-extractor.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnsembleExtractor } from './ensemble-extractor';

describe('EnsembleExtractor', () => {
  let ensembleExtractor: EnsembleExtractor;
  let mockProvider: MockProvider;
  
  beforeEach(() => {
    ensembleExtractor = new EnsembleExtractor();
    mockProvider = createMockProvider();
  });
  
  it('should extract with multiple runs and build consensus', async () => {
    // Mock 3 different responses with some overlap
    mockProvider.extractGoldenNuggets
      .mockResolvedValueOnce({ golden_nuggets: [nugget1, nugget2] })
      .mockResolvedValueOnce({ golden_nuggets: [nugget1, nugget3] })
      .mockResolvedValueOnce({ golden_nuggets: [nugget2, nugget3] });
    
    const result = await ensembleExtractor.extractWithEnsemble(
      'test content',
      'test prompt', 
      mockProvider,
      { runs: 3, temperature: 0.7, parallelExecution: true }
    );
    
    expect(result.golden_nuggets).toHaveLength(3);
    expect(result.metadata.totalRuns).toBe(3);
    expect(result.metadata.consensusReached).toBe(3);
    
    // Verify confidence scores
    const nuggetsByConfidence = result.golden_nuggets.sort((a, b) => b.confidence - a.confidence);
    expect(nuggetsByConfidence[0].confidence).toBeGreaterThan(0.6); // Should have high agreement
  });
  
  it('should handle partial failures gracefully', async () => {
    mockProvider.extractGoldenNuggets
      .mockResolvedValueOnce({ golden_nuggets: [nugget1] })
      .mockRejectedValueOnce(new Error('API failure'))
      .mockResolvedValueOnce({ golden_nuggets: [nugget1] });
    
    const result = await ensembleExtractor.extractWithEnsemble(
      'test content',
      'test prompt',
      mockProvider,
      { runs: 3, temperature: 0.7, parallelExecution: true }
    );
    
    expect(result.golden_nuggets).toHaveLength(1);
    expect(result.metadata.totalRuns).toBe(3);
    expect(result.golden_nuggets[0].confidence).toBe(2/3); // 2 out of 3 runs succeeded
  });
});
```

#### Integration Tests
Test ensemble extraction end-to-end:
- Verify context menu integration
- Test progress message flow
- Validate confidence score display
- Ensure error handling works

### Phase 1 Success Criteria
- [ ] 3-run ensemble extraction working for single provider
- [ ] Confidence scores displayed in UI
- [ ] Progress tracking shows ensemble-specific messages  
- [ ] No regression in existing functionality
- [ ] Test coverage >90% for new components

## Phase 2: Multi-Model Consortium (3-4 weeks)

### Goal
Extend single-provider ensemble to multi-provider consortium with advanced consensus mechanisms.

### Week 1: Consortium Extractor Service

#### Step 2.1: Create Consortium Extractor
**File**: `src/background/services/consortium-extractor.ts`

```typescript
import { EnsembleExtractor } from './ensemble-extractor';
import { SemanticDeduplicator } from './semantic-deduplicator';
import { ConsensusEngine } from './consensus-engine';
import type { LLMProvider } from '../../shared/types/providers';

interface ConsortiumOptions {
  providers: LLMProvider[];
  runsPerProvider: number;
  consensusThreshold: number; // Minimum agreement required
  qualityThreshold: number; // Minimum quality score
}

interface ConsortiumExtractionResult extends EnsembleExtractionResult {
  metadata: EnsembleExtractionResult['metadata'] & {
    providersUsed: string[];
    crossModelAgreement: number; // Agreement between different models
    providerPerformance: Record<string, ProviderPerformance>;
  };
}

interface ProviderPerformance {
  successfulRuns: number;
  totalRuns: number;
  averageResponseTime: number;
  uniqueContributions: number; // Nuggets only this provider found
}

export class ConsortiumExtractor {
  private ensembleExtractor = new EnsembleExtractor();
  private semanticDeduplicator = new SemanticDeduplicator();
  private consensusEngine = new ConsensusEngine();
  
  async extractWithConsortium(
    content: string,
    prompt: string,
    providers: LLMProvider[],
    options: ConsortiumOptions
  ): Promise<ConsortiumExtractionResult> {
    
    console.log(`Starting consortium extraction with ${providers.length} providers, ${options.runsPerProvider} runs each`);
    
    const startTime = performance.now();
    
    // Stage 1: Parallel extraction from all providers
    const providerResults = await Promise.allSettled(
      providers.map(provider => 
        this.extractFromProvider(content, prompt, provider, options.runsPerProvider)
      )
    );
    
    const successfulResults = providerResults
      .filter((result): result is PromiseFulfilledResult<{ 
        provider: string; 
        result: EnsembleExtractionResult 
      }> => result.status === 'fulfilled')
      .map(result => result.value);
    
    console.log(`Consortium extraction: ${successfulResults.length}/${providers.length} providers succeeded`);
    
    // Stage 2: Semantic deduplication across all provider results
    const allNuggets = successfulResults.flatMap(providerResult => 
      providerResult.result.golden_nuggets.map(nugget => ({
        ...nugget,
        sourceProvider: providerResult.provider,
        providerConfidence: nugget.confidence
      }))
    );
    
    const deduplicatedNuggets = await this.semanticDeduplicator.deduplicate(
      allNuggets,
      { similarityThreshold: 0.8 }
    );
    
    // Stage 3: Cross-model consensus building
    const consensusNuggets = await this.consensusEngine.buildConsensus(
      deduplicatedNuggets,
      { 
        minimumAgreement: options.consensusThreshold,
        votingMethod: 'majority',
        confidenceWeighting: true
      }
    );
    
    // Calculate performance metrics
    const responseTime = performance.now() - startTime;
    const providerPerformance = this.calculateProviderPerformance(successfulResults);
    
    return {
      golden_nuggets: consensusNuggets,
      metadata: {
        totalRuns: providers.length * options.runsPerProvider,
        consensusReached: consensusNuggets.length,
        duplicatesRemoved: allNuggets.length - deduplicatedNuggets.length,
        averageResponseTime: responseTime / providers.length,
        providersUsed: providers.map(p => p.providerId),
        crossModelAgreement: this.calculateCrossModelAgreement(consensusNuggets),
        providerPerformance
      }
    };
  }
  
  private async extractFromProvider(
    content: string,
    prompt: string,
    provider: LLMProvider,
    runs: number
  ): Promise<{ provider: string; result: EnsembleExtractionResult }> {
    
    try {
      const result = await this.ensembleExtractor.extractWithEnsemble(
        content,
        this.adaptPromptForProvider(prompt, provider),
        provider,
        { runs, temperature: 0.7, parallelExecution: true }
      );
      
      return { provider: provider.providerId, result };
      
    } catch (error) {
      console.error(`Provider ${provider.providerId} failed:`, error);
      throw error;
    }
  }
  
  private adaptPromptForProvider(prompt: string, provider: LLMProvider): string {
    // Adapt prompt based on provider strengths (Phase 2 enhancement)
    const providerAdaptations = {
      gemini: 'Focus on structured analysis and pattern recognition.',
      anthropic: 'Emphasize detailed explanations and software engineering insights.',
      openai: 'Leverage creative analogies and general knowledge connections.',
      openrouter: 'Apply specialized domain knowledge and diverse perspectives.'
    };
    
    const adaptation = providerAdaptations[provider.providerId] || '';
    return `${prompt}\n\nProvider-specific guidance: ${adaptation}`;
  }
  
  private calculateProviderPerformance(results: any[]): Record<string, ProviderPerformance> {
    // Calculate detailed performance metrics for each provider
    const performance: Record<string, ProviderPerformance> = {};
    
    for (const result of results) {
      performance[result.provider] = {
        successfulRuns: result.result.metadata.consensusReached,
        totalRuns: result.result.metadata.totalRuns,
        averageResponseTime: result.result.metadata.averageResponseTime,
        uniqueContributions: this.calculateUniqueContributions(result, results)
      };
    }
    
    return performance;
  }
}
```

### Week 2: Advanced Consensus Components

#### Step 2.2: Semantic Deduplicator
**File**: `src/background/services/semantic-deduplicator.ts`

```typescript
interface DeduplicationOptions {
  similarityThreshold: number; // 0.8 recommended by research
  algorithm: 'simple' | 'embedding' | 'hybrid';
}

export class SemanticDeduplicator {
  
  async deduplicate(
    nuggets: EnsembleNugget[],
    options: DeduplicationOptions
  ): Promise<EnsembleNugget[]> {
    
    if (nuggets.length === 0) return nuggets;
    
    console.log(`Deduplicating ${nuggets.length} nuggets with threshold ${options.similarityThreshold}`);
    
    // Group nuggets by type first (tools with tools, media with media, etc.)
    const nuggetsByType = this.groupByType(nuggets);
    
    // Deduplicate within each type
    const deduplicatedByType = await Promise.all(
      Object.entries(nuggetsByType).map(([type, typeNuggets]) =>
        this.deduplicateWithinType(typeNuggets, options)
      )
    );
    
    const deduplicatedNuggets = deduplicatedByType.flat();
    
    console.log(`Deduplication: ${nuggets.length} → ${deduplicatedNuggets.length} nuggets`);
    
    return deduplicatedNuggets;
  }
  
  private async deduplicateWithinType(
    nuggets: EnsembleNugget[],
    options: DeduplicationOptions
  ): Promise<EnsembleNugget[]> {
    
    if (nuggets.length <= 1) return nuggets;
    
    // Implementation of SemDeDup algorithm (simplified)
    const groups: EnsembleNugget[][] = [];
    
    for (const nugget of nuggets) {
      const similarGroup = groups.find(group => 
        this.calculateSemanticSimilarity(
          group[0].startContent, 
          nugget.startContent
        ) > options.similarityThreshold
      );
      
      if (similarGroup) {
        similarGroup.push(nugget);
      } else {
        groups.push([nugget]);
      }
    }
    
    // From each group, select the nugget with highest confidence
    return groups.map(group => 
      group.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      )
    );
  }
  
  private calculateSemanticSimilarity(text1: string, text2: string): number {
    // Phase 2: Enhanced similarity calculation
    // This would use embeddings in a full implementation
    // For now, use improved word-level similarity
    
    const words1 = this.normalizeText(text1).split(/\s+/);
    const words2 = this.normalizeText(text2).split(/\s+/);
    
    // Calculate Jaccard similarity with stemming
    const stemmed1 = new Set(words1.map(this.simpleStem));
    const stemmed2 = new Set(words2.map(this.simpleStem));
    
    const intersection = new Set([...stemmed1].filter(x => stemmed2.has(x)));
    const union = new Set([...stemmed1, ...stemmed2]);
    
    return intersection.size / union.size;
  }
  
  private normalizeText(text: string): string {
    // Advanced text normalization
    return text
      .toLowerCase()
      .replace(/['']/g, "'")  // Normalize apostrophes
      .replace(/[""]/g, '"')  // Normalize quotes  
      .replace(/[–—]/g, '-')  // Normalize dashes
      .replace(/\s+/g, ' ')   // Normalize whitespace
      .trim();
  }
  
  private simpleStem(word: string): string {
    // Very basic stemming for Phase 2
    return word.replace(/(?:ing|ed|s)$/, '').toLowerCase();
  }
}
```

### Week 3-4: Cross-Model Consensus Engine

#### Step 2.3: Consensus Engine
**File**: `src/background/services/consensus-engine.ts`

```typescript
interface ConsensusOptions {
  minimumAgreement: number; // Minimum models that must agree (e.g., 2 out of 4)
  votingMethod: 'majority' | 'weighted' | 'confidence-based';
  confidenceWeighting: boolean;
}

interface ConsensusNugget extends EnsembleNugget {
  modelAgreement: {
    total: number;
    sources: string[]; // Which providers agreed
    agreementLevel: 'high' | 'medium' | 'low';
    crossModelConfidence: number; // Agreement across different models
  };
}

export class ConsensusEngine {
  
  async buildConsensus(
    nuggets: EnsembleNugget[],
    options: ConsensusOptions
  ): Promise<ConsensusNugget[]> {
    
    console.log(`Building consensus from ${nuggets.length} nuggets with ${options.votingMethod} voting`);
    
    // Group nuggets by semantic similarity across all providers
    const similarityGroups = await this.groupBySemanticSimilarity(nuggets);
    
    // Apply voting scheme to each group
    const consensusResults = similarityGroups
      .map(group => this.applyVotingScheme(group, options))
      .filter(result => result !== null) as ConsensusNugget[];
    
    // Sort by cross-model confidence
    const sortedResults = consensusResults.sort((a, b) => 
      b.modelAgreement.crossModelConfidence - a.modelAgreement.crossModelConfidence
    );
    
    console.log(`Consensus: ${nuggets.length} → ${consensusResults.length} nuggets after voting`);
    
    return sortedResults;
  }
  
  private async groupBySemanticSimilarity(
    nuggets: EnsembleNugget[]
  ): Promise<EnsembleNugget[][]> {
    
    const groups: EnsembleNugget[][] = [];
    
    for (const nugget of nuggets) {
      const similarGroup = groups.find(group => 
        this.crossProviderSimilarity(group[0], nugget) > 0.8
      );
      
      if (similarGroup) {
        similarGroup.push(nugget);
      } else {
        groups.push([nugget]);
      }
    }
    
    return groups;
  }
  
  private applyVotingScheme(
    group: EnsembleNugget[],
    options: ConsensusOptions
  ): ConsensusNugget | null {
    
    if (group.length < options.minimumAgreement) {
      return null; // Not enough agreement
    }
    
    // Get unique providers in this group
    const uniqueProviders = new Set(
      group.map(nugget => nugget.sourceProvider)
    );
    
    // Select representative nugget (highest confidence)
    const representative = group.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );
    
    const crossModelConfidence = this.calculateCrossModelConfidence(group, uniqueProviders.size);
    
    return {
      ...representative,
      confidence: Math.min(representative.confidence, crossModelConfidence),
      modelAgreement: {
        total: group.length,
        sources: Array.from(uniqueProviders),
        agreementLevel: this.determineAgreementLevel(group.length, uniqueProviders.size),
        crossModelConfidence
      }
    };
  }
  
  private calculateCrossModelConfidence(group: EnsembleNugget[], uniqueProviders: number): number {
    // Higher confidence when multiple different models agree vs same model multiple times
    const modelDiversityBonus = Math.min(uniqueProviders / 4, 1); // Up to 4 providers
    const consensusStrength = group.length / 12; // Out of maximum possible (3 runs × 4 providers)
    
    return (modelDiversityBonus * 0.7) + (consensusStrength * 0.3);
  }
  
  private determineAgreementLevel(totalAgreement: number, uniqueProviders: number): 'high' | 'medium' | 'low' {
    if (uniqueProviders >= 3) return 'high';
    if (uniqueProviders >= 2 || totalAgreement >= 4) return 'medium';
    return 'low';
  }
}
```

### Week 2: Provider Orchestration Enhancement

#### Step 2.4: Enhanced Message Handler Integration
**File**: `src/background/message-handler.ts`

Replace single-provider extraction with consortium extraction:
```typescript
// Update handleExtractGoldenNuggets method
static async handleExtractGoldenNuggets(
  content: string,
  prompt: string,
  analysisId?: string,
  tabId?: number,
  extractionMode: 'single' | 'ensemble' | 'consortium' = 'single'
): Promise<GoldenNuggetsResponse | ConsortiumExtractionResult> {
  
  if (extractionMode === 'consortium') {
    return await this.handleConsortiumExtraction(content, prompt, analysisId, tabId);
  } else if (extractionMode === 'ensemble') {
    return await this.handleEnsembleExtraction(content, prompt, analysisId, tabId);
  } else {
    // Keep existing single extraction for backwards compatibility
    return await this.handleSingleExtraction(content, prompt, analysisId, tabId);
  }
}

private static async handleConsortiumExtraction(
  content: string,
  prompt: string, 
  analysisId?: string,
  tabId?: number
): Promise<ConsortiumExtractionResult> {
  
  // Get all configured providers
  const availableProviders = await getAvailableProviders();
  const providers: LLMProvider[] = [];
  
  for (const providerId of availableProviders) {
    try {
      const apiKey = await getApiKey(providerId);
      const modelName = await getSelectedModel(providerId);
      const provider = await createProvider({ providerId, apiKey, modelName });
      providers.push(provider);
    } catch (error) {
      console.warn(`Failed to create provider ${providerId}:`, error);
      // Continue with other providers
    }
  }
  
  if (providers.length === 0) {
    throw new Error("No providers available for consortium extraction");
  }
  
  console.log(`Consortium extraction using ${providers.length} providers:`, 
    providers.map(p => p.providerId).join(', '));
  
  const consortiumExtractor = new ConsortiumExtractor();
  
  return await consortiumExtractor.extractWithConsortium(
    content,
    prompt,
    providers,
    {
      runsPerProvider: 3,
      consensusThreshold: 2, // At least 2 models must agree
      qualityThreshold: 0.5
    }
  );
}
```

### Week 3: UI Enhancement for Consortium Results

#### Step 2.5: Enhanced Result Display
**File**: `src/content/ui/sidebar.ts`

```typescript
// Enhanced nugget display with provider information
function renderConsortiumNugget(nugget: ConsensusNugget): string {
  const { modelAgreement } = nugget;
  const providerIcons = {
    gemini: '🔷',
    anthropic: '🟡', 
    openai: '🟢',
    openrouter: '🔶'
  };
  
  const agreementIcons = modelAgreement.sources
    .map(provider => providerIcons[provider] || '❓')
    .join('');
  
  const confidenceLevel = modelAgreement.agreementLevel;
  const confidenceClass = `confidence-${confidenceLevel}`;
  
  return `
    <div class="nugget-item consortium-nugget ${confidenceClass}">
      <div class="nugget-header">
        <span class="nugget-type">${getTypeEmoji(nugget.type)} ${nugget.type}</span>
        <div class="model-agreement">
          <span class="provider-icons">${agreementIcons}</span>
          <span class="agreement-text">${modelAgreement.total} extractions</span>
          <span class="confidence-score">${Math.round(nugget.confidence * 100)}%</span>
        </div>
      </div>
      <div class="nugget-content">${nugget.startContent}...</div>
      <div class="nugget-meta">
        <span class="agreement-level">${confidenceLevel} agreement</span>
        <span class="cross-model-confidence">Cross-model: ${Math.round(modelAgreement.crossModelConfidence * 100)}%</span>
      </div>
    </div>
  `;
}

// Add CSS styles for consortium display
const consortiumStyles = `
  .consortium-nugget {
    border-left: 3px solid var(--border-color);
    position: relative;
  }
  
  .confidence-high { border-left-color: #10b981; }
  .confidence-medium { border-left-color: #f59e0b; }
  .confidence-low { border-left-color: #ef4444; }
  
  .model-agreement {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--text-secondary);
  }
  
  .provider-icons {
    display: flex;
    gap: 2px;
  }
  
  .confidence-score {
    font-weight: 600;
    color: var(--text-primary);
  }
`;
```

### Testing Phase 2

#### Integration Tests
**File**: `tests/e2e/consortium-extraction.spec.ts`

```typescript
import { test, expect } from './fixtures';

test.describe('Consortium Extraction', () => {
  test('should extract with multiple providers and show consensus', async ({ page, extensionId }) => {
    // Navigate to test page
    await page.goto('https://news.ycombinator.com/item?id=example');
    
    // Trigger consortium analysis
    await page.click('text=🎯 Consortium Analysis');
    
    // Wait for progress indicators
    await expect(page.locator('.progress-message')).toContainText('Starting consortium extraction');
    await expect(page.locator('.progress-message')).toContainText('Building cross-model consensus');
    
    // Wait for results
    await page.waitForSelector('.consortium-nugget', { timeout: 45000 }); // Allow time for multiple API calls
    
    // Verify consortium-specific features
    const nuggets = page.locator('.consortium-nugget');
    await expect(nuggets).toHaveCount.greaterThan(0);
    
    // Check confidence displays
    await expect(page.locator('.confidence-score')).toHaveCount.greaterThan(0);
    await expect(page.locator('.provider-icons')).toHaveCount.greaterThan(0);
    
    // Verify high-confidence nuggets appear first
    const firstNugget = nuggets.first();
    const lastNugget = nuggets.last();
    
    const firstConfidence = await firstNugget.locator('.confidence-score').textContent();
    const lastConfidence = await lastNugget.locator('.confidence-score').textContent();
    
    expect(parseInt(firstConfidence!)).toBeGreaterThanOrEqual(parseInt(lastConfidence!));
  });
  
  test('should handle provider failures gracefully', async ({ page }) => {
    // Test with only some providers configured
    // Verify graceful degradation
  });
});
```

### Phase 2 Success Criteria
- [ ] Multi-provider parallel extraction working
- [ ] Semantic deduplication reducing duplicates by 40%+
- [ ] Cross-model consensus showing higher confidence for agreed-upon nuggets
- [ ] UI displaying provider agreement and confidence levels
- [ ] Performance within acceptable bounds (<45 seconds for comprehensive analysis)

## Phase 3: Adaptive Precision Controls (2 weeks)

### Goal
Add user-configurable extraction modes and dynamic precision/recall balancing.

### Week 1: User Preference System

#### Step 3.1: Extraction Mode Configuration
**File**: `src/shared/types.ts`

```typescript
// Add extraction mode types
export interface ExtractionModeConfig {
  name: 'fast' | 'balanced' | 'comprehensive' | 'custom';
  providers: number; // How many providers to use
  runsPerProvider: number;
  consensusThreshold: number; // Minimum agreement required
  qualityThreshold: number; // Minimum quality score
  estimatedTime: string;
  estimatedCost: string;
}

export const EXTRACTION_MODES: Record<string, ExtractionModeConfig> = {
  fast: {
    name: 'fast',
    providers: 1,
    runsPerProvider: 1,
    consensusThreshold: 1,
    qualityThreshold: 0.3,
    estimatedTime: '~5 seconds',
    estimatedCost: '$0.003'
  },
  balanced: {
    name: 'balanced', 
    providers: 2,
    runsPerProvider: 2,
    consensusThreshold: 2,
    qualityThreshold: 0.5,
    estimatedTime: '~15 seconds',
    estimatedCost: '$0.012'
  },
  comprehensive: {
    name: 'comprehensive',
    providers: 4,
    runsPerProvider: 3,
    consensusThreshold: 2,
    qualityThreshold: 0.3, // Lower to allow more results
    estimatedTime: '~30 seconds',
    estimatedCost: '$0.036'
  }
};
```

#### Step 3.2: Options Page Enhancement
**File**: `src/entrypoints/options.tsx`

Add extraction mode configuration:
```typescript
// Add to existing Options component
const ExtractionModeSettings = () => {
  const [selectedMode, setSelectedMode] = useState<string>('balanced');
  const [customConfig, setCustomConfig] = useState<ExtractionModeConfig>();
  
  return (
    <div className="extraction-mode-settings">
      <h3>Golden Nuggets Extraction Mode</h3>
      
      <div className="mode-selection">
        {Object.entries(EXTRACTION_MODES).map(([key, config]) => (
          <div key={key} className="mode-option">
            <input 
              type="radio" 
              id={key}
              checked={selectedMode === key}
              onChange={() => setSelectedMode(key)}
            />
            <label htmlFor={key}>
              <strong>{config.name}</strong>
              <div className="mode-details">
                {config.estimatedTime} • {config.estimatedCost} per analysis
              </div>
              <div className="mode-description">
                {config.providers} provider{config.providers > 1 ? 's' : ''} × {config.runsPerProvider} run{config.runsPerProvider > 1 ? 's' : ''}
              </div>
            </label>
          </div>
        ))}
      </div>
      
      <div className="precision-recall-controls">
        <h4>Precision vs Recall Balance</h4>
        <div className="slider-container">
          <label>More Results (Recall)</label>
          <input 
            type="range" 
            min="0.3" 
            max="0.9" 
            step="0.1"
            value={customConfig?.qualityThreshold || 0.5}
            onChange={(e) => updateQualityThreshold(parseFloat(e.target.value))}
          />
          <label>Higher Quality (Precision)</label>
        </div>
        <div className="threshold-explanation">
          Current: {Math.round((customConfig?.qualityThreshold || 0.5) * 100)}% minimum confidence
        </div>
      </div>
      
      <div className="cost-estimate">
        <h4>Monthly Cost Estimate</h4>
        <div>Based on 50 analyses/month: ~${calculateMonthlyCost(selectedMode)}</div>
      </div>
    </div>
  );
};
```

### Week 2: Quality Ranking Implementation

#### Step 3.3: Quality Ranker Service
**File**: `src/background/services/quality-ranker.ts`

```typescript
interface RankingOptions {
  metric: 'R@P50' | 'R@P70' | 'R@P90'; // Research-recommended metrics
  userQualityThreshold: number; // 0.3-0.9 range
  typePreferences?: Record<string, number>; // User preferences by type
}

interface RankedNugget extends ConsensusNugget {
  qualityScore: number; // 0-1 composite quality score
  rankingFactors: {
    confidence: number;
    crossModelAgreement: number;
    typePreference: number;
    uniqueness: number;
  };
}

export class QualityRanker {
  
  async rankNuggets(
    nuggets: ConsensusNugget[],
    options: RankingOptions
  ): Promise<RankedNugget[]> {
    
    console.log(`Ranking ${nuggets.length} nuggets with ${options.metric} metric`);
    
    // Calculate quality scores for all nuggets
    const rankedNuggets = nuggets.map(nugget => {
      const rankingFactors = this.calculateRankingFactors(nugget, nuggets, options);
      const qualityScore = this.calculateCompositeQualityScore(rankingFactors);
      
      return {
        ...nugget,
        qualityScore,
        rankingFactors
      } as RankedNugget;
    });
    
    // Apply quality threshold filter
    const filteredNuggets = rankedNuggets.filter(nugget => 
      nugget.qualityScore >= options.userQualityThreshold
    );
    
    // Sort by quality score (highest first)
    const sortedNuggets = filteredNuggets.sort((a, b) => b.qualityScore - a.qualityScore);
    
    console.log(`Quality ranking: ${nuggets.length} → ${sortedNuggets.length} nuggets after threshold filter`);
    
    return sortedNuggets;
  }
  
  private calculateRankingFactors(
    nugget: ConsensusNugget, 
    allNuggets: ConsensusNugget[],
    options: RankingOptions
  ) {
    return {
      confidence: nugget.confidence, // Direct confidence score
      crossModelAgreement: nugget.modelAgreement.crossModelConfidence, // Cross-model consensus
      typePreference: options.typePreferences?.[nugget.type] || 1.0, // User type preferences
      uniqueness: this.calculateUniqueness(nugget, allNuggets) // How unique/novel this nugget is
    };
  }
  
  private calculateCompositeQualityScore(factors: RankingFactors): number {
    // Research-based weighting (can be tuned based on user feedback)
    return (
      factors.confidence * 0.4 +           // Most important: model confidence
      factors.crossModelAgreement * 0.3 +  // Second: cross-model consensus  
      factors.typePreference * 0.2 +       // Third: user preferences
      factors.uniqueness * 0.1             // Fourth: novelty bonus
    );
  }
  
  private calculateUniqueness(nugget: ConsensusNugget, allNuggets: ConsensusNugget[]): number {
    // Higher score for nuggets that are semantically distinct from others
    const similarities = allNuggets
      .filter(other => other !== nugget)
      .map(other => this.calculateContentSimilarity(nugget.startContent, other.startContent));
    
    if (similarities.length === 0) return 1.0;
    
    const maxSimilarity = Math.max(...similarities);
    return 1 - maxSimilarity; // More unique = higher score
  }
}
```

### Testing Phase 3

#### User Experience Tests  
**File**: `tests/e2e/adaptive-precision.spec.ts`

```typescript
test.describe('Adaptive Precision Controls', () => {
  test('should respect user quality threshold settings', async ({ page }) => {
    // Set high precision mode (0.8 threshold)
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.fill('#quality-threshold', '0.8');
    await page.click('#save-settings');
    
    // Analyze content
    await page.goto('https://news.ycombinator.com/item?id=example');
    await page.click('text=🎯 Comprehensive Analysis');
    
    await page.waitForSelector('.ranked-nugget');
    
    // Verify all displayed nuggets meet threshold
    const confidenceScores = await page.locator('.confidence-score').allTextContents();
    for (const scoreText of confidenceScores) {
      const score = parseInt(scoreText.replace('%', ''));
      expect(score).toBeGreaterThanOrEqual(80);
    }
  });
  
  test('should show more results with lower precision setting', async ({ page }) => {
    // Test that lowering threshold increases result count
    // Implementation similar to above
  });
});
```

### Phase 3 Success Criteria
- [ ] User-configurable extraction modes working
- [ ] Dynamic precision/recall balancing functional
- [ ] Quality threshold filtering applied correctly
- [ ] Cost estimates accurate within 20%
- [ ] User satisfaction metrics improve measurably

## Phase 4: Advanced Optimization (3+ months)

### Advanced Features (High-Level Implementation Plan)

#### 4.1: Machine Learning Integration
- **DSPy Ensemble Integration**: Use DSPy for optimizing ensemble prompts based on feedback
- **Adaptive Model Weights**: Learn which models perform best for different content types
- **Dynamic Threshold Optimization**: Automatically adjust thresholds based on user feedback patterns

#### 4.2: Intelligent Routing
- **Content-Type Detection**: Route different content types to models that excel at them
- **Cost-Performance Optimization**: Balance cost vs quality based on user budget preferences
- **Predictive Caching**: Pre-cache results for content likely to be analyzed

#### 4.3: Advanced Consensus Methods
- **ICE Framework**: Implement iterative consensus ensemble for highest accuracy
- **DeePEn Integration**: Add probabilistic consensus for heterogeneous models
- **Confidence Calibration**: Fine-tune confidence scoring based on actual correctness

## Testing Strategy

### Unit Testing Approach

#### Core Components Testing
```typescript
// Test ensemble extractor
describe('EnsembleExtractor', () => {
  test('handles provider failures gracefully');
  test('builds consensus correctly with various agreement levels');
  test('calculates confidence scores accurately');
});

// Test consortium extractor  
describe('ConsortiumExtractor', () => {
  test('orchestrates multiple providers correctly');
  test('handles partial provider failures');
  test('calculates cross-model confidence properly');
});

// Test consensus engine
describe('ConsensusEngine', () => {
  test('majority voting works with various input combinations');
  test('semantic deduplication removes appropriate duplicates');
  test('confidence weighting improves result quality');
});
```

#### Performance Testing
```typescript
// Test performance characteristics
describe('Performance Tests', () => {
  test('ensemble extraction completes within time limits');
  test('parallel execution faster than sequential');
  test('memory usage remains acceptable');
  test('API cost tracking accurate');
});
```

### Integration Testing

#### End-to-End Workflow Tests
1. **Complete Analysis Flow**: Context menu → extraction → consensus → display
2. **Error Handling**: Provider failures, network issues, malformed responses
3. **User Interactions**: Mode switching, threshold adjustment, type filtering  
4. **Cross-Component Integration**: Message passing, storage, UI updates

#### Performance Integration Tests
- Test extraction under various network conditions
- Verify graceful degradation with provider unavailability
- Validate cost tracking accuracy across all phases
- Ensure UI responsiveness during long-running extractions

### User Acceptance Testing

#### Feedback Collection
- A/B test ensemble vs single extraction with real users
- Measure user satisfaction with confidence indicators
- Track usage patterns for different extraction modes
- Collect feedback on precision vs recall balance

#### Success Metrics
- Reduction in "missed nugget" user reports
- Increased user confidence in extraction completeness
- Positive feedback on quality improvements
- Adoption rate of different extraction modes

## Migration Plan

### Backwards Compatibility Strategy

#### Gradual Rollout
1. **Phase 1**: Add ensemble as optional alternative (existing system unchanged)
2. **Phase 2**: Make ensemble default for new users, opt-in for existing
3. **Phase 3**: Full migration with automatic mode selection based on user patterns

#### Feature Flags
```typescript
// Add to storage configuration
interface ExtractionConfig {
  enableEnsemble: boolean;
  enableConsortium: boolean;
  defaultMode: 'single' | 'ensemble' | 'consortium';
  migrationCompleted: boolean;
}

// Gradual feature enablement
function shouldUseEnsemble(userId: string, config: ExtractionConfig): boolean {
  if (!config.enableEnsemble) return false;
  
  // Gradual rollout logic
  const userHash = hashUserId(userId);
  const rolloutPercentage = 25; // Start with 25% of users
  
  return (userHash % 100) < rolloutPercentage;
}
```

### Data Migration
- Extend existing storage schema to include ensemble metadata
- Migrate existing feedback data to support multi-model tracking
- Update backend database schema incrementally
- Maintain compatibility with existing DSPy optimization

### User Communication
- Clear communication about new features in extension updates
- Optional tutorial for new extraction modes
- Help text explaining confidence scores and provider agreement
- Cost transparency for different modes

## Quality Assurance

### Code Quality Standards

#### Pre-Commit Requirements
- All new code must pass existing linting (Biome)
- TypeScript strict mode compliance
- Unit test coverage >90% for new components
- Integration test coverage for all new user flows

#### Performance Standards
- Single-provider ensemble: <10 seconds
- Multi-provider consortium: <45 seconds
- UI responsiveness: No blocking operations >100ms
- Memory usage: No more than 50MB increase during extraction

### Monitoring and Metrics

#### Performance Monitoring
```typescript
// Add to existing performance monitoring
interface EnsembleMetrics {
  extractionMode: string;
  providersUsed: number;
  totalRuns: number;
  responseTime: number;
  consensusRate: number; // % of nuggets with agreement
  userSatisfaction: number; // From feedback
  costPerAnalysis: number;
}

// Track in background service
class EnsembleMetricsCollector {
  async recordAnalysis(metrics: EnsembleMetrics) {
    await chrome.storage.local.set({
      'ensemble_metrics': [...existingMetrics, metrics]
    });
  }
  
  async getPerformanceReport(): Promise<PerformanceReport> {
    // Generate performance insights for optimization
  }
}
```

#### Quality Metrics
- Track accuracy improvements through user feedback
- Monitor cost per analysis across different modes
- Measure user adoption of different extraction modes
- Validate confidence score accuracy over time

### Deployment Checklist

#### Pre-Deployment Validation
- [ ] All unit tests passing
- [ ] Integration tests covering happy path and error scenarios
- [ ] Performance tests within acceptable limits
- [ ] UI/UX validation with stakeholders
- [ ] Cost estimates validated with actual usage
- [ ] Backwards compatibility confirmed
- [ ] Database migration scripts tested

#### Post-Deployment Monitoring
- [ ] Error rates within expected bounds (<2% analysis failures)
- [ ] Performance metrics meeting targets
- [ ] User adoption tracking functional
- [ ] Cost tracking accurate and alerts configured
- [ ] Feedback collection working for optimization

---

*This implementation guide provides a complete roadmap for implementing ensemble extraction. Each phase includes detailed code examples, testing strategies, and success criteria to ensure reliable development and deployment.*