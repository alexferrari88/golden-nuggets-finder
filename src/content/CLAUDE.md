# Content Scripts Architecture

This document covers the content script architecture, extraction system, and UI management for the Golden Nugget Finder extension.

## ⚠️ CRITICAL WARNING - Content Script Matches

**NEVER change the content script matches pattern to `<all_urls>` or any broad pattern.**

The content script in `src/entrypoints/content.ts` is configured with:
```typescript
matches: ['https://example.com/*'] // Restrictive pattern - DO NOT CHANGE
```

**Why this restriction exists:**
- Changing to `<all_urls>` causes Chrome to reload every open tab when the extension loads
- This creates terrible UX and user frustration
- The extension uses dynamic injection via `chrome.scripting.executeScript()` instead
- Content scripts are injected only when needed via context menu actions

**The correct approach:**
- Keep the restrictive matches pattern
- Use dynamic injection in `background.ts` to inject content scripts on demand
- Inject `content-scripts/content.js` using `chrome.scripting.executeScript()`

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
Handles text highlighting on pages with minimalistic design:
- **Subtle Highlighting**: Uses subtle yellow background (rgba(250, 204, 21, 0.12)) instead of bright colors
- **Minimal Indicators**: Small, unobtrusive indicators with hover states
- **Consistent Styling**: Follows design system with 3px border radius and smooth transitions
- **Accessibility**: Maintains proper contrast while being visually minimal

### Sidebar (`ui/sidebar.ts`)
Displays results in right sidebar with Notion-inspired design:
- **Clean Layout**: Uses design system colors and spacing
- **Card-based Design**: Subtle shadows and borders for content hierarchy
- **Minimal Interactions**: Hover states and smooth transitions
- **Typography**: System font stack with consistent sizing

### Notifications (`ui/notifications.ts`)
Shows progress and status banners with minimalistic approach:
- **Subtle Backgrounds**: Uses design system's neutral grays
- **Clean Typography**: Consistent font sizes and weights
- **Minimal Shadows**: Subtle depth without visual clutter
- **Smooth Animations**: Fade-in and slide-in animations for polished feel

### Design System Integration
Content script UI components follow the shared design system:
- **Color Consistency**: All components use the same gray-based palette
- **Typography**: System font stack for consistent reading experience
- **Spacing**: 8-step spacing scale for proper visual hierarchy
- **Shadows**: Subtle shadows for depth without visual noise
- **Animations**: Smooth transitions and animations for professional feel
- **Z-Index Management**: Proper layering with defined z-index values

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