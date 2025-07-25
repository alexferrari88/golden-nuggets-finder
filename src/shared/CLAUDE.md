# Shared Utilities Documentation

This document covers the shared utilities, types, storage management, security, content processing, and performance monitoring for the Golden Nugget Finder extension.

## Storage Management

### Storage Manager (`storage.ts`)
Handles Chrome storage with caching and security integration:
- Provides abstraction layer over Chrome storage APIs
- Implements caching for frequently accessed data
- Handles storage quota management
- Ensures data consistency across extension components

### Storage Structure
- `geminiApiKey`: User's Google Gemini API key (encrypted using SecurityManager)
- `userPrompts`: Array of saved prompt objects with names, content, and default status

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
- **Type System**: Enforced golden nugget types (tool, media, explanation, analogy, model)
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

### Types (`types.ts`)
Comprehensive TypeScript interfaces for all extension data structures:
- **Core Data Models**: GoldenNugget, GeminiResponse, SavedPrompt, ExtensionConfig
- **UI State Management**: NuggetDisplayState, SidebarNuggetItem, TypeFilterOptions
- **Analysis System**: AnalysisRequest, AnalysisResponse, AnalysisProgressMessage
- **Feedback System**: NuggetFeedback, MissingContentFeedback, FeedbackStats
- **Export System**: ExportData, ExportOptions with multiple format support
- **Message System**: Complete MessageTypes enum for inter-component communication
- **Debug System**: DebugLogMessage for development logging

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

### Default Prompt System
The extension includes a comprehensive default prompt that implements:
- **Diamond Miner Principle**: Ultra-high quality filtering with preference for zero results over mediocre ones  
- **Persona-Based Analysis**: Tailored for "Pragmatic Synthesizer" with ADHD and INTP cognitive patterns
- **Anti-Pattern Detection**: Sophisticated filtering to avoid meta-summaries and feature lists
- **Five Extraction Categories**: Tools, Media, Explanations, Analogies, and Mental Models
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

### Test Coverage Areas
- **Security**: Encryption/decryption cycles, device fingerprinting, error recovery
- **Schema**: Dynamic schema generation, type validation, property ordering
- **Storage**: CRUD operations, error handling, data integrity validation
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
1. Follow existing naming conventions and file structure
2. Implement proper TypeScript typing with strict mode
3. Add comprehensive unit tests in corresponding `.test.ts` file
4. Document usage examples and integration points
5. Consider security implications for sensitive operations
6. Update this CLAUDE.md file with new utility documentation

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