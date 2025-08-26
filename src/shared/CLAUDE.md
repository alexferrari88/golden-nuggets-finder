# Shared Utilities Documentation

This document covers the shared utilities, multi-provider system, types, storage management, security, content processing, and performance monitoring for the Golden Nugget Finder extension.

## Multi-Provider System

### Provider Directory (`providers/`)
The extension supports multiple AI providers through a unified interface:

#### Gemini Direct Provider (`providers/gemini-direct-provider.ts`)
Direct REST API integration with Google Gemini:
- **API Integration**: Direct REST calls without SDK dependencies
- **Structured Output**: Uses Gemini's structured output capabilities with schema enforcement
- **Thinking Budget**: Configurable thinking budget for complex analysis
- **Caching**: Built-in response caching for improved performance
- **Error Handling**: Gemini-specific error patterns and retry logic

#### LangChain Anthropic Provider (`providers/langchain-anthropic-provider.ts`)
Anthropic Claude integration via LangChain:
- **LangChain Integration**: Leverages LangChain's Anthropic adapter
- **Model Support**: Supports Claude Sonnet 4 and other Claude models
- **Structured Output**: Tool calling for consistent response formatting
- **Advanced Reasoning**: Optimized for complex analytical tasks

#### LangChain OpenAI Provider (`providers/langchain-openai-provider.ts`)
OpenAI integration via LangChain:
- **Model Range**: Supports GPT-4o, GPT-4, and other OpenAI models
- **Tool Calling**: Uses OpenAI's function calling for structured responses
- **Cost Optimization**: Efficient token usage and model selection
- **Reliability**: Robust error handling and retry mechanisms

#### LangChain OpenRouter Provider (`providers/langchain-openrouter-provider.ts`)
OpenRouter integration providing access to multiple models:
- **Multi-Model Access**: Access to various models through single API
- **Cost Comparison**: Enables cost comparison across different providers
- **Model Variety**: Supports both open-source and proprietary models
- **Fallback Option**: Serves as fallback when primary providers are unavailable

### Provider Interface (`types/providers.ts`)
Unified interface for all AI providers:
- **Common Interface**: `LLMProvider` interface ensures consistent API across providers
- **Provider Configuration**: `ProviderConfig` for standardized provider setup
- **Response Format**: `GoldenNuggetsResponse` standardizes output format
- **Type Safety**: Strong typing for provider IDs and configurations

## Storage Management

### Storage Manager (`storage.ts`)
Handles Chrome storage with caching and security integration:
- Provides abstraction layer over Chrome storage APIs
- Implements caching for frequently accessed data
- Handles storage quota management
- Ensures data consistency across extension components

### Storage Directory (`storage/`)
Modular storage system for different data types:

#### API Key Storage (`storage/api-key-storage.ts`)
Specialized storage for AI provider API keys:
- **Multi-Provider Support**: Stores API keys for Gemini, OpenAI, Anthropic, and OpenRouter
- **Encryption**: All API keys encrypted using SecurityManager with device-specific encryption
- **Provider Management**: Get, set, and remove API keys for specific providers
- **Validation Integration**: Works with provider validation systems

#### Model Storage (`storage/model-storage.ts`)
Manages user-selected models for each provider:
- **Model Selection**: Stores user's preferred model for each provider
- **Fallback Logic**: Automatic fallback to provider defaults when no selection exists
- **Provider-Specific**: Separate model storage per provider
- **Configuration Support**: Integrates with provider configuration system

### Storage Structure
- **Multi-Provider API Keys**: Encrypted storage for all supported AI providers
- **Model Selections**: User-selected models per provider with fallback defaults
- **User Prompts**: Array of saved prompt objects with names, content, and default status
- **Provider Configuration**: Selected provider and provider-specific settings
- **Type Filtering**: User preferences for nugget type filtering

### Storage Best Practices
- Use local storage for user preferences and settings
- Implement proper error handling for storage operations
- Validate data integrity on read/write operations
- Handle storage quota exceeded scenarios
- API keys are automatically encrypted using device-specific encryption

## Security System

### Security Manager (`security.ts`)
Comprehensive security system for API key protection and access control:
- **Device-Specific Encryption**: API keys encrypted using AES-GCM with device fingerprinting
- **Access Control**: Rate limiting and context validation for all security operations
- **Audit Logging**: Complete audit trail of all security events and access attempts
- **Key Rotation**: Automatic detection of key age and rotation recommendations
- **Error Recovery**: Enhanced error handling with recovery suggestions for device changes

### Security Features
- **Encryption**: AES-GCM with PBKDF2 key derivation using device-specific salts
- **Rate Limiting**: Configurable rate limits per context (background, popup, options, content)
- **Integrity Verification**: Storage integrity checks with version compatibility
- **Memory Security**: Automatic cleanup of sensitive data from memory
- **Context Validation**: Strict access control based on extension context

### Security Best Practices
- Never store API keys in plaintext
- Use SecurityManager for all sensitive data operations
- Validate access context before security operations
- Monitor audit logs for suspicious activity
- Clear sensitive data when no longer needed

## Content Processing System

### Content Reconstruction (`content-reconstruction.ts`)
Advanced text reconstruction utilities for golden nuggets:
- **Unicode Normalization**: Handles all common Unicode character variants for reliable matching
- **Text Reconstruction**: Rebuilds full content from startContent and endContent snippets
- **Improved Matching**: Enhanced start/end matching algorithm with detailed error reporting
- **Display Optimization**: Smart content display based on reconstruction success

### Text Matching Features
- **Advanced Normalization**: Handles apostrophes, quotes, dashes, ellipses, and whitespace variants
- **Multi-Strategy Matching**: Combines exact matching, reconstruction, and partial word matching
- **Error Reporting**: Detailed match results with failure reasons and indices
- **Content Validation**: Length-based validation to ensure reconstruction quality

### Fuzzy Matching (`fuzzy-matching.ts`)
Tolerance-based content matching system:
- **Word-Level Matching**: Uses Levenshtein distance for handling minor text variations
- **Configurable Tolerance**: Adjustable match threshold (default 0.8) for different use cases
- **Performance Optimized**: Efficient algorithms for real-time content highlighting

### Fuzzy Matching Features
- **Levenshtein Distance**: Single-character edit distance calculation
- **Word Filtering**: Smart word filtering to improve match accuracy
- **Tolerance Control**: Fine-tuned matching thresholds for different content types

## Schema System

### Schema Definitions (`schemas.ts`)
JSON schema definitions for API validation:
- **Golden Nugget Schema**: Complete schema for nugget validation and API responses
- **Type System**: Enforced golden nugget types (tool, media, aha! moments, analogy, model)
- **Dynamic Schema Generation**: Configurable schemas based on selected nugget types
- **Validation Support**: Integration with JSON schema validation libraries

### Schema Features
- **Strict Validation**: Enforced required fields and data types
- **Property Ordering**: Consistent property ordering for API responses
- **Type Filtering**: Dynamic schema generation based on user-selected types
- **Extensibility**: Easy addition of new nugget types and validation rules

## Development System

### Debug Logger (`debug.ts`)
Development and production logging system:
- **Environment Detection**: Automatic development mode detection
- **Multi-Context Logging**: Logs to both service worker and page console
- **LLM Integration**: Specialized logging for API requests/responses
- **Message Forwarding**: Debug messages forwarded to active content scripts

### Debug Features
- **Development Only**: Automatically disabled in production builds
- **API Validation Logging**: Detailed logging of API key validation attempts
- **Error Context**: Enhanced error logging with stack traces and context
- **Performance Integration**: Integrated with performance monitoring system

## Type System

### Core Types (`types.ts`)
Comprehensive TypeScript interfaces for all extension data structures:
- **Core Data Models**: GoldenNugget, SavedPrompt, ExtensionConfig with multi-provider support
- **UI State Management**: NuggetDisplayState, SidebarNuggetItem, TypeFilterOptions
- **Analysis System**: AnalysisRequest, AnalysisResponse, AnalysisProgressMessage with provider metadata
- **Feedback System**: NuggetFeedback, MissingContentFeedback, FeedbackStats
- **Export System**: ExportData, ExportOptions with multiple format support
- **Message System**: Complete MessageTypes enum for inter-component communication
- **Debug System**: DebugLogMessage for development logging
- **Provider Integration**: Provider metadata types for UI display and analytics

### Provider Types Directory (`types/`)
Specialized type definitions for the multi-provider system:

#### Provider Types (`types/providers.ts`)
Core provider system types:
- **Provider IDs**: `ProviderId` union type for all supported providers
- **Provider Configuration**: `ProviderConfig` interface for provider setup
- **LLM Interface**: `LLMProvider` interface ensuring consistent provider API
- **Response Format**: `GoldenNuggetsResponse` for standardized output
- **Storage Schema**: `ProviderStorageSchema` for provider data persistence

### Advanced Type Features
- **Feedback Integration**: Complete feedback system types for prompt optimization
- **Progress Tracking**: Real-time analysis progress with unique ID tracking
- **Export Flexibility**: Multiple export formats (JSON, Markdown) with scope control
- **Message Safety**: Strongly typed message system prevents runtime errors
- **Performance Monitoring**: Types for optimization requests and performance metrics

### Type Safety Guidelines  
- Use strict TypeScript configuration
- Define interfaces for all data structures
- Implement proper type guards for runtime validation
- Use discriminated unions for complex type hierarchies
- Leverage const assertions for immutable data structures

## Design System

### Design System (`design-system.ts`)
Comprehensive Notion-inspired design system with consistent styling:
- **Color Palette**: Ultra-minimal monochromatic gray palette (no colors, only neutral tones)
- **Typography**: System font stack with defined sizes and weights
- **Spacing**: Consistent spacing scale from 4px to 64px
- **Components**: Pre-built styles for buttons, cards, inputs, badges
- **Utilities**: Helper functions for hover, focus, and animation states

### Design Tokens
- **Colors**: 
  - Ultra-minimal gray scale (25-900) for all elements
  - No color accents - only neutral grays for sophisticated aesthetic
  - Semantic colors using different gray shades for hierarchy
  - Incredibly subtle highlight colors using minimal opacity overlays
- **Typography**: System font stack with 7 size variants (xs to 3xl)
- **Spacing**: 8-step scale for consistent layouts
- **Shadows**: 4 shadow variants for depth and hierarchy
- **Border Radius**: 5 variants from subtle to full rounded

### Component Styles
- **Buttons**: Primary, secondary, and ghost variants
- **Cards**: Hover states and consistent padding
- **Inputs**: Focus states with blue accent borders
- **Badges**: Default and accent variants for status indicators

### Design Philosophy
- Minimalistic approach inspired by Notion's clean interface
- Subtle visual feedback over bright, attention-grabbing elements
- Consistent spacing and typography for professional appearance
- Accessibility-focused with proper contrast ratios

### ⚠️ CRITICAL: Design System Usage Rules

**NEVER use hardcoded design values anywhere in the codebase. ALWAYS reference the design system.**

**Forbidden patterns:**
```typescript
// ❌ NEVER DO THIS
style.color = '#1A1A1A'
style.backgroundColor = 'rgba(0, 0, 0, 0.5)'
style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'
style.fontSize = '14px'
style.padding = '12px'
```

**Required patterns:**
```typescript
// ✅ ALWAYS DO THIS
import { colors, shadows, typography, spacing } from '../design-system'

style.color = colors.text.accent
style.backgroundColor = colors.background.modalOverlay
style.boxShadow = shadows.md
style.fontSize = typography.fontSize.sm
style.padding = spacing.md
```

**For content scripts and dynamic styling:**
```typescript
import { generateInlineStyles } from '../design-system'

element.style.cssText = `
  color: ${colors.text.primary};
  box-shadow: ${generateInlineStyles.cardShadow()};
`
```

**Why this rule exists:**
- Maintains visual consistency across the entire extension
- Enables easy design updates by changing values in one place
- Preserves the carefully crafted Notion-inspired aesthetic
- Prevents design drift and inconsistencies
- Makes the codebase maintainable and scalable

**The design system is the single source of truth for all visual design decisions.**

## Constants and Configuration

### Constants (`constants.ts`)
Core configuration values and defaults:
- **Storage Keys**: Centralized key definitions for Chrome storage (`STORAGE_KEYS`)
- **Gemini Configuration**: API model selection and thinking budget settings (`GEMINI_CONFIG`)
- **Default Prompts**: Complete default prompt system with sophisticated persona-based analysis
- **Template Processing**: `processPromptTemplate()` function for dynamic prompt handling

### Default Prompt System
The extension includes a comprehensive default prompt that implements:
- **Precision Over Recall**: Ultra-high quality filtering with preference for zero results over mediocre ones  
- **Persona-Based Analysis**: Tailored for "Pragmatic Processor" with ADHD and INTP cognitive patterns
- **Anti-Pattern Detection**: Sophisticated filtering to avoid meta-summaries and feature lists
- **Extraction Categories**: Tools, Media, Explanations, Analogies, and Mental Models
- **Quality Control**: Multiple validation layers with strict signal-to-noise requirements

### Configuration Features
- **Immutable Constants**: Using `as const` assertions for type safety
- **Centralized Storage**: All storage keys defined in single location
- **Model Configuration**: Easy switching between Gemini model versions
- **Prompt Templating**: Support for dynamic prompt variables like `{{ source }}`

### Configuration Management
- Centralize all configuration values
- Use environment-specific overrides where needed
- Implement validation for critical constants
- Document all configuration options
- Leverage TypeScript for compile-time validation

## Performance Monitoring

### Performance Monitor (`performance.ts`)
Tracks timing and memory usage:
- Measures content extraction performance
- Monitors API call latency and success rates
- Tracks DOM operations and rendering performance
- Provides insights for optimization

### Performance Metrics
- **Content Extraction**: Time to extract content from different site types
- **API Calls**: Request/response times and error rates
- **DOM Operations**: Time for highlighting and UI rendering
- **Memory Usage**: Tracked during analysis phases

### Performance Best Practices
- Batch DOM operations where possible
- Implement lazy loading for non-critical components
- Use efficient data structures for large datasets
- Monitor and optimize memory usage patterns

## Chrome Extension Utils

### Chrome Extension Utilities (`chrome-extension-utils.ts`)
Core utilities for Chrome extension operations including content script management and analysis tracking:

#### ContentScriptError Class
Custom error class for content script injection failures:
- **Properties**: `tabId`, `cause` for detailed error tracking
- **Usage**: Thrown when content script injection or verification fails
- **Error Context**: Provides specific tab and error information for debugging

#### injectContentScript() Function
Robust content script injection with verification and retry logic:
- **Verification Check**: Tests if content script already exists before injection
- **Retry Mechanism**: 10 attempts with 100ms intervals to ensure script readiness
- **Error Handling**: Throws ContentScriptError with detailed failure information
- **Deduplication**: Prevents duplicate injections by checking for existing scripts

```typescript
await injectContentScript(tabId); // Injects and verifies content script
```

#### generateAnalysisId() Function
Unique identifier generation for analysis session tracking:
- **Format**: `analysis_${timestamp}_${random}` for guaranteed uniqueness
- **Usage**: Tracking analysis requests across background and content scripts
- **Performance**: Enables analysis progress monitoring and debugging

## Messaging Utils

### Messaging Utilities (`messaging-utils.ts`)
Type-safe messaging system combining injection and communication patterns:

#### Type-Safe Message Interface
Comprehensive message type definitions for extension communication:
- **BaseMessage/BaseResponse**: Foundation interfaces for all messaging
- **Specific Message Types**: `AnalyzeContentMessage`, `EnterSelectionModeMessage`, etc.
- **Union Types**: `MessagingRequest`/`MessagingResponse` for complete type safety
- **Provider Integration**: Messages include provider-specific data types

#### MessagingError Class
Specialized error handling for communication failures:
- **Properties**: `tabId`, `messageType`, `cause` for detailed debugging
- **Context Awareness**: Tracks which tab and message type failed
- **Error Chaining**: Preserves original error cause for root cause analysis

#### sendWithInjection() Function
Combined injection and messaging operation:
- **Automatic Injection**: Ensures content script exists before sending messages
- **Type Safety**: Generic return type based on expected response
- **Error Handling**: Comprehensive error reporting with context
- **Deduplication**: Leverages injectContentScript's deduplication logic

```typescript
const response = await sendWithInjection<AnalysisResponse>(tabId, message);
```

#### getActiveTab() Function
Reliable active tab retrieval with validation:
- **Tab Validation**: Ensures tab exists and has valid ID
- **Error Handling**: Throws MessagingError for missing or invalid tabs
- **Type Safety**: Returns properly typed chrome.tabs.Tab object

#### sendToActiveTab() Function
Convenience function combining tab retrieval and messaging:
- **One-Step Operation**: Handles tab lookup, injection, and messaging
- **Error Propagation**: Maintains error context through the entire chain
- **Type Safety**: Preserves response type through generic parameters

```typescript
const response = await sendToActiveTab<AnalysisResponse>(message);
```

## Provider Validation Utils

### Provider Validation Utilities (`provider-validation-utils.ts`)
Centralized provider configuration validation system:

#### ProviderValidationResult Interface
Complete provider validation state information:
- **isConfigured**: Boolean indicating if provider has valid API key
- **provider**: Current ProviderId (gemini, anthropic, openai, openrouter)
- **model**: Selected model name for the provider
- **error**: Optional error message if validation failed

#### ProviderConfigurationError Class
Specialized error for provider configuration issues:
- **Provider Context**: Includes which provider failed configuration
- **Usage**: Thrown when operations require configured provider but none exists
- **Error Propagation**: Preserves original error context

#### validateCurrentProvider() Function
Comprehensive provider validation with parallel checks:
- **Parallel Validation**: Simultaneously checks provider, model, and configuration
- **Fallback Handling**: Returns default provider on failure with error details
- **Performance Optimized**: Uses Promise.all for efficient validation
- **Error Recovery**: Never throws, always returns validation result

```typescript
const validation = await validateCurrentProvider();
if (!validation.isConfigured) {
  // Handle unconfigured provider
}
```

#### requireConfiguredProvider() Function
Validation with mandatory configuration requirement:
- **Strict Validation**: Throws error if provider not configured
- **Operation Gating**: Use before operations requiring valid provider
- **Clear Error Messages**: Provides actionable error messages for users
- **Type Safety**: Returns validated provider info on success

```typescript
const provider = await requireConfiguredProvider(); // Throws if not configured
```

## Type Filtering System

### Type Filter Integration
User-configurable nugget type filtering with persistent storage:

#### Provider Interface Integration (`types/providers.ts`)
Type filtering parameter in provider analysis calls:
- **Optional Parameter**: `typeFilter?: TypeFilterOptions` in analysis requests
- **Backwards Compatibility**: Defaults to all types when not specified
- **Provider Agnostic**: Supported across all AI providers (Gemini, Claude, OpenAI, OpenRouter)

### Type Filter Benefits
- **User Control**: Users can focus on specific nugget types of interest
- **Backward Compatibility**: Existing prompts work without modification
- **Provider Independence**: Works consistently across all AI providers
- **Performance Optimization**: More focused analysis when types are filtered

## Utility Functions

### Common Utilities
- String manipulation and validation helpers
- DOM utility functions
- Async operation helpers
- Error handling utilities

### Helper Function Guidelines
- Keep functions pure and side-effect free where possible
- Implement proper error handling
- Use TypeScript generics for reusable functions
- Document function parameters and return types

## Error Handling

### Error Utilities
- Standardized error types and messages
- Error logging and reporting functions
- User-friendly error message formatting
- Debug information collection

### Error Handling Strategy
- Use typed error objects for better error handling
- Implement proper error boundaries in UI components
- Log errors with sufficient context for debugging
- Provide graceful degradation for non-critical failures

## Testing Infrastructure

### Unit Tests
The shared utilities include comprehensive unit tests:
- **Schema Validation Tests** (`schemas.test.ts`): Tests for JSON schema generation and validation
- **Security System Tests** (`security.test.ts`): Tests for encryption, decryption, and access control  
- **Storage System Tests** (`storage.test.ts`): Tests for storage operations and error handling
- **Chrome Extension Utils Tests** (`chrome-extension-utils.test.ts`): Tests for content script injection and analysis ID generation
- **Provider Validation Tests** (`provider-validation-utils.test.ts`): Tests for provider configuration validation and error handling
- **Content Reconstruction Tests** (`content-reconstruction.test.ts`): Tests for text matching and reconstruction algorithms
- **Model Storage Tests** (`storage/model-storage.test.ts`): Tests for provider model selection and storage

### Test Coverage Areas
- **Security**: Encryption/decryption cycles, device fingerprinting, error recovery
- **Schema**: Dynamic schema generation, type validation, property ordering
- **Storage**: CRUD operations, error handling, data integrity validation
- **Chrome Extension Operations**: Content script injection, deduplication, retry logic
- **Provider Validation**: Configuration checks, error scenarios, fallback handling
- **Content Processing**: Text reconstruction, fuzzy matching, normalization
- **Performance**: Timing validation, memory usage monitoring
- **Error Handling**: Edge cases, malformed data, security failures

### Testing Best Practices
- Focus on unit testing for utility functions
- Test error conditions and edge cases thoroughly
- Verify type safety and validation logic
- Test performance under various conditions
- Use descriptive test names and organize by feature area

## Development Notes

### Adding New Utilities
1. **Naming Conventions**: Follow existing naming conventions and file structure
2. **TypeScript Integration**: Implement proper TypeScript typing with strict mode
3. **Provider Compatibility**: Ensure utilities work across all supported providers
4. **Testing Coverage**: Add comprehensive unit tests in corresponding `.test.ts` file
5. **Security Considerations**: Consider security implications for sensitive operations
6. **Documentation**: Update this CLAUDE.md file with new utility documentation

#### Utility File Organization
The shared utilities are organized into specialized modules for maintainability:

- **`chrome-extension-utils.ts`**: Core Chrome extension operations (injection, analysis IDs)
- **`messaging-utils.ts`**: Type-safe messaging patterns with injection integration
- **`provider-validation-utils.ts`**: Provider configuration validation and error handling
- **`storage.ts`**: Chrome storage abstraction with caching and security
- **`security.ts`**: Encryption, access control, and audit logging
- **`content-reconstruction.ts`**: Text matching and content reconstruction
- **`fuzzy-matching.ts`**: Tolerance-based content matching algorithms

#### Utility Integration Patterns
When creating new utilities, follow these established patterns:

1. **Error Classes**: Create specialized error classes (e.g., `ContentScriptError`, `MessagingError`)
2. **Type Safety**: Use generics and strict typing (e.g., `sendWithInjection<T>()`)
3. **Parallel Operations**: Use `Promise.all()` for independent async operations
4. **Error Recovery**: Provide fallback values and graceful degradation
5. **Function Composition**: Combine smaller utilities into higher-level operations
6. **Context Preservation**: Maintain error context through the call stack

### Adding New Providers
1. **Provider Implementation**: Create new provider class in `providers/` directory
2. **Interface Compliance**: Implement `LLMProvider` interface from `types/providers.ts`
3. **Type Updates**: Extend `ProviderId` union type and related interfaces
4. **Model Service**: Add model fetching logic to model service
5. **Error Handling**: Implement provider-specific error patterns
6. **Storage Integration**: Update storage systems for new provider
7. **Testing**: Comprehensive testing including API integration and error scenarios

### Security Considerations
- All new utilities handling sensitive data must use SecurityManager
- Implement proper access control validation
- Add audit logging capability for security-sensitive operations
- Consider rate limiting for operations that could be abused
- Test error handling to prevent information leakage

### Performance Optimization
- Profile utility functions for performance bottlenecks
- Implement memoization where appropriate (see content reconstruction)
- Use efficient algorithms and data structures (see fuzzy matching)
- Monitor memory usage and implement cleanup (see security manager)
- Consider lazy loading for heavy operations

### Code Quality Enforcement
- **ALWAYS** use the `code-quality-enforcer` agent at the end of any shared utility development task
- When working with todo lists, add "Run code quality enforcement" as the **last** todo item
- This ensures all shared utility code passes formatting, linting, type checking, and testing
- Critical for shared utilities since they're used across all extension components

## Migration Notes

### Storage Migration
- Implement version-based storage migration
- Handle legacy data format conversion
- Provide fallback values for missing data
- Test migration scenarios thoroughly

### API Changes
- Version API interfaces appropriately
- Maintain backward compatibility where possible
- Document breaking changes clearly
- Provide migration guides for major updates