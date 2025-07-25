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

The content extraction system uses the external `threads-harvester` library (v1.1.1) for intelligent content extraction across different website types.

### ContentScraper (`threads-harvester`)
The extension uses `ContentScraper` from the threads-harvester library which provides:
- **Automatic Site Detection**: Automatically detects site type (Reddit, Hacker News, generic websites)
- **Structured Content Extraction**: Returns structured `Content` objects with `items` array containing posts and comments
- **HTML Support**: Can include HTML content for better extraction with `includeHtml: true` option
- **Interactive Selection**: Supports checkbox-based content selection with custom styling

### Content Processing Flow
1. **Initialization**: `ContentScraper` is created with design-system-compliant checkbox styling
2. **Extraction**: `contentScraper.run()` extracts structured content from the page
3. **Conversion**: `convertContentToText()` converts structured content to text with type delimiters (`[POST]`, `[COMMENT]`)
4. **Analysis**: Processed text is sent to AI for golden nugget analysis

### Site-Specific Extraction
The threads-harvester library handles site-specific extraction internally:
- **Reddit**: Handles modern Reddit's shadow DOM structure and both old/new layouts
- **Hacker News**: Optimized for classic HTML structure with nested comments
- **Generic Sites**: Fallback extraction for unknown site structures
- **Content Types**: Distinguishes between posts, comments, and article content

## UI Management

### UI Manager (`ui/ui-manager.ts`)
Orchestrates all UI interactions and coordinates between components:
- Manages lifecycle of UI components
- Handles state synchronization
- Coordinates highlighting and sidebar display

### Highlighter (`ui/highlighter.ts`)
Modern text highlighting using CSS Custom Highlight API with DOM fallback:
- **CSS Custom Highlight API**: Uses modern browser API for performance and native behavior
- **DOM Fallback**: Graceful degradation to DOM-based highlighting for older browsers
- **Ultra-Subtle Styling**: Uses design system's minimal gray overlays for sophisticated highlighting
- **Minimal Visual Impact**: Small, unobtrusive indicators with hover states using design system colors
- **Performance Optimized**: CSS-based highlighting avoids DOM manipulation overhead
- **Accessibility**: Maintains proper contrast while being visually minimal using neutral grays

### Sidebar (`ui/sidebar.ts`)
Displays results in right sidebar with Notion-inspired design:
- **Clean Layout**: Uses design system colors and spacing
- **Card-based Design**: Subtle shadows and borders for content hierarchy
- **Minimal Interactions**: Hover states and smooth transitions
- **Typography**: System font stack with consistent sizing

### NotificationManager (`ui/notifications.ts`)
Manages different types of notification banners with automatic lifecycle:
- **Multiple Banner Types**: Progress, error, success, info, and API key error banners
- **Auto-hide Behavior**: Automatic timeout for errors and success messages
- **Interactive Options**: Info banners can include buttons with custom actions
- **Single Banner Policy**: Only one banner shown at a time, with smart replacement
- **Design System Integration**: Uses design system colors, typography, and timing
- **Smooth Animations**: Fade-in and slide-in animations for polished feel

### Design System Integration
Content script UI components follow the shared design system:
- **Color Consistency**: All components use the same ultra-minimal gray palette
- **Typography**: System font stack for consistent reading experience
- **Spacing**: 8-step spacing scale for proper visual hierarchy
- **Shadows**: Subtle shadows for depth without visual noise
- **Animations**: Smooth transitions and animations for professional feel
- **Z-Index Management**: Proper layering with defined z-index values

### ⚠️ CRITICAL: Never Use Hardcoded Design Values in Content Scripts

**ABSOLUTELY NEVER use hardcoded colors, shadows, spacing, or any design values in content script UI components.**

**All styling MUST reference the design system:**

```typescript
// ✅ CORRECT - Always import and use design system
import { colors, shadows, spacing, generateInlineStyles } from '../../shared/design-system'

// For dynamic styling in content scripts
element.style.cssText = `
  background: ${colors.background.primary};
  color: ${colors.text.primary};
  box-shadow: ${generateInlineStyles.cardShadow()};
  padding: ${spacing.md};
`

// For hover effects
element.addEventListener('mouseover', () => {
  element.style.boxShadow = generateInlineStyles.cardShadowHover()
  element.style.borderColor = colors.border.medium
})
```

**FORBIDDEN patterns in content scripts:**
```typescript
// ❌ NEVER DO THIS
element.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'
element.style.color = '#1A1A1A'
element.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'
```

**Why this is critical for content scripts:**
- Content scripts inject UI into arbitrary websites
- Hardcoded values break visual consistency across different sites
- Design system ensures our Notion-inspired aesthetic is preserved
- Makes UI components maintainable and themeable
- Prevents style conflicts with host website styles

**Content script components that MUST use design system:**
- `ui/highlighter.ts` - All highlighting and indicator styles
- `ui/sidebar.ts` - All sidebar and card styles  
- `ui/notifications.ts` - All banner and notification styles
- `ui/ui-manager.ts` - Any dynamic styling

**Remember: The design system (`../../shared/design-system.ts`) is the single source of truth.**

## Site-Specific Behavior

The threads-harvester library provides automatic site detection and optimized extraction:

### Reddit Integration
- Automatic detection of modern Reddit interface
- Handles both old and new Reddit layouts seamlessly
- Extracts post content and comment threads with proper hierarchy
- Supports both standard and shadow DOM structures

### Hacker News Integration  
- Recognizes Hacker News URL patterns and DOM structure
- Extracts nested comment structures with proper threading
- Handles both article links and discussion content
- Maintains comment hierarchy and metadata

### Generic Site Handling
- Automatic fallback for unrecognized sites
- Intelligent content extraction using multiple strategies
- Maintains consistent content quality across different site types
- Adapts to various DOM structures and layouts

## Performance Considerations

### Content Extraction Optimization
- Content extraction timing is measured using `measureContentExtraction()`
- ThreadsHarvester library operations are monitored for performance
- DOM operations are batched and measured with `measureDOMOperation()`
- Memory usage is tracked during analysis with `performanceMonitor.measureMemory()`

### Dynamic Injection
- Content scripts are injected dynamically only when needed
- Uses `chrome.scripting.executeScript()` from background script
- ContentScraper is initialized on-demand to prevent unnecessary loading
- Prevents performance impact on all pages by using restrictive matches pattern

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

### Working with ContentScraper
1. ContentScraper automatically detects site types - no manual configuration needed
2. Configure extraction options via constructor (`includeHtml`, `showCheckboxes`, etc.)
3. Use `measureContentExtraction()` to monitor performance of extraction operations
4. Test extraction across different site types and content structures
5. For site-specific issues, consider contributing to the threads-harvester library

### UI Component Guidelines
- Keep UI components lightweight and performant
- Ensure proper cleanup on page navigation
- Handle dynamic content updates gracefully