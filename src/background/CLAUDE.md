# Background Script Architecture

This document covers the background script architecture, AI integration, API management, and backend services for the Golden Nugget Finder extension.

## Background Script Overview

The background script (`entrypoints/background.ts`) operates as a service worker that handles:
- API calls to Google Gemini
- Context menu creation and interactions with type filtering
- Dynamic content script injection to prevent auto-loading on all pages
- Communication with content scripts via message passing
- Tab state tracking for analysis completion and missed nugget reporting
- Backend integration for feedback collection and DSPy optimization

## AI Integration

### Gemini Client (`gemini-client.ts`)
Handles API communication with Google Gemini:
- Uses REST API (not SDK due to WXT/Vite limitations)
- Implements structured JSON output with schema validation
- Features retry logic, caching, and enhanced error handling
- Optimizes content size and uses thinking budget configuration
- Supports dynamic schema generation based on type filters
- Integrates with backend for optimized prompt selection

### API Configuration
- **Model**: `gemini-2.5-flash`
- **Thinking Budget**: `thinkingBudget: -1` (dynamic)
- **Structured Output**: Enforced via `responseSchema` with dynamic schema support
- **Content Optimization**: Limits requests to 30KB
- **Caching**: API responses are cached for 5 minutes
- **Enhanced Error Handling**: Comprehensive error classification and user-friendly messages

## Golden Nugget Response Schema

The extension expects Gemini API responses in this exact format:
```json
{
  "golden_nuggets": [
    {
      "type": "tool|media|explanation|analogy|model",
      "startContent": "Original text verbatim (start)",
      "endContent": "Original text verbatim (end)",
      "synthesis": "Why this is relevant to the user persona"
    }
  ]
}
```

**Note**: The schema can be dynamically filtered to only include selected nugget types when type filtering is active.

## Message Passing System

### Communication Protocol
Uses typed message system with `MESSAGE_TYPES` constants for communication between background and content scripts.

### Core Message Types
- **Analysis Flow**: 
  - `ANALYZE_CONTENT`: Trigger content analysis
  - `ANALYZE_SELECTED_CONTENT`: Analyze user-selected content
  - `ANALYSIS_COMPLETE`: Analysis finished successfully
  - `ANALYSIS_ERROR`: Analysis failed with error
- **Progress Tracking**: 
  - `ANALYSIS_CONTENT_EXTRACTED`: Step 1 complete
  - `ANALYSIS_CONTENT_OPTIMIZED`: Step 2 complete  
  - `ANALYSIS_API_REQUEST_START`: Step 3 start
  - `ANALYSIS_API_RESPONSE_RECEIVED`: Step 3 complete
  - `ANALYSIS_PROCESSING_RESULTS`: Step 4 complete
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
- Comprehensive error handling and user-friendly error messages
- Backend integration for feedback and optimization
- Progress tracking with 4-step analysis workflow
- Type filtering support for nugget extraction
- Automatic fallback to optimized prompts when available

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
- **Type Definitions**: Maintains definitions for all 5 nugget types (tool, media, explanation, analogy, model)
- **Context Menu Integration**: Provides type-specific menu options with emojis
- **Dynamic Prompt Generation**: Filters base prompts to focus on selected types
- **Schema Generation**: Creates dynamic response schemas for filtered analyses
- **Validation**: Ensures selected types are valid before processing

### Supported Nugget Types
1. **🛠️ Tools**: Actionable software, techniques, or methods
2. **📚 Media**: High-quality books, articles, videos, podcasts with clear value
3. **💡 Explanations**: Deep, insightful explanations of complex concepts
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

## Backend Integration & DSPy Optimization

### Backend Services
The extension integrates with a local backend service (`http://localhost:7532`) for advanced features:

#### Feedback Collection (`/feedback`)
- **Purpose**: Collects user feedback on nugget quality and missed content
- **Data**: Nugget feedback (helpful/not helpful) and missing content reports
- **Fallback**: Stores feedback locally when backend unavailable
- **Deduplication**: Backend prevents duplicate feedback submissions

#### DSPy Optimization (`/optimize`)
- **Purpose**: Uses DSPy framework to optimize prompts based on user feedback
- **Triggers**: Manual optimization requests and automatic threshold-based optimization
- **Modes**: 'cheap' (faster) and 'thorough' (more comprehensive) optimization
- **Monitoring**: Real-time progress tracking via `/monitor/*` endpoints

#### Optimized Prompt Retrieval (`/optimize/current`)
- **Purpose**: Fetches current optimized prompt for analysis
- **Integration**: Automatically uses optimized prompts when available
- **Fallback**: Uses default prompts when backend unavailable or no optimization exists
- **Versioning**: Tracks optimization versions and performance metrics

#### Feedback Statistics (`/feedback/stats`)
- **Purpose**: Provides insights into feedback patterns and optimization triggers
- **Metrics**: Total feedback count, positive/negative rates, optimization dates
- **Usage**: Helps determine when new optimizations should be triggered

### Backend Error Handling
Sophisticated error classification system for backend failures:
- **Network Errors**: "Backend service unavailable" with local fallback
- **Database Errors**: "Database temporarily busy" with retry suggestions
- **DSPy Configuration**: "Optimization system not configured" notifications
- **API Errors**: Enhanced error messages with specific remediation steps
- **Timeout Handling**: 10-second timeout for feedback, 5-second for prompt retrieval

### Local Fallback Strategy
- **Feedback Storage**: All feedback stored locally as backup
- **Graceful Degradation**: Extension functions fully without backend
- **User Notifications**: Informative messages about backend status
- **Automatic Sync**: Future implementation for syncing when backend recovers

## Error Handling

### API Error Management
- Robust retry logic for API calls with exponential backoff
- User-friendly error messages for common issues
- Comprehensive logging for debugging

### Network and Connectivity
- Handles network timeouts and connectivity issues
- Provides fallback mechanisms for service interruptions
- Manages rate limiting and quota restrictions

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
- Test API integration with mock services and backend fallback scenarios
- Verify message passing between scripts including new message types
- Test context menu functionality with type filtering
- Validate type filter service operations and schema generation
- Test tab state tracking and cleanup operations
- Mock backend services for feedback and optimization testing

### API Key Management
- Secure storage of API keys with security manager integration
- Validation of API key format and permissions
- Enhanced error handling for invalid or expired keys
- Recovery mechanisms for device changes and key rotation

### Adding New AI Features
1. Extend the Gemini client interface with new methods
2. Update response schema validation and type definitions
3. Add appropriate error handling and user feedback
4. Test with representative data samples and edge cases
5. Consider type filtering implications for new features
6. Update backend integration if optimization support needed

### Type Filtering Development
1. Update TypeFilterService with new type definitions
2. Extend context menu options and emoji representations  
3. Test dynamic prompt generation and schema filtering
4. Validate type combinations and edge cases
5. Ensure proper integration with backend optimization

### Backend Integration Development
1. Add new API endpoints to message handler
2. Implement proper timeout and retry logic
3. Test error classification and user notification
4. Validate local fallback mechanisms
5. Monitor performance impact of backend calls
6. Document new endpoints and data structures

### Service Worker Considerations
- Handle service worker lifecycle events and state persistence
- Manage persistent connections appropriately with backend
- Ensure proper cleanup on extension updates including tab tracking
- Monitor memory usage with increased backend integration
- Handle network connectivity changes gracefully
- Implement proper error boundaries for backend failures