# Golden Nuggets API Proof of Concept Implementation Plan

## Overview

Create a Node.js API service that reuses the Chrome extension's AI provider system to extract golden nuggets from web pages without requiring a browser. This proof of concept will enable headless golden nugget extraction via API endpoints while maintaining the same AI analysis capabilities as the extension.

## Current State Analysis

The Chrome extension has a sophisticated multi-provider AI system with:
- **AI Providers**: Gemini, OpenAI, Anthropic, OpenRouter with unified LLMProvider interface
- **FullContent Extraction**: Direct golden nugget extraction with confidence scoring
- **Ensemble Mode**: Multi-run analysis for improved accuracy (3-5% improvement)
- **Type Filtering**: Tools, media, aha moments, analogies, mental models
- **Advanced Features**: Text highlighting, progress tracking, secure API key storage
- **Proven Architecture**: Battle-tested content extraction and AI integration

### Key Discoveries:
- Existing LLMProvider interface in `src/shared/types/providers.ts:35` provides perfect abstraction
- EnsembleExtractor in `src/background/services/ensemble-extractor.ts:27` can be reused directly
- Response schemas in `src/shared/schemas.ts` ensure consistent output format
- Multi-provider architecture already handles all target AI services

## Desired End State

A self-hosted API service that accepts web URLs and returns extracted golden nuggets using the same AI analysis engine as the Chrome extension. The API will handle web scraping, content extraction, and AI analysis in a single request.

**Verification Criteria:**
```bash
curl -X POST http://localhost:3001/api/extract \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://news.ycombinator.com/item?id=38981254",
    "provider": "gemini", 
    "apiKey": "your-api-key",
    "nuggetTypes": ["tool", "aha! moments"],
    "ensemble": false
  }'
```

Expected response with same format as extension:
```json
{
  "golden_nuggets": [
    {
      "type": "tool",
      "fullContent": "SQLite is incredibly versatile for local development...",
      "confidence": 0.92
    }
  ]
}
```

## What We're NOT Doing

- Complex enterprise scaling (horizontal scaling, load balancing)
- Advanced anti-detection systems (residential proxies, sophisticated fingerprinting)
- Real-time WebSocket APIs or streaming responses
- User authentication/authorization systems
- Database storage of results
- Advanced monitoring/alerting systems
- Multi-tenant support
- Complex caching layers

## Implementation Approach

**Hybrid Scraping Strategy**: Use lightweight static scraping for simple sites (Hacker News, blogs) and browser automation for complex dynamic content (Twitter, Reddit). This optimizes performance while maintaining capability.

**Code Reuse Strategy**: Extract the existing AI provider implementations into a shared package that both the extension and API can use, eliminating code duplication and ensuring consistent behavior.

**Incremental Development**: Four phases where each delivers immediate value and can serve as a stopping point based on needs.

## Phase 1: Core Foundation

### Overview
Establish basic API functionality with Cheerio-based static content scraping and integration with one AI provider. Focus on proving the concept works end-to-end.

### Changes Required:

#### 1. Project Setup
**Create**: `golden-nuggets-api/` directory (subfolder of main project)

```bash
mkdir golden-nuggets-api
cd golden-nuggets-api
npm init -y
npm install express cors helmet morgan dotenv cheerio axios
npm install -D typescript @types/node @types/express ts-node nodemon
```

#### 2. Shared Code Extraction
**Create**: `golden-nuggets-api/src/shared/` directory
**Copy from extension**:
- `src/shared/providers/gemini-direct-provider.ts` → Reuse exact implementation
- `src/shared/types/providers.ts` → LLMProvider interface and types
- `src/shared/schemas.ts` → Response schema generators
- `src/shared/constants.ts` → Default prompts and configuration

#### 3. Basic API Implementation
**File**: `golden-nuggets-api/src/app.ts`
```typescript
import express from 'express';
import cors from 'cors';
import { extractGoldenNuggets } from './api/extract';

const app = express();
app.use(cors());
app.use(express.json());
app.use(helmet());

app.post('/api/extract', extractGoldenNuggets);

app.listen(3001, () => {
  console.log('Golden Nuggets API running on port 3001');
});
```

**File**: `golden-nuggets-api/src/scrapers/cheerio-scraper.ts`
```typescript
import axios from 'axios';
import * as cheerio from 'cheerio';

export class CheerioScraper {
  private userAgents = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  ];

  async scrapeContent(url: string): Promise<string> {
    await this.randomDelay(1000, 3000);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': this.getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive'
      },
      timeout: 30000
    });
    
    const $ = cheerio.load(response.data);
    
    // Remove script and style elements
    $('script, style, nav, header, footer').remove();
    
    return $('body').text().trim();
  }

  private randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  private getRandomUserAgent(): string {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }
}
```

**File**: `golden-nuggets-api/src/api/extract.ts`
```typescript
import { CheerioScraper } from '../scrapers/cheerio-scraper';
import { GeminiDirectProvider } from '../shared/providers/gemini-direct-provider';
import type { ProviderId } from '../shared/types/providers';

const scraper = new CheerioScraper();

export async function extractGoldenNuggets(req: any, res: any) {
  try {
    const { 
      url, 
      provider = 'gemini' as ProviderId,
      apiKey, 
      prompt, 
      nuggetTypes = [],
      temperature = 0.7
    } = req.body;

    if (!url || !apiKey) {
      return res.status(400).json({ 
        error: 'URL and API key are required' 
      });
    }

    // Scrape content
    const content = await scraper.scrapeContent(url);
    
    // Create AI provider (start with Gemini)
    const aiProvider = new GeminiDirectProvider({
      providerId: 'gemini',
      apiKey,
      modelName: 'gemini-2.5-flash'
    });

    // Extract golden nuggets
    const result = await aiProvider.extractGoldenNuggets(
      content, 
      prompt || getDefaultPrompt(), 
      temperature,
      nuggetTypes
    );

    res.json(result);
  } catch (error) {
    console.error('Extraction error:', error);
    res.status(500).json({ 
      error: 'Failed to extract golden nuggets',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

function getDefaultPrompt(): string {
  return `You are a highly discerning content analyst extracting only the most valuable insights...`;
}
```

### Success Criteria

#### Automated Verification
- [ ] Project builds without TypeScript errors: `npm run build`
- [ ] API starts successfully: `npm run dev`
- [ ] Health endpoint responds: `curl http://localhost:3001/health`
- [ ] Basic extraction works for static site

#### Manual Verification
- [ ] API accepts POST requests to `/api/extract`
- [ ] Successfully scrapes Hacker News comment threads
- [ ] Returns golden nuggets in expected format
- [ ] Gemini provider integration works correctly
- [ ] Error handling works for invalid URLs/API keys

---

## Phase 2: Multi-Provider & Enhanced Features

### Overview
Add support for all AI providers from the extension, implement ensemble mode, and add Playwright for complex sites.

### Changes Required:

#### 1. Complete AI Provider Integration
**File**: `golden-nuggets-api/src/services/provider-factory.ts`
```typescript
import { GeminiDirectProvider } from '../shared/providers/gemini-direct-provider';
import { LangChainAnthropicProvider } from '../shared/providers/langchain-anthropic-provider';
import { LangChainOpenAIProvider } from '../shared/providers/langchain-openai-provider';
import { LangChainOpenRouterProvider } from '../shared/providers/langchain-openrouter-provider';
import type { LLMProvider, ProviderId, ProviderConfig } from '../shared/types/providers';

export function createProvider(providerId: ProviderId, apiKey: string, modelName?: string): LLMProvider {
  const config: ProviderConfig = {
    providerId,
    apiKey,
    modelName: modelName || getDefaultModel(providerId)
  };

  switch (providerId) {
    case 'gemini':
      return new GeminiDirectProvider(config);
    case 'anthropic':
      return new LangChainAnthropicProvider(config);
    case 'openai':
      return new LangChainOpenAIProvider(config);
    case 'openrouter':
      return new LangChainOpenRouterProvider(config);
    default:
      throw new Error(`Unsupported provider: ${providerId}`);
  }
}

function getDefaultModel(providerId: ProviderId): string {
  const defaults = {
    'gemini': 'gemini-2.5-flash',
    'anthropic': 'claude-sonnet-4-20250514',
    'openai': 'gpt-4o-mini',
    'openrouter': 'openai/gpt-3.5-turbo'
  };
  return defaults[providerId];
}
```

#### 2. Playwright Integration
**Install**: `npm install playwright`

**File**: `golden-nuggets-api/src/scrapers/playwright-scraper.ts`
```typescript
import { chromium, Browser, Page } from 'playwright';

export class PlaywrightScraper {
  private browser: Browser | null = null;

  async init() {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage'
        ]
      });
    }
  }

  async scrapeContent(url: string): Promise<string> {
    await this.init();
    
    const context = await this.browser!.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    });
    
    const page = await context.newPage();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      
      // Wait for dynamic content
      await page.waitForTimeout(2000);
      
      // Extract text content
      const content = await page.evaluate(() => {
        // Remove unnecessary elements
        const elementsToRemove = document.querySelectorAll('script, style, nav, header, footer, .ad');
        elementsToRemove.forEach(el => el.remove());
        
        return document.body.innerText;
      });
      
      return content;
    } finally {
      await context.close();
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
```

#### 3. Smart Hybrid Scraper
**File**: `golden-nuggets-api/src/scrapers/hybrid-scraper.ts`
```typescript
import { CheerioScraper } from './cheerio-scraper';
import { PlaywrightScraper } from './playwright-scraper';

export class HybridScraper {
  private cheerioScraper = new CheerioScraper();
  private playwrightScraper = new PlaywrightScraper();

  async scrapeContent(url: string): Promise<string> {
    if (this.isStaticSite(url)) {
      console.log(`Using Cheerio for static site: ${url}`);
      return await this.cheerioScraper.scrapeContent(url);
    } else {
      console.log(`Using Playwright for dynamic site: ${url}`);
      return await this.playwrightScraper.scrapeContent(url);
    }
  }

  private isStaticSite(url: string): boolean {
    const staticSites = [
      'news.ycombinator.com',
      'medium.com',
      'dev.to',
      'stackoverflow.com',
      'github.com'
    ];
    
    return staticSites.some(site => url.includes(site));
  }

  async close() {
    await this.playwrightScraper.close();
  }
}
```

#### 4. Ensemble Mode Integration
**Copy**: `src/background/services/ensemble-extractor.ts` to API
**File**: `golden-nuggets-api/src/services/ensemble-extractor.ts`
```typescript
// Direct copy from extension with minor imports adjustments
import type { EnsembleExtractionResult, LLMProvider } from '../shared/types/providers';
import { HybridSimilarityMatcher } from './hybrid-similarity';
```

#### 5. Updated API Handler
**File**: `golden-nuggets-api/src/api/extract.ts` - Enhanced version
```typescript
import { HybridScraper } from '../scrapers/hybrid-scraper';
import { createProvider } from '../services/provider-factory';
import { EnsembleExtractor } from '../services/ensemble-extractor';
import type { ProviderId } from '../shared/types/providers';

const scraper = new HybridScraper();
const ensembleExtractor = new EnsembleExtractor();

export async function extractGoldenNuggets(req: any, res: any) {
  try {
    const { 
      url, 
      provider = 'gemini' as ProviderId,
      model,
      apiKey, 
      prompt, 
      nuggetTypes = [],
      ensemble = false,
      temperature = 0.7
    } = req.body;

    if (!url || !apiKey) {
      return res.status(400).json({ 
        error: 'URL and API key are required' 
      });
    }

    // Scrape content using hybrid approach
    const content = await scraper.scrapeContent(url);
    
    if (!content.trim()) {
      return res.status(400).json({ 
        error: 'No content could be extracted from the URL' 
      });
    }

    // Create AI provider
    const aiProvider = createProvider(provider, apiKey, model);

    // Extract golden nuggets
    let result;
    if (ensemble) {
      result = await ensembleExtractor.extractWithEnsemble(
        content, 
        prompt || getDefaultPrompt(), 
        aiProvider,
        {
          runs: 3,
          temperature,
          parallelExecution: true,
          selectedTypes: nuggetTypes
        }
      );
    } else {
      result = await aiProvider.extractGoldenNuggets(
        content, 
        prompt || getDefaultPrompt(), 
        temperature,
        nuggetTypes
      );
    }

    res.json({
      ...result,
      metadata: {
        ...result.metadata,
        url,
        provider,
        model: model || 'default',
        scrapingMethod: scraper.isStaticSite(url) ? 'cheerio' : 'playwright',
        contentLength: content.length
      }
    });
  } catch (error) {
    console.error('Extraction error:', error);
    res.status(500).json({ 
      error: 'Failed to extract golden nuggets',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
```

### Success Criteria

#### Automated Verification
- [ ] All providers build without errors: `npm run build`
- [ ] Playwright installs correctly: `npx playwright install`
- [ ] API supports all providers: Gemini, OpenAI, Anthropic, OpenRouter
- [ ] Ensemble mode returns consensus results

#### Manual Verification
- [ ] Static sites use Cheerio (faster response times)
- [ ] Dynamic sites use Playwright (handles JavaScript)
- [ ] All AI providers return consistent golden nugget format
- [ ] Ensemble mode provides confidence scores and run metadata
- [ ] Type filtering works across all providers

---

## Phase 3: Production Ready & Docker

### Overview
Add Docker containerization, proper configuration management, comprehensive error handling, and basic rate limiting for production deployment.

### Changes Required:

#### 1. Docker Configuration
**File**: `golden-nuggets-api/Dockerfile`
```dockerfile
FROM node:18-slim

# Install Playwright dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libnss3 \
    libatk-bridge2.0-0 \
    libxss1 \
    libgtk-3-0 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set up Playwright
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Build TypeScript
RUN npm run build

# Create non-root user
RUN useradd -m -u 1001 apiuser
USER apiuser

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

CMD ["npm", "start"]
```

**File**: `golden-nuggets-api/docker-compose.yml`
```yaml
version: '3.8'
services:
  golden-nuggets-api:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=info
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    mem_limit: 1g
    cpus: 1.0
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

#### 2. Configuration Management
**File**: `golden-nuggets-api/src/config/config.ts`
```typescript
export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  rateLimiting: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10)
  },
  
  scraping: {
    timeout: parseInt(process.env.SCRAPING_TIMEOUT || '30000', 10),
    retries: parseInt(process.env.SCRAPING_RETRIES || '2', 10),
    maxContentLength: parseInt(process.env.MAX_CONTENT_LENGTH || '100000', 10)
  },
  
  browser: {
    headless: process.env.BROWSER_HEADLESS !== 'false',
    timeout: parseInt(process.env.BROWSER_TIMEOUT || '30000', 10)
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};
```

#### 3. Enhanced Error Handling
**File**: `golden-nuggets-api/src/middleware/errorHandler.ts`
```typescript
import { Request, Response, NextFunction } from 'express';

export class APIError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export function errorHandler(
  error: Error, 
  req: Request, 
  res: Response, 
  next: NextFunction
) {
  console.error(`API Error [${req.method} ${req.path}]:`, {
    message: error.message,
    stack: error.stack,
    body: req.body
  });

  if (error instanceof APIError) {
    return res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    });
  }

  // Handle specific error types
  if (error.message.includes('timeout')) {
    return res.status(408).json({
      error: 'Request timeout - the website took too long to respond',
      code: 'TIMEOUT_ERROR'
    });
  }

  if (error.message.includes('Invalid API key')) {
    return res.status(401).json({
      error: 'Invalid API key for the specified provider',
      code: 'INVALID_API_KEY'
    });
  }

  if (error.message.includes('rate limit')) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      code: 'RATE_LIMITED'
    });
  }

  // Default server error
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  });
}
```

#### 4. Rate Limiting & Security Middleware
**Install**: `npm install express-rate-limit express-slow-down`

**File**: `golden-nuggets-api/src/middleware/security.ts`
```typescript
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { config } from '../config/config';

export const apiRateLimit = rateLimit({
  windowMs: config.rateLimiting.windowMs,
  max: config.rateLimiting.max,
  message: {
    error: 'Too many requests from this IP',
    retryAfter: Math.ceil(config.rateLimiting.windowMs / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const speedLimiter = slowDown({
  windowMs: config.rateLimiting.windowMs,
  delayAfter: Math.floor(config.rateLimiting.max / 2),
  delayMs: 500,
  maxDelayMs: 20000
});
```

#### 5. Health Check Endpoint
**File**: `golden-nuggets-api/src/api/health.ts`
```typescript
import { Request, Response } from 'express';

export async function healthCheck(req: Request, res: Response) {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    services: {
      api: 'operational',
      scraping: 'operational'
    }
  };

  try {
    // Add basic service checks if needed
    res.status(200).json(health);
  } catch (error) {
    health.status = 'unhealthy';
    health.services.api = 'degraded';
    res.status(503).json(health);
  }
}
```

#### 6. Updated Main App
**File**: `golden-nuggets-api/src/app.ts` - Production version
```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/config';
import { apiRateLimit, speedLimiter } from './middleware/security';
import { errorHandler } from './middleware/errorHandler';
import { extractGoldenNuggets } from './api/extract';
import { healthCheck } from './api/health';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: false
}));

// Logging
if (config.nodeEnv !== 'test') {
  app.use(morgan('combined'));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api', apiRateLimit, speedLimiter);

// Routes
app.get('/health', healthCheck);
app.post('/api/extract', extractGoldenNuggets);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /health',
      'POST /api/extract'
    ]
  });
});

export { app };

// Start server if not in test mode
if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`Golden Nuggets API running on port ${config.port}`);
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(`Health check: http://localhost:${config.port}/health`);
  });
}
```

### Success Criteria

#### Automated Verification
- [ ] Docker image builds successfully: `docker build -t golden-nuggets-api .`
- [ ] Container starts and passes health check: `docker-compose up -d`
- [ ] Health endpoint returns 200: `curl http://localhost:3001/health`
- [ ] Rate limiting works: Test with rapid requests
- [ ] Error handling returns proper HTTP status codes

#### Manual Verification
- [ ] API handles invalid URLs gracefully with clear error messages
- [ ] Memory usage stays within reasonable bounds during operation
- [ ] Container restarts automatically on crashes
- [ ] Logs are captured and accessible via `docker-compose logs`
- [ ] Production configuration works in Docker environment

---

## Phase 4: Advanced Features (Optional)

### Overview
Add batch processing, enhanced anti-detection, monitoring, and performance optimizations for production scale usage.

### Changes Required:

#### 1. Batch Processing API
**File**: `golden-nuggets-api/src/api/batch.ts`
```typescript
import { Request, Response } from 'express';
import { HybridScraper } from '../scrapers/hybrid-scraper';
import { createProvider } from '../services/provider-factory';

export async function batchExtract(req: Request, res: Response) {
  const { 
    urls, 
    provider = 'gemini',
    apiKey,
    concurrency = 3,
    ...extractConfig 
  } = req.body;

  if (!Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: 'URLs array is required' });
  }

  if (urls.length > 10) {
    return res.status(400).json({ error: 'Maximum 10 URLs per batch' });
  }

  const scraper = new HybridScraper();
  const aiProvider = createProvider(provider, apiKey);
  
  // Process URLs with controlled concurrency
  const results = [];
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    
    const batchPromises = batch.map(async (url: string) => {
      try {
        const content = await scraper.scrapeContent(url);
        const nuggets = await aiProvider.extractGoldenNuggets(
          content, 
          extractConfig.prompt || getDefaultPrompt(),
          extractConfig.temperature || 0.7,
          extractConfig.nuggetTypes || []
        );
        
        return { url, success: true, result: nuggets };
      } catch (error) {
        return { 
          url, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });
    
    const batchResults = await Promise.allSettled(batchPromises);
    results.push(...batchResults.map(r => 
      r.status === 'fulfilled' ? r.value : r.reason
    ));
  }

  await scraper.close();

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  res.json({
    total: urls.length,
    successful: successful.length,
    failed: failed.length,
    results
  });
}
```

#### 2. Enhanced Anti-Detection
**Install**: `npm install playwright-extra playwright-extra-plugin-stealth`

**File**: `golden-nuggets-api/src/scrapers/stealth-playwright-scraper.ts`
```typescript
import { chromium } from 'playwright-extra';
import stealth from 'playwright-extra-plugin-stealth';

chromium.use(stealth());

export class StealthPlaywrightScraper {
  private browser: any = null;

  async init() {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled'
        ]
      });
    }
  }

  async scrapeContent(url: string): Promise<string> {
    await this.init();
    
    const context = await this.browser.newContext({
      userAgent: this.getRandomUserAgent(),
      viewport: this.getRandomViewport(),
      locale: 'en-US',
      timezoneId: 'America/New_York'
    });

    // Add random mouse movements
    const page = await context.newPage();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      
      // Simulate human behavior
      await page.mouse.move(
        Math.random() * 800, 
        Math.random() * 600
      );
      
      await page.waitForTimeout(Math.random() * 3000 + 1000);
      
      const content = await page.evaluate(() => {
        const elementsToRemove = document.querySelectorAll(
          'script, style, nav, header, footer, .ad, .advertisement'
        );
        elementsToRemove.forEach(el => el.remove());
        
        return document.body.innerText;
      });
      
      return content;
    } finally {
      await context.close();
    }
  }

  private getRandomUserAgent(): string {
    const agents = [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
    return agents[Math.floor(Math.random() * agents.length)];
  }

  private getRandomViewport() {
    const viewports = [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 1536, height: 864 }
    ];
    return viewports[Math.floor(Math.random() * viewports.length)];
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
```

#### 3. Performance Monitoring
**Install**: `npm install prom-client`

**File**: `golden-nuggets-api/src/middleware/metrics.ts`
```typescript
import promClient from 'prom-client';

const register = new promClient.Register();

export const httpDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  registers: [register]
});

export const scrapingDuration = new promClient.Histogram({
  name: 'scraping_duration_seconds',
  help: 'Duration of scraping operations',
  labelNames: ['scraper_type', 'success'],
  registers: [register]
});

export const activeRequests = new promClient.Gauge({
  name: 'active_requests',
  help: 'Number of active requests',
  registers: [register]
});

register.setDefaultLabels({ service: 'golden-nuggets-api' });

export { register };
```

### Success Criteria

#### Automated Verification
- [ ] Batch processing handles multiple URLs correctly
- [ ] Stealth scraper passes basic anti-bot tests
- [ ] Metrics are collected and exposed at `/metrics`
- [ ] Performance improvements measurable

#### Manual Verification
- [ ] Batch API processes up to 10 URLs efficiently
- [ ] Enhanced anti-detection works on Twitter/Reddit
- [ ] Memory usage optimized for concurrent requests
- [ ] Response times remain reasonable under load

---

## Testing Strategy

### Unit Tests
- API endpoint validation and error handling
- Scraper functionality with mock responses
- AI provider integration with test API keys
- Configuration and middleware behavior

### Integration Tests
- End-to-end extraction workflow
- Multi-provider AI integration
- Error scenarios and recovery
- Docker container functionality

### Manual Testing Steps
1. **Basic Functionality**
   ```bash
   # Test Hacker News extraction
   curl -X POST http://localhost:3001/api/extract \
     -H "Content-Type: application/json" \
     -d '{
       "url": "https://news.ycombinator.com/item?id=38981254",
       "provider": "gemini",
       "apiKey": "your-key"
     }'
   ```

2. **Provider Testing**
   - Test each AI provider (Gemini, OpenAI, Anthropic, OpenRouter)
   - Verify consistent response format
   - Check error handling for invalid API keys

3. **Ensemble Mode**
   ```bash
   # Test ensemble extraction
   curl -X POST http://localhost:3001/api/extract \
     -H "Content-Type: application/json" \
     -d '{
       "url": "https://news.ycombinator.com/item?id=38981254",
       "provider": "gemini",
       "apiKey": "your-key",
       "ensemble": true
     }'
   ```

4. **Batch Processing** (Phase 4)
   ```bash
   # Test batch extraction
   curl -X POST http://localhost:3001/api/extract/batch \
     -H "Content-Type: application/json" \
     -d '{
       "urls": ["url1", "url2", "url3"],
       "provider": "gemini",
       "apiKey": "your-key"
     }'
   ```

## Performance Considerations

### Expected Performance
- **Static Sites** (Cheerio): 1-3 seconds per extraction
- **Dynamic Sites** (Playwright): 5-15 seconds per extraction
- **Memory Usage**: 100-500MB depending on browser instances
- **Concurrent Requests**: 3-5 without performance degradation

### Optimization Strategies
- Browser instance reuse to reduce startup overhead
- Content size limits to prevent memory issues
- Request queuing to prevent system overload
- Response caching for repeated URLs (optional)

## Migration Notes

### From Extension to API
1. **Shared Code Extraction**: Move AI providers to shared package
2. **Configuration Updates**: Externalize configuration from Chrome storage to environment variables
3. **Error Handling**: Adapt extension error handling to HTTP status codes
4. **Testing**: Create API-specific test suites

### Deployment Considerations
- Use Docker Compose for simple self-hosting
- Mount configuration files for easy updates
- Set up log rotation to prevent disk space issues
- Configure proper memory limits for containers

## References

- Original request: Proof of concept API for golden nugget extraction
- Extension architecture: `src/background/services/`, `src/shared/providers/`
- AI provider interfaces: `src/shared/types/providers.ts:35`
- Ensemble implementation: `src/background/services/ensemble-extractor.ts:27`
- Web scraping research: Comprehensive analysis of Playwright, Cheerio, anti-detection techniques
- Container deployment: Docker best practices for Node.js applications