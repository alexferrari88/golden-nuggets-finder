# Content Scripts Architecture

This document covers the content script architecture, extraction system, and UI management for the Golden Nugget Finder extension.

## Content Script Overview

Content scripts are injected dynamically only when needed (not on all pages) and handle:
- Content extraction from webpages using specialized extractors
- DOM manipulation for highlighting and UI rendering
- Analysis workflow and performance monitoring
- Communication with background scripts via message passing

## Content Extraction System

### Base Extractor (`extractors/base.ts`)
Abstract interface that defines the contract for all content extractors.

### Specialized Extractors

#### RedditExtractor
- Uses `[slot='text-body']` and `[slot='comment']` selectors
- Designed for modern Reddit's shadow DOM structure
- Handles both posts and comments efficiently

#### HackerNewsExtractor
- Uses `.toptext` and `.comment` selectors
- Optimized for Hacker News' classic HTML structure
- Extracts both article content and discussion threads

#### GenericExtractor
- Uses Mozilla's Readability.js for article extraction
- Fallback for general websites
- Provides clean, readable content extraction

## UI Management

### UI Manager (`ui/ui-manager.ts`)
Orchestrates all UI interactions and coordinates between components:
- Manages lifecycle of UI components
- Handles state synchronization
- Coordinates highlighting and sidebar display

### Highlighter (`ui/highlighter.ts`)
Handles text highlighting on pages:
- Highlights golden nuggets in original content
- Provides visual feedback for discovered insights
- Manages highlight persistence and cleanup

### Sidebar (`ui/sidebar.ts`)
Displays results in right sidebar:
- Shows extracted golden nuggets
- Provides categorized view of insights
- Handles user interactions with results

### Notifications (`ui/notifications.ts`)
Shows progress and status banners:
- Displays analysis progress
- Shows error states and user feedback
- Manages notification lifecycle

## Site-Specific Behavior

### Reddit Integration
- Uses shadow DOM selectors for modern Reddit interface
- Handles both old and new Reddit layouts
- Optimized for post content and comment threads

### Hacker News Integration
- Uses CSS class selectors for comments and posts
- Handles nested comment structures
- Extracts both article links and discussion content

### Generic Site Handling
- Uses Readability.js for article extraction
- Provides fallback for unknown site structures
- Maintains consistent extraction quality

## Performance Considerations

### Content Extraction Optimization
- Content extraction is measured and optimized
- DOM operations are batched and measured
- Memory usage is tracked during analysis

### Dynamic Injection
- Content scripts are injected dynamically only when needed
- Uses `chrome.scripting.executeScript` with `content-injector.js`
- Prevents unnecessary loading on all pages for performance

## Error Handling

### Graceful Degradation
- Graceful degradation when content extraction fails
- Fallback extraction methods for different site types
- User-friendly error messages for extraction issues

### Logging and Debugging
- Comprehensive logging for debugging extraction issues
- Performance metrics for optimization
- Error tracking for content script failures

## Development Notes

### Testing Content Scripts
- Focus on extraction accuracy and performance
- Test across different site types and structures
- Verify UI component interactions

### Adding New Extractors
1. Extend the base extractor interface
2. Implement site-specific selection logic
3. Add performance monitoring
4. Test with representative content samples

### UI Component Guidelines
- Keep UI components lightweight and performant
- Ensure proper cleanup on page navigation
- Handle dynamic content updates gracefully