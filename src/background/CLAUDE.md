# Background Script Architecture

This document covers the background script architecture, AI integration, multi-provider system, and backend services for the Golden Nugget Finder extension.

## Background Script Overview

The background script (`entrypoints/background.ts`) operates as a service worker that handles:
- Multi-provider AI integration (Gemini, OpenAI, Anthropic, OpenRouter)
- High recall extraction with confidence filtering (0.85 threshold)
- Context menu creation and interactions with type filtering
- Dynamic content script injection to prevent auto-loading on all pages
- Communication with content scripts via message passing
- Tab state tracking for analysis completion and missed nugget reporting
- Provider switching and API key management
- Simplified architecture with direct provider calls and natural validation

## Multi-Provider AI Integration

### Provider Architecture
The extension supports multiple AI providers through a unified interface:
- **Gemini Direct Provider**: Direct REST API integration with Google Gemini
- **LangChain Providers**: OpenAI, Anthropic, and OpenRouter via LangChain
- **Provider Factory**: Creates appropriate provider instances based on configuration
- **Provider Switching**: Automatic fallback and manual provider switching
- **FullContent Support**: All providers implement unified fullContent extraction with confidence scoring

### Provider Factory (`services/provider-factory.ts`)
Central factory for creating provider instances with multi-provider ensemble support:
- **Provider Creation**: `createProvider(config)` creates appropriate provider based on ID
- **Bulk Provider Creation**: `createMultipleProviders(configurations)` creates multiple providers for ensemble mode
- **Model Selection**: `getSelectedModel(providerId)` retrieves user-selected models
- **Default Models**: Fallback to provider-specific defaults
- **Convenience Methods**: `createProviderWithSelectedModel()` for common usage
- **Configuration Validation**: Validates provider configurations before creation
- **Error Handling**: Graceful handling of individual provider failures during bulk creation
- **Provider Metadata**: Returns provider instances with configuration metadata

## Multi-Provider Ensemble Architecture

### Core Components

#### Provider Configuration Validation
The system includes comprehensive validation for multi-provider ensemble configurations:
- **validateProviderConfigurations()**: Validates array of provider configurations before ensemble execution
- **Configuration Requirements**: Ensures providerId and modelId are specified for each configuration
- **Provider Availability**: Checks that all specified providers have valid API keys configured
- **Error Aggregation**: Collects and reports all validation errors for user feedback

#### Bulk Provider Management
Enhanced provider creation system for ensemble coordination:
- **Parallel Provider Creation**: Creates multiple provider instances simultaneously using Promise.allSettled
- **Individual Error Handling**: Continues with partial results if some providers fail during creation
- **API Key Management**: Handles provider-specific API key retrieval (special handling for Gemini via SecurityManager)
- **Provider Instance Metadata**: Returns provider instances with full configuration metadata

#### Cross-Provider Consensus Building
Advanced consensus algorithms for multi-provider results:
- **Hybrid Similarity Matching**: Combines text-based and embedding-based similarity for cross-provider consensus
- **Provider Attribution**: Maintains sourceProvider and sourceModel metadata throughout consensus process
- **Contributing Providers Collection**: Tracks unique provider/model combinations supporting each consensus nugget
- **Weighted Confidence Scoring**: Confidence scores reflect agreement across different AI models

### Multi-Provider Message Flow

#### Request Processing
1. **Request Validation**: MessageHandler validates multi-provider ensemble request structure
2. **Provider Configuration**: Loads and validates provider configurations from storage
3. **Progress Tracking**: Sends provider-specific progress messages during coordination
4. **Error Aggregation**: Collects and reports provider-specific errors with fallback handling

#### Parallel Execution Coordination
1. **Provider Instance Creation**: Creates all required providers using `createMultipleProviders()`
2. **Parallel API Calls**: Executes extraction calls across all providers simultaneously
3. **Result Aggregation**: Collects successful results and handles individual provider failures
4. **Metadata Collection**: Tracks response times, success rates, and provider-specific metadata

#### Enhanced Error Handling
- **Partial Success Handling**: Continues analysis with successful providers when others fail
- **Provider-Specific Error Messages**: Converts provider errors to actionable user guidance
- **Graceful Degradation**: Returns best available results even with provider failures
- **Retry Logic**: Provider-specific retry strategies with exponential backoff

### Storage Schema Enhancements

#### Enhanced EnsembleSettings Interface
```typescript
interface EnsembleSettings {
  enabled: boolean;
  defaultRuns: number; // For single-model mode
  mode: "single-model" | "multi-provider";
  providerConfigurations: Array<{
    providerId: ProviderId;
    modelId: string;
    enabled: boolean;
  }>;
  defaultProviderSet: string; // Named provider configuration
}
```

#### Provider Configuration Storage
- **Named Provider Sets**: Save and load specific provider combinations
- **Individual Provider Toggles**: Enable/disable specific providers within a set
- **Migration Support**: Automatic migration from legacy single-model settings
- **Validation on Load**: Ensures stored configurations are still valid on retrieval

### Model Service (`services/model-service.ts`)
Handles model discovery and management across providers:
- **Dynamic Model Fetching**: Fetches available models from each provider's API
- **Model Filtering**: Filters models by capability (text generation, chat completion)
- **Fallback Models**: Hardcoded fallback models when API calls fail
- **Model Information**: Returns model metadata including context length and descriptions

### Provider Switching (`services/provider-switcher.ts`)
Manages provider availability and switching:
- **Provider Discovery**: `getAvailableProviders()` finds configured providers
- **Current Provider**: `getCurrentProvider()` returns active provider with fallback logic
- **Configuration Check**: `isProviderConfigured()` validates provider setup
- **Automatic Switching**: `switchToFallbackProvider()` for error handling

## Supported AI Providers

### Google Gemini (Direct Integration)
- **Implementation**: `shared/providers/gemini-direct-provider.ts`
- **API**: Direct REST API calls (not SDK due to WXT/Vite limitations)
- **Default Model**: `gemini-2.5-flash`
- **Features**: Structured JSON output, thinking budget configuration
- **Caching**: 5-minute response caching
- **FullContent Method**:
  - `extractGoldenNuggets()`: Direct fullContent extraction with confidence scoring

### OpenAI (LangChain Integration)
- **Implementation**: `shared/providers/langchain-openai-provider.ts`
- **API**: LangChain OpenAI integration
- **Default Model**: `gpt-4.1-mini`
- **Features**: Chat completion models, structured output via tool calling
- **FullContent Method**:
  - `extractGoldenNuggets()`: Returns standardized response with fullContent and confidence

### Anthropic Claude (LangChain Integration)
- **Implementation**: `shared/providers/langchain-anthropic-provider.ts`
- **API**: LangChain Anthropic integration
- **Default Model**: `claude-sonnet-4-20250514`
- **Features**: Advanced reasoning capabilities, structured output
- **FullContent Method**:
  - `extractGoldenNuggets()`: Advanced reasoning-based fullContent extraction

### OpenRouter (LangChain Integration)
- **Implementation**: `shared/providers/langchain-openrouter-provider.ts`
- **API**: LangChain OpenRouter integration providing access to multiple models
- **Default Model**: `openai/gpt-3.5-turbo`
- **Features**: Access to multiple providers through single API
- **FullContent Method**:
  - `extractGoldenNuggets()`: Multi-model fullContent extraction with consistent formatting

## Ensemble Mode Integration

### EnsembleExtractor Service (`services/ensemble-extractor.ts`)
Advanced multi-run analysis service that provides improved accuracy through consensus-based extraction with support for both single-model and multi-provider ensemble modes:

#### Core Functionality
- **Single-Model Ensemble**: Multiple runs with the same provider/model for consensus
- **Multi-Provider Ensemble**: Single runs across different providers/models for cross-provider consensus
- **Hybrid Similarity Matching**: Advanced text matching algorithms for consensus building across providers
- **Embedding Analysis**: Semantic similarity analysis for duplicate detection and cross-provider matching
- **Confidence Scoring**: Assigns confidence metrics based on run/provider agreement
- **Result Consolidation**: Merges multiple runs/providers into consensus results with metadata
- **Provider Attribution**: Tracks which providers contributed to each consensus nugget
- **FullContent Integration**: Uses fullContent extraction for consensus building with hybrid similarity matching

#### Key Methods
- `extractWithEnsemble(content, provider, prompt, options)`: Single-model ensemble extraction method
- `extractWithMultiProviderEnsemble(content, prompt, providerConfigurations, options)`: Multi-provider ensemble extraction
- `extractWithMultiProvider(content, prompt, providerConfigurations, options)`: Core multi-provider extraction logic
- `buildConsensus(extractions, metadata, options)`: Combines multiple results using hybrid similarity matching
- `calculateConfidenceScores(nuggets, totalRuns)`: Assigns confidence based on agreement across runs/providers

#### Multi-Provider Ensemble Features
- **Provider Tagging**: Each nugget tagged with `sourceProvider` and `sourceModel` metadata at extraction time
- **Parallel Execution**: Multiple providers called simultaneously for optimal performance
- **Contributing Providers Collection**: Tracks unique provider/model combinations that contributed to consensus
- **Provider Failure Handling**: Graceful degradation when individual providers fail
- **Cross-Provider Consensus**: Hybrid similarity matching identifies consensus across different AI models

#### Configuration Options
- **Mode Selection**: "single-model" or "multi-provider" ensemble modes
- **Run Count**: Number of analysis passes for single-model mode (default: 3, configurable 1-10)
- **Provider Configurations**: Array of {providerId, modelId, enabled} for multi-provider mode
- **Similarity Threshold**: Consensus threshold for nugget inclusion (default: 0.7)
- **Temperature**: AI provider temperature setting for diversity (default: 0.7)
- **Provider Sets**: Named configurations of provider combinations

#### Performance Characteristics
- **Single-Model Latency**: ~3x longer than single-run (runs are sequential)
- **Multi-Provider Latency**: Similar to single-run (providers called in parallel)
- **API Cost**: Linear scaling with run count or provider count
- **Memory Usage**: Minimal - processes results incrementally
- **Error Resilience**: Continues with partial results if some runs/providers fail

### Ensemble Message Types
Extended message passing system with ensemble-specific types:
- **ANALYZE_CONTENT_ENSEMBLE**: Trigger single-model or multi-provider ensemble analysis
- **ENSEMBLE_EXTRACTION_PROGRESS**: Progress updates during ensemble runs or multi-provider coordination
- **ENSEMBLE_CONSENSUS_COMPLETE**: Ensemble analysis finished with consensus results
- **MULTI_PROVIDER_ENSEMBLE_REQUEST**: Specific message type for multi-provider ensemble requests
- **MULTI_PROVIDER_EXTRACTION_PROGRESS**: Progress updates during multi-provider analysis

### Context Menu Integration
Enhanced context menu with ensemble support:
- **"Analyze Content"**: Standard single-run analysis
- **"Ensemble Analysis"**: Multi-run ensemble analysis (shows cost indication)

### Storage Integration
Ensemble preferences stored securely using the same encryption system with enhanced multi-provider support:
- **enabled**: Master toggle for ensemble functionality
- **defaultRuns**: Default number of analysis runs for single-model mode (3)
- **mode**: "single-model" or "multi-provider" ensemble mode selection
- **providerConfigurations**: Array of provider/model configurations with enable/disable toggles
- **defaultProviderSet**: Named configuration for quick provider set switching
- **Migration Support**: Automatic migration from legacy single-model settings

### Background Script Ensemble Flow

#### Single-Model Ensemble Flow
1. **Request Handling**: MessageHandler receives ensemble analysis request
2. **Configuration**: Loads ensemble settings from secure storage
3. **Provider Setup**: Creates single AI provider instance
4. **Ensemble Execution**: EnsembleExtractor performs multi-run analysis with same provider
5. **Result Processing**: Hybrid similarity matching builds consensus across runs
6. **Confidence Filtering**: Apply 0.85 confidence threshold to filter high-quality nuggets
7. **Response**: Enhanced response with confidence scores and filtering metadata

#### Multi-Provider Ensemble Flow
1. **Request Handling**: MessageHandler receives multi-provider ensemble request via `handleMultiProviderEnsemble()`
2. **Provider Validation**: Validates provider configurations using `validateProviderConfigurations()`
3. **Bulk Provider Creation**: Creates multiple provider instances via `createMultipleProviders()`
4. **Parallel Execution**: EnsembleExtractor performs single run per provider in parallel
5. **Provider Attribution**: Tags nuggets with sourceProvider and sourceModel metadata
6. **Cross-Provider Consensus**: Hybrid similarity matching identifies consensus across different AI models
7. **Contributing Providers**: Collects unique provider/model combinations that contributed to each consensus nugget
8. **Enhanced Metadata**: Response includes provider metadata, response times, and success rates
9. **Confidence Filtering**: Apply 0.85 confidence threshold with provider consensus weighting

## Golden Nugget Response Schema

### FullContent Response Format
All AI providers are normalized to return responses in this standardized fullContent format:
```json
{
  "golden_nuggets": [
    {
      "type": "tool|media|aha! moments|analogy|model",
      "fullContent": "Complete text of the golden nugget",
      "confidence": 0.85
    }
  ]
}
```

**Response Features**:
- **fullContent**: Complete verbatim text of the golden nugget
- **confidence**: AI-assigned quality score (0.0-1.0) with 0.85 threshold filtering
- **type**: Categorization for filtering and organization
- **Provider Agnostic**: Consistent format across all AI providers

**High Recall Approach**:
- AI providers use generous extraction with confidence scoring
- Background script applies 0.85 confidence threshold filtering
- Natural validation through highlighter success/failure
- Simplified architecture eliminates expensive validation layer
- ~50% performance improvement over previous precision-focused approach

**Note**: Response normalization is handled by `services/response-normalizer.ts` to ensure consistent data structure across all providers.

## High Recall Extraction with Confidence Filtering

### Overview
The system uses a high recall extraction approach that maximizes nugget capture by encouraging AI providers to be generous in their extraction, then applies post-processing confidence filtering to ensure quality.

### Architecture Change (Breaking)
**Before (Precision-Focused)**:
```
AI extracts → ContentValidator validates → Highlighter highlights
```

**After (High Recall + Filtering)**:
```
AI extracts → Confidence filtering (≥0.85) → Highlighter highlights
```

### Implementation Details

#### Confidence Filtering (`filterByConfidence()`)
- **Threshold**: Fixed 0.85 confidence threshold for quality assurance
- **Location**: `MessageHandler.filterByConfidence()` method
- **Application**: Applied to both standard and ensemble analysis results
- **Purpose**: Filter out low-confidence extractions while maintaining high recall

#### Benefits
- **Performance**: ~50% improvement with elimination of ContentValidator
- **Simplicity**: Reduced architecture complexity with direct provider calls
- **Quality**: Natural validation through highlighter success/failure
- **Consistency**: Same 0.85 threshold applied across all analysis modes

#### Filtering Metadata
Analysis responses include filtering statistics:
```typescript
{
  golden_nuggets: [...],
  metadata: {
    preFilterCount: 12,    // Nuggets before confidence filtering
    postFilterCount: 8,    // Nuggets after confidence filtering  
    confidenceThreshold: 0.85,
    filteringApplied: true
  }
}
```

### Provider Integration
All providers support the high recall approach:
- **Gemini**: Uses structured output with confidence scoring
- **OpenAI**: LangChain integration with tool-based confidence assignment
- **Anthropic**: Advanced reasoning with confidence assessment
- **OpenRouter**: Multi-model access with consistent confidence formatting

## Message Passing System

### Communication Protocol
Uses typed message system with `MESSAGE_TYPES` constants for communication between background and content scripts.

### Core Message Types
- **Analysis Flow**: 
  - `ANALYZE_CONTENT`: Trigger content analysis
  - `ANALYZE_SELECTED_CONTENT`: Analyze user-selected content
  - `ANALYZE_CONTENT_ENSEMBLE`: Trigger ensemble analysis with multiple runs
  - `ANALYSIS_COMPLETE`: Analysis finished successfully
  - `ANALYSIS_ERROR`: Analysis failed with error
- **Progress Tracking**: 
  - `ANALYSIS_CONTENT_EXTRACTED`: Step 1 complete
  - `ANALYSIS_CONTENT_OPTIMIZED`: Step 2 complete  
  - `ANALYSIS_API_REQUEST_START`: Step 3 start
  - `ANALYSIS_API_RESPONSE_RECEIVED`: Step 3 complete
  - `ANALYSIS_PROCESSING_RESULTS`: Step 4 complete
  - `ENSEMBLE_EXTRACTION_PROGRESS`: Progress updates during ensemble runs
  - `ENSEMBLE_CONSENSUS_COMPLETE`: Ensemble consensus building finished
- **User Interface**:
  - `SHOW_ERROR`: Display error message to user
  - `SHOW_INFO`: Display informational message
  - `SHOW_API_KEY_ERROR`: API key configuration error
  - `ENTER_SELECTION_MODE`: Enable content selection mode
- **Configuration Management**:
  - `GET_PROMPTS`, `SAVE_PROMPT`, `DELETE_PROMPT`, `SET_DEFAULT_PROMPT`
  - `GET_CONFIG`, `SAVE_CONFIG`
- **Feedback System**:
  - `SUBMIT_NUGGET_FEEDBACK`: Submit feedback on extracted nuggets
  - `ENTER_MISSING_CONTENT_MODE`: Enable missed nugget reporting
  - `SUBMIT_MISSING_CONTENT_FEEDBACK`: Submit missed nugget reports
  - `GET_FEEDBACK_STATS`: Retrieve feedback statistics
  - `TRIGGER_OPTIMIZATION`: Manually trigger DSPy optimization
  - `GET_CURRENT_OPTIMIZED_PROMPT`: Get current optimized prompt

### Message Handler (`message-handler.ts`)
Centralized message processing with:
- Multi-provider analysis orchestration via `handleMultiProviderEnsemble()` method
- Single-model ensemble support via existing `handleEnsembleAnalysis()` method
- High recall extraction with 0.85 confidence threshold filtering
- Comprehensive error handling with provider-specific error recovery
- Progress tracking with enhanced 4-step analysis workflow for ensemble modes
- Type filtering support for nugget extraction across all providers
- Provider switching and fallback mechanisms with graceful degradation
- API key management and validation across multiple providers simultaneously
- Bulk provider creation and configuration validation
- Direct provider calls with simplified architecture (no validation layer)
- Enhanced progress messages for multi-provider coordination
- Provider metadata collection and response time tracking

## Content Script Injection

### ⚠️ CRITICAL: Dynamic Injection Strategy

**The extension uses dynamic injection to avoid tab reloads. DO NOT change the content script matches pattern.**

- Content scripts are injected dynamically only when needed
- Uses `chrome.scripting.executeScript` with `content-scripts/content.js`
- Prevents unnecessary loading on all pages for performance
- **Never change content script matches to `<all_urls>` - this causes all tabs to reload**

### Injection Triggers
- Context menu interactions
- Extension popup actions
- Programmatic analysis requests

### Injection Implementation
```typescript
// Correct approach - inject built content script file
await chrome.scripting.executeScript({
  target: { tabId },
  files: ['content-scripts/content.js']
});
```

## Type Filtering System

### TypeFilterService (`type-filter-service.ts`)
Manages nugget type filtering and customization:
- **Type Definitions**: Maintains definitions for all nugget types (tool, media, aha! moments, analogy, model)
- **Context Menu Integration**: Provides type-specific menu options with emojis
- **Dynamic Prompt Generation**: Filters base prompts to focus on selected types
- **Schema Generation**: Creates dynamic response schemas for filtered analyses
- **Validation**: Ensures selected types are valid before processing

### Supported Nugget Types
1. **🛠️ Tools**: Actionable software, techniques, or methods
2. **📚 Media**: High-quality books, articles, videos, podcasts with clear value
3. **💡 Aha! Moments**: Deep, insightful explanations of complex concepts
4. **🌉 Analogies**: Powerful analogies that simplify complex topics
5. **🧠 Mental Models**: Named cognitive frameworks and thinking principles

### Type Filter Options
- **All Types**: Default behavior extracting all nugget types
- **Single Type**: Focus on specific type (e.g., "Tools Only", "Mental Models Only")
- **Combination**: Custom selection of multiple types (popup UI)

## Context Menu Management

### Menu Creation
- Creates hierarchical context menus for page analysis
- Integrates with TypeFilterService for type-specific options
- Uses double underscore (`__`) delimiter for complex menu IDs
- Handles different context types (selection, page, link)
- Manages menu state based on current page context

### Menu Structure
```
Golden Nugget Finder
├── ⭐ Default Prompt
│   ├── 🔍 All Types
│   ├── 🛠️ Tools Only
│   ├── 📚 Media Only
│   ├── 💡 Explanations Only
│   ├── 🌉 Analogies Only
│   └── 🧠 Mental Models Only
├── Custom Prompt 1
│   ├── (same type options)
├── ────────────────────
├── ✂️ Select Content to Analyze
└── 🚩 Report missed golden nugget (selection only)
```

### Menu Interactions
- Processes user selections from context menus
- Triggers appropriate analysis workflows with type filtering
- Handles permission requests and error states
- Tracks analysis completion for missed nugget reporting

### Tab State Tracking
- Maintains `analysisCompletedTabs` set to track which tabs have completed analysis
- Enables "Report missed golden nugget" feature only after analysis completion
- Cleans up state when tabs are closed or navigated

## Service Architecture

### Services Directory (`services/`)
The background script is organized into modular services:

#### Error Handler (`services/error-handler.ts`)
Comprehensive error handling across all providers:
- **Provider-Specific Errors**: Handles unique error patterns for each AI provider
- **User-Friendly Messages**: Converts technical errors to actionable user guidance
- **Retry Logic**: Implements intelligent retry with exponential backoff
- **Error Recovery**: Automatic provider switching on persistent failures

#### Response Normalizer (`services/response-normalizer.ts`)
Ensures consistent data structure across providers:
- **Schema Normalization**: Converts all provider responses to unified format
- **Validation**: Validates response structure and content quality
- **Error Handling**: Graceful handling of malformed provider responses
- **Testing Support**: Comprehensive test coverage for all normalization scenarios

## Error Handling

### Multi-Provider Error Management
- **Provider-Specific Handling**: Each provider has tailored error handling for its API patterns
- **Automatic Fallback**: Switches to alternative providers when primary provider fails
- **Retry Logic**: Intelligent retry with exponential backoff and provider-specific limits
- **User-Friendly Messages**: Technical errors converted to actionable guidance

### FullContent Error Handling
- **Simplified Architecture**: Direct provider calls with natural filtering through highlighting
- **Confidence Filtering**: High recall extraction with 0.85 confidence threshold filtering
- **Provider Fallback**: Automatic switching to alternative providers on failures
- **Graceful Degradation**: Returns best available results when possible
- **Performance Improvement**: ~50% faster response times with elimination of validation layer

### Network and Connectivity
- **Timeout Handling**: Provider-specific timeout configurations
- **Rate Limiting**: Handles rate limits across different provider APIs
- **Quota Management**: Monitors and manages API quota restrictions
- **Connection Recovery**: Automatic recovery from network interruptions

## Performance Optimization

### Request Optimization
- Content size optimization before API calls
- Batched processing for multiple requests
- Intelligent caching to reduce API usage

### Resource Management
- Efficient memory usage in service worker context
- Proper cleanup of event listeners and timers
- Optimized background script lifecycle management

## Development Notes

### Testing Background Scripts
- **Multi-Provider Testing**: Test all providers (Gemini, OpenAI, Anthropic, OpenRouter) with mock services
- **Multi-Provider Ensemble Testing**: Test cross-provider consensus building and provider coordination
- **Confidence Filtering**: Test 0.85 threshold filtering across all providers and analysis modes
- **High Recall Validation**: Verify generous extraction with quality filtering
- **Provider Switching**: Verify automatic fallback and manual provider switching
- **Bulk Provider Creation**: Test `createMultipleProviders()` with various configuration scenarios
- **Provider Configuration Validation**: Test `validateProviderConfigurations()` with invalid configurations
- **Cross-Provider Consensus**: Test hybrid similarity matching across different AI models
- **Provider Attribution**: Verify sourceProvider and sourceModel metadata preservation
- **Parallel Execution**: Test simultaneous provider calls and result aggregation
- **Partial Failure Handling**: Test ensemble behavior when some providers fail
- **Message Passing**: Test message handling for both single-model and multi-provider ensemble modes
- **Context Menu**: Test context menu functionality with type filtering across providers
- **Model Management**: Test model fetching and selection for all providers
- **Enhanced Progress Tracking**: Test progress messages for multi-provider coordination
- **Error Scenarios**: Test provider failures, API key issues, and network problems in ensemble modes
- **Performance**: Verify performance characteristics for both single-model and multi-provider modes

### API Key Management
- **Multi-Provider Storage**: Secure storage for all provider API keys using SecurityManager
- **Provider Validation**: Validate API keys for each provider with provider-specific endpoints
- **Error Handling**: Enhanced error messages for invalid/expired keys per provider
- **Key Rotation**: Recovery mechanisms for device changes and key updates

### Adding New AI Providers
1. **Create Provider Implementation**: Add new provider class in `shared/providers/`
2. **Implement FullContent Method**: Ensure `extractGoldenNuggets()` returns fullContent format with confidence scores
3. **Update Provider Factory**: Add provider to factory and default model configuration
4. **Update Provider Types**: Extend `ProviderId` union and related types
5. **Add Model Service**: Implement model fetching for the new provider
6. **Update Error Handling**: Add provider-specific error patterns
7. **High Recall Integration**: Configure provider for generous extraction with confidence scoring
8. **Multi-Provider Ensemble Integration**: Ensure provider works in multi-provider ensemble mode
9. **Provider Tagging Support**: Implement sourceProvider and sourceModel metadata support
10. **Bulk Creation Support**: Ensure provider works with `createMultipleProviders()` method
11. **Configuration Validation**: Add provider to `validateProviderConfigurations()` logic
12. **Cross-Provider Consensus**: Verify provider results work with hybrid similarity matching
13. **Test Integration**: Comprehensive testing including confidence filtering, response validation, and ensemble modes

### Service Development
1. **Service Modularity**: Keep services focused and testable
2. **Provider Agnostic**: Ensure services work across all providers
3. **Simplified Architecture**: Direct provider calls without intermediate validation layers
4. **Confidence Integration**: Implement confidence scoring and filtering where applicable
5. **Error Recovery**: Implement graceful degradation and fallback mechanisms
6. **Testing Coverage**: Unit tests for all service methods and error cases
7. **Documentation**: Update service documentation for API changes

### Multi-Provider Considerations
- **Provider Parity**: Ensure feature parity across all supported providers
- **Ensemble Mode Compatibility**: Ensure all providers work in both single-model and multi-provider ensemble modes
- **Cross-Provider Consensus**: Implement consistent confidence scoring and similarity matching across providers
- **Provider Attribution**: Maintain sourceProvider and sourceModel metadata throughout the analysis pipeline
- **Performance Monitoring**: Track response times and success rates per provider in ensemble modes
- **Cost Optimization**: Monitor token usage and costs across providers, especially in multi-provider ensemble
- **Parallel Execution**: Optimize simultaneous provider calls for multi-provider ensemble performance
- **Graceful Degradation**: Handle partial failures gracefully when some providers fail in ensemble mode
- **Model Updates**: Handle new model releases and deprecations across all ensemble-enabled providers
- **Rate Limiting**: Implement provider-specific rate limiting strategies that work with parallel execution
- **Configuration Management**: Support complex provider configurations with named sets and individual toggles

### Service Worker Considerations
- **State Management**: Handle provider state across service worker restarts
- **Connection Management**: Efficient connection handling for multiple providers
- **Memory Optimization**: Monitor memory usage with multiple provider instances
- **Cleanup**: Proper cleanup of provider resources on extension updates
- **Error Boundaries**: Implement provider-specific error boundaries

### Code Quality Enforcement
- **ALWAYS** use the `code-quality-enforcer` agent at the end of any background script development task
- When working with todo lists, add "Run code quality enforcement" as the **last** todo item
- This ensures all background script code passes formatting, linting, type checking, and testing
- Critical for background scripts since they handle AI integration and manage extension state