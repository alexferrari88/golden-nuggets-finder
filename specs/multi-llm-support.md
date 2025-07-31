# Multi-LLM Support - Personal Project Spec

## Goal

Add support for multiple LLM providers (Google Gemini, OpenAI, Anthropic, OpenRouter) to the Golden Nuggets Finder Chrome extension. Keep it simple since this is a personal hobby project.

### Why Multi-LLM?
- **Choice**: Use different models for different content types
- **Cost**: Switch to cheaper providers when needed  
- **Quality**: Try different models to see which works best
- **Reliability**: Fallback when one provider has issues

## Architecture (Simple Hybrid Approach)

**Key Research Finding**: LangChain JS has issues with Gemini structured outputs, so keep existing Gemini implementation and add LangChain for others.

```typescript
// Simple provider interface
interface LLMProvider {
  providerId: 'gemini' | 'openai' | 'anthropic' | 'openrouter';
  modelName: string;
  extractGoldenNuggets(content: string, prompt: string): Promise<GoldenNuggetsResponse>;
}

// Provider factory
class ProviderFactory {
  static create(config: ProviderConfig): LLMProvider {
    switch (config.providerId) {
      case 'gemini': return new GeminiDirectProvider(config); // Keep existing
      case 'openai': return new LangChainOpenAIProvider(config);
      case 'anthropic': return new LangChainAnthropicProvider(config);
      case 'openrouter': return new LangChainOpenRouterProvider(config);
    }
  }
}
```

**File Changes Needed:**
- `src/background/services/provider-factory.ts` - New provider factory
- `src/shared/providers/` - Provider implementations
- `src/entrypoints/options.tsx` - Add provider selection UI
- Backend: Add model tracking to feedback

## Frontend Implementation

### 1. Provider Implementations

```typescript
// src/shared/providers/gemini-direct-provider.ts
// Keep existing implementation - it works great!
export class GeminiDirectProvider implements LLMProvider {
  // No changes needed - just wrap existing GeminiClient
}

// src/shared/providers/langchain-openai-provider.ts
export class LangChainOpenAIProvider implements LLMProvider {
  private model: ChatOpenAI;
  
  constructor(config: { apiKey: string; modelName: string }) {
    this.model = new ChatOpenAI({ 
      apiKey: config.apiKey,
      model: config.modelName || 'gpt-4o-mini'
    });
  }
  
  async extractGoldenNuggets(content: string, prompt: string) {
    const structuredModel = this.model.withStructuredOutput(GoldenNuggetsZodSchema);
    return await structuredModel.invoke([
      new SystemMessage(prompt),
      new HumanMessage(content)
    ]);
  }
}

// Similar simple implementations for Anthropic and OpenRouter
```

### 2. Simple Options Page UI

```typescript
// Add to existing src/entrypoints/options.tsx
const ProviderSelection = () => {
  const [selectedProvider, setSelectedProvider] = useState('gemini');
  const [apiKeys, setApiKeys] = useState({});
  
  return (
    <div>
      <h3>LLM Provider</h3>
      
      <select value={selectedProvider} onChange={(e) => setSelectedProvider(e.target.value)}>
        <option value="gemini">Google Gemini (Current)</option>
        <option value="openai">OpenAI GPT</option>
        <option value="anthropic">Anthropic Claude</option>
        <option value="openrouter">OpenRouter</option>
      </select>
      
      {selectedProvider !== 'gemini' && (
        <div>
          <label>API Key:</label>
          <input 
            type="password" 
            value={apiKeys[selectedProvider] || ''}
            onChange={(e) => setApiKeys({...apiKeys, [selectedProvider]: e.target.value})}
          />
          <button onClick={() => testApiKey(selectedProvider, apiKeys[selectedProvider])}>
            Test Connection
          </button>
        </div>
      )}
      
      <div>
        <small>Rough cost: {getCostEstimate(selectedProvider)} per request</small>
      </div>
    </div>
  );
};
```

### 3. Simple API Key Storage

```typescript
// src/shared/storage/api-keys.ts
export class ApiKeyStorage {
  static async store(providerId: string, apiKey: string) {
    // Simple encrypted storage using Chrome's built-in encryption
    await chrome.storage.local.set({
      [`encrypted_${providerId}_key`]: btoa(apiKey) // Basic encoding for now
    });
  }
  
  static async get(providerId: string): Promise<string | null> {
    const result = await chrome.storage.local.get(`encrypted_${providerId}_key`);
    const encoded = result[`encrypted_${providerId}_key`];
    return encoded ? atob(encoded) : null;
  }
}
```


## Backend Changes (Simple)

### 1. Add Model Tracking to Feedback

```sql
-- Simple migration: just add model info to existing feedback table
ALTER TABLE feedback ADD COLUMN model_provider VARCHAR(50);
ALTER TABLE feedback ADD COLUMN model_name VARCHAR(100);
```

```python
# Update feedback model to include provider info
class Feedback(BaseModel):
    # ... existing fields ...
    
    # NEW: Track which model was used
    model_provider: str  # 'gemini', 'openai', 'anthropic', 'openrouter'
    model_name: str      # 'gemini-2.5-flash', 'gpt-4o-mini', etc.
```

### 2. Simple DSPy Multi-Model Support

```python
# backend/app/services/dspy_manager.py
import dspy

class DSPyManager:
    def __init__(self):
        # Simple model configs
        self.models = {
            'gemini': dspy.LM('gemini/gemini-2.5-flash'),
            'openai': dspy.LM('openai/gpt-4o-mini'), 
            'anthropic': dspy.LM('anthropic/claude-3-5-sonnet'),
            'openrouter': dspy.LM('openai/gpt-4o-mini', api_base='https://openrouter.ai/api/v1')
        }
    
    def optimize_for_provider(self, provider_id: str, feedback_data: list):
        """Simple optimization when enough feedback accumulates"""
        
        # Filter feedback for this provider
        provider_feedback = [f for f in feedback_data if f.model_provider == provider_id]
        
        if len(provider_feedback) < 50:  # Wait for enough data
            return None
            
        # Switch to this model for optimization
        dspy.settings.configure(lm=self.models[provider_id])
        
        # Create training examples from negative feedback
        trainset = self._create_examples_from_feedback(provider_feedback)
        
        # Simple optimization
        optimizer = dspy.BootstrapFewShot()
        optimized_program = optimizer.compile(
            student=GoldenNuggetsExtractor(),
            trainset=trainset
        )
        
        # Save the optimized prompts for this provider
        self._save_optimized_prompts(provider_id, optimized_program)
        
        return optimized_program
```

### 3. Simple Optimization Trigger

```python
# Just run optimization when feedback builds up
def check_if_optimization_needed():
    """Simple check - optimize when we have 50+ feedback items"""
    
    for provider in ['gemini', 'openai', 'anthropic', 'openrouter']:
        feedback_count = db.execute(
            "SELECT COUNT(*) FROM feedback WHERE model_provider = ?", 
            [provider]
        ).fetchone()[0]
        
        if feedback_count >= 50:
            # Run optimization for this provider
            dspy_manager.optimize_for_provider(provider, get_feedback(provider))
            print(f"Optimized prompts for {provider}")
```

## Cost Estimates (Rough)

- **Gemini**: ~$0.001 per request (cheapest)
- **OpenAI**: ~$0.01 per request  
- **Anthropic**: ~$0.008 per request
- **OpenRouter**: Varies by model ($0.002-$0.02)

For personal use, even heavy usage should be under $10/month.

## Implementation Plan (3 Weeks)

### Week 1: Core Setup
- [ ] Create provider factory and interfaces
- [ ] Add LangChain integrations for OpenAI/Anthropic/OpenRouter
- [ ] Update options page with provider selection
- [ ] Add basic encrypted API key storage

### Week 2: Backend Integration  
- [ ] Add model_provider and model_name to feedback schema
- [ ] Update feedback collection to include provider info
- [ ] Implement basic DSPy multi-model support
- [ ] Test all providers work end-to-end

### Week 3: Polish & Deploy
- [ ] Add simple cost estimates to UI
- [ ] Handle edge cases and errors
- [ ] Basic testing
- [ ] Deploy and migrate existing users

**Goal**: Have working multi-LLM support with all 4 providers in 3 weeks.

## Summary

Simple 3-week implementation to add multi-LLM support:

1. **Keep existing Gemini** (it works great, research shows LangChain has issues with it)
2. **Add LangChain wrappers** for OpenAI, Anthropic, OpenRouter  
3. **Simple provider selection** in options page
4. **Basic encrypted storage** for API keys
5. **Update backend** to track model info for DSPy optimization
6. **Basic cost estimates** to help choose providers

Result: Personal Chrome extension that can use 4 different LLM providers with model-specific optimization, keeping complexity minimal for a hobby project.
