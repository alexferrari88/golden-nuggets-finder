# Multi-LLM Implementation Task Breakdown

## Overview

This plan implements multi-LLM provider support for the Golden Nuggets Finder Chrome extension. The implementation follows a **hybrid architecture approach** based on research findings:

- **Keep existing Gemini integration** (direct API calls work reliably)
- **Add LangChain wrappers** for OpenAI, Anthropic, and OpenRouter
- **Model-specific DSPy optimization** in the backend
- **Simple encrypted API key storage**
- **3-week implementation timeline**

## Key Research Findings

1. **LangChain Gemini Issues**: LangChain JS has compatibility problems with Gemini structured outputs - keep direct API approach
2. **Hybrid Architecture**: Most effective approach is to maintain existing Gemini while adding LangChain for other providers
3. **Model-Specific Optimization**: DSPy optimization must be separate for each model/provider combination
4. **Response Normalization**: All providers must return consistent golden nuggets schema

## Task Dependencies

```
Week 1: Foundation & Provider Implementation
T1 → T2 → T3 → T4
     ↓    ↓    ↓
     T5   T6   T7, T8, T9 (parallel)
          ↓
          T10

Week 2: Backend & Integration  
T11 → T12 → T13
T14 → T15 (parallel with T11-T13)
T16 (depends on T14-T15)

Week 3: Polish & Deploy
T17 → T18 → T19 → T20 → T21 → T22
```

---

## WEEK 1: Foundation & Provider Implementation

### T1: Project Dependencies and Setup
**Status**: ✅ COMPLETED  
**Estimated Time**: 2 hours  
**Dependencies**: None  

**Description**: Add LangChain and supporting dependencies to the project.

**Files to Modify**:
- `/home/alex/src/golden-nuggets-finder/package.json`
- `/home/alex/src/golden-nuggets-finder/pnpm-lock.yaml` (auto-generated)

**Implementation Details**:
```bash
# Add these dependencies
pnpm add @langchain/core @langchain/openai @langchain/anthropic @langchain/community
pnpm add zod  # For schema validation
```

**Acceptance Criteria**:
- [x] LangChain dependencies successfully installed
- [x] Project builds without errors: `pnpm build`
- [x] Dependencies visible in package.json
- [x] No conflicts with existing dependencies

**Completion Notes**:
- Successfully installed @langchain/core, @langchain/openai, @langchain/anthropic, @langchain/community, and zod
- Project builds cleanly without TypeScript errors
- Minor peer dependency warnings exist but don't affect functionality
- All dependencies correctly added to package.json

**Context for Future Sessions**:
This Chrome extension currently uses direct Gemini API calls. We're adding support for multiple LLM providers while keeping the existing Gemini implementation unchanged.

---

### T2: Define Provider Types and Interfaces
**Status**: ✅ COMPLETED  
**Estimated Time**: 3 hours  
**Dependencies**: T1  

**Description**: Create TypeScript interfaces and types for the multi-provider system.

**Files to Create**:
- `/home/alex/src/golden-nuggets-finder/src/shared/types/providers.ts`

**Implementation Details**:
```typescript
// src/shared/types/providers.ts
export type ProviderId = 'gemini' | 'openai' | 'anthropic' | 'openrouter';

export interface ProviderConfig {
  providerId: ProviderId;
  apiKey: string;
  modelName: string;
}

export interface LLMProvider {
  readonly providerId: ProviderId;
  readonly modelName: string;
  extractGoldenNuggets(content: string, prompt: string): Promise<GoldenNuggetsResponse>;
  validateApiKey(): Promise<boolean>;
}

export interface GoldenNuggetsResponse {
  golden_nuggets: Array<{
    type: 'tool' | 'media' | 'explanation' | 'analogy' | 'model';
    content: string;
    synthesis: string;
  }>;
}

export interface ProviderStorageSchema {
  selectedProvider: ProviderId;
  apiKeys: Record<ProviderId, string>; // Encrypted
  providerConfigs: Record<ProviderId, ProviderConfig>;
}
```

**Files to Update**:
- `/home/alex/src/golden-nuggets-finder/src/shared/types.ts` - Export new provider types

**Acceptance Criteria**:
- [x] All provider types defined with proper TypeScript interfaces
- [x] Types exported from shared/types.ts
- [x] No TypeScript compilation errors
- [x] Types are consistent with existing GeminiResponse interface

**Completion Notes**:
- Created src/shared/types/providers.ts with all required interfaces
- ProviderId, ProviderConfig, LLMProvider, and GoldenNuggetsResponse defined
- Types exported from main types.ts file for easy imports
- GoldenNuggetsResponse maintains compatibility with existing GeminiResponse format
- Project builds successfully with new type definitions

**Context for Future Sessions**:
The existing golden nuggets response format must be maintained. Current schema is in `src/shared/schemas.ts` - ensure compatibility.

---

### T3: Implement Secure API Key Storage
**Status**: TODO  
**Estimated Time**: 4 hours  
**Dependencies**: T2  

**Description**: Create encrypted storage system for multi-provider API keys using Chrome's built-in capabilities.

**Files to Create**:
- `/home/alex/src/golden-nuggets-finder/src/shared/storage/api-key-storage.ts`

**Implementation Details**:
```typescript
// src/shared/storage/api-key-storage.ts
import { ProviderId } from '../types/providers';

export class ApiKeyStorage {
  private static readonly KEY_PREFIX = 'encrypted_api_key_';

  static async store(providerId: ProviderId, apiKey: string): Promise<void> {
    // Simple encryption using base64 for now (can be enhanced later)
    const encrypted = btoa(apiKey);
    await chrome.storage.local.set({
      [`${this.KEY_PREFIX}${providerId}`]: encrypted
    });
  }

  static async get(providerId: ProviderId): Promise<string | null> {
    const result = await chrome.storage.local.get(`${this.KEY_PREFIX}${providerId}`);
    const encrypted = result[`${this.KEY_PREFIX}${providerId}`];
    
    if (!encrypted) return null;
    
    try {
      return atob(encrypted);
    } catch (error) {
      console.error(`Failed to decrypt API key for ${providerId}:`, error);
      return null;
    }
  }

  static async remove(providerId: ProviderId): Promise<void> {
    await chrome.storage.local.remove(`${this.KEY_PREFIX}${providerId}`);
  }

  static async listConfiguredProviders(): Promise<ProviderId[]> {
    const keys = await chrome.storage.local.get();
    return Object.keys(keys)
      .filter(key => key.startsWith(this.KEY_PREFIX))
      .map(key => key.replace(this.KEY_PREFIX, '') as ProviderId);
  }
}
```

**Files to Update**:
- `/home/alex/src/golden-nuggets-finder/src/shared/storage.ts` - Export ApiKeyStorage

**Acceptance Criteria**:
- [ ] API keys can be stored and retrieved successfully
- [ ] Encryption/decryption works correctly
- [ ] Storage operations don't interfere with existing storage
- [ ] Can list configured providers
- [ ] Error handling for corrupted/invalid keys

**Testing Verification**:
```typescript
// Test in browser console
const test = async () => {
  await ApiKeyStorage.store('openai', 'test-key-123');
  const retrieved = await ApiKeyStorage.get('openai');
  console.log('Retrieved:', retrieved); // Should be 'test-key-123'
};
```

**Context for Future Sessions**:
The extension currently stores Gemini API key in `geminiApiKey` field. This new system should coexist with existing storage without conflicts.

---

### T4: Create Provider Factory Pattern
**Status**: TODO  
**Estimated Time**: 3 hours  
**Dependencies**: T3  

**Description**: Implement factory pattern to create provider instances based on configuration.

**Files to Create**:
- `/home/alex/src/golden-nuggets-finder/src/background/services/provider-factory.ts`

**Implementation Details**:
```typescript
// src/background/services/provider-factory.ts
import { LLMProvider, ProviderConfig, ProviderId } from '../../shared/types/providers';
import { GeminiDirectProvider } from '../../shared/providers/gemini-direct-provider';
import { LangChainOpenAIProvider } from '../../shared/providers/langchain-openai-provider';
import { LangChainAnthropicProvider } from '../../shared/providers/langchain-anthropic-provider';
import { LangChainOpenRouterProvider } from '../../shared/providers/langchain-openrouter-provider';

export class ProviderFactory {
  static async createProvider(config: ProviderConfig): Promise<LLMProvider> {
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

  static getDefaultModel(providerId: ProviderId): string {
    const defaults = {
      'gemini': 'gemini-2.5-flash',
      'openai': 'gpt-4.1-mini',
      'anthropic': 'claude-sonnet-4-20250514',
      'openrouter': 'deepseek/deepseek-r1-0528:free'
    };
    return defaults[providerId];
  }

  static getSupportedProviders(): ProviderId[] {
    return ['gemini', 'openai', 'anthropic', 'openrouter'];
  }
}
```

**Acceptance Criteria**:
- [ ] Factory can create provider instances for all supported providers
- [ ] Error handling for unsupported providers
- [ ] Default model configurations provided
- [ ] TypeScript compilation successful
- [ ] No runtime errors when instantiating factory

**Context for Future Sessions**:
This factory will be used by the background script to route requests to appropriate providers. It needs to integrate with existing message handling system.

---

### T5: Implement Gemini Direct Provider Wrapper
**Status**: TODO  
**Estimated Time**: 2 hours  
**Dependencies**: T4  

**Description**: Create wrapper around existing GeminiClient to implement LLMProvider interface.

**Files to Create**:
- `/home/alex/src/golden-nuggets-finder/src/shared/providers/gemini-direct-provider.ts`

**Implementation Details**:
```typescript
// src/shared/providers/gemini-direct-provider.ts
import { LLMProvider, ProviderConfig, GoldenNuggetsResponse } from '../types/providers';
import { GeminiClient } from '../../background/gemini-client';

export class GeminiDirectProvider implements LLMProvider {
  readonly providerId = 'gemini' as const;
  readonly modelName: string;
  private geminiClient: GeminiClient;

  constructor(private config: ProviderConfig) {
    this.modelName = config.modelName || 'gemini-2.5-flash';
    this.geminiClient = new GeminiClient();
  }

  async extractGoldenNuggets(content: string, prompt: string): Promise<GoldenNuggetsResponse> {
    // Use existing GeminiClient implementation
    // The existing client already returns the correct format
    return this.geminiClient.generateStructuredContent(content, prompt, this.config.apiKey);
  }

  async validateApiKey(): Promise<boolean> {
    try {
      // Test with minimal content
      const testResult = await this.extractGoldenNuggets(
        'Test content for API validation',
        'Extract one simple insight from this text.'
      );
      return testResult && testResult.golden_nuggets && Array.isArray(testResult.golden_nuggets);
    } catch (error) {
      console.warn(`Gemini API key validation failed:`, error.message);
      return false;
    }
  }
}
```

**Files to Update**:
- `/home/alex/src/golden-nuggets-finder/src/shared/providers/index.ts` - Export new provider

**Acceptance Criteria**:
- [ ] Provider implements LLMProvider interface correctly
- [ ] Uses existing GeminiClient without modification
- [ ] API key validation works
- [ ] Returns golden nuggets in expected format
- [ ] No breaking changes to existing Gemini functionality

**Context for Future Sessions**:
The existing GeminiClient is in `src/background/gemini-client.ts`. Do NOT modify the existing client - only wrap it. The current implementation uses responseSchema for structured output.

---

### T6: Implement LangChain OpenAI Provider
**Status**: TODO  
**Estimated Time**: 4 hours  
**Dependencies**: T4  

**Description**: Create OpenAI provider using LangChain with structured output for golden nuggets.

**Files to Create**:
- `/home/alex/src/golden-nuggets-finder/src/shared/providers/langchain-openai-provider.ts`

**Implementation Details**:
```typescript
// src/shared/providers/langchain-openai-provider.ts
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { LLMProvider, ProviderConfig, GoldenNuggetsResponse } from '../types/providers';

// Zod schema for golden nuggets (matches existing format)
const GoldenNuggetsSchema = z.object({
  golden_nuggets: z.array(z.object({
    type: z.enum(['tool', 'media', 'explanation', 'analogy', 'model']),
    content: z.string(),
    synthesis: z.string()
  }))
});

export class LangChainOpenAIProvider implements LLMProvider {
  readonly providerId = 'openai' as const;
  readonly modelName: string;
  private model: ChatOpenAI;

  constructor(private config: ProviderConfig) {
    this.modelName = config.modelName || 'gpt-4.1-mini';
    this.model = new ChatOpenAI({
      apiKey: config.apiKey,
      model: this.modelName,
      temperature: 0, // Consistent output
    });
  }

  async extractGoldenNuggets(content: string, prompt: string): Promise<GoldenNuggetsResponse> {
    try {
      const structuredModel = this.model.withStructuredOutput(GoldenNuggetsSchema, {
        name: "extract_golden_nuggets",
        method: "functionCalling"
      });

      const response = await structuredModel.invoke([
        new SystemMessage(prompt),
        new HumanMessage(content)
      ]);

      return response as GoldenNuggetsResponse;
    } catch (error) {
      console.error(`OpenAI provider error:`, error);
      throw new Error(`OpenAI API call failed: ${error.message}`);
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      const testResult = await this.extractGoldenNuggets(
        'Test content for API validation',
        'Extract one simple insight from this text.'
      );
      return testResult && testResult.golden_nuggets && Array.isArray(testResult.golden_nuggets);
    } catch (error) {
      console.warn(`OpenAI API key validation failed:`, error.message);
      return false;
    }
  }
}
```

**Acceptance Criteria**:
- [ ] Provider implements LLMProvider interface
- [ ] Uses LangChain's withStructuredOutput correctly
- [ ] Returns golden nuggets in exact same format as Gemini
- [ ] API key validation works
- [ ] Error handling for API failures
- [ ] Structured output schema matches existing format exactly

**Testing Verification**:
Create test in browser console with valid OpenAI API key to verify golden nuggets format matches Gemini output.

**Context for Future Sessions**:
OpenAI models work well with LangChain structured outputs. Use function calling method for most reliable results. The response format must exactly match the existing golden nuggets schema.

---

### T7: Implement LangChain Anthropic Provider
**Status**: TODO  
**Estimated Time**: 4 hours  
**Dependencies**: T4  

**Description**: Create Anthropic Claude provider using LangChain with structured output.

**Files to Create**:
- `/home/alex/src/golden-nuggets-finder/src/shared/providers/langchain-anthropic-provider.ts`

**Implementation Details**:
```typescript
// src/shared/providers/langchain-anthropic-provider.ts
import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { LLMProvider, ProviderConfig, GoldenNuggetsResponse } from '../types/providers';

const GoldenNuggetsSchema = z.object({
  golden_nuggets: z.array(z.object({
    type: z.enum(['tool', 'media', 'explanation', 'analogy', 'model']),
    content: z.string(),
    synthesis: z.string()
  }))
});

export class LangChainAnthropicProvider implements LLMProvider {
  readonly providerId = 'anthropic' as const;
  readonly modelName: string;
  private model: ChatAnthropic;

  constructor(private config: ProviderConfig) {
    this.modelName = config.modelName || 'claude-sonnet-4-20250514';
    this.model = new ChatAnthropic({
      apiKey: config.apiKey,
      model: this.modelName,
      temperature: 0,
    });
  }

  async extractGoldenNuggets(content: string, prompt: string): Promise<GoldenNuggetsResponse> {
    try {
      const structuredModel = this.model.withStructuredOutput(GoldenNuggetsSchema, {
        name: "extract_golden_nuggets",
        method: "functionCalling"
      });

      const response = await structuredModel.invoke([
        new SystemMessage(prompt),
        new HumanMessage(content)
      ]);

      return response as GoldenNuggetsResponse;
    } catch (error) {
      console.error(`Anthropic provider error:`, error);
      throw new Error(`Anthropic API call failed: ${error.message}`);
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      const testResult = await this.extractGoldenNuggets(
        'Test content for API validation',
        'Extract one simple insight from this text.'
      );
      return testResult && testResult.golden_nuggets && Array.isArray(testResult.golden_nuggets);
    } catch (error) {
      console.warn(`Anthropic API key validation failed:`, error.message);
      return false;
    }
  }
}
```

**Acceptance Criteria**:
- [ ] Provider implements LLMProvider interface correctly
- [ ] Uses LangChain Anthropic integration
- [ ] Returns consistent golden nuggets format
- [ ] API key validation functional
- [ ] Proper error handling and logging
- [ ] Compatible with Claude-4-sonnet model

**Context for Future Sessions**:
Anthropic Claude models work well with LangChain but can be less stable than OpenAI. The default model should be claude-sonnet-4-20250514 for best results.

---

### T8: Implement LangChain OpenRouter Provider
**Status**: TODO  
**Estimated Time**: 4 hours  
**Dependencies**: T4  

**Description**: Create OpenRouter provider using LangChain's OpenAI-compatible interface.

**Files to Create**:
- `/home/alex/src/golden-nuggets-finder/src/shared/providers/langchain-openrouter-provider.ts`

**Implementation Details**:
```typescript
// src/shared/providers/langchain-openrouter-provider.ts
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { LLMProvider, ProviderConfig, GoldenNuggetsResponse } from '../types/providers';

const GoldenNuggetsSchema = z.object({
  golden_nuggets: z.array(z.object({
    type: z.enum(['tool', 'media', 'explanation', 'analogy', 'model']),
    content: z.string(),
    synthesis: z.string()
  }))
});

export class LangChainOpenRouterProvider implements LLMProvider {
  readonly providerId = 'openrouter' as const;
  readonly modelName: string;
  private model: ChatOpenAI;

  constructor(private config: ProviderConfig) {
    this.modelName = config.modelName || 'deepseek/deepseek-r1-0528:free';
    this.model = new ChatOpenAI({
      apiKey: config.apiKey,
      model: this.modelName,
      temperature: 0,
      configuration: {
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'HTTP-Referer': 'https://golden-nuggets-finder.com',
          'X-Title': 'Golden Nuggets Finder'
        }
      }
    });
  }

  async extractGoldenNuggets(content: string, prompt: string): Promise<GoldenNuggetsResponse> {
    try {
      const structuredModel = this.model.withStructuredOutput(GoldenNuggetsSchema, {
        name: "extract_golden_nuggets",
        method: "functionCalling"
      });

      const response = await structuredModel.invoke([
        new SystemMessage(prompt),
        new HumanMessage(content)
      ]);

      return response as GoldenNuggetsResponse;
    } catch (error) {
      console.error(`OpenRouter provider error:`, error);
      throw new Error(`OpenRouter API call failed: ${error.message}`);
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      const testResult = await this.extractGoldenNuggets(
        'Test content for API validation',
        'Extract one simple insight from this text.'
      );
      return testResult && testResult.golden_nuggets && Array.isArray(testResult.golden_nuggets);
    } catch (error) {
      console.warn(`OpenRouter API key validation failed:`, error.message);
      return false;
    }
  }
}
```

**Acceptance Criteria**:
- [ ] Provider works with OpenRouter's OpenAI-compatible API
- [ ] Correct headers for OpenRouter attribution
- [ ] Model name format compatible with OpenRouter
- [ ] API key validation works
- [ ] Structured output functions correctly
- [ ] Default model is deepseek/deepseek-r1-0528:free

**Context for Future Sessions**:
OpenRouter uses OpenAI-compatible API but requires specific headers. The base URL should be https://openrouter.ai/api/v1. Model names follow format provider/model-name.

---

### T9: Create Response Normalizer
**Status**: TODO  
**Estimated Time**: 3 hours  
**Dependencies**: T5, T6, T7, T8  

**Description**: Ensure all providers return consistent golden nuggets format.

**Files to Create**:
- `/home/alex/src/golden-nuggets-finder/src/background/services/response-normalizer.ts`

**Implementation Details**:
```typescript
// src/background/services/response-normalizer.ts
import { GoldenNuggetsResponse, ProviderId } from '../../shared/types/providers';
import { z } from 'zod';

const GoldenNuggetsSchema = z.object({
  golden_nuggets: z.array(z.object({
    type: z.enum(['tool', 'media', 'explanation', 'analogy', 'model']),
    content: z.string(),
    synthesis: z.string()
  }))
});

export class ResponseNormalizer {
  static normalize(response: any, providerId: ProviderId): GoldenNuggetsResponse {
    try {
      // Validate response structure
      const validated = GoldenNuggetsSchema.parse(response);
      
      // Ensure content and synthesis are strings and non-empty
      const normalized = {
        golden_nuggets: validated.golden_nuggets.map(nugget => ({
          type: nugget.type,
          content: String(nugget.content).trim(),
          synthesis: String(nugget.synthesis).trim()
        })).filter(nugget => nugget.content && nugget.synthesis)
      };

      return normalized;
    } catch (error) {
      console.error(`Response normalization failed for ${providerId}:`, error);
      console.error('Raw response:', response);
      
      // Return empty response rather than throwing
      return { golden_nuggets: [] };
    }
  }

  static validate(response: any): boolean {
    try {
      GoldenNuggetsSchema.parse(response);
      return true;
    } catch {
      return false;
    }
  }
}
```

**Acceptance Criteria**:
- [ ] All provider responses validated against schema
- [ ] Invalid responses handled gracefully
- [ ] Empty/malformed responses don't crash system
- [ ] Consistent format across all providers
- [ ] Proper error logging for debugging

**Context for Future Sessions**:
This normalizer ensures consistency across different provider response formats. It should be used by all providers before returning responses to the background script.

---

### T10: Update Options Page with Provider Selection
**Status**: TODO  
**Estimated Time**: 5 hours  
**Dependencies**: T3, T9  

**Description**: Add provider selection UI to existing options page.

**Files to Update**:
- `/home/alex/src/golden-nuggets-finder/src/entrypoints/options.tsx`

**Implementation Details**:
Add provider selection section to existing options page:

```typescript
// Add to options.tsx
import { ApiKeyStorage } from '../shared/storage/api-key-storage';
import { ProviderFactory } from '../background/services/provider-factory';

const ProviderConfiguration = () => {
  const [selectedProvider, setSelectedProvider] = useState<ProviderId>('gemini');
  const [apiKeys, setApiKeys] = useState<Record<ProviderId, string>>({});
  const [validationStatus, setValidationStatus] = useState<Record<ProviderId, boolean>>({});

  const providers = [
    { id: 'gemini', name: 'Google Gemini', description: 'Fast, reliable, low cost' },
    { id: 'openai', name: 'OpenAI GPT', description: 'High quality, industry standard' },
    { id: 'anthropic', name: 'Anthropic Claude', description: 'Safe, helpful responses' },
    { id: 'openrouter', name: 'OpenRouter', description: 'Access to many models' }
  ];

  const handleProviderChange = async (providerId: ProviderId) => {
    setSelectedProvider(providerId);
    // Save selection to storage
    await chrome.storage.local.set({ selectedProvider: providerId });
  };

  const handleApiKeyUpdate = async (providerId: ProviderId, apiKey: string) => {
    setApiKeys(prev => ({ ...prev, [providerId]: apiKey }));
    if (apiKey) {
      await ApiKeyStorage.store(providerId, apiKey);
    }
  };

  const testApiKey = async (providerId: ProviderId) => {
    const apiKey = apiKeys[providerId];
    if (!apiKey) return;

    try {
      const provider = await ProviderFactory.createProvider({
        providerId,
        apiKey,
        modelName: ProviderFactory.getDefaultModel(providerId)
      });
      
      const isValid = await provider.validateApiKey();
      setValidationStatus(prev => ({ ...prev, [providerId]: isValid }));
    } catch (error) {
      setValidationStatus(prev => ({ ...prev, [providerId]: false }));
    }
  };

  return (
    <div className="provider-config">
      <h3>LLM Provider Selection</h3>
      
      <div className="provider-selection">
        {providers.map(provider => (
          <div key={provider.id} className="provider-option">
            <label>
              <input
                type="radio"
                name="provider"
                value={provider.id}
                checked={selectedProvider === provider.id}
                onChange={() => handleProviderChange(provider.id as ProviderId)}
              />
              <strong>{provider.name}</strong>
              <span>{provider.description}</span>
            </label>
          </div>
        ))}
      </div>

      {selectedProvider !== 'gemini' && (
        <div className="api-key-config">
          <label>API Key for {providers.find(p => p.id === selectedProvider)?.name}:</label>
          <input
            type="password"
            value={apiKeys[selectedProvider] || ''}
            onChange={(e) => handleApiKeyUpdate(selectedProvider, e.target.value)}
            placeholder="Enter your API key"
          />
          <button onClick={() => testApiKey(selectedProvider)}>
            Test Connection
          </button>
          {validationStatus[selectedProvider] !== undefined && (
            <span className={validationStatus[selectedProvider] ? 'valid' : 'invalid'}>
              {validationStatus[selectedProvider] ? '✓ Valid' : '✗ Invalid'}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// Add to main Options component
export default function Options() {
  return (
    <div>
      {/* Existing options content */}
      <ProviderConfiguration />
    </div>
  );
}
```

**Files to Update**:
- `/home/alex/src/golden-nuggets-finder/src/styles/content.css` - Add provider selection styles

**Acceptance Criteria**:
- [ ] Provider selection radio buttons work
- [ ] API key input fields appear for non-Gemini providers
- [ ] API key validation works for each provider
- [ ] Selected provider persists in storage
- [ ] UI integrates cleanly with existing options page
- [ ] Gemini option uses existing API key system

**Context for Future Sessions**:
The existing options page handles Gemini API key configuration. The new provider system should coexist without breaking existing functionality. Use the same design system styles as the rest of the extension.

---

## WEEK 2: Backend Integration & Core Functionality

### T11: Update Database Schema for Model Tracking
**Status**: TODO  
**Estimated Time**: 2 hours  
**Dependencies**: None (backend work)  

**Description**: Add model_provider and model_name fields to feedback table for DSPy optimization.

**Files to Update**:
- `/home/alex/src/golden-nuggets-finder/backend/app/models.py`
- Create new migration file

**Implementation Details**:

**Create Migration**:
```sql
-- backend/migrations/002_add_model_tracking.sql
ALTER TABLE feedback ADD COLUMN model_provider VARCHAR(50);
ALTER TABLE feedback ADD COLUMN model_name VARCHAR(100);

-- Backfill existing data (assume it was Gemini)
UPDATE feedback 
SET model_provider = 'gemini', model_name = 'gemini-2.5-flash' 
WHERE model_provider IS NULL;
```

**Update Models**:
```python
# backend/app/models.py - Update Feedback class
from pydantic import BaseModel
from typing import Optional

class Feedback(BaseModel):
    feedback_id: str
    user_id: str
    content_hash: str
    prompt_hash: str
    
    # NEW: Model tracking fields
    model_provider: str  # 'gemini', 'openai', 'anthropic', 'openrouter'
    model_name: str      # 'gemini-2.5-flash', 'gpt-4.1-mini', etc.
    
    # Existing fields
    feedback_type: str
    rating: int
    golden_nuggets: list
    response_time_ms: int
    created_at: datetime
```

**Acceptance Criteria**:
- [ ] Database schema updated successfully
- [ ] Existing feedback records backfilled with Gemini info
- [ ] Python models updated to include new fields
- [ ] Database migration runs without errors
- [ ] Backend still starts and serves requests

**Context for Future Sessions**:
This enables model-specific DSPy optimization. Each feedback item needs to know which provider/model was used for that particular extraction.

---

### T12: Update Feedback Collection with Provider Metadata
**Status**: TODO  
**Estimated Time**: 3 hours  
**Dependencies**: T11  

**Description**: Modify feedback collection to include provider and model information.

**Files to Update**:
- `/home/alex/src/golden-nuggets-finder/backend/app/services/feedback_service.py`
- `/home/alex/src/golden-nuggets-finder/src/background/message-handler.ts`

**Backend Changes**:
```python
# backend/app/services/feedback_service.py
class FeedbackService:
    @staticmethod
    def save_feedback(
        user_id: str,
        content_hash: str,
        prompt_hash: str,
        feedback_type: str,
        rating: int,
        golden_nuggets: list,
        response_time_ms: int,
        model_provider: str,  # NEW
        model_name: str       # NEW
    ) -> str:
        feedback = Feedback(
            feedback_id=str(uuid.uuid4()),
            user_id=user_id,
            content_hash=content_hash,
            prompt_hash=prompt_hash,
            model_provider=model_provider,  # NEW
            model_name=model_name,          # NEW
            feedback_type=feedback_type,
            rating=rating,
            golden_nuggets=golden_nuggets,
            response_time_ms=response_time_ms,
            created_at=datetime.now()
        )
        
        # Save to database
        db.save_feedback(feedback)
        return feedback.feedback_id
```

**Frontend Changes**:
```typescript
// src/background/message-handler.ts
// Update feedback submission to include provider info
const submitFeedback = async (
  feedbackData: any,
  providerInfo: { providerId: ProviderId; modelName: string }
) => {
  const feedbackPayload = {
    ...feedbackData,
    model_provider: providerInfo.providerId,
    model_name: providerInfo.modelName
  };
  
  // Send to backend
  await fetch('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(feedbackPayload)
  });
};
```

**Acceptance Criteria**:
- [ ] Backend saves provider metadata with feedback
- [ ] Frontend sends provider info in feedback requests
- [ ] API endpoints updated to handle new fields
- [ ] Existing feedback functionality not broken
- [ ] Provider metadata correctly associated with feedback

**Context for Future Sessions**:
Every time golden nuggets are extracted, the system needs to track which provider and model was used. This enables the DSPy optimization to be model-specific.

---

### T13: Implement DSPy Multi-Model Manager
**Status**: TODO  
**Estimated Time**: 4 hours  
**Dependencies**: T12  

**Description**: Create DSPy system that handles optimization for different models separately.

**Files to Create**:
- `/home/alex/src/golden-nuggets-finder/backend/app/services/dspy_multi_model_manager.py`

**Implementation Details**:
```python
# backend/app/services/dspy_multi_model_manager.py
import dspy
from typing import Dict, List
from app.models import Feedback

class DSPyMultiModelManager:
    def __init__(self):
        # Model configurations for DSPy
        self.model_configs = {
            'gemini': dspy.LM('gemini/gemini-2.5-flash'),
            'openai': dspy.LM('openai/gpt-4.1-mini'), 
            'anthropic': dspy.LM('anthropic/claude-sonnet-4-20250514'),
            'openrouter': dspy.LM('deepseek/deepseek-r1-0528:free', api_base='https://openrouter.ai/api/v1')
        }
    
    def optimize_for_provider(self, provider_id: str, feedback_data: List[Feedback]):
        """Run optimization for a specific provider when enough feedback accumulates"""
        
        # Filter feedback for this provider
        provider_feedback = [
            fb for fb in feedback_data 
            if fb.model_provider == provider_id
        ]
        
        if len(provider_feedback) < 50:
            print(f"Not enough feedback for {provider_id}: {len(provider_feedback)} samples")
            return None
            
        print(f"Starting optimization for {provider_id} with {len(provider_feedback)} samples")
        
        # Switch DSPy to this model
        dspy.settings.configure(lm=self.model_configs[provider_id])
        
        # Create training examples from negative feedback
        trainset = self._create_training_examples(provider_feedback)
        
        if len(trainset) < 10:
            print(f"Not enough training examples for {provider_id}")
            return None
        
        # Run DSPy optimization
        optimizer = dspy.BootstrapFewShot()
        optimized_program = optimizer.compile(
            student=GoldenNuggetsExtractor(),
            trainset=trainset
        )
        
        # Save optimized prompts
        self._save_optimized_prompts(provider_id, optimized_program)
        
        print(f"Optimization completed for {provider_id}")
        return optimized_program
    
    def _create_training_examples(self, feedback_data: List[Feedback]) -> List[dspy.Example]:
        """Convert feedback into DSPy training examples"""
        examples = []
        
        for feedback in feedback_data:
            if feedback.feedback_type == 'negative' or feedback.rating <= 2:
                # Create example from negative feedback
                example = dspy.Example(
                    content=feedback.content_hash,  # Would need to store actual content
                    expected_nuggets=feedback.golden_nuggets
                ).with_inputs('content')
                examples.append(example)
        
        return examples
    
    def _save_optimized_prompts(self, provider_id: str, program):
        """Save optimized prompts for this provider"""
        # Save to file or database for later use
        with open(f'optimized_prompts_{provider_id}.json', 'w') as f:
            # Save program state
            pass

# Global instance
dspy_manager = DSPyMultiModelManager()
```

**Files to Update**:
- `/home/alex/src/golden-nuggets-finder/backend/app/services/optimization_service.py` - Integrate multi-model manager

**Acceptance Criteria**:
- [ ] DSPy can switch between different models
- [ ] Optimization runs separately for each provider
- [ ] Training examples created from feedback data
- [ ] Optimized prompts saved per provider
- [ ] Integration with existing optimization service

**Context for Future Sessions**:
This is the core of model-specific optimization. Each provider needs separate optimization because different models respond differently to prompt optimization techniques.

---

### T14: Update Background Script for Provider Routing
**Status**: TODO  
**Estimated Time**: 4 hours  
**Dependencies**: T4, T9, T10  

**Description**: Modify background script to use provider factory and route requests to selected provider.

**Files to Update**:
- `/home/alex/src/golden-nuggets-finder/src/background/message-handler.ts`
- `/home/alex/src/golden-nuggets-finder/src/entrypoints/background.ts`

**Implementation Details**:
```typescript
// src/background/message-handler.ts - Update message handling
import { ProviderFactory } from './services/provider-factory';
import { ApiKeyStorage } from '../shared/storage/api-key-storage';
import { ResponseNormalizer } from './services/response-normalizer';

export class MessageHandler {
  private static async getSelectedProvider(): Promise<ProviderConfig> {
    // Get selected provider from storage
    const result = await chrome.storage.local.get(['selectedProvider']);
    const providerId = result.selectedProvider || 'gemini';
    
    // Get API key for provider
    let apiKey: string;
    if (providerId === 'gemini') {
      // Use existing Gemini key storage
      const geminiResult = await chrome.storage.local.get(['geminiApiKey']);
      apiKey = geminiResult.geminiApiKey;
    } else {
      apiKey = await ApiKeyStorage.get(providerId);
    }
    
    if (!apiKey) {
      throw new Error(`No API key found for provider: ${providerId}`);
    }
    
    return {
      providerId,
      apiKey,
      modelName: ProviderFactory.getDefaultModel(providerId)
    };
  }

  static async handleExtractGoldenNuggets(content: string, prompt: string): Promise<GoldenNuggetsResponse> {
    try {
      // Get provider configuration
      const providerConfig = await this.getSelectedProvider();
      
      // Create provider instance
      const provider = await ProviderFactory.createProvider(providerConfig);
      
      // Extract golden nuggets
      const startTime = performance.now();
      const rawResponse = await provider.extractGoldenNuggets(content, prompt);
      const responseTime = performance.now() - startTime;
      
      // Normalize response
      const normalizedResponse = ResponseNormalizer.normalize(rawResponse, providerConfig.providerId);
      
      // Store provider metadata for feedback
      await chrome.storage.local.set({
        lastUsedProvider: {
          providerId: providerConfig.providerId,
          modelName: providerConfig.modelName,
          responseTime
        }
      });
      
      return normalizedResponse;
    } catch (error) {
      console.error('Golden nuggets extraction failed:', error);
      throw error;
    }
  }
}
```

**Acceptance Criteria**:
- [ ] Background script routes to correct provider
- [ ] Provider selection from storage works
- [ ] API key retrieval works for all providers
- [ ] Response normalization applied
- [ ] Provider metadata stored for feedback
- [ ] Error handling for missing API keys
- [ ] Existing Gemini functionality preserved

**Context for Future Sessions**:
This is the core integration point. The background script needs to route golden nuggets extraction requests to the user's selected provider while maintaining all existing functionality.

---

### T15: Implement Provider Switching Logic
**Status**: TODO  
**Estimated Time**: 3 hours  
**Dependencies**: T14  

**Description**: Add ability to switch providers and handle fallback scenarios.

**Files to Create**:
- `/home/alex/src/golden-nuggets-finder/src/background/services/provider-switcher.ts`

**Implementation Details**:
```typescript
// src/background/services/provider-switcher.ts
import { ProviderFactory } from './provider-factory';
import { ApiKeyStorage } from '../../shared/storage/api-key-storage';
import { ProviderId, ProviderConfig } from '../../shared/types/providers';

export class ProviderSwitcher {
  static async switchProvider(providerId: ProviderId): Promise<boolean> {
    try {
      // Validate provider has API key
      let apiKey: string;
      if (providerId === 'gemini') {
        const result = await chrome.storage.local.get(['geminiApiKey']);
        apiKey = result.geminiApiKey;
      } else {
        apiKey = await ApiKeyStorage.get(providerId);
      }
      
      if (!apiKey) {
        throw new Error(`No API key configured for ${providerId}`);
      }
      
      // Test provider connection
      const config: ProviderConfig = {
        providerId,
        apiKey,
        modelName: ProviderFactory.getDefaultModel(providerId)
      };
      
      const provider = await ProviderFactory.createProvider(config);
      const isValid = await provider.validateApiKey();
      
      if (!isValid) {
        throw new Error(`Invalid API key for ${providerId}`);
      }
      
      // Save new selection
      await chrome.storage.local.set({ selectedProvider: providerId });
      
      // Notify content scripts of provider change
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        try {
          await chrome.tabs.sendMessage(tab.id!, {
            type: 'provider-changed',
            providerId
          });
        } catch {
          // Tab may not have content script
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Failed to switch to provider ${providerId}:`, error);
      return false;
    }
  }
  
  static async getAvailableProviders(): Promise<ProviderId[]> {
    const available: ProviderId[] = [];
    
    // Check Gemini
    const geminiResult = await chrome.storage.local.get(['geminiApiKey']);
    if (geminiResult.geminiApiKey) {
      available.push('gemini');
    }
    
    // Check other providers
    const configuredProviders = await ApiKeyStorage.listConfiguredProviders();
    available.push(...configuredProviders);
    
    return [...new Set(available)]; // Remove duplicates
  }
  
  static async getFallbackProvider(): Promise<ProviderId | null> {
    const available = await this.getAvailableProviders();
    return available.length > 0 ? available[0] : null;
  }
}
```

**Acceptance Criteria**:
- [ ] Can switch between providers successfully
- [ ] Provider validation before switching
- [ ] Fallback to available provider if selected unavailable
- [ ] Content scripts notified of provider changes
- [ ] List of available providers works
- [ ] Error handling for invalid switches

**Context for Future Sessions**:
Provider switching should be smooth and include validation. If a provider fails, the system should gracefully fallback to an available provider.

---

### T16: Update Storage Schema for Multi-Provider
**Status**: TODO  
**Estimated Time**: 2 hours  
**Dependencies**: T15  

**Description**: Update storage schema to handle multi-provider configuration while maintaining backward compatibility.

**Files to Update**:
- `/home/alex/src/golden-nuggets-finder/src/shared/storage.ts`

**Implementation Details**:
```typescript
// src/shared/storage.ts - Update storage interface
export interface ExtensionStorage {
  // Existing fields
  geminiApiKey: string;
  userPrompts: UserPrompt[];
  
  // NEW: Multi-provider fields
  selectedProvider: ProviderId;
  
  // Provider-specific settings
  providerSettings: {
    [K in ProviderId]?: {
      modelName: string;
      lastUsed: string;
      isConfigured: boolean;
    }
  };
  
  // Metadata
  lastUsedProvider?: {
    providerId: ProviderId;
    modelName: string;
    responseTime: number;
    timestamp: string;
  };
}

// Migration function for existing users
export class StorageMigration {
  static async migrateToMultiProvider(): Promise<void> {
    const current = await chrome.storage.local.get();
    
    // Check if already migrated
    if (current.selectedProvider) return;
    
    // Set default provider to Gemini if API key exists
    const updates: Partial<ExtensionStorage> = {
      selectedProvider: current.geminiApiKey ? 'gemini' : 'gemini',
      providerSettings: {
        gemini: {
          modelName: 'gemini-2.5-flash',
          lastUsed: new Date().toISOString(),
          isConfigured: !!current.geminiApiKey
        }
      }
    };
    
    await chrome.storage.local.set(updates);
    console.log('Migrated storage to multi-provider format');
  }
}

// Run migration on service worker startup
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onStartup.addListener(() => {
    StorageMigration.migrateToMultiProvider();
  });
}
```

**Acceptance Criteria**:
- [ ] Storage schema supports multi-provider configuration
- [ ] Backward compatibility with existing Gemini setup
- [ ] Migration runs automatically for existing users
- [ ] No data loss during migration
- [ ] Provider settings persist correctly

**Context for Future Sessions**:
Existing users should not lose their Gemini configuration. The migration should be seamless and automatic.

---

## WEEK 3: Polish & Deployment

### T17: Add Cost Estimation to UI
**Status**: TODO  
**Estimated Time**: 3 hours  
**Dependencies**: T10, T16  

**Description**: Show rough cost estimates for different providers to help users choose.

**Files to Update**:
- `/home/alex/src/golden-nuggets-finder/src/entrypoints/options.tsx`

**Implementation Details**:
```typescript
// Add to options.tsx
const CostEstimator = ({ providerId }: { providerId: ProviderId }) => {
  const costInfo = {
    'gemini': { perRequest: 0.001, description: 'Cheapest option' },
    'openai': { perRequest: 0.01, description: 'Higher quality' },
    'anthropic': { perRequest: 0.008, description: 'Good balance' },
    'openrouter': { perRequest: 0.005, description: 'Varies by model' }
  };

  const cost = costInfo[providerId];
  const monthlyEstimate = cost.perRequest * 100; // Assume 100 requests/month

  return (
    <div className="cost-estimate">
      <div className="cost-per-request">
        ~${cost.perRequest.toFixed(3)} per request
      </div>
      <div className="monthly-estimate">
        ~${monthlyEstimate.toFixed(2)}/month for 100 requests
      </div>
      <div className="description">
        {cost.description}
      </div>
    </div>
  );
};

// Update provider selection to include cost info
const ProviderOption = ({ provider, isSelected, onSelect }) => {
  return (
    <div className={`provider-option ${isSelected ? 'selected' : ''}`}>
      <div className="provider-header">
        <label>
          <input
            type="radio"
            name="provider"
            checked={isSelected}
            onChange={() => onSelect(provider.id)}
          />
          <strong>{provider.name}</strong>
        </label>
      </div>
      <div className="provider-details">
        <div className="description">{provider.description}</div>
        <CostEstimator providerId={provider.id} />
      </div>
    </div>
  );
};
```

**Files to Update**:
- Add cost-related CSS to content.css

**Acceptance Criteria**:
- [ ] Cost estimates displayed for each provider
- [ ] Monthly usage estimates helpful for decision making
- [ ] Cost information is clearly visible
- [ ] UI remains clean and not cluttered
- [ ] Cost estimates are roughly accurate

**Context for Future Sessions**:
Cost transparency helps users make informed decisions about which provider to use. The estimates should be rough but realistic.

---

### T18: Implement Error Handling and Fallbacks
**Status**: TODO  
**Estimated Time**: 4 hours  
**Dependencies**: T15  

**Description**: Add comprehensive error handling and automatic fallback to working providers.

**Files to Create**:
- `/home/alex/src/golden-nuggets-finder/src/background/services/error-handler.ts`

**Implementation Details**:
```typescript
// src/background/services/error-handler.ts
import { ProviderSwitcher } from './provider-switcher';
import { ProviderId } from '../../shared/types/providers';

export class ErrorHandler {
  private static retryAttempts = new Map<string, number>();
  private static readonly MAX_RETRIES = 3;
  
  static async handleProviderError(
    error: Error,
    providerId: ProviderId,
    context: string
  ): Promise<{ shouldRetry: boolean; fallbackProvider?: ProviderId }> {
    
    const errorKey = `${providerId}-${context}`;
    const attempts = this.retryAttempts.get(errorKey) || 0;
    
    console.error(`Provider ${providerId} error in ${context}:`, error.message);
    
    // Categorize error
    if (this.isApiKeyError(error)) {
      // API key issues - don't retry, suggest re-configuration
      return { shouldRetry: false };
    }
    
    if (this.isRateLimitError(error)) {
      // Rate limited - wait and retry
      await this.sleep(2000 * (attempts + 1)); // Exponential backoff
      return { shouldRetry: attempts < this.MAX_RETRIES };
    }
    
    if (this.isTemporaryError(error)) {
      // Temporary issue - retry with backoff
      await this.sleep(1000 * (attempts + 1));
      return { shouldRetry: attempts < this.MAX_RETRIES };
    }
    
    // Serious error - try fallback provider
    const fallbackProvider = await ProviderSwitcher.getFallbackProvider();
    if (fallbackProvider && fallbackProvider !== providerId) {
      console.log(`Falling back to provider: ${fallbackProvider}`);
      return { shouldRetry: false, fallbackProvider };
    }
    
    return { shouldRetry: false };
  }
  
  private static isApiKeyError(error: Error): boolean {
    const apiKeyErrors = [
      'invalid api key',
      'unauthorized',
      'authentication failed',
      'api key not found'
    ];
    return apiKeyErrors.some(msg => 
      error.message.toLowerCase().includes(msg)
    );
  }
  
  private static isRateLimitError(error: Error): boolean {
    const rateLimitErrors = [
      'rate limit',
      'too many requests',
      'quota exceeded',
      'rate_limit_exceeded'
    ];
    return rateLimitErrors.some(msg => 
      error.message.toLowerCase().includes(msg)
    );
  }
  
  private static isTemporaryError(error: Error): boolean {
    const temporaryErrors = [
      'network error',
      'timeout',
      'service unavailable',
      'server error',
      'connection failed'
    ];
    return temporaryErrors.some(msg => 
      error.message.toLowerCase().includes(msg)
    );
  }
  
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  static resetRetryCount(providerId: ProviderId, context: string): void {
    const errorKey = `${providerId}-${context}`;
    this.retryAttempts.delete(errorKey);
  }
}
```

**Files to Update**:
- `/home/alex/src/golden-nuggets-finder/src/background/message-handler.ts` - Integrate error handling

**Acceptance Criteria**:
- [ ] API key errors handled gracefully
- [ ] Rate limiting handled with backoff
- [ ] Temporary errors retried appropriately
- [ ] Automatic fallback to working providers
- [ ] User-friendly error messages
- [ ] No infinite retry loops

**Context for Future Sessions**:
Robust error handling is critical for good user experience. The system should gracefully handle provider outages and API issues.

---

### T19: Add API Key Validation
**Status**: TODO  
**Estimated Time**: 2 hours  
**Dependencies**: T18  

**Description**: Implement efficient API key validation using models list endpoints for all providers.

**Files to Update**:
- `/home/alex/src/golden-nuggets-finder/src/entrypoints/options.tsx`
- `/home/alex/src/golden-nuggets-finder/src/shared/providers/` (all provider files)

**Implementation Details**:

**Provider-Specific Validation Endpoints**:
Each provider implements validateApiKey() using their models list endpoint:

```typescript
// OpenAI Provider
async validateApiKey(): Promise<boolean> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`
      }
    });
    return response.ok; // 200 = valid, 401 = invalid key
  } catch (error) {
    console.warn(`OpenAI API key validation failed:`, error.message);
    return false;
  }
}

// Gemini Provider  
async validateApiKey(): Promise<boolean> {
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
      headers: {
        'x-goog-api-key': this.config.apiKey
      }
    });
    return response.ok; // 200 = valid, 400 = invalid key
  } catch (error) {
    console.warn(`Gemini API key validation failed:`, error.message);
    return false;
  }
}

// Anthropic Provider
async validateApiKey(): Promise<boolean> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01'
      }
    });
    return response.ok; // 200 = valid, 401 = invalid key
  } catch (error) {
    console.warn(`Anthropic API key validation failed:`, error.message);
    return false;
  }
}

// OpenRouter Provider
async validateApiKey(): Promise<boolean> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'HTTP-Referer': 'https://golden-nuggets-finder.com',
        'X-Title': 'Golden Nuggets Finder'
      }
    });
    return response.ok; // 200 = valid, 401 = invalid key  
  } catch (error) {
    console.warn(`OpenRouter API key validation failed:`, error.message);
    return false;
  }
}
```

**UI Validation Component**:
```typescript
// Enhanced API key validation in options.tsx
const ApiKeyValidator = ({ providerId, apiKey, onValidation }) => {
  const [validationState, setValidationState] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const validateApiKey = async () => {
    if (!apiKey) return;
    
    setValidationState('validating');
    setErrorMessage('');
    
    try {
      const config = {
        providerId,
        apiKey,
        modelName: ProviderFactory.getDefaultModel(providerId)
      };
      
      const provider = await ProviderFactory.createProvider(config);
      const isValid = await provider.validateApiKey();
      
      if (isValid) {
        setValidationState('valid');
        onValidation(true);
      } else {
        setValidationState('invalid');
        setErrorMessage('Invalid API key - please check your key and try again');
        onValidation(false);
      }
    } catch (error) {
      setValidationState('invalid');
      setErrorMessage(error.message);
      onValidation(false);
    }
  };

  const getValidationDisplay = () => {
    switch (validationState) {
      case 'validating':
        return <span className="validating">🔄 Testing...</span>;
      case 'valid':
        return <span className="valid">✅ Valid</span>;
      case 'invalid':
        return (
          <div className="invalid">
            <span>❌ Invalid</span>
            {errorMessage && <div className="error-message">{errorMessage}</div>}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="api-key-validator">
      <button 
        onClick={validateApiKey}
        disabled={!apiKey || validationState === 'validating'}
      >
        Test API Key
      </button>
      {getValidationDisplay()}
    </div>
  );
};
```

**Error Code Reference**:
- **OpenAI**: 401 with `"invalid_api_key"` error code
- **Gemini**: 400 with "API key not valid" message  
- **Anthropic**: 401 with `"authentication_error"` type
- **OpenRouter**: 401 with "Invalid credentials" message

**Acceptance Criteria**:
- [ ] API key validation works for all providers using models endpoints
- [ ] Fast validation (under 2 seconds for each provider)
- [ ] No token consumption or API costs for validation
- [ ] Clear feedback on validation status with provider-specific error messages
- [ ] Loading states during validation
- [ ] Validation results persist until key changes
- [ ] Handles network errors gracefully

**Context for Future Sessions**:
This approach is significantly more efficient than the previous golden nuggets extraction method:
- **Speed**: Simple GET request vs full LLM inference
- **Cost**: No token consumption vs paid extraction  
- **Reliability**: Standard auth endpoints vs complex processing
- **Accuracy**: Clear auth success/failure vs inference validation

The models list endpoints are designed specifically for authentication testing and provide immediate, reliable feedback about API key validity.

---

### T20: End-to-End Testing
**Status**: TODO  
**Estimated Time**: 5 hours  
**Dependencies**: T19  

**Description**: Comprehensive testing of multi-provider functionality across the entire system.

**Files to Create**:
- `/home/alex/src/golden-nuggets-finder/tests/e2e/multi-provider.spec.ts`

**Implementation Details**:
```typescript
// tests/e2e/multi-provider.spec.ts
import { test, expect } from '@playwright/test';
import { setupExtension } from './test-config';

test.describe('Multi-Provider Integration', () => {
  test.beforeEach(async ({ page }) => {
    await setupExtension(page);
  });

  test('can switch between providers in options', async ({ page }) => {
    // Navigate to options page
    await page.goto('chrome-extension://extension-id/options.html');
    
    // Select OpenAI provider
    await page.click('input[value="openai"]');
    
    // Enter API key
    await page.fill('input[type="password"]', process.env.OPENAI_TEST_KEY || 'test-key');
    
    // Test connection
    await page.click('button:has-text("Test API Key")');
    
    // Should show validation result
    await expect(page.locator('.validation-result')).toBeVisible();
  });

  test('golden nuggets extraction works with different providers', async ({ page }) => {
    const providers = [
      { id: 'gemini', key: process.env.GEMINI_TEST_KEY },
      { id: 'openai', key: process.env.OPENAI_TEST_KEY },
      { id: 'anthropic', key: process.env.ANTHROPIC_TEST_KEY }
    ];

    for (const provider of providers) {
      if (!provider.key) continue;

      // Configure provider
      await page.goto('chrome-extension://extension-id/options.html');
      await page.click(`input[value="${provider.id}"]`);
      
      if (provider.id !== 'gemini') {
        await page.fill('input[type="password"]', provider.key);
        await page.click('button:has-text("Test API Key")');
        await expect(page.locator('.valid')).toBeVisible();
      }

      // Test extraction on a real page
      await page.goto('https://example.com');
      
      // Right-click to open context menu
      await page.click('body', { button: 'right' });
      
      // Click extract golden nuggets
      await page.click('text="Extract Golden Nuggets"');
      
      // Wait for results
      await expect(page.locator('.golden-nuggets-sidebar')).toBeVisible({ timeout: 30000 });
      
      // Verify nuggets were extracted
      const nuggets = await page.locator('.golden-nugget').count();
      expect(nuggets).toBeGreaterThan(0);
      
      console.log(`${provider.id}: extracted ${nuggets} nuggets`);
    }
  });

  test('error handling works correctly', async ({ page }) => {
    // Configure provider with invalid API key
    await page.goto('chrome-extension://extension-id/options.html');
    await page.click('input[value="openai"]');
    await page.fill('input[type="password"]', 'invalid-key-123');
    
    // Try to extract nuggets
    await page.goto('https://example.com');
    await page.click('body', { button: 'right' });
    await page.click('text="Extract Golden Nuggets"');
    
    // Should show error message
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('API key');
  });

  test('fallback to working provider', async ({ page }) => {
    // Configure multiple providers - one valid, one invalid
    await page.goto('chrome-extension://extension-id/options.html');
    
    // Configure invalid primary provider
    await page.click('input[value="openai"]');
    await page.fill('input[type="password"]', 'invalid-key');
    
    // Ensure Gemini is available as fallback
    const geminiKey = process.env.GEMINI_TEST_KEY;
    if (geminiKey) {
      await chrome.storage.local.set({ geminiApiKey: geminiKey });
    }
    
    // Try extraction - should fallback to Gemini
    await page.goto('https://example.com');
    await page.click('body', { button: 'right' });
    await page.click('text="Extract Golden Nuggets"');
    
    // Should eventually succeed with fallback
    await expect(page.locator('.golden-nuggets-sidebar')).toBeVisible({ timeout: 45000 });
  });
});
```

**Manual Testing Checklist**:
Create comprehensive manual test checklist in `/home/alex/src/golden-nuggets-finder/tests/manual-testing-checklist.md`:

```markdown
# Multi-Provider Manual Testing Checklist

## Provider Configuration
- [ ] Can select each provider in options
- [ ] API key fields appear/disappear correctly
- [ ] API key validation works for each provider
- [ ] Invalid keys show appropriate error messages
- [ ] Valid keys show success indicators

## Golden Nuggets Extraction
- [ ] Extraction works with Gemini (existing functionality)
- [ ] Extraction works with OpenAI
- [ ] Extraction works with Anthropic
- [ ] Extraction works with OpenRouter
- [ ] Response format consistent across providers
- [ ] Performance reasonable for all providers

## Error Handling
- [ ] Invalid API keys handled gracefully
- [ ] Network errors don't crash extension
- [ ] Rate limiting handled appropriately
- [ ] Fallback to working provider functions
- [ ] User-friendly error messages displayed

## Storage and Migration
- [ ] Existing Gemini users not affected
- [ ] Provider selection persists across browser restarts
- [ ] API keys stored securely
- [ ] No data loss during storage operations

## UI/UX
- [ ] Options page UI clean and intuitive
- [ ] Cost estimates helpful for decision making
- [ ] Provider switching smooth
- [ ] No broken layouts or styling issues
```

**Acceptance Criteria**:
- [ ] All automated tests pass
- [ ] Manual testing checklist completed
- [ ] No regressions in existing functionality
- [ ] All providers work end-to-end
- [ ] Error scenarios handled gracefully
- [ ] Performance acceptable for all providers

**Context for Future Sessions**:
Thorough testing is critical before deployment. Test with real API keys in a controlled environment to ensure everything works correctly.

---

### T21: Migration for Existing Users
**Status**: TODO  
**Estimated Time**: 3 hours  
**Dependencies**: T20  

**Description**: Ensure smooth migration for existing Gemini users to multi-provider system.

**Files to Update**:
- `/home/alex/src/golden-nuggets-finder/src/shared/storage.ts`
- `/home/alex/src/golden-nuggets-finder/src/entrypoints/background.ts`

**Implementation Details**:
```typescript
// Enhanced migration in storage.ts
export class StorageMigration {
  private static readonly MIGRATION_VERSION = '2.0.0';
  
  static async checkAndRunMigration(): Promise<void> {
    const storage = await chrome.storage.local.get(['migrationVersion', 'geminiApiKey']);
    
    // Skip if already migrated
    if (storage.migrationVersion === this.MIGRATION_VERSION) {
      return;
    }
    
    console.log('Running storage migration to multi-provider format...');
    
    try {
      await this.migrateToMultiProvider(storage);
      
      // Mark migration as complete
      await chrome.storage.local.set({ 
        migrationVersion: this.MIGRATION_VERSION 
      });
      
      console.log('Migration completed successfully');
      
      // Show migration notification to user
      this.showMigrationNotification();
      
    } catch (error) {
      console.error('Migration failed:', error);
      // Don't break existing functionality if migration fails
    }
  }
  
  private static async migrateToMultiProvider(currentStorage: any): Promise<void> {
    const updates: any = {};
    
    // Set default provider based on existing configuration
    if (currentStorage.geminiApiKey) {
      updates.selectedProvider = 'gemini';
      updates.providerSettings = {
        gemini: {
          modelName: 'gemini-2.5-flash',
          lastUsed: new Date().toISOString(),
          isConfigured: true
        }
      };
    } else {
      // No existing API key - default to Gemini but not configured
      updates.selectedProvider = 'gemini';
      updates.providerSettings = {
        gemini: {
          modelName: 'gemini-2.5-flash',
          lastUsed: new Date().toISOString(),
          isConfigured: false
        }
      };
    }
    
    // Preserve all existing data
    updates.migrationDate = new Date().toISOString();
    
    await chrome.storage.local.set(updates);
  }
  
  private static showMigrationNotification(): void {
    // Show user-friendly notification about new features
    chrome.notifications.create({
      type: 'basic',
      iconUrl: '/assets/icon128.png',
      title: 'Golden Nuggets Finder Updated!',
      message: 'New: Choose from multiple AI providers! Check the options page to explore OpenAI, Claude, and more.'
    });
  }
  
  static async validateMigration(): Promise<boolean> {
    try {
      const storage = await chrome.storage.local.get();
      
      // Check required fields exist
      const hasSelectedProvider = !!storage.selectedProvider;
      const hasProviderSettings = !!storage.providerSettings;
      const hasMigrationVersion = storage.migrationVersion === this.MIGRATION_VERSION;
      
      return hasSelectedProvider && hasProviderSettings && hasMigrationVersion;
    } catch (error) {
      console.error('Migration validation failed:', error);
      return false;
    }
  }
}

// Auto-run migration on extension startup
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onStartup.addListener(async () => {
    await StorageMigration.checkAndRunMigration();
  });
  
  chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'update') {
      await StorageMigration.checkAndRunMigration();
    }
  });
}
```

**Create Migration Test**:
```typescript
// tests/unit/migration.test.ts
import { StorageMigration } from '../src/shared/storage';

describe('Storage Migration', () => {
  beforeEach(() => {
    // Mock Chrome storage
    global.chrome = {
      storage: {
        local: {
          get: jest.fn(),
          set: jest.fn()
        }
      }
    };
  });

  test('migrates existing Gemini user correctly', async () => {
    // Mock existing storage
    chrome.storage.local.get.mockResolvedValue({
      geminiApiKey: 'existing-key-123',
      userPrompts: []
    });

    await StorageMigration.checkAndRunMigration();

    // Verify migration
    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedProvider: 'gemini',
        providerSettings: expect.objectContaining({
          gemini: expect.objectContaining({
            isConfigured: true
          })
        })
      })
    );
  });

  test('migration is idempotent', async () => {
    // Mock already migrated storage
    chrome.storage.local.get.mockResolvedValue({
      migrationVersion: '2.0.0',
      selectedProvider: 'gemini'
    });

    await StorageMigration.checkAndRunMigration();

    // Should not run migration again
    expect(chrome.storage.local.set).not.toHaveBeenCalled();
  });
});
```

**Acceptance Criteria**:
- [ ] Existing Gemini users retain all functionality
- [ ] Migration runs automatically on extension update
- [ ] Migration is idempotent (safe to run multiple times)
- [ ] User notification about new features
- [ ] No data loss during migration
- [ ] Migration can be validated programmatically
- [ ] Fallback if migration fails

**Context for Future Sessions**:
Migration should be completely transparent to users. They should see new features available but not lose any existing functionality or data.

---

### T22: Final Integration Testing and Deployment
**Status**: TODO  
**Estimated Time**: 4 hours  
**Dependencies**: T21  

**Description**: Final comprehensive testing and preparation for deployment.

**Testing Phases**:

**Phase 1: Regression Testing**
- [ ] All existing Gemini functionality works unchanged
- [ ] Context menu integration works
- [ ] Golden nuggets extraction and display works
- [ ] Feedback system functions correctly
- [ ] Options page existing features work
- [ ] Performance not degraded

**Phase 2: Multi-Provider Testing**
- [ ] All four providers extract golden nuggets successfully
- [ ] Provider switching works smoothly
- [ ] API key management secure and functional
- [ ] Error handling works for all providers
- [ ] Cost estimates display correctly
- [ ] Fallback mechanisms work

**Phase 3: Backend Integration**
- [ ] Feedback includes provider metadata
- [ ] DSPy optimization works for multiple models
- [ ] Database schema updates successful
- [ ] Backend handles new feedback format
- [ ] Model-specific optimization triggers work

**Phase 4: Edge Cases**
- [ ] Invalid API keys handled gracefully
- [ ] Network failures don't crash system
- [ ] Provider outages handled correctly
- [ ] Large content extraction works
- [ ] Concurrent requests handled properly

**Files to Create**:
- `/home/alex/src/golden-nuggets-finder/tests/deployment-checklist.md`

**Deployment Preparation**:
```bash
# Build and package for deployment
pnpm build
pnpm package

# Run full test suite
pnpm test
pnpm test:e2e

# Verify build outputs
ls -la dist/
```

**Documentation Updates**:
- [ ] Update README.md with multi-provider information
- [ ] Update user documentation
- [ ] Add provider setup instructions
- [ ] Document troubleshooting steps

**Performance Verification**:
- [ ] Extension loads quickly
- [ ] Golden nuggets extraction under 30 seconds
- [ ] Memory usage reasonable
- [ ] No memory leaks
- [ ] Storage usage efficient

**Security Review**:
- [ ] API keys encrypted in storage
- [ ] No sensitive data in logs
- [ ] Secure communication with providers
- [ ] Input validation for all user data
- [ ] No XSS vulnerabilities

**Acceptance Criteria**:
- [ ] All regression tests pass
- [ ] All new functionality works correctly
- [ ] Performance meets requirements
- [ ] Security review completed
- [ ] Documentation updated
- [ ] Extension ready for personal use

**Context for Future Sessions**:
This is the final step before the multi-provider functionality is complete. Everything should work smoothly and reliably for personal use.

---

## Dependencies Summary

**Critical Path**:
T1 → T2 → T3 → T4 → T5,T6,T7,T8 → T9 → T10 → T14 → T15 → T16 → T17 → T18 → T19 → T20 → T21 → T22

**Parallel Work Possible**:
- T6, T7, T8 can be done in parallel after T4
- T11, T12, T13 (backend work) can be done in parallel with frontend tasks
- T17, T18 can start after T15/T16 are complete

**Total Estimated Time**: ~65 hours (3 weeks with some parallel work)

**Risk Mitigation**:
- Each task is self-contained with clear acceptance criteria
- Backend work can be done independently of frontend
- Migration and testing have dedicated time allocation
- Error handling built in throughout

This plan provides a complete roadmap for implementing multi-LLM support while maintaining the existing functionality and user experience.