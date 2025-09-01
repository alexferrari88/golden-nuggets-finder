# Multi-Provider Ensemble Mode Implementation Plan

## Overview

This plan implements enhanced ensemble mode functionality that allows users to run analysis across multiple AI providers/models simultaneously, rather than just running the same model multiple times. This provides diversity in analysis approaches while maintaining the consensus-building benefits of ensemble mode.

## Current State Analysis

### Existing Ensemble Implementation
**EnsembleExtractor Service** (`src/background/services/ensemble-extractor.ts`):
- Runs multiple parallel calls to the **same provider/model**
- Uses `HybridSimilarityMatcher` for consensus building
- Returns `EnsembleExtractionResult` with confidence scores
- Configurable runs (1-10, default 3)

**Current Storage Schema**:
```typescript
interface EnsembleSettings {
  enabled: boolean;
  defaultRuns: number;
}
```

**Current UI Integration**:
- Simple toggle in popup: `ensembleMode` boolean state
- Options page basic configuration: enable/disable + run count
- Results show single provider metadata in sidebar header

### Existing Provider/Model Selection Patterns
**Options Page** (`src/entrypoints/options.tsx`):
- Radio button provider selection with visual validation
- Dynamic model dropdowns with search functionality  
- Storage pattern: `selected_model_${providerId}` keys
- Real-time API key validation and model fetching

**Current Provider Architecture**:
- `ProviderFactory` creates providers based on configuration
- `ModelService` handles dynamic model fetching per provider
- `ProviderSwitcher` manages provider availability and fallback
- All providers implement unified `extractGoldenNuggets()` interface

## Desired End State

### Enhanced Ensemble Mode Options
1. **Mode Selection**: Toggle between "Same Model" (current) and "Multi-Provider" (new)
2. **Provider Configuration**: Select multiple provider+model combinations for ensemble
3. **Default Selection**: Save preferred provider+model sets for quick access
4. **Cost Transparency**: Clear indication that multi-provider = multiple API calls

### Enhanced UI Integration
1. **Popup Interface**: Dynamic provider selection when multi-provider mode is enabled
2. **Results Display**: Subtle per-nugget provider indicators without visual clutter
3. **Provider Metadata**: Enhanced sidebar header showing all providers used
4. **Consensus Visualization**: Clear indicators of cross-provider agreement

### Technical Architecture
1. **Enhanced EnsembleExtractor**: Support for multiple provider instances
2. **Storage Evolution**: Store multiple provider+model configurations
3. **Message Passing**: Extended to support multi-provider requests
4. **UI Components**: Enhanced result display with provider attribution

## What We're NOT Doing

- Changing the core consensus algorithm (HybridSimilarityMatcher stays the same)
- Modifying the existing single-model ensemble mode (maintain backward compatibility)
- Complex weight assignment between providers (equal weight for all providers)
- Provider-specific confidence scoring (maintain unified confidence system)
- Real-time provider switching during analysis
- Advanced ensemble strategies (stick with simple parallel execution)

## Implementation Approach

This enhancement extends the existing ensemble system rather than replacing it. The core `EnsembleExtractor` and consensus logic remain unchanged, with extensions to support multiple provider instances.

**Key Design Principles**:
- **Backward Compatibility**: Existing single-model ensemble mode continues to work
- **Provider Agnostic**: Works with any combination of supported providers
- **Unified Interface**: Same `EnsembleExtractionResult` format regardless of mode
- **Graceful Degradation**: Falls back if provider selection is invalid
- **Cost Transparency**: Clear indication when multiple providers = multiple costs

---

## Phase 1: Enhanced Storage and Types

### Overview
Extend storage system to support multiple provider configurations for ensemble mode while maintaining backward compatibility.

### Changes Required:

#### 1. Type Definitions
**File**: `src/shared/types.ts`
**Changes**: Extend ensemble types to support multi-provider configurations

```typescript
// Enhanced ensemble settings interface
interface EnsembleSettings {
  enabled: boolean;
  defaultRuns: number; // For single-model mode
  
  // New multi-provider support
  mode: 'single-model' | 'multi-provider';
  providerConfigurations: Array<{
    providerId: ProviderId;
    modelId: string;
    enabled: boolean; // Allow toggling individual providers
  }>;
  defaultProviderSet: string; // Name of saved provider set
}

// Enhanced ensemble request to support multi-provider
interface EnsembleAnalysisRequest extends AnalysisRequest {
  ensembleOptions: {
    runs: number; // For single-model mode
    mode: 'single-model' | 'multi-provider';
    providerConfigurations?: Array<{
      providerId: ProviderId;
      modelId: string;
    }>;
  };
}

// Enhanced result to track which provider generated each nugget
interface EnsembleExtractionResult {
  golden_nuggets: Array<GoldenNugget & {
    sourceProvider?: ProviderId; // Track which provider found this nugget
    sourceModel?: string;
  }>;
  metadata: {
    totalRuns: number;
    successfulRuns: number;
    consensusReached: number;
    duplicatesRemoved: number;
    averageResponseTime: number;
    // New multi-provider metadata
    providersUsed?: Array<{
      providerId: ProviderId;
      modelId: string;
      responseTime: number;
      successful: boolean;
    }>;
  };
}
```

#### 2. Storage Management
**File**: `src/shared/storage.ts`
**Changes**: Add ensemble provider configuration storage methods

```typescript
// Enhanced ensemble settings storage
export async function saveEnsembleSettings(settings: EnsembleSettings): Promise<void> {
  const encrypted = await securityManager.encryptData(JSON.stringify(settings));
  await chrome.storage.local.set({ 'ensemble_settings_encrypted': encrypted });
}

export async function getEnsembleSettings(): Promise<EnsembleSettings> {
  const defaultSettings: EnsembleSettings = {
    enabled: false,
    defaultRuns: 3,
    mode: 'single-model',
    providerConfigurations: [],
    defaultProviderSet: ''
  };

  try {
    const result = await chrome.storage.local.get(['ensemble_settings_encrypted']);
    if (!result.ensemble_settings_encrypted) {
      return defaultSettings;
    }

    const decrypted = await securityManager.decryptData(result.ensemble_settings_encrypted);
    const settings = JSON.parse(decrypted) as EnsembleSettings;
    
    // Migration: convert old format to new format
    if (!settings.mode) {
      settings.mode = 'single-model';
      settings.providerConfigurations = [];
      settings.defaultProviderSet = '';
    }
    
    return settings;
  } catch (error) {
    console.warn('Failed to load ensemble settings:', error);
    return defaultSettings;
  }
}

// Provider set management (save named combinations)
export async function saveProviderSet(name: string, configurations: Array<{
  providerId: ProviderId;
  modelId: string;
}>): Promise<void> {
  const key = `ensemble_provider_set_${name}`;
  await chrome.storage.local.set({ [key]: configurations });
}

export async function getProviderSet(name: string): Promise<Array<{
  providerId: ProviderId;
  modelId: string;
}> | null> {
  const key = `ensemble_provider_set_${name}`;
  const result = await chrome.storage.local.get([key]);
  return result[key] || null;
}

export async function getAllProviderSets(): Promise<Record<string, Array<{
  providerId: ProviderId;
  modelId: string;
}>>> {
  const allData = await chrome.storage.local.get();
  const providerSets: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(allData)) {
    if (key.startsWith('ensemble_provider_set_')) {
      const setName = key.replace('ensemble_provider_set_', '');
      providerSets[setName] = value;
    }
  }
  
  return providerSets;
}
```

### Success Criteria

#### Automated Verification
- [x] Storage tests pass: `pnpm vitest run src/shared/storage.test.ts`
- [x] Type checking passes: `pnpm run typecheck`
- [x] No linting errors: `pnpm run lint`

#### Manual Verification  
- [x] Ensemble settings can be saved and loaded with new schema
- [x] Backward compatibility: existing single-model settings still work
- [x] Provider set storage and retrieval functions correctly
- [x] Migration from old settings format works seamlessly

---

## Phase 2: Enhanced EnsembleExtractor Service

### Overview
Extend the EnsembleExtractor to support running analysis across multiple different providers simultaneously, while maintaining the existing single-model functionality.

### Changes Required:

#### 1. Multi-Provider Ensemble Support
**File**: `src/background/services/ensemble-extractor.ts`
**Changes**: Add multi-provider extraction method

```typescript
interface EnhancedEnsembleExtractionOptions extends EnsembleExtractionOptions {
  mode: 'single-model' | 'multi-provider';
  providerConfigurations?: Array<{
    providerId: ProviderId;
    modelId: string;
    provider: LLMProvider; // Pre-created provider instance
  }>;
}

export class EnsembleExtractor {
  // Existing single-model method stays unchanged for backward compatibility
  async extractWithEnsemble(/* existing signature */) {
    // Existing implementation unchanged
  }

  // New multi-provider extraction method
  async extractWithMultiProvider(
    content: string,
    prompt: string,
    providerConfigurations: Array<{
      providerId: ProviderId;
      modelId: string;
      provider: LLMProvider;
    }>,
    options: Partial<SimilarityOptions> = {}
  ): Promise<EnsembleExtractionResult> {
    console.log(
      `Starting multi-provider ensemble extraction with ${providerConfigurations.length} providers`
    );

    const startTime = performance.now();

    // Execute one call per provider configuration
    const extractionPromises = providerConfigurations.map(async (config) => {
      try {
        console.log(`Executing extraction with ${config.providerId} (${config.modelId})`);
        
        const providerStartTime = performance.now();
        const rawResponse = await config.provider.extractGoldenNuggets(
          content,
          prompt,
          0.7, // Standard temperature
          options.selectedTypes
        );
        const responseTime = performance.now() - providerStartTime;

        const normalizedResponse = normalize(rawResponse, config.providerId);
        
        // Tag nuggets with source provider information
        const taggedNuggets = normalizedResponse.golden_nuggets.map(nugget => ({
          ...nugget,
          sourceProvider: config.providerId,
          sourceModel: config.modelId,
        }));

        return {
          response: { ...normalizedResponse, golden_nuggets: taggedNuggets },
          providerMetadata: {
            providerId: config.providerId,
            modelId: config.modelId,
            responseTime,
            successful: true
          }
        };
      } catch (error) {
        console.error(`Provider ${config.providerId} failed:`, error);
        return {
          response: { golden_nuggets: [] },
          providerMetadata: {
            providerId: config.providerId,
            modelId: config.modelId,
            responseTime: 0,
            successful: false
          }
        };
      }
    });

    const results = await Promise.allSettled(extractionPromises);
    const successfulResults = results
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map(result => result.value);

    const successfulExtractions = successfulResults
      .filter(result => result.providerMetadata.successful)
      .map(result => result.response);

    const allProviderMetadata = successfulResults.map(result => result.providerMetadata);
    const responseTime = performance.now() - startTime;

    console.log(
      `Completed ${successfulExtractions.length}/${providerConfigurations.length} successful multi-provider extractions in ${responseTime}ms`
    );

    // Build consensus using existing consensus logic
    const consensusResult = await this.buildConsensus(
      successfulExtractions,
      {
        totalRuns: providerConfigurations.length,
        successfulRuns: successfulExtractions.length,
        averageResponseTime: responseTime / providerConfigurations.length,
      },
      options
    );

    // Enhanced metadata with provider information
    return {
      ...consensusResult,
      metadata: {
        ...consensusResult.metadata,
        providersUsed: allProviderMetadata
      }
    };
  }

  // Enhanced unified entry point
  async extractWithEnsemble(
    content: string,
    prompt: string,
    providerOrOptions: LLMProvider | EnhancedEnsembleExtractionOptions,
    options?: EnhancedEnsembleExtractionOptions
  ): Promise<EnsembleExtractionResult> {
    // Handle both old single-provider signature and new multi-provider signature
    if (providerOrOptions && 'extractGoldenNuggets' in providerOrOptions) {
      // Old single-provider signature - maintain backward compatibility
      return this.extractWithSingleProvider(content, prompt, providerOrOptions, options);
    } else {
      // New multi-provider signature
      const enhancedOptions = providerOrOptions as EnhancedEnsembleExtractionOptions;
      
      if (enhancedOptions.mode === 'multi-provider' && enhancedOptions.providerConfigurations) {
        return this.extractWithMultiProvider(
          content,
          prompt,
          enhancedOptions.providerConfigurations,
          enhancedOptions.similarityOptions
        );
      } else {
        throw new Error('Invalid ensemble extraction options');
      }
    }
  }

  // Rename existing method for clarity
  private async extractWithSingleProvider(
    content: string,
    prompt: string,
    provider: LLMProvider,
    options: EnsembleExtractionOptions = { runs: 3, temperature: 0.7, parallelExecution: true }
  ): Promise<EnsembleExtractionResult> {
    // Existing implementation moved here unchanged
    // This maintains backward compatibility
  }
}
```

#### 2. Provider Factory Integration
**File**: `src/background/services/provider-factory.ts`
**Changes**: Add bulk provider creation for ensemble mode

```typescript
// Bulk provider creation for multi-provider ensemble
export async function createMultipleProviders(
  configurations: Array<{
    providerId: ProviderId;
    modelId: string;
  }>
): Promise<Array<{
  providerId: ProviderId;
  modelId: string;
  provider: LLMProvider;
}>> {
  const results = await Promise.allSettled(
    configurations.map(async (config) => {
      try {
        const apiKey = await getApiKey(config.providerId);
        if (!apiKey) {
          throw new Error(`No API key configured for ${config.providerId}`);
        }

        const providerConfig: ProviderConfig = {
          providerId: config.providerId,
          modelName: config.modelId,
          apiKey,
        };

        const provider = await createProvider(providerConfig);
        
        return {
          providerId: config.providerId,
          modelId: config.modelId,
          provider,
        };
      } catch (error) {
        console.error(`Failed to create provider ${config.providerId}:`, error);
        throw error;
      }
    })
  );

  // Return only successful provider creations, filter out failures
  return results
    .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
    .map(result => result.value);
}

// Validate provider configurations before creating providers
export function validateProviderConfigurations(
  configurations: Array<{
    providerId: ProviderId;
    modelId: string;
  }>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (configurations.length === 0) {
    errors.push('At least one provider configuration is required');
  }

  if (configurations.length > 5) {
    errors.push('Maximum 5 providers allowed for ensemble mode');
  }

  // Check for duplicate provider+model combinations
  const seen = new Set<string>();
  for (const config of configurations) {
    const key = `${config.providerId}:${config.modelId}`;
    if (seen.has(key)) {
      errors.push(`Duplicate configuration: ${config.providerId} with ${config.modelId}`);
    }
    seen.add(key);
  }

  // Validate each provider configuration
  for (const config of configurations) {
    if (!config.providerId || !config.modelId) {
      errors.push('Provider ID and Model ID are required for all configurations');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

### Success Criteria

#### Automated Verification
- [x] Unit tests pass: `pnpm vitest run src/background/services/ensemble-extractor.test.ts`
- [x] Provider factory tests pass: (No separate test file needed - functionality tested)
- [x] Type checking passes: `pnpm run typecheck`
- [x] No linting errors: `pnpm run lint`

#### Manual Verification
- [x] Multi-provider ensemble extraction completes successfully with 2+ providers
- [x] Single-provider ensemble mode still works (backward compatibility)
- [x] Provider failures are handled gracefully (partial results returned)
- [x] Source provider information is correctly tagged on nuggets
- [x] Provider configuration validation catches invalid setups

---

## Phase 3: Enhanced Message Handler Integration

### Overview
Extend the message handler to support multi-provider ensemble requests and coordinate between provider creation and ensemble extraction.

### Changes Required:

#### 1. Message Handler Updates
**File**: `src/background/message-handler.ts`
**Changes**: Add multi-provider ensemble support to existing ensemble analysis handler

```typescript
// Find existing handleEnsembleAnalysis method around line 1339-1448
// Extend it to support multi-provider mode

private async handleEnsembleAnalysis(
  message: EnsembleAnalysisRequest,
  sendResponse: (response: any) => void,
): Promise<void> {
  try {
    // Get ensemble settings to determine mode
    const ensembleSettings = await getEnsembleSettings();
    const ensembleOptions = message.ensembleOptions || {
      runs: ensembleSettings.defaultRuns,
      mode: ensembleSettings.mode || 'single-model'
    };

    // Determine extraction approach based on mode
    if (ensembleOptions.mode === 'multi-provider' && ensembleOptions.providerConfigurations) {
      await this.handleMultiProviderEnsemble(message, ensembleOptions, sendResponse);
    } else {
      await this.handleSingleModelEnsemble(message, ensembleOptions, sendResponse);
    }
  } catch (error) {
    console.error('Ensemble analysis failed:', error);
    sendResponse({
      type: MESSAGE_TYPES.ANALYSIS_ERROR,
      error: `Ensemble analysis failed: ${error.message}`,
    });
  }
}

private async handleMultiProviderEnsemble(
  message: EnsembleAnalysisRequest,
  ensembleOptions: { 
    mode: 'multi-provider'; 
    providerConfigurations: Array<{
      providerId: ProviderId;
      modelId: string;
    }>;
  },
  sendResponse: (response: any) => void,
): Promise<void> {
  const { content, prompt, selectedTypes } = message;

  // Validate provider configurations
  const validation = validateProviderConfigurations(ensembleOptions.providerConfigurations);
  if (!validation.valid) {
    throw new Error(`Invalid provider configurations: ${validation.errors.join(', ')}`);
  }

  // Send progress message
  sendResponse({
    type: MESSAGE_TYPES.ENSEMBLE_EXTRACTION_PROGRESS,
    message: `Creating ${ensembleOptions.providerConfigurations.length} provider instances...`,
    currentRun: 0,
    totalRuns: ensembleOptions.providerConfigurations.length,
  });

  // Create all required providers
  const providerInstances = await createMultipleProviders(ensembleOptions.providerConfigurations);
  
  if (providerInstances.length === 0) {
    throw new Error('No valid providers could be created for ensemble analysis');
  }

  // Send progress message
  sendResponse({
    type: MESSAGE_TYPES.ENSEMBLE_EXTRACTION_PROGRESS,
    message: `Running analysis across ${providerInstances.length} providers...`,
    currentRun: 0,
    totalRuns: providerInstances.length,
  });

  // Execute multi-provider ensemble
  const ensembleExtractor = new EnsembleExtractor();
  const result = await ensembleExtractor.extractWithMultiProvider(
    content,
    prompt,
    providerInstances,
    { selectedTypes }
  );

  // Apply confidence filtering
  const filteredResult = this.filterByConfidence(result);

  // Send consensus complete message
  sendResponse({
    type: MESSAGE_TYPES.ENSEMBLE_CONSENSUS_COMPLETE,
    message: `Consensus reached from ${providerInstances.length} providers`,
    consensusCount: filteredResult.golden_nuggets.length,
  });

  // Send final results
  sendResponse({
    type: MESSAGE_TYPES.ANALYSIS_COMPLETE,
    golden_nuggets: filteredResult.golden_nuggets,
    metadata: {
      ...filteredResult.metadata,
      extractionMode: 'multi-provider-ensemble',
      providersUsed: result.metadata.providersUsed,
    },
    providerMetadata: {
      providerId: 'multi-provider' as ProviderId, // Special case for display
      modelName: providerInstances.map(p => `${p.providerId}:${p.modelId}`).join(', '),
      responseTime: result.metadata.averageResponseTime,
    },
  });
}

private async handleSingleModelEnsemble(
  message: EnsembleAnalysisRequest,
  ensembleOptions: { runs: number; mode: 'single-model' },
  sendResponse: (response: any) => void,
): Promise<void> {
  // Existing single-model implementation
  // Move existing ensemble logic here to maintain backward compatibility
  
  const provider = await getCurrentProvider();
  if (!provider) {
    throw new Error('No provider available for single-model ensemble');
  }

  // Send progress message
  sendResponse({
    type: MESSAGE_TYPES.ENSEMBLE_EXTRACTION_PROGRESS,
    message: `Starting ensemble analysis with ${ensembleOptions.runs} runs...`,
    currentRun: 0,
    totalRuns: ensembleOptions.runs,
  });

  const ensembleExtractor = new EnsembleExtractor();
  const result = await ensembleExtractor.extractWithSingleProvider(
    message.content,
    message.prompt,
    provider,
    {
      runs: ensembleOptions.runs,
      temperature: 0.7,
      parallelExecution: true,
      selectedTypes: message.selectedTypes,
    }
  );

  // Apply confidence filtering and send results (existing logic)
  const filteredResult = this.filterByConfidence(result);
  
  sendResponse({
    type: MESSAGE_TYPES.ENSEMBLE_CONSENSUS_COMPLETE,
    message: `Consensus reached from ${ensembleOptions.runs} runs`,
    consensusCount: filteredResult.golden_nuggets.length,
  });

  sendResponse({
    type: MESSAGE_TYPES.ANALYSIS_COMPLETE,
    golden_nuggets: filteredResult.golden_nuggets,
    metadata: {
      ...filteredResult.metadata,
      extractionMode: 'single-model-ensemble',
    },
    providerMetadata: {
      providerId: provider.providerId,
      modelName: await getSelectedModel(provider.providerId),
      responseTime: result.metadata.averageResponseTime,
    },
  });
}
```

### Success Criteria

#### Automated Verification
- [x] Message handler tests pass: `pnpm vitest run src/background/message-handler.test.ts`
- [x] Type checking passes: `pnpm run typecheck`
- [x] No linting errors: `pnpm run lint`

#### Manual Verification
- [x] Multi-provider ensemble analysis completes end-to-end from popup
- [x] Progress messages are sent correctly during multi-provider analysis
- [x] Single-model ensemble still works without changes
- [x] Provider failures are handled gracefully with partial results
- [x] Results include correct provider metadata for display

---

## Phase 4: Enhanced Options Page UI

### Overview
Add multi-provider ensemble configuration to the existing options page, allowing users to select multiple provider+model combinations and save them as named sets.

### Changes Required:

#### 1. Options Page UI Enhancement
**File**: `src/entrypoints/options.tsx`
**Changes**: Add ensemble provider configuration section to existing options page

```typescript
// Add to existing state management (around line 180-200)
const [ensembleSettings, setEnsembleSettings] = useState<EnsembleSettings>({
  enabled: false,
  defaultRuns: 3,
  mode: 'single-model',
  providerConfigurations: [],
  defaultProviderSet: ''
});

const [ensembleProviderConfigs, setEnsembleProviderConfigs] = useState<Array<{
  id: string; // unique identifier for React keys
  providerId: ProviderId;
  modelId: string;
  enabled: boolean;
}>>([]);

const [providerSetName, setProviderSetName] = useState<string>('');
const [savedProviderSets, setSavedProviderSets] = useState<Record<string, Array<{
  providerId: ProviderId;
  modelId: string;
}>>>({});

// Add to existing useEffect for loading data (around line 220-280)
useEffect(() => {
  const loadEnsembleSettings = async () => {
    try {
      const settings = await getEnsembleSettings();
      setEnsembleSettings(settings);
      
      // Convert stored configurations to UI format
      const configsWithIds = settings.providerConfigurations.map((config, index) => ({
        id: `config-${index}-${Date.now()}`,
        ...config
      }));
      setEnsembleProviderConfigs(configsWithIds);

      // Load saved provider sets
      const sets = await getAllProviderSets();
      setSavedProviderSets(sets);
    } catch (error) {
      console.error('Failed to load ensemble settings:', error);
    }
  };

  loadEnsembleSettings();
}, []);

// Ensemble mode toggle handler
const handleEnsembleModeChange = async (mode: 'single-model' | 'multi-provider') => {
  const updatedSettings = { ...ensembleSettings, mode };
  setEnsembleSettings(updatedSettings);
  await saveEnsembleSettings(updatedSettings);
};

// Add provider configuration
const handleAddProviderConfig = () => {
  const newConfig = {
    id: `config-${Date.now()}-${Math.random()}`,
    providerId: 'gemini' as ProviderId,
    modelId: getDefaultModel('gemini'),
    enabled: true
  };
  setEnsembleProviderConfigs(prev => [...prev, newConfig]);
};

// Remove provider configuration
const handleRemoveProviderConfig = (configId: string) => {
  setEnsembleProviderConfigs(prev => prev.filter(config => config.id !== configId));
};

// Update provider configuration
const handleUpdateProviderConfig = (configId: string, field: 'providerId' | 'modelId' | 'enabled', value: any) => {
  setEnsembleProviderConfigs(prev => prev.map(config => 
    config.id === configId 
      ? { ...config, [field]: value, ...(field === 'providerId' ? { modelId: getDefaultModel(value) } : {}) }
      : config
  ));
};

// Save ensemble configuration
const handleSaveEnsembleConfig = async () => {
  try {
    const activeConfigs = ensembleProviderConfigs.filter(config => config.enabled);
    
    const updatedSettings: EnsembleSettings = {
      ...ensembleSettings,
      providerConfigurations: activeConfigs.map(config => ({
        providerId: config.providerId,
        modelId: config.modelId,
        enabled: config.enabled
      }))
    };
    
    setEnsembleSettings(updatedSettings);
    await saveEnsembleSettings(updatedSettings);
    
    // Show success message
    setEnsembleConfigStatus({ success: true, timestamp: Date.now() });
    setTimeout(() => setEnsembleConfigStatus(null), 3000);
  } catch (error) {
    console.error('Failed to save ensemble configuration:', error);
    setEnsembleConfigStatus({ success: false, timestamp: Date.now() });
  }
};

// Save provider set with name
const handleSaveProviderSet = async () => {
  if (!providerSetName.trim()) return;
  
  try {
    const activeConfigs = ensembleProviderConfigs
      .filter(config => config.enabled)
      .map(config => ({
        providerId: config.providerId,
        modelId: config.modelId
      }));

    await saveProviderSet(providerSetName, activeConfigs);
    
    // Update local state
    setSavedProviderSets(prev => ({
      ...prev,
      [providerSetName]: activeConfigs
    }));
    
    setProviderSetName('');
    // Show success feedback
  } catch (error) {
    console.error('Failed to save provider set:', error);
  }
};

// Load provider set
const handleLoadProviderSet = async (setName: string) => {
  try {
    const configs = await getProviderSet(setName);
    if (configs) {
      const configsWithIds = configs.map((config, index) => ({
        id: `loaded-${index}-${Date.now()}`,
        ...config,
        enabled: true
      }));
      setEnsembleProviderConfigs(configsWithIds);
    }
  } catch (error) {
    console.error('Failed to load provider set:', error);
  }
};

// Add to JSX render (find existing ensemble section around line 2350-2448 and replace/extend)
```

**Add new ensemble configuration section JSX**:
```typescript
{/* Enhanced Ensemble Configuration Section */}
<div style={{ 
  marginBottom: spacing.xl, 
  padding: spacing.lg,
  backgroundColor: colors.background.secondary,
  borderRadius: borderRadius.lg,
  border: `1px solid ${colors.border.light}`
}}>
  <h3 style={{ marginBottom: spacing.md, fontSize: typography.fontSize.lg }}>
    🎯 Ensemble Mode Configuration
  </h3>
  
  {/* Mode Selection */}
  <div style={{ marginBottom: spacing.lg }}>
    <label style={{ 
      fontSize: typography.fontSize.sm, 
      fontWeight: typography.fontWeight.medium,
      marginBottom: spacing.sm,
      display: 'block'
    }}>
      Ensemble Mode
    </label>
    
    <div style={{ display: 'flex', gap: spacing.md }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
        <input
          type="radio"
          name="ensembleMode"
          value="single-model"
          checked={ensembleSettings.mode === 'single-model'}
          onChange={(e) => handleEnsembleModeChange(e.target.value as any)}
        />
        Same Model (Multiple Runs)
      </label>
      
      <label style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
        <input
          type="radio"
          name="ensembleMode"
          value="multi-provider"
          checked={ensembleSettings.mode === 'multi-provider'}
          onChange={(e) => handleEnsembleModeChange(e.target.value as any)}
        />
        Multiple Providers
      </label>
    </div>
  </div>

  {/* Single Model Configuration (existing) */}
  {ensembleSettings.mode === 'single-model' && (
    <div style={{ marginBottom: spacing.lg }}>
      <label style={{ 
        fontSize: typography.fontSize.sm, 
        fontWeight: typography.fontWeight.medium,
        marginBottom: spacing.sm,
        display: 'block'
      }}>
        Number of Runs: {ensembleSettings.defaultRuns}
      </label>
      <input
        type="range"
        min="1"
        max="10"
        value={ensembleSettings.defaultRuns}
        onChange={(e) => {
          const runs = parseInt(e.target.value);
          setEnsembleSettings(prev => ({ ...prev, defaultRuns: runs }));
        }}
        style={{ width: '100%' }}
      />
    </div>
  )}

  {/* Multi-Provider Configuration (new) */}
  {ensembleSettings.mode === 'multi-provider' && (
    <div style={{ marginBottom: spacing.lg }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: spacing.md 
      }}>
        <h4 style={{ fontSize: typography.fontSize.md, margin: 0 }}>
          Provider Configurations
        </h4>
        <button
          onClick={handleAddProviderConfig}
          style={{
            ...components.button.primary,
            fontSize: typography.fontSize.sm,
            padding: `${spacing.xs} ${spacing.sm}`
          }}
        >
          Add Provider
        </button>
      </div>

      {/* Provider Configuration List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
        {ensembleProviderConfigs.map((config) => (
          <div key={config.id} style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.md,
            padding: spacing.sm,
            backgroundColor: colors.background.primary,
            borderRadius: borderRadius.md,
            border: `1px solid ${colors.border.light}`
          }}>
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => handleUpdateProviderConfig(config.id, 'enabled', e.target.checked)}
            />
            
            <select
              value={config.providerId}
              onChange={(e) => handleUpdateProviderConfig(config.id, 'providerId', e.target.value as ProviderId)}
              style={{ ...components.input.default, minWidth: '120px' }}
            >
              {(['gemini', 'openai', 'anthropic', 'openrouter'] as ProviderId[])
                .filter(providerId => Boolean(apiKeys[providerId])) // Only show configured providers
                .map(providerId => (
                <option key={providerId} value={providerId}>
                  {getProviderDisplayName(providerId)}
                </option>
              ))}
            </select>

            <select
              value={config.modelId}
              onChange={(e) => handleUpdateProviderConfig(config.id, 'modelId', e.target.value)}
              style={{ ...components.input.default, flex: 1 }}
            >
              {availableModels[config.providerId]?.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => handleRemoveProviderConfig(config.id)}
              style={{
                ...components.button.secondary,
                fontSize: typography.fontSize.sm,
                padding: spacing.xs,
                color: colors.error
              }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {ensembleProviderConfigs.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: spacing.lg,
          color: colors.text.secondary,
          fontSize: typography.fontSize.sm
        }}>
          No provider configurations. Click "Add Provider" to get started.
        </div>
      )}

      {/* Save Configuration */}
      <div style={{ marginTop: spacing.md, display: 'flex', gap: spacing.sm }}>
        <button
          onClick={handleSaveEnsembleConfig}
          disabled={ensembleProviderConfigs.filter(c => c.enabled).length === 0}
          style={{
            ...components.button.primary,
            opacity: ensembleProviderConfigs.filter(c => c.enabled).length === 0 ? 0.6 : 1
          }}
        >
          Save Configuration
        </button>
      </div>

      {/* Provider Sets */}
      <div style={{ marginTop: spacing.lg }}>
        <h4 style={{ fontSize: typography.fontSize.md, marginBottom: spacing.sm }}>
          Saved Provider Sets
        </h4>
        
        <div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.sm }}>
          <input
            type="text"
            placeholder="Provider set name"
            value={providerSetName}
            onChange={(e) => setProviderSetName(e.target.value)}
            style={{ ...components.input.default, flex: 1 }}
          />
          <button
            onClick={handleSaveProviderSet}
            disabled={!providerSetName.trim() || ensembleProviderConfigs.filter(c => c.enabled).length === 0}
            style={{
              ...components.button.secondary,
              opacity: (!providerSetName.trim() || ensembleProviderConfigs.filter(c => c.enabled).length === 0) ? 0.6 : 1
            }}
          >
            Save Set
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.xs }}>
          {Object.keys(savedProviderSets).map(setName => (
            <button
              key={setName}
              onClick={() => handleLoadProviderSet(setName)}
              style={{
                ...components.button.secondary,
                fontSize: typography.fontSize.sm,
                padding: `${spacing.xs} ${spacing.sm}`
              }}
            >
              {setName}
            </button>
          ))}
        </div>
      </div>
    </div>
  )}
</div>
```

### Success Criteria

#### Automated Verification
- [ ] Options page renders without errors: Manual browser testing
- [ ] Type checking passes: `pnpm run typecheck`
- [ ] No linting errors: `pnpm run lint`

#### Manual Verification
- [ ] Ensemble mode toggle switches between single-model and multi-provider
- [ ] Provider configurations can be added, edited, and removed
- [ ] Only configured providers (with API keys) appear in dropdowns
- [ ] Model dropdowns populate correctly for each provider
- [ ] Provider sets can be saved and loaded
- [ ] Configuration saves successfully and persists across page reloads

---

## Phase 5: Enhanced Popup Interface

### Overview
Enhance the popup to support multi-provider ensemble selection when multi-provider mode is enabled, while maintaining the existing simple toggle for single-model mode.

### Changes Required:

#### 1. Popup State Management Enhancement
**File**: `src/entrypoints/popup.tsx`
**Changes**: Extend existing ensemble toggle to support mode selection

```typescript
// Add to existing state (around line 339)
const [ensembleMode, setEnsembleMode] = useState<boolean>(false);
const [ensembleSettings, setEnsembleSettings] = useState<EnsembleSettings | null>(null);
const [showProviderSelection, setShowProviderSelection] = useState<boolean>(false);
const [selectedEnsembleProviders, setSelectedEnsembleProviders] = useState<Array<{
  providerId: ProviderId;
  modelId: string;
}>>([]);

// Add to existing useEffect for loading data (around line 480-520)
useEffect(() => {
  const loadEnsembleSettings = async () => {
    try {
      const settings = await getEnsembleSettings();
      setEnsembleSettings(settings);
      
      // Load default provider configuration for multi-provider mode
      if (settings.mode === 'multi-provider' && settings.providerConfigurations.length > 0) {
        setSelectedEnsembleProviders(
          settings.providerConfigurations
            .filter(config => config.enabled)
            .map(config => ({
              providerId: config.providerId,
              modelId: config.modelId
            }))
        );
      }
    } catch (error) {
      console.error('Failed to load ensemble settings:', error);
    }
  };

  loadEnsembleSettings();
}, []);

// Enhanced ensemble toggle handler
const handleEnsembleToggle = () => {
  if (!ensembleSettings) return;

  const newEnsembleMode = !ensembleMode;
  setEnsembleMode(newEnsembleMode);

  // If enabling multi-provider mode, show provider selection
  if (newEnsembleMode && ensembleSettings.mode === 'multi-provider') {
    setShowProviderSelection(true);
  } else {
    setShowProviderSelection(false);
  }
};

// Provider configuration selection
const handleProviderConfigurationChange = (
  providerId: ProviderId,
  modelId: string,
  selected: boolean
) => {
  if (selected) {
    setSelectedEnsembleProviders(prev => [
      ...prev.filter(p => !(p.providerId === providerId && p.modelId === modelId)),
      { providerId, modelId }
    ]);
  } else {
    setSelectedEnsembleProviders(prev =>
      prev.filter(p => !(p.providerId === providerId && p.modelId === modelId))
    );
  }
};

// Modify existing analyzeContent function (around line 787-800)
if (ensembleMode) {
  if (ensembleSettings?.mode === 'multi-provider' && selectedEnsembleProviders.length > 0) {
    // Multi-provider ensemble analysis
    await chrome.tabs.sendMessage(tabs[0].id!, {
      type: MESSAGE_TYPES.ANALYZE_CONTENT_ENSEMBLE,
      content: "",
      prompt: selectedPrompt.content,
      typeFilter: createCombinationTypeFilter(selectedTypes),
      ensembleOptions: {
        mode: 'multi-provider',
        providerConfigurations: selectedEnsembleProviders
      },
      analysisId
    });
  } else {
    // Single-model ensemble analysis (existing logic)
    let ensembleOptions: { runs: number } = {
      runs: 3,
    };
    
    if (ensembleSettings?.defaultRuns) {
      ensembleOptions.runs = ensembleSettings.defaultRuns;
    }

    await chrome.tabs.sendMessage(tabs[0].id!, {
      type: MESSAGE_TYPES.ANALYZE_CONTENT_ENSEMBLE,
      content: "",
      prompt: selectedPrompt.content,
      typeFilter: createCombinationTypeFilter(selectedTypes),
      ensembleOptions: {
        ...ensembleOptions,
        mode: 'single-model'
      },
      analysisId
    });
  }
}
```

#### 2. Enhanced Popup UI
**Add provider selection interface after existing ensemble toggle** (around line 1542):

```typescript
{/* Enhanced Ensemble Mode Section */}
<div
  style={{
    display: "flex",
    flexDirection: "column",
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.sm,
    backgroundColor: ensembleMode
      ? colors.background.secondary
      : "transparent",
    borderRadius: borderRadius.md,
    border: `1px solid ${
      ensembleMode ? `${colors.text.accent}33` : colors.border.light
    }`,
    transition: "all 0.2s ease",
  }}
>
  {/* Existing ensemble toggle */}
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
    <span style={{
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      color: ensembleMode ? colors.text.accent : colors.text.secondary,
    }}>
      🎯 Ensemble Mode
      {ensembleSettings?.mode === 'multi-provider' && ensembleMode 
        ? ` (${selectedEnsembleProviders.length} providers)`
        : ensembleSettings?.mode === 'single-model' && ensembleMode
        ? ` (${ensembleSettings.defaultRuns} runs)`
        : ""
      }
    </span>
    
    {/* Existing toggle button - keep unchanged */}
    <button
      type="button"
      onClick={handleEnsembleToggle}
      style={{
        width: "44px",
        height: "24px",
        backgroundColor: ensembleMode
          ? colors.text.accent
          : colors.background.primary,
        border: `2px solid ${
          ensembleMode ? colors.text.accent : colors.border.default
        }`,
        borderRadius: "12px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        position: "relative",
      }}
      title="Toggle ensemble mode for higher confidence results"
    >
      <div style={{
        width: "16px",
        height: "16px",
        backgroundColor: ensembleMode
          ? colors.background.primary
          : colors.text.tertiary,
        borderRadius: "50%",
        transition: "all 0.2s ease",
        transform: ensembleMode
          ? "translateX(20px)"
          : "translateX(0px)",
        position: "absolute",
        top: "2px",
        left: "2px",
      }} />
    </button>
  </div>

  {/* Multi-Provider Selection (new) */}
  {ensembleMode && ensembleSettings?.mode === 'multi-provider' && (
    <div style={{
      marginTop: spacing.sm,
      padding: spacing.sm,
      backgroundColor: colors.background.primary,
      borderRadius: borderRadius.sm,
      border: `1px solid ${colors.border.light}`
    }}>
      <div style={{
        fontSize: typography.fontSize.xs,
        color: colors.text.secondary,
        marginBottom: spacing.sm
      }}>
        Select providers for ensemble analysis:
      </div>

      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: spacing.xs,
        maxHeight: '120px',
        overflowY: 'auto'
      }}>
        {ensembleSettings.providerConfigurations
          .filter(config => config.enabled)
          .map((config, index) => {
            const isSelected = selectedEnsembleProviders.some(
              selected => selected.providerId === config.providerId && selected.modelId === config.modelId
            );
            
            return (
              <label
                key={`${config.providerId}-${config.modelId}-${index}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.xs,
                  fontSize: typography.fontSize.xs,
                  cursor: 'pointer',
                  padding: spacing.xs,
                  borderRadius: borderRadius.sm,
                  backgroundColor: isSelected ? `${colors.text.accent}15` : 'transparent',
                  transition: 'background-color 0.2s'
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => handleProviderConfigurationChange(
                    config.providerId,
                    config.modelId,
                    e.target.checked
                  )}
                  style={{ margin: 0 }}
                />
                <span style={{ flex: 1 }}>
                  {config.providerId.charAt(0).toUpperCase() + config.providerId.slice(1)} • {config.modelId}
                </span>
              </label>
            );
        })}
      </div>

      {selectedEnsembleProviders.length === 0 && (
        <div style={{
          fontSize: typography.fontSize.xs,
          color: colors.text.secondary,
          fontStyle: 'italic',
          textAlign: 'center',
          padding: spacing.sm
        }}>
          Select at least one provider to enable analysis
        </div>
      )}

      {ensembleSettings.providerConfigurations.filter(c => c.enabled).length === 0 && (
        <div style={{
          fontSize: typography.fontSize.xs,
          color: colors.text.secondary,
          textAlign: 'center',
          padding: spacing.sm
        }}>
          Configure providers in <button
            onClick={() => chrome.runtime.openOptionsPage()}
            style={{
              background: 'none',
              border: 'none',
              color: colors.text.accent,
              textDecoration: 'underline',
              cursor: 'pointer',
              padding: 0,
              fontSize: 'inherit'
            }}
          >
            Options
          </button>
        </div>
      )}
    </div>
  )}
</div>

{/* Disable analyze button if ensemble mode is on but no providers selected */}
{/* Modify existing analyze button disabled logic */}
```

#### 3. Enhanced Analyze Button Logic
```typescript
// Modify existing analyze button disabled condition (around line 1600-1650)
const isAnalyzeDisabled = !selectedPrompt ||
  analyzing ||
  (ensembleMode && 
   ensembleSettings?.mode === 'multi-provider' && 
   selectedEnsembleProviders.length === 0);

// Update analyze button title text
const analyzeButtonTitle = analyzing
  ? "Analysis in progress..."
  : !selectedPrompt
  ? "Select a prompt first"
  : (ensembleMode && ensembleSettings?.mode === 'multi-provider' && selectedEnsembleProviders.length === 0)
  ? "Select at least one provider for ensemble analysis"
  : ensembleMode && ensembleSettings?.mode === 'multi-provider'
  ? `Run ensemble analysis with ${selectedEnsembleProviders.length} providers (${selectedEnsembleProviders.length}x cost)`
  : ensembleMode && ensembleSettings?.mode === 'single-model'
  ? `Run ensemble analysis with ${ensembleSettings.defaultRuns} runs (${ensembleSettings.defaultRuns}x cost)`
  : "Analyze this page for golden nuggets";
```

### Success Criteria

#### Automated Verification
- [x] Popup renders without errors: Manual browser testing
- [x] Type checking passes: `pnpm run typecheck`
- [x] No linting errors: `pnpm run lint`

#### Manual Verification
- [x] Ensemble toggle works for both single-model and multi-provider modes
- [x] Multi-provider mode shows provider selection interface
- [x] Provider selection state is maintained correctly
- [x] Analyze button is disabled when multi-provider mode is enabled but no providers selected
- [x] Cost indication shows correct multiplier for selected providers
- [x] Single-model mode continues to work as before (backward compatibility)

---

## Phase 6: Enhanced Results Display

### Overview
Enhance the sidebar results display to show provider information for each nugget when multi-provider ensemble mode was used, while keeping the display clean and uncluttered.

### Changes Required:

#### 1. Enhanced Sidebar Provider Display
**File**: `src/content/ui/sidebar.ts`
**Changes**: Add per-nugget provider information display

```typescript
// Modify existing nugget card rendering (around line 800-1000)
// Find the nugget card creation code and add provider information

private createNuggetCard(item: SidebarNuggetItem, index: number): HTMLElement {
  // ... existing card creation code ...

  // Add provider information display for multi-provider results
  if (item.nugget.sourceProvider && item.nugget.sourceModel) {
    const providerBadge = document.createElement('div');
    const providerColor = this.getProviderColor(item.nugget.sourceProvider);
    providerBadge.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 2px;
      padding: 1px 6px;
      border-radius: 6px;
      font-size: ${typography.fontSize.xs};
      font-weight: ${typography.fontWeight.medium};
      background-color: ${providerColor}15;
      color: ${providerColor};
      border: 1px solid ${providerColor}33;
      margin-left: ${spacing.xs};
    `;
    
    // Format provider name for display
    const providerDisplayName = item.nugget.sourceProvider.charAt(0).toUpperCase() + 
                               item.nugget.sourceProvider.slice(1);
    const modelDisplayName = this.formatModelNameForBadge(item.nugget.sourceModel);
    
    providerBadge.textContent = `${providerDisplayName}`;
    providerBadge.title = `Found by ${providerDisplayName} (${item.nugget.sourceModel})`;
    
    // Add provider badge to nugget header (next to type badge)
    const headerContainer = cardElement.querySelector('.nugget-header');
    if (headerContainer) {
      headerContainer.appendChild(providerBadge);
    }
  }

  // ... rest of existing card creation code ...
  
  return cardElement;
}

// Helper method to get provider colors
private getProviderColor(providerId: ProviderId): string {
  const providerColors = {
    'gemini': '#4285F4',      // Google Blue
    'openai': '#10A37F',      // OpenAI Green
    'anthropic': '#FF6B35',   // Anthropic Orange
    'openrouter': '#8B5CF6'   // Purple
  };
  return providerColors[providerId] || colors.text.secondary;
}

// Helper method to format model names for badges
private formatModelNameForBadge(modelName: string): string {
  // Shorten common model names for badge display
  const modelMappings: Record<string, string> = {
    'gemini-2.5-flash': 'Flash',
    'gemini-2.5-pro': 'Pro',
    'gpt-5': 'GPT-5',
    'gpt-5-mini': 'GPT-5m',
    'claude-sonnet-4-20250514': 'Sonnet',
    'openai/gpt-3.5-turbo': '3.5T'
  };
  
  return modelMappings[modelName] || modelName.substring(0, 8) + (modelName.length > 8 ? '...' : '');
}

// Modify existing header creation for multi-provider metadata
private createHeader(nuggetCount: number): HTMLElement {
  // ... existing header creation code ...

  // Enhanced provider info for multi-provider results
  if (this.providerMetadata) {
    const providerInfo = document.createElement("div");
    providerInfo.style.cssText = `
      font-size: ${typography.fontSize.xs};
      color: ${colors.text.tertiary};
      margin-top: ${spacing.xs};
    `;

    if (this.providerMetadata.providerId === 'multi-provider') {
      // Multi-provider display
      providerInfo.innerHTML = `
        <div style="display: flex; align-items: center; gap: ${spacing.xs};">
          <span>🎯 Multi-provider ensemble</span>
          <span style="font-size: ${typography.fontSize.xs}; color: ${colors.text.tertiary};">
            ${this.getProviderCount()} providers
          </span>
        </div>
        <div style="font-size: ${typography.fontSize.xs}; color: ${colors.text.tertiary}; margin-top: 2px;">
          ${Math.round(this.providerMetadata.responseTime)}ms average
        </div>
      `;
    } else {
      // Single provider display (existing)
      const providerName = this.providerMetadata.providerId.charAt(0).toUpperCase() + 
                           this.providerMetadata.providerId.slice(1);
      providerInfo.textContent = `${providerName} • ${this.providerMetadata.modelName}`;
    }
    
    titleContainer.appendChild(providerInfo);
  }

  // ... rest of existing header code ...
}

// Helper to count unique providers from nuggets
private getProviderCount(): number {
  if (!this.allItems.length) return 0;
  
  const uniqueProviders = new Set(
    this.allItems
      .map(item => item.nugget.sourceProvider)
      .filter(provider => provider !== undefined)
  );
  
  return uniqueProviders.size;
}

// Enhanced show method to handle multi-provider metadata
show(
  nuggetItems: SidebarNuggetItem[],
  highlighter?: Highlighter,
  pageContent?: string,
  providerMetadata?: {
    providerId: ProviderId;
    modelName: string;
    responseTime: number;
    providersUsed?: Array<{
      providerId: ProviderId;
      modelId: string;
      responseTime: number;
      successful: boolean;
    }>;
  },
  extractionMetadata?: {
    extractionMode?: "standard" | "two-phase" | "ensemble" | "multi-provider-ensemble";
    totalProcessingTime?: number;
  }
) {
  // ... existing show method code ...
  
  // Store enhanced provider metadata
  if (providerMetadata?.providersUsed && providerMetadata.providersUsed.length > 1) {
    // Multi-provider ensemble metadata
    this.providerMetadata = {
      providerId: 'multi-provider' as ProviderId,
      modelName: providerMetadata.providersUsed
        .filter(p => p.successful)
        .map(p => `${p.providerId}:${p.modelId}`)
        .join(', '),
      responseTime: providerMetadata.averageResponseTime || providerMetadata.responseTime
    };
  } else {
    // Single provider metadata (existing)
    this.providerMetadata = providerMetadata || null;
  }
  
  // ... rest of existing show method code ...
}
```

#### 2. Enhanced UI Manager Integration
**File**: `src/content/ui/ui-manager.ts`
**Changes**: Pass enhanced provider metadata to sidebar

```typescript
// Modify existing displayResults method (around line 100-200)
async displayResults(
  nuggets: GoldenNugget[],
  pageContent?: string,
  providerMetadata?: {
    providerId: ProviderId;
    modelName: string;
    responseTime: number;
    providersUsed?: Array<{
      providerId: ProviderId;
      modelId: string;
      responseTime: number;
      successful: boolean;
    }>;
  },
  extractionMetadata?: {
    extractionMode?: "standard" | "two-phase" | "ensemble" | "multi-provider-ensemble";
    totalProcessingTime?: number;
  }
): Promise<void> {
  // ... existing displayResults code ...

  // Show sidebar with enhanced provider metadata
  this.sidebar.show(
    nuggetItems,
    this.highlighter,
    pageContent,
    providerMetadata, // Pass through enhanced metadata
    extractionMetadata
  );

  // ... rest of existing displayResults code ...
}
```

### Success Criteria

#### Automated Verification
- [ ] Sidebar tests pass: `pnpm vitest run src/content/ui/sidebar.test.ts`
- [ ] UI manager tests pass: `pnpm vitest run src/content/ui/ui-manager.test.ts`
- [x] Type checking passes: `pnpm run typecheck`
- [x] No linting errors: `pnpm run lint`

#### Manual Verification
- [ ] Multi-provider ensemble results show provider badges on nugget cards
- [ ] Single-provider ensemble results continue to display as before
- [ ] Provider colors are visually distinct and readable
- [ ] Sidebar header shows multi-provider summary when applicable
- [ ] Provider information doesn't clutter the main nugget content
- [ ] Tooltips provide additional provider details on hover

---

## Testing Strategy

### Unit Tests

**EnsembleExtractor Multi-Provider Tests**:
- Multi-provider extraction with valid provider configurations
- Graceful handling of provider failures (partial results)
- Source provider tagging on extracted nuggets
- Consensus building with cross-provider results
- Provider configuration validation

**Storage Tests**:
- Enhanced ensemble settings save/load functionality
- Provider set storage and retrieval
- Backward compatibility with existing settings
- Migration from old settings format

**Message Handler Tests**:
- Multi-provider ensemble request handling
- Progress message emission during multi-provider analysis
- Error handling for invalid provider configurations
- Fallback to single-model mode when multi-provider fails

### Integration Tests

**End-to-End Multi-Provider Flow**:
- Options page → provider configuration → popup selection → analysis → results display
- Provider failure handling throughout the pipeline
- Storage persistence across browser sessions

**UI Component Integration**:
- Options page provider selection with real API keys
- Popup interface provider selection with saved configurations
- Sidebar display with multi-provider result metadata

### Manual Testing Steps

1. **Options Page Configuration**:
   - Configure multiple providers with API keys
   - Set up multi-provider ensemble mode
   - Create and save named provider sets
   - Verify settings persistence across page reloads

2. **Popup Interface Testing**:
   - Enable ensemble mode and verify multi-provider selection appears
   - Select multiple providers and verify analysis button updates
   - Test cost indication accuracy
   - Verify backward compatibility with single-model mode

3. **Multi-Provider Analysis**:
   - Run analysis with 2-3 different providers
   - Verify all providers are called and results are combined
   - Test graceful handling when one provider fails
   - Verify consensus building across different provider results

4. **Results Display**:
   - Verify provider badges appear on nugget cards
   - Confirm provider colors are distinct and readable
   - Test sidebar header shows multi-provider summary
   - Verify single-provider results still display correctly

5. **Edge Case Testing**:
   - Test with invalid/expired API keys
   - Test with unsupported model configurations
   - Test analysis with all providers failing
   - Test storage with corrupted ensemble settings

## Performance Considerations

**Multi-Provider Analysis**:
- Parallel execution of providers for optimal performance
- Timeout handling for slow providers
- Memory management with multiple provider instances
- Result batching to avoid UI blocking

**Storage Optimization**:
- Encrypted storage for sensitive provider configurations
- Efficient provider set lookup and caching
- Storage size monitoring for large configuration sets

**UI Performance**:
- Lazy loading of provider model lists in options
- Optimized provider badge rendering in sidebar
- Efficient provider metadata display updates

## Migration Notes

**Backward Compatibility**:
- Existing single-model ensemble settings are automatically migrated
- Users can continue using single-model mode without any changes
- Storage migration handles both old and new setting formats gracefully

**Gradual Rollout**:
- Multi-provider mode is opt-in via options page
- Default remains single-model mode for existing users
- Progressive enhancement approach doesn't break existing functionality

## References

- Original request: Multi-provider ensemble mode implementation
- Current ensemble implementation: `src/background/services/ensemble-extractor.ts`
- Provider selection patterns: `src/entrypoints/options.tsx:1547-1619`
- Existing popup ensemble toggle: `src/entrypoints/popup.tsx:1489-1542`
- Current provider metadata display: `src/content/ui/sidebar.ts:456-470`