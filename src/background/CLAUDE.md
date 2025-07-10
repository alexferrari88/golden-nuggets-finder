# Background Script Architecture

This document covers the background script architecture, AI integration, and API management for the Golden Nugget Finder extension.

## Background Script Overview

The background script (`entrypoints/background.ts`) operates as a service worker that handles:
- API calls to Google Gemini
- Context menu creation and interactions
- Dynamic content script injection to prevent auto-loading on all pages
- Communication with content scripts via message passing

## AI Integration

### Gemini Client (`gemini-client.ts`)
Handles API communication with Google Gemini:
- Uses REST API (not SDK due to WXT/Vite limitations)
- Implements structured JSON output with schema validation
- Features retry logic, caching, and error handling
- Optimizes content size and uses thinking budget configuration

### API Configuration
- **Model**: `gemini-2.5-flash`
- **Thinking Budget**: `thinkingBudget: -1` (dynamic)
- **Structured Output**: Enforced via `responseSchema`
- **Content Optimization**: Limits requests to 30KB
- **Caching**: API responses are cached for 5 minutes

## Golden Nugget Response Schema

The extension expects Gemini API responses in this exact format:
```json
{
  "golden_nuggets": [
    {
      "type": "tool|media|explanation|analogy|model",
      "content": "Original text verbatim",
      "synthesis": "Why this is relevant to the user persona"
    }
  ]
}
```

## Message Passing System

### Communication Protocol
Uses typed message system with `MESSAGE_TYPES` constants for communication between background and content scripts.

### Message Types
- Content extraction requests
- Analysis results delivery
- Error handling and status updates
- UI state synchronization

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

## Context Menu Management

### Menu Creation
- Creates context menus for page analysis
- Handles different context types (selection, page, link)
- Manages menu state based on current page context

### Menu Interactions
- Processes user selections from context menus
- Triggers appropriate analysis workflows
- Handles permission requests and error states

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
- Test API integration with mock services
- Verify message passing between scripts
- Test context menu functionality

### API Key Management
- Secure storage of API keys
- Validation of API key format and permissions
- Error handling for invalid or expired keys

### Adding New AI Features
1. Extend the Gemini client interface
2. Update response schema validation
3. Add appropriate error handling
4. Test with representative data samples

### Service Worker Considerations
- Handle service worker lifecycle events
- Manage persistent connections appropriately
- Ensure proper cleanup on extension updates