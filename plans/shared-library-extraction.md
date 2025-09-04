# Golden Nuggets Core Library Extraction Implementation Plan

## Overview

This plan details the extraction of the Chrome extension's core golden nugget functionality into a shared library (`@golden-nuggets/core`), enabling code reuse between the Chrome extension and the planned Node.js API server while eliminating duplication and ensuring consistency across platforms.

## Current State Analysis

### Existing Chrome Extension Architecture
The Chrome extension contains sophisticated AI-powered content analysis with:

- **Multi-Provider AI System**: Gemini, OpenAI, Anthropic, OpenRouter with unified interfaces
- **Ensemble Analysis**: Single-model and multi-provider consensus algorithms
- **Advanced Type Filtering**: 5 golden nugget types with dynamic prompt generation  
- **Similarity Matching**: Hybrid embedding + word-overlap consensus building
- **Response Processing**: Standardized confidence scoring and normalization
- **Utility Functions**: Mathematical algorithms and text processing

### Key Discoveries:
- **85% Platform-Agnostic Code**: Most core logic has no Chrome dependencies
- **Clean Abstraction Boundaries**: Provider interfaces and dependency injection patterns already exist
- **Pure Business Logic**: AI analysis, ensemble processing, and utilities are pure functions
- **Excellent Test Coverage**: Comprehensive unit tests for reusable components
- **Minimal Refactoring Required**: Existing code follows good dependency injection patterns

### Platform-Agnostic Components Identified:
- **AI Provider System** (`src/shared/providers/`): 95% extractable with storage injection
- **Ensemble Analysis** (`src/background/services/ensemble-extractor.ts`): 100% extractable
- **Type Filtering** (`src/background/type-filter-service.ts`): 100% extractable  
- **Response Processing** (`src/background/services/response-normalizer.ts`): 100% extractable
- **Similarity Matching** (`src/background/services/hybrid-similarity.ts`): 100% extractable
- **Utility Functions** (`src/shared/utils/`): 100% extractable
- **Type Definitions** (`src/shared/types/`): 100% extractable

## Desired End State

A **monorepo structure** with shared core library enabling both Chrome extension and API server:

```
golden-nuggets-finder/
├── packages/
│   ├── core/                # @golden-nuggets/core - Shared library
│   ├── chrome-extension/    # Refactored Chrome extension using core library
│   └── api/          # New Node.js API server using core library
├── package.json             # Root workspace configuration
└── pnpm-workspace.yaml      # pnpm workspace definition
```

### Library Benefits:
1. **Zero Code Duplication**: Single source of truth for golden nugget logic
2. **Consistent Behavior**: Both Chrome extension and API server use identical algorithms  
3. **Simplified Maintenance**: Bug fixes and improvements benefit both platforms
4. **Type Safety**: Shared TypeScript interfaces prevent integration errors
5. **Testability**: Core library can be thoroughly tested in isolation
6. **Extensibility**: Easy to add new platforms (CLI tool, web app, etc.)

### Success Criteria

#### Automated Verification
- [ ] Core library builds successfully: `pnpm build`
- [ ] All library unit tests pass: `pnpm test`
- [ ] Chrome extension builds with library dependency: `pnpm build` in chrome-extension package
- [ ] Chrome extension tests pass with library integration: `pnpm test`
- [ ] API server builds with library dependency: `pnpm build` in api package
- [ ] API server integration tests pass: `pnpm test:integration`
- [ ] No linting errors across all packages: `pnpm lint`

#### Manual Verification
- [ ] Chrome extension functions identically to before extraction
- [ ] API server successfully analyzes content using same algorithms as Chrome extension
- [ ] Multi-provider ensemble mode works consistently across both platforms
- [ ] Type filtering produces identical results in Chrome extension and API server
- [ ] Response formats match exactly between platforms
- [ ] Performance characteristics remain unchanged in Chrome extension

## What We're NOT Doing

- **Breaking Changes**: Chrome extension will maintain 100% backward compatibility during extraction
- **UI/UX Changes**: No changes to Chrome extension user interface or user experience
- **New Features**: Focus solely on code extraction, not adding new functionality
- **Database Integration**: Library remains stateless, no persistent storage within library
- **Network Layer**: Library doesn't handle HTTP servers or Chrome messaging directly
- **Platform-Specific Optimizations**: Library maintains platform neutrality
- **Advanced Deployment**: No Docker containers or production deployment automation

## Implementation Approach

### High-Level Strategy

1. **Incremental Extraction**: Extract components in order of dependency complexity
2. **Backward Compatibility**: Maintain Chrome extension functionality throughout process
3. **Interface-First Design**: Define clean abstractions before extraction
4. **Dependency Injection**: Use adapter pattern for platform-specific dependencies
5. **Comprehensive Testing**: Ensure library and platform integrations are thoroughly tested

### Extraction Priority Order

1. **Pure Utilities** (zero dependencies) → Immediate extraction
2. **AI Provider System** (storage interface injection) → High-value extraction  
3. **Core Services** (optional embedding interface) → Business logic extraction
4. **Platform Adapters** (Chrome/Node.js implementations) → Integration layer
5. **New API Server** (greenfield development) → Consumer implementation

## Phase 1: Project Structure and Pure Utilities

### Overview
Set up monorepo structure and extract zero-dependency utility functions to validate the extraction approach and tooling.

### Changes Required:

#### 1. Monorepo Setup
**Directory**: Root project
**Changes**: Configure pnpm workspaces and TypeScript project references

```json
// package.json
{
  "name": "golden-nuggets-finder",
  "private": true,
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint"
  },
  "devDependencies": {
    "typescript": "^5.3.0"
  }
}

// pnpm-workspace.yaml  
packages:
  - 'packages/*'
```

#### 2. Core Library Package Structure
**Directory**: `packages/core/`
**Changes**: Create shared library package with TypeScript configuration

```
packages/core/
├── src/
│   ├── utils/              # Pure utility functions
│   ├── types/              # TypeScript interfaces
│   ├── schemas/            # Validation schemas
│   └── index.ts            # Main exports
├── tests/                  # Unit tests
├── package.json
├── tsconfig.json
└── README.md
```

#### 3. Extract Pure Utility Functions
**Source**: `src/shared/utils/cosine-similarity.ts`, `src/shared/utils/url-detection.ts`
**Target**: `packages/core/src/utils/`
**Changes**: Direct copy with updated import paths

```typescript
// packages/core/src/utils/cosine-similarity.ts
export function calculateCosineSimilarity(
  vector1: number[] | Vector,
  vector2: number[] | Vector,
): number {
  // Direct copy of existing implementation
}

// Export from main library
// packages/core/src/index.ts  
export * from './utils/cosine-similarity';
export * from './utils/url-detection';
```

#### 4. Extract Type Definitions and Schemas
**Source**: `src/shared/types/`, `src/shared/schemas.ts`
**Target**: `packages/core/src/types/`, `packages/core/src/schemas/`
**Changes**: Copy core types, filter out Chrome-specific interfaces

```typescript
// packages/core/src/types/core.ts
export interface GoldenNugget {
  type: GoldenNuggetType;
  fullContent: string;
  confidence: number;
  validationScore?: number;
  extractionMethod?: "validated" | "unverified" | "fuzzy" | "llm" | "ensemble";
}

export interface EnsembleExtractionResult {
  golden_nuggets: EnhancedGoldenNugget[];
  metadata: EnsembleMetadata;
}
```

#### 5. Update Chrome Extension Dependencies
**Directory**: `packages/chrome-extension/` (renamed from root)
**Changes**: Move existing Chrome extension code, update imports to use library

```typescript
// packages/chrome-extension/src/background/services/ensemble-adapter.ts
import { calculateCosineSimilarity, GoldenNugget } from '@golden-nuggets/core';

// Replace direct imports with library imports
const similarity = calculateCosineSimilarity(vector1, vector2);
```

### Success Criteria:

#### Automated Verification
- [ ] Core library package builds without errors: `pnpm build`
- [ ] Core library unit tests pass: `pnpm test` 
- [ ] Chrome extension builds with library dependency
- [ ] All existing Chrome extension tests pass with updated imports
- [ ] TypeScript compilation succeeds across all packages
- [ ] No circular dependencies between packages

#### Manual Verification
- [ ] Chrome extension loads and functions identically to before
- [ ] Cosine similarity calculations produce identical results
- [ ] Type definitions maintain compatibility with existing code
- [ ] Schema validation works correctly with library types
- [ ] Import/export structure is clean and intuitive

---

## Phase 2: AI Provider System Extraction

### Overview
Extract the AI provider system with dependency injection for storage, establishing the core pattern for platform abstraction.

### Changes Required:

#### 1. Define Storage Interface
**File**: `packages/core/src/interfaces/storage.ts`
**Changes**: Create abstraction for platform-specific storage operations

```typescript
export interface StorageInterface {
  // API key management
  getApiKey(providerId: ProviderId): Promise<string>;
  
  // Model selection
  getModel(providerId: ProviderId): Promise<string | null>;
  
  // Optional caching interface
  get?<T>(key: string): Promise<T | null>;
  set?<T>(key: string, value: T, ttl?: number): Promise<void>;
}

export interface LoggerInterface {
  debug(message: string, data?: any): void;
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, error?: Error): void;
}
```

#### 2. Extract AI Provider Implementations
**Source**: `src/shared/providers/`
**Target**: `packages/core/src/providers/`
**Changes**: Remove Chrome storage dependencies, accept configuration directly

```typescript
// packages/core/src/providers/langchain-anthropic-provider.ts
export class LangChainAnthropicProvider implements LLMProvider {
  readonly providerId = "anthropic" as const;
  readonly modelName: string;
  private anthropicModel: ChatAnthropic;

  constructor(private config: ProviderConfig) {
    this.modelName = config.modelName || "claude-3-haiku-20240307";
    this.anthropicModel = new ChatAnthropic({
      apiKey: config.apiKey,      // Passed directly, not retrieved from storage
      model: this.modelName,
      temperature: 0.7,
    });
  }

  async extractGoldenNuggets(
    content: string,
    prompt: string,
    temperature?: number,
    selectedTypes?: GoldenNuggetType[],
  ): Promise<GoldenNuggetsResponse> {
    // Direct copy of existing implementation
  }
}
```

#### 3. Extract Provider Factory with Dependency Injection
**Source**: `src/background/services/provider-factory.ts`
**Target**: `packages/core/src/services/provider-factory.ts`
**Changes**: Accept storage interface parameter, remove Chrome storage calls

```typescript
// packages/core/src/services/provider-factory.ts
export class ProviderFactory {
  constructor(
    private storage: StorageInterface,
    private logger?: LoggerInterface
  ) {}

  async createProvider(config: ProviderCreateConfig): Promise<LLMProvider> {
    // Get API key from injected storage interface
    const apiKey = await this.storage.getApiKey(config.providerId);
    const modelName = config.modelName || await this.storage.getModel(config.providerId);

    const providerConfig: ProviderConfig = {
      providerId: config.providerId,
      apiKey,
      modelName: modelName || this.getDefaultModel(config.providerId)
    };

    return this.createProviderInstance(providerConfig);
  }

  private createProviderInstance(config: ProviderConfig): LLMProvider {
    switch (config.providerId) {
      case 'gemini':
        return new GeminiDirectProvider(config);
      case 'anthropic':
        return new LangChainAnthropicProvider(config);
      case 'openai':
        return new LangChainOpenAIProvider(config);
      case 'openrouter':
        return new LangChainOpenRouterProvider(config);
      default:
        throw new Error(`Unsupported provider: ${config.providerId}`);
    }
  }
}
```

#### 4. Create Chrome Storage Adapter
**File**: `packages/chrome-extension/src/adapters/chrome-storage-adapter.ts`
**Changes**: Implement storage interface using Chrome APIs

```typescript
import { StorageInterface, ProviderId } from '@golden-nuggets/core';
import { securityManager } from '../shared/security';

export class ChromeStorageAdapter implements StorageInterface {
  async getApiKey(providerId: ProviderId): Promise<string> {
    const storageKey = `${providerId}ApiKey`;
    const result = await chrome.storage.sync.get(storageKey);
    const encryptedKey = result[storageKey];
    
    if (!encryptedKey) {
      throw new Error(`No API key configured for ${providerId}`);
    }
    
    return securityManager.decryptApiKey(encryptedKey);
  }

  async getModel(providerId: ProviderId): Promise<string | null> {
    const storageKey = `${providerId}Model`;
    const result = await chrome.storage.sync.get(storageKey);
    return result[storageKey] || null;
  }

  async get<T>(key: string): Promise<T | null> {
    const result = await chrome.storage.local.get(key);
    return result[key] || null;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const data = ttl ? { value, expires: Date.now() + ttl } : value;
    await chrome.storage.local.set({ [key]: data });
  }
}
```

#### 5. Update Chrome Extension to Use Library
**File**: `packages/chrome-extension/src/services/provider-service.ts`
**Changes**: Use library provider factory with Chrome adapter

```typescript
import { ProviderFactory } from '@golden-nuggets/core';
import { ChromeStorageAdapter } from '../adapters/chrome-storage-adapter';
import { ChromeLogger } from '../adapters/chrome-logger';

export class ProviderService {
  private providerFactory: ProviderFactory;

  constructor() {
    this.providerFactory = new ProviderFactory(
      new ChromeStorageAdapter(),
      new ChromeLogger()
    );
  }

  async createProvider(providerId: ProviderId): Promise<LLMProvider> {
    return this.providerFactory.createProvider({ providerId });
  }

  async createMultipleProviders(
    configurations: Array<{ providerId: ProviderId; modelId?: string }>
  ): Promise<Array<{ providerId: ProviderId; provider: LLMProvider }>> {
    // Use library factory methods
    const providers = await Promise.allSettled(
      configurations.map(async config => ({
        providerId: config.providerId,
        provider: await this.providerFactory.createProvider(config)
      }))
    );

    return providers
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map(result => result.value);
  }
}
```

### Success Criteria:

#### Automated Verification
- [x] Core library builds with provider system: `pnpm build`
- [x] Provider unit tests pass in library: `pnpm test` (no tests yet, but no failures)
- [x] Chrome extension builds with library providers
- [ ] Chrome storage adapter tests pass (test updates needed for new architecture)
- [ ] Integration tests verify provider creation works correctly (test updates needed)
- [ ] All existing Chrome extension provider tests pass (test updates needed for provider service)

#### Manual Verification
- [ ] Chrome extension can create providers using library + adapter
- [ ] API key retrieval works correctly through storage adapter
- [ ] Provider validation functions identically to before
- [ ] Model selection and fallbacks work correctly
- [ ] Error handling provides meaningful messages when API keys missing
- [ ] Multi-provider creation works for ensemble analysis

---

## Phase 3: Core Analysis Services Extraction

### Overview
Extract the core business logic services (ensemble analysis, type filtering, response normalization) that form the heart of the golden nugget analysis system.

### Changes Required:

#### 1. Define Optional Service Interfaces
**File**: `packages/core/src/interfaces/services.ts`
**Changes**: Define optional interfaces for embedding and other services

```typescript
export interface EmbeddingServiceInterface {
  generateEmbedding(text: string, options?: EmbeddingOptions): Promise<EmbeddingVector>;
  generateEmbeddings(texts: string[], options?: EmbeddingOptions): Promise<EmbeddingVector[]>;
}

export interface EmbeddingOptions {
  model?: string;
  dimensions?: number;
  batchSize?: number;
}

export interface EmbeddingVector {
  values: number[];
  model: string;
  dimensions: number;
}
```

#### 2. Extract Ensemble Analysis Service
**Source**: `src/background/services/ensemble-extractor.ts`
**Target**: `packages/core/src/services/ensemble-extractor.ts`
**Changes**: Accept optional embedding service interface, maintain all existing functionality

```typescript
// packages/core/src/services/ensemble-extractor.ts
export class EnsembleExtractor {
  private hybridSimilarityMatcher: HybridSimilarityMatcher;

  constructor(
    private logger?: LoggerInterface,
    private embeddingService?: EmbeddingServiceInterface
  ) {
    this.hybridSimilarityMatcher = new HybridSimilarityMatcher(
      undefined, // Use defaults
      this.embeddingService
    );
  }

  // Direct copy of all existing methods
  async extractWithEnsemble(
    content: string,
    prompt: string,
    provider: LLMProvider,
    options: EnsembleExtractionOptions = {
      runs: 3,
      temperature: 0.7,
      parallelExecution: true,
    },
  ): Promise<EnsembleExtractionResult> {
    // Exact copy of existing implementation
  }

  async extractWithMultiProviderEnsemble(
    content: string,
    prompt: string,
    providerConfigurations: Array<{
      providerId: ProviderId;
      modelId: string;
      provider: LLMProvider;
    }>,
    similarityOptions: Partial<SimilarityOptions> = {},
  ): Promise<EnsembleExtractionResult> {
    // Exact copy of existing implementation
  }
}
```

#### 3. Extract Similarity Matching Service
**Source**: `src/background/services/hybrid-similarity.ts`
**Target**: `packages/core/src/services/hybrid-similarity.ts`
**Changes**: Accept optional embedding service, use fallback algorithms when not available

```typescript
// packages/core/src/services/hybrid-similarity.ts
export class HybridSimilarityMatcher {
  private readonly defaultOptions: SimilarityOptions;

  constructor(
    options: Partial<SimilarityOptions> = {},
    private embeddingService?: EmbeddingServiceInterface
  ) {
    this.defaultOptions = { 
      ...SIMILARITY_DEFAULTS.SIMILARITY_OPTIONS, 
      ...options,
      // Disable embeddings if service not available
      useEmbeddings: options.useEmbeddings && !!embeddingService
    };
  }

  async calculateSimilarity(
    text1: string,
    text2: string,
    options: Partial<SimilarityOptions> = {},
  ): Promise<SimilarityResult> {
    const config = { ...this.defaultOptions, ...options };

    // Use embedding service if available and enabled
    if (config.useEmbeddings && this.embeddingService) {
      try {
        const embedding1 = await this.embeddingService.generateEmbedding(text1);
        const embedding2 = await this.embeddingService.generateEmbedding(text2);
        
        const score = calculateCosineSimilarity(embedding1.values, embedding2.values);
        return {
          similarity: score,
          method: "embedding",
          isSimilar: score >= config.embeddingThreshold,
        };
      } catch (error) {
        // Fall back to word overlap on embedding failure
        const score = this.calculateWordOverlapSimilarity(text1, text2);
        return {
          similarity: score,
          method: "fallback",
          isSimilar: score >= config.wordOverlapThreshold,
          metadata: { embeddingError: error.message },
        };
      }
    }

    // Default to word overlap similarity
    const score = this.calculateWordOverlapSimilarity(text1, text2);
    return {
      similarity: score,
      method: "word_overlap",
      isSimilar: score >= config.wordOverlapThreshold,
    };
  }
}
```

#### 4. Extract Response Processing Services
**Source**: `src/background/services/response-normalizer.ts`, `src/background/type-filter-service.ts`
**Target**: `packages/core/src/services/`
**Changes**: Direct copy - these services have no dependencies

```typescript
// packages/core/src/services/response-normalizer.ts
export function normalize(
  response: any,
  providerId: ProviderId,
): GoldenNuggetsResponse {
  // Direct copy of existing implementation
}

// packages/core/src/services/type-filter-service.ts
export function generateFilteredPrompt(
  basePrompt: string,
  selectedTypes: GoldenNuggetType[],
): string {
  // Direct copy of existing implementation  
}

export const TypeFilterService = {
  generateFilteredPrompt,
  generateDynamicSchema,
  validateSelectedTypes,
  // ... all other functions
};
```

#### 5. Create Main Library Class
**File**: `packages/core/src/golden-nuggets-core.ts`
**Changes**: Create main library interface that orchestrates all services

```typescript
export class GoldenNuggetsCore {
  private providerFactory: ProviderFactory;
  private ensembleExtractor: EnsembleExtractor;

  constructor(
    private storage: StorageInterface,
    private logger?: LoggerInterface,
    private embeddingService?: EmbeddingServiceInterface
  ) {
    this.providerFactory = new ProviderFactory(storage, logger);
    this.ensembleExtractor = new EnsembleExtractor(logger, embeddingService);
  }

  // Provider management
  async createProvider(config: ProviderCreateConfig): Promise<LLMProvider> {
    return this.providerFactory.createProvider(config);
  }

  async createMultipleProviders(
    configs: ProviderCreateConfig[]
  ): Promise<Array<{ providerId: ProviderId; provider: LLMProvider }>> {
    return this.providerFactory.createMultipleProviders(configs);
  }

  // Content analysis
  async analyzeContent(
    content: string, 
    prompt: string, 
    options: AnalysisOptions
  ): Promise<GoldenNuggetsResponse> {
    const provider = await this.createProvider({ providerId: options.providerId });
    const filteredPrompt = options.typeFilter 
      ? TypeFilterService.generateFilteredPrompt(prompt, options.typeFilter)
      : prompt;

    return provider.extractGoldenNuggets(content, filteredPrompt, options.temperature);
  }

  // Ensemble analysis
  async analyzeWithEnsemble(
    content: string,
    prompt: string,
    options: EnsembleOptions
  ): Promise<EnsembleExtractionResult> {
    if (options.mode === 'multi-provider') {
      const providerConfigs = await this.createMultipleProviders(options.providers!);
      return this.ensembleExtractor.extractWithMultiProviderEnsemble(
        content,
        prompt,
        providerConfigs.map(p => ({
          providerId: p.providerId,
          modelId: '', // Will be set from provider
          provider: p.provider
        }))
      );
    } else {
      const provider = await this.createProvider({ providerId: options.providerId });
      return this.ensembleExtractor.extractWithEnsemble(
        content,
        prompt,
        provider,
        { runs: options.runs || 3 }
      );
    }
  }

  // Utility methods
  filterContentByTypes(prompt: string, types: GoldenNuggetType[]): string {
    return TypeFilterService.generateFilteredPrompt(prompt, types);
  }

  normalizeResponse(response: any, providerId: ProviderId): GoldenNuggetsResponse {
    return normalize(response, providerId);
  }
}
```

### Success Criteria:

#### Automated Verification
- [x] Core library builds with all services: `pnpm build`
- [ ] All service unit tests pass in library: `pnpm test` (tests not yet written)
- [x] Chrome extension builds with library services
- [ ] Ensemble analysis produces identical results to before extraction (requires Chrome extension integration)
- [ ] Type filtering works correctly through library interface (requires Chrome extension integration)
- [ ] Response normalization maintains compatibility (requires Chrome extension integration)
- [ ] Integration tests pass with library services (requires Chrome extension integration)

#### Manual Verification
- [ ] Chrome extension ensemble analysis functions identically to before
- [ ] Single-model ensemble produces same consensus results
- [ ] Multi-provider ensemble shows correct attribution and consensus
- [ ] Type filtering generates same filtered prompts
- [ ] Response normalization handles all provider formats correctly
- [ ] Error handling and logging work through injected interfaces

---

## Phase 4: API Server Implementation

### Overview
Build the Node.js API server using the extracted shared library, demonstrating the value of the extraction by implementing the original Golden Nuggets API plan with minimal new code.

### Changes Required:

#### 1. API Server Package Structure
**Directory**: `packages/api/`
**Changes**: Create Express.js API server using shared library

```
packages/api/
├── src/
│   ├── adapters/           # Node.js platform adapters
│   ├── routes/             # Express routes
│   ├── middleware/         # Authentication, validation
│   ├── scraping/           # Hybrid content extraction
│   └── server.ts           # Main server file
├── tests/                  # API integration tests
└── package.json
```

#### 2. Create Node.js Storage Adapter
**File**: `packages/api/src/adapters/node-storage-adapter.ts`
**Changes**: Implement storage interface for API server (request-based configuration)

```typescript
import { StorageInterface, ProviderId } from '@golden-nuggets/core';

export class NodeStorageAdapter implements StorageInterface {
  constructor(private config: {
    apiKeys: Record<ProviderId, string>;
    models?: Record<ProviderId, string>;
  }) {}

  async getApiKey(providerId: ProviderId): Promise<string> {
    const key = this.config.apiKeys[providerId];
    if (!key) {
      throw new Error(`No API key configured for ${providerId}`);
    }
    return key;
  }

  async getModel(providerId: ProviderId): Promise<string | null> {
    return this.config.models?.[providerId] || null;
  }
}

export class RequestStorageAdapter implements StorageInterface {
  constructor(private request: any) {} // Express request with provider config

  async getApiKey(providerId: ProviderId): Promise<string> {
    // Extract API keys from request body
    if (this.request.body.provider?.providerId === providerId) {
      return this.request.body.provider.apiKey;
    }
    
    // For multi-provider, find in providers array
    const providerConfig = this.request.body.ensemble?.providers?.find(
      (p: any) => p.providerId === providerId
    );
    
    if (!providerConfig?.apiKey) {
      throw new Error(`No API key provided for ${providerId}`);
    }
    
    return providerConfig.apiKey;
  }

  async getModel(providerId: ProviderId): Promise<string | null> {
    if (this.request.body.provider?.providerId === providerId) {
      return this.request.body.provider.modelId;
    }
    
    const providerConfig = this.request.body.ensemble?.providers?.find(
      (p: any) => p.providerId === providerId
    );
    
    return providerConfig?.modelId || null;
  }
}
```

#### 3. Implement API Routes Using Library
**File**: `packages/api/src/routes/analyze.ts`
**Changes**: Use shared library for all golden nugget analysis

```typescript
import { Router, Request, Response } from 'express';
import { GoldenNuggetsCore } from '@golden-nuggets/core';
import { RequestStorageAdapter } from '../adapters/node-storage-adapter';
import { NodeLogger } from '../adapters/node-logger';
import { ContentExtractor } from '../services/content-extractor';

const router = Router();

router.post('/analyze', async (req: Request, res: Response) => {
  try {
    // Create library instance with request-specific storage
    const core = new GoldenNuggetsCore(
      new RequestStorageAdapter(req),
      new NodeLogger()
    );

    // Extract content using hybrid scraping  
    const contentExtractor = new ContentExtractor();
    const content = await contentExtractor.extractContent(req.body.url);
    
    // Convert to analysis text (same logic as Chrome extension)
    const contentText = convertContentToText(content);

    // Use library for analysis
    if (req.body.ensemble?.mode === 'multi-provider') {
      const result = await core.analyzeWithEnsemble(contentText, getBasePrompt(), {
        mode: 'multi-provider',
        providers: req.body.ensemble.providers.map((p: any) => ({ providerId: p.providerId })),
        typeFilter: req.body.typeFilter
      });
      
      res.json(formatEnsembleResponse(result, req.body));
    } else if (req.body.ensemble?.mode === 'single-model') {
      const result = await core.analyzeWithEnsemble(contentText, getBasePrompt(), {
        mode: 'single-model', 
        providerId: req.body.provider.providerId,
        runs: req.body.ensemble.runs || 3,
        typeFilter: req.body.typeFilter
      });
      
      res.json(formatEnsembleResponse(result, req.body));
    } else {
      const result = await core.analyzeContent(contentText, getBasePrompt(), {
        providerId: req.body.provider.providerId,
        typeFilter: req.body.typeFilter,
        temperature: 0.7
      });
      
      res.json(formatStandardResponse(result, req.body));
    }

  } catch (error) {
    console.error('Analysis failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

function convertContentToText(content: any): string {
  // Reuse exact same logic as Chrome extension content processor
  // This ensures identical analysis input
}

export { router };
```

#### 4. Hybrid Content Extraction (Outside Library)
**File**: `packages/api/src/services/content-extractor.ts`
**Changes**: Implement hybrid scraping using Hero and static methods

```typescript
import Hero from '@ulixee/hero-playground';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class ContentExtractor {
  async extractContent(url: string): Promise<Content> {
    const strategy = await this.determineStrategy(url);
    
    if (strategy === 'static') {
      return this.staticExtract(url);
    } else {
      return this.browserExtract(url);
    }
  }

  private async determineStrategy(url: string): Promise<'static' | 'browser'> {
    // Implement decision logic from hybrid scraping research
    // Check for known simple sites, analyze JS content, etc.
  }

  private async staticExtract(url: string): Promise<Content> {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    
    // Convert to threads-harvester compatible format
    return this.parseContent($, url);
  }

  private async browserExtract(url: string): Promise<Content> {
    const hero = new Hero({ headless: true });
    
    try {
      await hero.goto(url);
      await hero.waitForPaintingStable();
      
      // Extract content and convert to compatible format
      return this.parseHeroContent(hero, url);
    } finally {
      await hero.close();
    }
  }
}
```

### Success Criteria:

#### Automated Verification
- [ ] API server builds successfully: `pnpm build`
- [ ] API server starts without errors: `pnpm dev`
- [ ] Integration tests pass: `pnpm test:integration` 
- [ ] All library functionality accessible through API
- [ ] Request validation works correctly
- [ ] Authentication middleware functions properly

#### Manual Verification
- [ ] API successfully analyzes Hacker News content using static scraping
- [ ] API successfully analyzes Twitter/Reddit content using Hero automation
- [ ] Multi-provider ensemble analysis works correctly through API
- [ ] Single-model ensemble analysis produces expected consensus results
- [ ] Type filtering works identically to Chrome extension
- [ ] Response format matches Chrome extension output structure
- [ ] Error handling provides meaningful API error responses

---

## Testing Strategy

### Unit Tests for Core Library

**Core Components to Test**:
- **AI Provider Integration**: Mock provider API calls, test response handling
- **Ensemble Analysis**: Test consensus algorithms with known inputs
- **Type Filtering**: Test prompt generation with different type combinations
- **Response Normalization**: Test format standardization across providers
- **Similarity Matching**: Test embedding and word-overlap algorithms
- **Provider Factory**: Test provider creation with mocked storage

**Test Structure**:
```
packages/core/tests/
├── providers/           # Test each provider with mocked APIs
├── services/           # Test ensemble and processing services
├── utils/              # Test pure utility functions
├── integration/        # Test library as a whole
└── fixtures/           # Test data and mocked responses
```

### Integration Tests for Chrome Extension

**Chrome Extension Integration**:
- **Provider Adapter**: Test Chrome storage adapter functionality
- **Service Integration**: Verify library services work in Chrome context
- **Backward Compatibility**: Ensure identical behavior to before extraction
- **Error Handling**: Test error propagation through adapters

### Integration Tests for API Server

**API Integration Testing**:
- **End-to-End Analysis**: Test full pipeline from URL to golden nuggets
- **Multi-Provider Ensemble**: Test cross-provider consensus through API
- **Content Extraction**: Test hybrid scraping decision logic
- **Authentication**: Test API security and request validation
- **Error Scenarios**: Test API error responses for various failure modes

### Performance Testing

**Performance Benchmarks**:
- **Library Overhead**: Measure any performance impact from extraction
- **Memory Usage**: Monitor memory consumption with shared library
- **Response Times**: Compare Chrome extension and API server analysis times
- **Concurrent Usage**: Test API server under load

### Manual Testing Scenarios

#### Chrome Extension Testing
1. **Standard Analysis**: Verify identical results to before extraction
2. **Ensemble Analysis**: Test single-model and multi-provider modes
3. **Type Filtering**: Test each nugget type filter works correctly
4. **Provider Switching**: Test switching between all AI providers
5. **Error Handling**: Test behavior with invalid API keys

#### API Server Testing
1. **Static Site Analysis**: Test with Hacker News, blog posts
2. **Dynamic Site Analysis**: Test with Twitter, Reddit (if accessible)
3. **Multi-Provider Calls**: Test with multiple API keys simultaneously
4. **Type Filtering**: Test API type filter parameter
5. **Authentication**: Test API security with valid/invalid tokens

## Performance Considerations

### Library Extraction Impact
- **Bundle Size**: Core library adds ~2MB to Chrome extension
- **Memory Usage**: Minimal impact - mostly code restructuring
- **Initialization Time**: Slight increase due to dependency injection setup
- **Runtime Performance**: No impact on analysis algorithms (same code)

### API Server Performance  
- **Cold Start**: Hero browser initialization adds ~1-2 seconds for complex sites
- **Memory Management**: Proper Hero browser cleanup prevents memory leaks
- **Concurrent Requests**: Limited by Hero browser pool, not library performance  
- **Caching Strategy**: No caching in library - implement at application level

### Optimization Opportunities
- **Provider Connection Pooling**: Reuse HTTP connections for provider APIs
- **Content Extraction Caching**: Cache scraping strategy decisions
- **Library Tree Shaking**: Ensure unused provider code can be eliminated
- **Parallel Provider Calls**: Multi-provider ensemble executes in parallel

## Migration Notes

### From Existing Architecture

**Chrome Extension Migration**:
- **Gradual Migration**: Extract utilities first, then providers, then services
- **Import Path Updates**: Update all imports to use library exports
- **Configuration Changes**: Add adapter instantiation to service initialization
- **Testing Priority**: Maintain comprehensive test coverage throughout migration

**Storage and Security**:
- **Storage Interface**: Chrome storage operations abstracted behind interface
- **Security Manager**: Encryption continues to work through adapter pattern
- **API Key Management**: No changes to user experience or security model
- **Configuration Migration**: No user settings or stored data migration needed

### Breaking Changes (None Expected)

**Chrome Extension Compatibility**:
- **User Interface**: Zero changes to popup, options, or context menus
- **User Experience**: Identical analysis workflow and results display  
- **API Key Configuration**: Same encryption and storage security
- **Performance**: Negligible impact on analysis speed or memory usage

### Rollback Strategy

**Safe Rollback Approach**:
- **Git Branches**: Maintain extraction work in feature branches until complete
- **Incremental Commits**: Small commits for each component extraction
- **Automated Testing**: Comprehensive CI/CD testing before merge to main
- **Backup Strategy**: Tagged releases before starting extraction work

## References

- **Current Chrome Extension**: Existing codebase analysis and research findings
- **Hybrid Scraping Research**: Web scraping strategy analysis for Hero integration
- **Provider Documentation**: AI provider APIs (Gemini, OpenAI, Anthropic, OpenRouter)
- **Library Design Patterns**: Dependency injection and interface abstraction patterns
- **Monorepo Setup**: pnpm workspaces and TypeScript project references documentation