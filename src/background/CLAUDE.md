# Background Script Architecture

This document covers the background script architecture, AI integration, multi-provider system, and backend services for the Golden Nugget Finder extension.

## Background Script Overview

The background script (`entrypoints/background.ts`) operates as a service worker that handles:
- Multi-provider AI integration (Gemini, OpenAI, Anthropic, OpenRouter)
- Context menu creation and interactions with type filtering
- Dynamic content script injection to prevent auto-loading on all pages
- Communication with content scripts via message passing
- Tab state tracking for analysis completion and missed nugget reporting
- Provider switching and API key management

## Multi-Provider AI Integration

### Provider Architecture
The extension supports multiple AI providers through a unified interface:
- **Gemini Direct Provider**: Direct REST API integration with Google Gemini
- **LangChain Providers**: OpenAI, Anthropic, and OpenRouter via LangChain
- **Provider Factory**: Creates appropriate provider instances based on configuration
- **Provider Switching**: Automatic fallback and manual provider switching
- **Two-Phase Support**: All providers implement both Phase 1 and Phase 2 extraction methods

### Provider Factory (`services/provider-factory.ts`)
Central factory for creating provider instances:
- **Provider Creation**: `createProvider(config)` creates appropriate provider based on ID
- **Model Selection**: `getSelectedModel(providerId)` retrieves user-selected models
- **Default Models**: Fallback to provider-specific defaults
- **Convenience Methods**: `createProviderWithSelectedModel()` for common usage

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
- **Two-Phase Methods**:
  - `extractPhase1HighRecall()`: High-recall extraction with temperature 0.7
  - `extractPhase2HighPrecision()`: Boundary detection with temperature 0.0

### OpenAI (LangChain Integration)
- **Implementation**: `shared/providers/langchain-openai-provider.ts`
- **API**: LangChain OpenAI integration
- **Default Model**: `gpt-4.1-mini`
- **Features**: Chat completion models, structured output via tool calling
- **Two-Phase Methods**:
  - `extractPhase1HighRecall()`: Returns `Phase1Response` with fullContent and confidence
  - `extractPhase2HighPrecision()`: Returns `Phase2Response` with startContent/endContent boundaries

### Anthropic Claude (LangChain Integration)
- **Implementation**: `shared/providers/langchain-anthropic-provider.ts`
- **API**: LangChain Anthropic integration
- **Default Model**: `claude-sonnet-4-20250514`
- **Features**: Advanced reasoning capabilities, structured output
- **Two-Phase Methods**:
  - `extractPhase1HighRecall()`: High-recall extraction optimized for discovery
  - `extractPhase2HighPrecision()`: Precise boundary detection for text matching

### OpenRouter (LangChain Integration)
- **Implementation**: `shared/providers/langchain-openrouter-provider.ts`
- **API**: LangChain OpenRouter integration providing access to multiple models
- **Default Model**: `openai/gpt-3.5-turbo`
- **Features**: Access to multiple providers through single API
- **Two-Phase Methods**:
  - `extractPhase1HighRecall()`: Multi-model high-recall extraction
  - `extractPhase2HighPrecision()`: Precise boundary detection across model types

## Ensemble Mode Integration

### EnsembleExtractor Service (`services/ensemble-extractor.ts`)
Advanced multi-run analysis service that provides improved accuracy through consensus-based extraction:

#### Core Functionality
- **Multi-Run Execution**: Performs multiple independent analysis runs with same provider
- **Hybrid Similarity Matching**: Uses advanced text matching algorithms for consensus building
- **Embedding Analysis**: Semantic similarity analysis for duplicate detection
- **Confidence Scoring**: Assigns confidence metrics based on run agreement
- **Result Consolidation**: Merges multiple runs into consensus results with metadata
- **Two-Phase Integration**: Uses Phase 1 high-recall extraction for consensus building, then converts back to standard format for ensemble similarity matching

#### Key Methods
- `extractWithEnsemble(content, provider, prompt, options)`: Main ensemble extraction method
- `buildConsensusResult(runResults, options)`: Combines multiple run results
- `calculateConfidenceScores(nuggets, totalRuns)`: Assigns confidence based on agreement

#### Configuration Options
- **Run Count**: Number of analysis passes (default: 3, configurable 1-10)
- **Mode Selection**: Different ensemble strategies (balanced, precision-focused, recall-focused)
- **Similarity Threshold**: Consensus threshold for nugget inclusion (default: 0.7)
- **Temperature**: AI provider temperature setting for diversity (default: 0.7)

#### Performance Characteristics
- **Latency**: ~3x longer than single-run (runs are sequential)
- **API Cost**: Linear scaling with run count (3 runs = 3x cost)
- **Memory Usage**: Minimal - processes results incrementally
- **Error Resilience**: Continues with partial results if some runs fail

### Ensemble Message Types
Extended message passing system with ensemble-specific types:
- **ANALYZE_CONTENT_ENSEMBLE**: Trigger ensemble analysis
- **ENSEMBLE_EXTRACTION_PROGRESS**: Progress updates during ensemble runs
- **ENSEMBLE_CONSENSUS_COMPLETE**: Ensemble analysis finished

### Context Menu Integration
Enhanced context menu with ensemble support:
- **"Analyze Content"**: Standard single-run analysis
- **"Ensemble Analysis"**: Multi-run ensemble analysis (shows cost indication)

### Storage Integration
Ensemble preferences stored securely using the same encryption system:
- **enabled**: Master toggle for ensemble functionality
- **defaultRuns**: Default number of analysis runs (3)
- **defaultMode**: Default ensemble strategy ("balanced")

### Background Script Ensemble Flow
1. **Request Handling**: MessageHandler receives ensemble analysis request
2. **Configuration**: Loads ensemble settings from secure storage
3. **Provider Setup**: Creates appropriate AI provider instance
4. **Ensemble Execution**: EnsembleExtractor performs multi-run analysis
5. **Result Processing**: Hybrid similarity matching builds consensus
6. **Response**: Enhanced response with confidence scores and metadata

## Golden Nugget Response Schema

### Standard Response Format
All AI providers are normalized to return responses in this standardized format:
```json
{
  "golden_nuggets": [
    {
      "type": "tool|media|aha! moments|analogy|model",
      "startContent": "Original text verbatim (start)",
      "endContent": "Original text verbatim (end)"
    }
  ]
}
```

### Two-Phase Response Formats

#### Phase 1 Response (`Phase1Response`)
High-recall extraction with confidence scoring:
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

#### Phase 2 Response (`Phase2Response`)
Boundary detection for precise text matching:
```json
{
  "golden_nuggets": [
    {
      "type": "tool|media|aha! moments|analogy|model",
      "startContent": "Original text verbatim (start)",
      "endContent": "Original text verbatim (end)"
    }
  ]
}
```

**Temperature Differences**:
- **Phase 1**: Higher temperature (0.7) for creative, high-recall extraction
- **Phase 2**: Lower temperature (0.0) for precise, deterministic boundary detection

**Note**: Response normalization is handled by `services/response-normalizer.ts` to ensure consistent data structure across all providers.

## Message Passing System

### Communication Protocol
Uses typed message system with `MESSAGE_TYPES` constants for communication between background and content scripts.

### Core Message Types
- **Analysis Flow**: 
  - `ANALYZE_CONTENT`: Trigger content analysis (supports `useTwoPhase` parameter)
  - `ANALYZE_SELECTED_CONTENT`: Analyze user-selected content (supports `useTwoPhase` parameter)
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
- Multi-provider analysis orchestration
- Comprehensive error handling with provider-specific error recovery
- Progress tracking with 4-step analysis workflow
- Type filtering support for nugget extraction
- Provider switching and fallback mechanisms
- API key management and validation across providers

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

#### TwoPhaseExtractor (`services/two-phase-extractor.ts`)
Main orchestrator for two-phase extraction workflow:
- **Phase 1 Execution**: High-recall extraction using `extractPhase1HighRecall()` method
- **Confidence Filtering**: Filters nuggets based on configurable confidence threshold (default: 0.85)
- **Phase 2 Execution**: Boundary detection using fuzzy matching and LLM fallback
- **Abort Logic**: Aborts extraction when >60% of nuggets have low confidence
- **Performance Monitoring**: Tracks processing times and extraction method statistics
- **Key Methods**:
  - `extractWithTwoPhase()`: Main orchestration method
  - `executePhase1()`: Phase 1 high-recall extraction
  - `executePhase2()`: Phase 2 boundary detection
  - `llmBoundaryDetection()`: Fallback LLM boundary detection

#### FuzzyBoundaryMatcher (`services/fuzzy-boundary-matcher.ts`)
Advanced text matching service for boundary extraction:
- **Exact Match Strategy**: Direct text matching for identical content
- **Fuzzy Match Strategy**: Levenshtein distance-based matching with configurable tolerance
- **Word Boundary Detection**: Ensures matches respect word boundaries
- **Confidence Scoring**: Assigns confidence based on match quality and strategy
- **Similarity Calculation**: Advanced word-level similarity for fuzzy matching
- **Key Methods**:
  - `findBoundaries()`: Main boundary detection method
  - `tryExactMatch()`: Exact text matching
  - `tryFuzzyMatch()`: Fuzzy matching with Levenshtein distance
  - `extractBoundariesFromIndex()`: Boundary extraction from match indices
  - `getUnmatchedNuggets()`: Returns nuggets that couldn't be matched

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

### Two-Phase Error Handling
- **Confidence Threshold Abort**: Automatically aborts when >60% of Phase 1 nuggets have low confidence
- **Phase Isolation**: Failures in one phase don't affect the other
- **Fuzzy Match Fallback**: LLM boundary detection as fallback when fuzzy matching fails
- **Graceful Degradation**: Returns partial results when possible

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
- **Provider Switching**: Verify automatic fallback and manual provider switching
- **Message Passing**: Test message handling between scripts including provider-specific messages
- **Context Menu**: Test context menu functionality with type filtering across providers
- **Model Management**: Test model fetching and selection for all providers
- **Error Scenarios**: Test provider failures, API key issues, and network problems

### API Key Management
- **Multi-Provider Storage**: Secure storage for all provider API keys using SecurityManager
- **Provider Validation**: Validate API keys for each provider with provider-specific endpoints
- **Error Handling**: Enhanced error messages for invalid/expired keys per provider
- **Key Rotation**: Recovery mechanisms for device changes and key updates

### Adding New AI Providers
1. **Create Provider Implementation**: Add new provider class in `shared/providers/`
2. **Update Provider Factory**: Add provider to factory and default model configuration
3. **Update Provider Types**: Extend `ProviderId` union and related types
4. **Add Model Service**: Implement model fetching for the new provider
5. **Update Error Handling**: Add provider-specific error patterns
6. **Test Integration**: Comprehensive testing across all provider scenarios

### Service Development
1. **Service Modularity**: Keep services focused and testable
2. **Provider Agnostic**: Ensure services work across all providers
3. **Error Recovery**: Implement graceful degradation and fallback mechanisms
4. **Testing Coverage**: Unit tests for all service methods and error cases
5. **Documentation**: Update service documentation for API changes

### Multi-Provider Considerations
- **Provider Parity**: Ensure feature parity across all supported providers
- **Performance Monitoring**: Track response times and success rates per provider
- **Cost Optimization**: Monitor token usage and costs across providers
- **Model Updates**: Handle new model releases and deprecations
- **Rate Limiting**: Implement provider-specific rate limiting strategies

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