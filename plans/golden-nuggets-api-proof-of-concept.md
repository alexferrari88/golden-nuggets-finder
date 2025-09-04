# Golden Nuggets API Proof of Concept Implementation Plan

## Overview

This plan details the implementation of a Node.js API server that provides the Chrome extension's golden nugget extraction capabilities as a REST API. The API will feature hybrid scraping (static + browser automation), multi-provider AI support, and ensemble analysis modes while maximizing code reuse from the existing Chrome extension.

## Current State Analysis

### Existing Chrome Extension Architecture
The Chrome extension provides a sophisticated multi-provider AI system with:

- **Multi-Provider Support**: Gemini, OpenAI, Anthropic, OpenRouter with unified interfaces
- **Ensemble Analysis**: Both single-model (multiple runs) and multi-provider (cross-provider consensus)
- **High Recall Extraction**: FullContent approach with 0.85 confidence threshold filtering
- **Type Filtering**: 5 golden nugget types (tool, media, aha moments, analogy, model)
- **Advanced Content Processing**: `threads-harvester` library for DOM-based content extraction
- **Consensus Building**: Hybrid similarity matching with embedding analysis

### Key Discoveries:
- **Provider System**: `src/shared/providers/` contains reusable AI provider implementations
- **Ensemble Logic**: `src/background/services/ensemble-extractor.ts` handles consensus building
- **Type Filtering**: `src/background/type-filter-service.ts` manages prompt filtering
- **Response Format**: Standardized fullContent + confidence format across all providers
- **Hybrid Similarity**: Advanced text matching for cross-provider consensus
- **Security**: Device-specific encryption for API keys (adaptable for server environment)

## Desired End State

A Node.js API server (`api/`) that:

1. **Accepts HTTP POST requests** with URL and provider configuration
2. **Performs hybrid scraping** using axios+Cheerio for static sites, Hero for complex sites
3. **Extracts golden nuggets** using the same multi-provider AI system as the Chrome extension
4. **Supports ensemble modes** including multi-provider consensus analysis
5. **Returns JSON responses** with golden nuggets and provider attribution metadata
6. **Requires authentication** via API token for security
7. **Maximizes code reuse** from the existing Chrome extension (80%+ reuse target)

### Success Criteria

#### Automated Verification
- [ ] `pnpm install` completes without errors in api directory
- [ ] `pnpm dev` starts server successfully on specified port
- [ ] `pnpm build` compiles TypeScript without errors
- [ ] `pnpm lint` passes without violations
- [ ] `pnpm test` runs and passes unit tests for core functionality
- [ ] API responds with 200 status for valid requests
- [ ] Hybrid scraping correctly detects static vs dynamic sites

#### Manual Verification
- [ ] Successfully extracts golden nuggets from Hacker News (static scraping)
- [ ] Successfully extracts golden nuggets from Twitter/Reddit (browser automation)
- [ ] Multi-provider ensemble mode works with provider attribution
- [ ] Type filtering correctly filters nugget extraction
- [ ] Error handling provides meaningful error messages
- [ ] Authentication rejects unauthorized requests
- [ ] Response format matches Chrome extension output structure

## What We're NOT Doing

- **Chrome Extension Features**: No popup UI, context menus, or browser-specific functionality
- **Persistent Storage**: No database or persistent storage of API keys (they're provided per request)
- **User Management**: No user accounts, sessions, or complex authentication
- **Caching**: No response caching system (can be added later)
- **Rate Limiting**: Basic IP-based rate limiting only
- **Real-time Updates**: No WebSocket or Server-Sent Events for progress updates
- **Advanced Deployment**: No Docker containerization or production deployment scripts

## Implementation Approach

### High-Level Strategy

1. **Maximize Code Reuse**: Copy 80%+ of Chrome extension logic with minimal modifications
2. **Hybrid Scraping Strategy**: Intelligent switching between static and browser automation
3. **Provider Compatibility**: Maintain full compatibility with existing AI provider system
4. **API-First Design**: RESTful API with comprehensive request/response validation
5. **Security by Design**: API authentication with secure provider key handling

### Architecture Overview

```
api/
├── src/
│   ├── providers/           # Copied from Chrome extension
│   ├── services/           # Ensemble and similarity logic
│   ├── scraping/           # Hybrid scraping implementation
│   ├── routes/             # Express.js API routes
│   ├── middleware/         # Authentication and validation
│   ├── types/              # TypeScript interfaces
│   └── utils/              # Utility functions
├── tests/                  # Unit and integration tests
└── package.json           # Dependencies and scripts
```

## Phase 1: Foundation and Direct Code Reuse

### Overview
Establish the Node.js project structure and copy reusable components from the Chrome extension with minimal modifications.

### Changes Required:

#### 1. Project Initialization
**Directory**: `api/`
**Changes**: Create new Node.js project with TypeScript configuration

```bash
# Initialize project
cd api/
pnpm init
pnpm add express cors helmet
pnpm add -D typescript @types/node @types/express tsx nodemon
pnpm add @ulixee/hero-playground axios cheerio
```

#### 2. Copy AI Provider System
**Source**: `src/shared/providers/`
**Target**: `api/src/providers/`
**Changes**: Update imports and remove Chrome-specific dependencies

```typescript
// Copy directly with import path adjustments:
// - gemini-direct-provider.ts
// - langchain-openai-provider.ts  
// - langchain-anthropic-provider.ts
// - langchain-openrouter-provider.ts
```

#### 3. Copy Service Logic
**Source**: `src/background/services/`
**Target**: `api/src/services/`
**Changes**: Remove Chrome message passing, update imports

```typescript
// Copy with adaptations:
// - ensemble-extractor.ts (90% reusable)
// - response-normalizer.ts (100% reusable)
// - hybrid-similarity.ts (100% reusable)
// - provider-factory.ts (80% reusable - remove storage dependencies)
```

#### 4. Copy Type Definitions
**Source**: `src/shared/types/` and `src/background/type-filter-service.ts`
**Target**: `api/src/types/`
**Changes**: Remove Chrome-specific types, keep core interfaces

```typescript
// Copy with filtering:
// - Core types (GoldenNugget, EnsembleSettings, etc.)
// - Provider types and interfaces  
// - Type filtering service (100% reusable)
```

#### 5. Copy Utility Functions
**Source**: `src/shared/utils/`
**Target**: `api/src/utils/`
**Changes**: Copy pure functions without modification

```typescript
// Direct copy:
// - cosine-similarity.ts
// - Text normalization utilities
// - Schema generation utilities
```

### Success Criteria:

#### Automated Verification
- [ ] TypeScript compilation succeeds without errors: `pnpm build`
- [ ] All provider classes instantiate correctly
- [ ] Ensemble extractor service initializes without Chrome dependencies
- [ ] Type filtering service generates prompts correctly
- [ ] No linting errors: `pnpm lint`

#### Manual Verification
- [ ] All AI providers (Gemini, OpenAI, Anthropic, OpenRouter) can be imported
- [ ] EnsembleExtractor can be instantiated in Node.js environment  
- [ ] TypeFilterService generates filtered prompts correctly
- [ ] Provider factory creates providers with valid configurations

---

## Phase 2: Hybrid Scraping Implementation

### Overview
Implement the hybrid scraping system that intelligently chooses between static scraping (axios + Cheerio) and browser automation (Hero) based on website characteristics.

### Changes Required:

#### 1. Content Extraction Interface
**File**: `api/src/types/content.ts`
**Changes**: Define interfaces compatible with threads-harvester format

```typescript
interface Content {
  items: ContentItem[];
  title?: string;
  url?: string;
}

interface ContentItem {
  type: 'post' | 'comment' | 'text' | 'link';
  text: string;
  htmlContent?: string;
  metadata?: Record<string, any>;
}
```

#### 2. Hybrid Scraping Decision Engine
**File**: `api/src/scraping/scraping-strategy.ts`
**Changes**: Implement website analysis for scraping method selection

```typescript
class ScrapingStrategy {
  async determineStrategy(url: string): Promise<'static' | 'browser'> {
    // Quick static analysis
    const response = await axios.head(url);
    const quickCheck = await this.quickStaticAnalysis(url);
    
    // Decision criteria based on research findings
    if (this.isSimpleSite(url, quickCheck)) {
      return 'static';
    } else {
      return 'browser';  
    }
  }

  private isSimpleSite(url: string, analysis: any): boolean {
    // Logic based on hybrid scraping research
    // - Check for known static sites (HN, blogs)  
    // - Analyze JavaScript content ratio
    // - Check for SPA indicators
  }
}
```

#### 3. Static Scraping Implementation
**File**: `api/src/scraping/static-scraper.ts`
**Changes**: Implement axios + Cheerio scraping with content structure preservation

```typescript
class StaticScraper {
  async scrape(url: string): Promise<Content> {
    const response = await axios.get(url, {
      headers: this.generateRealisticHeaders(url),
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    return this.extractContent($, url);
  }

  private extractContent($: CheerioAPI, url: string): Content {
    // Site-specific extractors
    if (url.includes('news.ycombinator.com')) {
      return this.extractHackerNews($);
    }
    // Generic extractor using Readability-like logic
    return this.extractGeneric($);
  }
}
```

#### 4. Hero Browser Automation
**File**: `api/src/scraping/hero-scraper.ts`
**Changes**: Implement Hero-based scraping with anti-detection

```typescript
import Hero from '@ulixee/hero-playground';

class HeroScraper {
  async scrape(url: string): Promise<Content> {
    const hero = new Hero({
      userAgent: this.rotateUserAgent(),
      showChrome: false
    });

    try {
      await hero.goto(url);
      await hero.waitForPaintingStable();
      
      // Handle dynamic content loading
      if (this.requiresScrolling(url)) {
        await this.handleInfiniteScroll(hero);
      }
      
      return await this.extractContentFromBrowser(hero, url);
    } finally {
      await hero.close();
    }
  }

  private async extractContentFromBrowser(hero: Hero, url: string): Promise<Content> {
    // Extract content using Hero's DOM API
    // Convert to threads-harvester compatible format
  }
}
```

#### 5. Content Extractor Service
**File**: `api/src/services/content-extractor.ts`
**Changes**: Orchestrate hybrid scraping strategy

```typescript
class ContentExtractor {
  private staticScraper = new StaticScraper();
  private heroScraper = new HeroScraper();
  private strategy = new ScrapingStrategy();

  async extractContent(url: string, options?: ScrapingOptions): Promise<Content> {
    const method = options?.strategy || await this.strategy.determineStrategy(url);
    
    if (method === 'static') {
      return await this.staticScraper.scrape(url);
    } else {
      return await this.heroScraper.scrape(url);
    }
  }
}
```

### Success Criteria:

#### Automated Verification
- [ ] Static scraper extracts content from simple HTML pages
- [ ] Hero scraper successfully navigates JavaScript-heavy sites  
- [ ] Strategy engine correctly identifies static vs dynamic sites
- [ ] Content extraction preserves threads-harvester data structure
- [ ] All scrapers handle errors gracefully without crashes

#### Manual Verification
- [ ] Hacker News content extracted correctly via static scraping
- [ ] Twitter/Reddit content extracted correctly via Hero browser automation
- [ ] Strategy engine makes correct scraping method decisions
- [ ] Extracted content maintains proper formatting and structure
- [ ] Error handling provides meaningful error messages for failed scraping

---

## Phase 3: API Server Implementation

### Overview
Build the Express.js API server with authentication, request validation, and integration with the golden nugget extraction system.

### Changes Required:

#### 1. Express Server Setup
**File**: `api/src/server.ts`
**Changes**: Configure Express with middleware and error handling

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Authentication middleware
app.use('/api', authenticationMiddleware);

// API routes
app.use('/api', apiRoutes);

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT);
```

#### 2. Authentication Middleware
**File**: `api/src/middleware/auth.ts`
**Changes**: Simple token-based authentication for hobby project

```typescript
function authenticationMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const expectedToken = process.env.API_ACCESS_TOKEN;
  
  if (!token || token !== expectedToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
}
```

#### 3. Request Validation
**File**: `api/src/middleware/validation.ts`
**Changes**: Comprehensive request validation using Zod or similar

```typescript
import { z } from 'zod';

const AnalyzeRequestSchema = z.object({
  url: z.string().url(),
  provider: z.object({
    providerId: z.enum(['gemini', 'openai', 'anthropic', 'openrouter']),
    modelId: z.string(),
    apiKey: z.string().min(1)
  }),
  ensemble: z.object({
    mode: z.enum(['single-model', 'multi-provider']),
    runs: z.number().min(1).max(10).optional(),
    providers: z.array(z.object({
      providerId: z.enum(['gemini', 'openai', 'anthropic', 'openrouter']),
      modelId: z.string(),
      apiKey: z.string()
    })).optional()
  }).optional(),
  typeFilter: z.array(z.enum(['tool', 'media', 'aha! moments', 'analogy', 'model'])).optional()
});
```

#### 4. API Routes
**File**: `api/src/routes/analyze.ts`
**Changes**: Main API endpoint implementation

```typescript
class AnalyzeController {
  private contentExtractor = new ContentExtractor();
  private goldenNuggetService = new GoldenNuggetService();

  async analyze(req: Request, res: Response) {
    try {
      const request = AnalyzeRequestSchema.parse(req.body);
      
      // Extract content using hybrid scraping
      const content = await this.contentExtractor.extractContent(request.url);
      
      // Analyze using golden nugget service
      const result = await this.goldenNuggetService.analyze({
        content,
        ...request
      });
      
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}
```

#### 5. Golden Nugget Service
**File**: `api/src/services/golden-nugget-service.ts`  
**Changes**: Orchestrate AI analysis with ensemble support

```typescript
class GoldenNuggetService {
  private providerFactory = new ProviderFactory();
  private ensembleExtractor = new EnsembleExtractor();
  private typeFilterService = new TypeFilterService();

  async analyze(request: AnalyzeServiceRequest): Promise<AnalyzeResponse> {
    // Apply type filtering to prompt
    const basePrompt = this.getBasePrompt();
    const filteredPrompt = request.typeFilter 
      ? this.typeFilterService.generateFilteredPrompt(basePrompt, request.typeFilter)
      : basePrompt;

    // Convert content to text (reuse Chrome extension logic)
    const contentText = this.convertContentToText(request.content);

    // Single or ensemble analysis
    if (request.ensemble?.mode === 'multi-provider') {
      return await this.multiProviderAnalysis(contentText, filteredPrompt, request);
    } else if (request.ensemble?.mode === 'single-model') {
      return await this.singleModelEnsemble(contentText, filteredPrompt, request);
    } else {
      return await this.singleAnalysis(contentText, filteredPrompt, request);
    }
  }

  private async multiProviderAnalysis(
    content: string, 
    prompt: string, 
    request: AnalyzeServiceRequest
  ): Promise<AnalyzeResponse> {
    // Create providers from request configurations
    const providerConfigs = request.ensemble!.providers!.map(p => ({
      providerId: p.providerId,
      modelId: p.modelId,
      provider: this.providerFactory.createProvider({
        providerId: p.providerId,
        apiKey: p.apiKey,
        modelName: p.modelId
      })
    }));

    // Use ensemble extractor for multi-provider consensus
    const result = await this.ensembleExtractor.extractWithMultiProviderEnsemble(
      content,
      prompt,
      providerConfigs
    );

    return this.formatResponse(result, request);
  }
}
```

### Success Criteria:

#### Automated Verification
- [ ] Express server starts without errors: `pnpm dev`
- [ ] Authentication middleware rejects invalid tokens
- [ ] Request validation catches malformed requests
- [ ] API responds with proper HTTP status codes
- [ ] Error handling returns structured error responses

#### Manual Verification
- [ ] `/api/analyze` endpoint accepts valid requests and returns structured responses
- [ ] Authentication properly secures the API from unauthorized access
- [ ] Request validation provides helpful error messages for invalid input
- [ ] API integrates successfully with content extraction and AI analysis
- [ ] Response format matches the planned API specification

---

## Phase 4: Integration and Multi-Provider Support

### Overview
Complete the integration between content extraction, AI analysis, and ensemble processing. Ensure full compatibility with all AI providers and ensemble modes.

### Changes Required:

#### 1. Provider Factory Adaptation
**File**: `api/src/services/provider-factory.ts`
**Changes**: Adapt Chrome extension provider factory for API environment

```typescript
class ProviderFactory {
  createProvider(config: ProviderConfig): LLMProvider {
    switch (config.providerId) {
      case 'gemini':
        return new GeminiDirectProvider(config);
      case 'openai':
        return new LangChainOpenAIProvider(config);
      case 'anthropic':
        return new LangChainAnthropicProvider(config);
      case 'openrouter':
        return new LangChainOpenRouterProvider(config);
      default:
        throw new Error(`Unsupported provider: ${config.providerId}`);
    }
  }

  createMultipleProviders(
    configurations: Array<{ providerId: ProviderId; modelId: string; apiKey: string }>
  ): Array<{ providerId: ProviderId; modelId: string; provider: LLMProvider }> {
    // Adapted from Chrome extension bulk provider creation
    return configurations.map(config => ({
      providerId: config.providerId,
      modelId: config.modelId,
      provider: this.createProvider({
        providerId: config.providerId,
        apiKey: config.apiKey,
        modelName: config.modelId
      })
    }));
  }
}
```

#### 2. Content Processing Adapter
**File**: `api/src/services/content-processor.ts`
**Changes**: Adapt Chrome extension content processing logic

```typescript
class ContentProcessor {
  convertContentToText(content: Content): string {
    // Reuse exact logic from Chrome extension content script
    const items = content.items || [];
    let result = '';
    
    if (content.title) {
      result += `${content.title}\n\n`;
    }
    
    for (const item of items) {
      const typePrefix = this.getTypePrefix(item.type);
      const cleanText = this.stripHtml(item.htmlContent || item.text || '');
      result += `${typePrefix} ${cleanText}\n\n`;
    }
    
    return result.trim();
  }

  private getTypePrefix(type: string): string {
    // Same logic as Chrome extension
    const prefixes: Record<string, string> = {
      post: '[POST]',
      comment: '[COMMENT]',
      text: '[TEXT]',
      link: '[LINK]'
    };
    return prefixes[type] || '[CONTENT]';
  }
}
```

#### 3. Ensemble Integration  
**File**: `api/src/services/ensemble-adapter.ts`
**Changes**: Adapt ensemble extractor for API server environment

```typescript
class EnsembleAdapter {
  private ensembleExtractor = new EnsembleExtractor();

  async executeSingleModelEnsemble(
    content: string,
    prompt: string,
    provider: LLMProvider,
    runs: number = 3
  ): Promise<EnsembleExtractionResult> {
    // Direct reuse of Chrome extension ensemble logic
    return await this.ensembleExtractor.extractWithEnsemble(
      content,
      prompt,
      provider,
      { runs, temperature: 0.7, parallelExecution: true }
    );
  }

  async executeMultiProviderEnsemble(
    content: string,
    prompt: string,
    providerConfigurations: Array<{
      providerId: ProviderId;
      modelId: string;
      provider: LLMProvider;
    }>
  ): Promise<EnsembleExtractionResult> {
    // Direct reuse of Chrome extension multi-provider ensemble logic
    return await this.ensembleExtractor.extractWithMultiProviderEnsemble(
      content,
      prompt,
      providerConfigurations
    );
  }
}
```

#### 4. Response Formatting
**File**: `api/src/services/response-formatter.ts`
**Changes**: Format API responses with full metadata

```typescript
class ResponseFormatter {
  formatAnalyzeResponse(
    result: EnsembleExtractionResult,
    request: AnalyzeServiceRequest,
    metadata: {
      scrapingStrategy: 'static' | 'browser';
      extractionTime: number;
      contentLength: number;
    }
  ): AnalyzeResponse {
    return {
      success: true,
      data: {
        golden_nuggets: result.golden_nuggets.map(nugget => ({
          type: nugget.type,
          fullContent: nugget.fullContent,
          confidence: nugget.confidence,
          sourceProvider: nugget.sourceProvider,
          sourceModel: nugget.sourceModel,
          contributingProviders: nugget.contributingProviders,
          runsSupportingThis: nugget.runsSupportingThis,
          totalRuns: nugget.totalRuns,
          similarityMethod: nugget.similarityMethod
        })),
        metadata: {
          url: request.url,
          scrapingStrategy: metadata.scrapingStrategy,
          extractionMode: this.getExtractionMode(request),
          ...result.metadata,
          contentExtraction: {
            method: metadata.scrapingStrategy,
            contentLength: metadata.contentLength,
            extractionTime: metadata.extractionTime
          }
        }
      }
    };
  }
}
```

### Success Criteria:

#### Automated Verification
- [ ] All AI providers work correctly in API server environment
- [ ] Single-model ensemble mode produces consensus results
- [ ] Multi-provider ensemble mode shows cross-provider attribution
- [ ] Type filtering correctly filters nuggets by selected types
- [ ] Confidence filtering applies 0.85 threshold consistently
- [ ] Response formatting matches API specification exactly

#### Manual Verification
- [ ] Gemini, OpenAI, Anthropic, and OpenRouter providers all work correctly
- [ ] Single-model ensemble mode with 3 runs produces consensus with confidence scores
- [ ] Multi-provider ensemble mode shows contributing providers for each nugget
- [ ] Type filtering (e.g., tools only) correctly filters extraction results
- [ ] Response includes complete metadata about providers, scraping strategy, and analysis
- [ ] No confidence filtering bypassed - all returned nuggets have confidence ≥ 0.85

---

## Testing Strategy

### Unit Tests

**Core Components to Test**:
- **AI Provider Integration**: Mock API calls to test each provider's response handling
- **Ensemble Logic**: Test consensus building algorithms with known inputs
- **Hybrid Scraping**: Test decision logic for static vs browser automation
- **Content Processing**: Test conversion from scraped content to analysis text
- **Type Filtering**: Test prompt generation with different type combinations
- **Request Validation**: Test API request parsing and validation logic

**Key Test Files**:
```
tests/
├── providers/           # Test each AI provider with mocked responses
├── services/           # Test ensemble and content processing logic  
├── scraping/           # Test hybrid scraping strategy and extractors
├── api/                # Test API routes and middleware
└── integration/        # End-to-end API tests
```

### Integration Tests

**End-to-End API Testing**:
- **Static Site Analysis**: Test full pipeline with Hacker News URL
- **Dynamic Site Analysis**: Test full pipeline with Twitter/Reddit URL  
- **Multi-Provider Ensemble**: Test cross-provider consensus building
- **Error Handling**: Test API responses for invalid inputs and provider failures
- **Authentication**: Test API security with valid/invalid tokens

### Manual Testing Steps

1. **Basic Static Site Extraction**:
   ```bash
   curl -X POST localhost:3000/api/analyze \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://news.ycombinator.com", "provider": {"providerId": "gemini", "modelId": "gemini-1.5-flash", "apiKey": "YOUR_KEY"}}'
   ```

2. **Dynamic Site with Browser Automation**:
   ```bash
   curl -X POST localhost:3000/api/analyze \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \  
     -d '{"url": "https://twitter.com/username", "provider": {"providerId": "openai", "modelId": "gpt-4o", "apiKey": "YOUR_KEY"}, "options": {"scrapingStrategy": "browser"}}'
   ```

3. **Multi-Provider Ensemble Analysis**:
   ```bash
   curl -X POST localhost:3000/api/analyze \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://example.com", "ensemble": {"mode": "multi-provider", "providers": [{"providerId": "gemini", "modelId": "gemini-1.5-flash", "apiKey": "KEY1"}, {"providerId": "openai", "modelId": "gpt-4o", "apiKey": "KEY2"}]}}'
   ```

4. **Type Filtering Test**:
   ```bash
   curl -X POST localhost:3000/api/analyze \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://example.com", "provider": {"providerId": "gemini", "modelId": "gemini-1.5-flash", "apiKey": "YOUR_KEY"}, "typeFilter": ["tool", "media"]}'
   ```

## Performance Considerations

### Hybrid Scraping Optimization
- **Static First**: Always attempt static scraping before escalating to browser automation
- **Caching Strategy**: Cache scraping strategy decisions for known URLs
- **Resource Management**: Proper Hero browser instance cleanup to prevent memory leaks
- **Timeout Handling**: Reasonable timeouts for both static requests and browser automation

### AI Provider Optimization
- **Parallel Execution**: Multi-provider ensemble calls providers simultaneously
- **Connection Pooling**: Reuse HTTP connections for provider API calls
- **Rate Limiting**: Respect provider-specific rate limits and implement backoff
- **Error Recovery**: Graceful fallback when individual providers fail

### Memory Management
- **Content Size Limits**: Reasonable limits on scraped content size
- **Browser Cleanup**: Ensure Hero browsers are properly closed after use
- **Request Limits**: Limit concurrent analysis requests to prevent resource exhaustion

## Migration Notes

### From Chrome Extension Architecture

**Storage Migration**:
- Chrome extension uses encrypted storage - API server uses environment variables
- Provider configurations passed per request instead of stored persistently  
- No need to migrate user prompts - API uses default prompt with optional type filtering

**Code Migration Path**:
1. **Direct Copy**: AI providers, ensemble logic, type filtering (80% of codebase)
2. **Adaptation**: Content extraction (replace threads-harvester with hybrid scraping)
3. **Replacement**: Message passing (replace with direct function calls)
4. **Addition**: HTTP API layer and authentication middleware

**Breaking Changes**:
- No persistent user state - all configuration passed per request
- No progress updates - synchronous analysis with final response
- No Chrome extension storage encryption (use environment variables instead)

## References

- **Original Chrome Extension**: Existing codebase in project root
- **Hero Documentation**: https://github.com/ulixee/hero for browser automation
- **Hybrid Scraping Research**: Research findings on static vs browser automation strategies
- **Provider Documentation**: AI provider APIs (Gemini, OpenAI, Anthropic, OpenRouter)
- **User Requirements**: Support single-model and multi-provider ensemble modes with type filtering