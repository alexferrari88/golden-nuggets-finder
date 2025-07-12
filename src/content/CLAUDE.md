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
- Designed for modern Reddit's shadow DOM structure
- Handles both posts and comments efficiently

#### HackerNewsExtractor
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
- **Ultra-Subtle Highlighting**: Uses design system's minimal gray overlays for sophisticated highlighting
- **Minimal Indicators**: Small, unobtrusive indicators with hover states using design system colors
- **Consistent Styling**: Follows design system with consistent border radius and smooth transitions
- **Accessibility**: Maintains proper contrast while being visually minimal using neutral grays

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