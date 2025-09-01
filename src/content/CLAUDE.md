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

## ⚠️ CRITICAL WARNING - CSS Highlight ID Consistency

**NEVER change the CSS Custom Highlight API ID from the static "golden-nugget" constant.**

The highlighter in `src/content/ui/highlighter.ts` uses CSS Custom Highlight API with this architecture:
```typescript
// CSS selector expects this exact ID
::highlight(golden-nugget) {
  background-color: ${colors.highlight.background};
  color: ${colors.text.primary};
}

// Highlighter code MUST use this exact static ID
private static readonly HIGHLIGHT_ID = "golden-nugget";
CSS.highlights.set(Highlighter.HIGHLIGHT_ID, highlight);
```

**Why this is critical:**
- CSS selector `::highlight(golden-nugget)` expects the exact ID "golden-nugget"
- Using unique/dynamic IDs like `nugget-${timestamp}-${random}` breaks visual highlighting
- Ranges are created and stored correctly, but no visual styling is applied
- Users see no highlighting even though the technical implementation works

**FORBIDDEN patterns:**
```typescript
// ❌ NEVER DO THIS - Dynamic IDs break CSS highlighting
const highlightId = `nugget-${Date.now()}-${Math.random()}`;
CSS.highlights.set(highlightId, highlight);

// ❌ NEVER DO THIS - Wrong static ID
CSS.highlights.set("custom-highlight", highlight);
```

**REQUIRED pattern:**
```typescript
// ✅ ALWAYS DO THIS - Use the static constant
CSS.highlights.set(Highlighter.HIGHLIGHT_ID, highlight);
```

**What happens if you break this rule:**
- CSS highlighting silently fails (no visual highlighting appears)
- Text matching and range creation still works (confusing debugging)
- Users cannot see golden nuggets on the page
- Scrolling to highlights may fail

**This architectural constraint exists because CSS Custom Highlight API requires the CSS selector ID to match the JavaScript highlight registration ID exactly.**

## ⚠️ CRITICAL WARNING - WXT Bundler Template Literal Variable References

**NEVER reference design system variables directly inside template literals in content scripts.**

The WXT bundler has a known issue where design system variables get renamed during compilation, breaking template literal references. This causes CSS styling to fail when variables are used inside template strings.

**FORBIDDEN pattern:**
```typescript
// ❌ NEVER DO THIS - Variables get renamed during bundling
element.style.cssText = `
  background: ${colors.highlight.background};
  color: ${colors.text.primary};
`;
```

**REQUIRED pattern:**
```typescript
// ✅ ALWAYS DO THIS - Extract variables before template literals
const highlightBg = colors.highlight.background;
const primaryText = colors.text.primary;
element.style.cssText = `
  background: ${highlightBg};
  color: ${primaryText};
`;
```

**Why this happens:**
- WXT's bundling process renames variables during compilation
- Template literals capture the renamed variable names
- CSS properties receive the renamed identifiers instead of actual values
- Styling silently fails with no visual feedback

**Files that MUST use this pattern:**
- `ui/highlighter.ts` - All CSS template literals
- `ui/sidebar.ts` - All dynamic styling
- `ui/notifications.ts` - All banner styling
- Any content script that generates CSS via template literals

**This warning exists because this exact issue broke visual highlighting and took significant debugging time to identify.**

## Content Script Overview

Content scripts are injected dynamically only when needed (not on all pages) and handle:
- Content extraction from webpages using the `threads-harvester` library
- DOM manipulation for highlighting and UI rendering with design system integration
- Analysis workflow and performance monitoring with real-time progress updates
- Communication with background scripts via message passing
- Multi-provider analysis support with provider metadata display
- Ensemble mode UI integration with confidence scoring and consensus visualization

## Progressive Text Matching Services

The extension uses a sophisticated 3-phase progressive text matching system for accurate golden nugget highlighting, especially when dealing with LLM-generated content variations and cross-node text spans.

### TextMatcher (`ui/text-matcher.ts`) - Phase 1: Fuzzy Text Matching
Centralized fuzzy text matching service using uFuzzy.js for handling LLM text variations:
- **uFuzzy.js Integration**: Advanced fuzzy string matching with configurable tolerance levels
- **Multi-Strategy Approach**: Exact → Normalized → Fuzzy → Partial word matching progression
- **Text Normalization**: Uses `TextNormalizer` for comprehensive text variation handling
- **Confidence Scoring**: Returns confidence metrics (0.0-1.0) for match quality assessment
- **Performance Optimized**: Exact matching first, fuzzy matching only when needed
- **Word-Based Matching**: Intelligent word sequence matching for better LLM content handling
- **Sliding Window Approach**: Creates overlapping text windows for comprehensive coverage

### DOMPositionMapper (`ui/dom-position-mapper.ts`) - Phase 2: Cross-Node Text Highlighting
Converts global text positions to DOM Ranges that can span multiple nodes:
- **Cross-Node Support**: Handles text that spans multiple DOM elements
- **Text Node Mapping**: Builds comprehensive mapping of visible text nodes
- **Range Optimization**: Merges adjacent ranges for better performance
- **Visibility Filtering**: Excludes hidden elements and script/style tags
- **Position Accuracy**: Precise global-to-local position conversion
- **Range Merging**: Combines adjacent ranges to reduce highlight objects
- **Debug Utilities**: Text node mapping visualization for troubleshooting

### AnchorTextMatcher (`ui/anchor-text-matcher.ts`) - Phase 3: Context-Aware Text Matching
Wrapper for dom-anchor-text-quote with progressive fallback strategy:
- **Context-Aware Matching**: Uses prefix/suffix context for disambiguation
- **dom-anchor-text-quote Integration**: Leverages robust academic text anchoring library
- **Progressive Fallback**: Anchor → Fuzzy → Exact matching progression
- **Hint-Based Positioning**: Prioritizes matches near expected positions
- **Confidence Integration**: Unified confidence scoring across all match types
- **Error Recovery**: Graceful fallback when advanced methods fail
- **Match Validation**: Comprehensive validation with configurable thresholds
- **Context Extraction**: Automatic context extraction for future anchor-based matches

### TextNormalizer (`ui/text-normalizer.ts`) - Enhanced Text Normalization
Comprehensive text normalization for improved fuzzy matching accuracy:
- **Unicode Normalization**: Handles smart quotes, dashes, brackets, and full-width characters
- **Punctuation Standardization**: Normalizes ellipsis, multiple punctuation, and spacing
- **Math Symbol Conversion**: Converts Unicode math symbols to ASCII equivalents
- **Whitespace Collapse**: Intelligent whitespace normalization while preserving meaning
- **Stop Word Filtering**: Removes common stop words for better key word extraction
- **Similarity Calculation**: Jaccard similarity scoring for text comparison
- **Equivalence Testing**: Aggressive equivalence checking for exact match detection
- **Debug Utilities**: Normalization diff tracking for troubleshooting

### Progressive Matching Strategy

The system uses a 3-phase approach for maximum reliability:

```typescript
// Phase 1: Try anchor-based matching with context
const anchorResult = await tryAnchorMatching(searchText, prefix, suffix);
if (anchorResult.ranges.length > 0) return anchorResult;

// Phase 2: Try fuzzy matching with DOM position mapping
const fuzzyResult = await tryFuzzyMatching(searchText, minConfidence);
if (fuzzyResult.ranges.length > 0) return fuzzyResult;

// Phase 3: Fallback to exact matching
const exactResult = await tryExactMatching(searchText);
return exactResult;
```

**Benefits of Progressive Matching:**
- **High Accuracy**: Context-aware matching handles ambiguous text
- **LLM Variation Handling**: Fuzzy matching handles AI-generated content variations
- **Cross-Node Support**: Position mapping handles text spanning multiple elements
- **Performance Optimized**: Fast exact matching first, complex methods only when needed
- **Graceful Degradation**: Always provides fallback options
- **Confidence Metrics**: Each match includes quality assessment

## Content Extraction System

The content extraction system uses the external `threads-harvester` library for intelligent content extraction across different website types.

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
Orchestrates all UI interactions and coordinates between components with enhanced text matching integration:
- **Component Lifecycle Management**: Manages highlighter, sidebar, and notification components
- **Progressive Matching Integration**: Uses async progressive matching strategy for optimal accuracy
- **State Synchronization**: Coordinates between highlighting, sidebar, and notification states
- **Context Extraction**: Extracts page content and processes it for golden nugget reconstruction
- **Batch Processing**: Efficiently processes multiple nuggets with performance monitoring
- **Error Recovery**: Graceful handling of text matching failures with fallback strategies
- **Real-Time Progress**: Displays progress updates during async progressive matching operations
- **Performance Monitoring**: Tracks highlighting performance and DOM operation timing

### Highlighter (`ui/highlighter.ts`)
Modern text highlighting using CSS Custom Highlight API with mark.js fallback and **3-phase progressive text matching**:
- **CSS Custom Highlight API**: Uses modern browser API for performance and native behavior
- **mark.js Fallback**: Graceful degradation to DOM-based highlighting for older browsers
- **Progressive Text Matching**: 3-phase strategy for maximum accuracy and reliability:
  - **Phase 1 - Anchor Matching**: Uses `dom-anchor-text-quote` with context for precise positioning
  - **Phase 2 - Fuzzy Matching**: Uses `TextMatcher` + `DOMPositionMapper` for LLM text variations
  - **Phase 3 - Exact Matching**: Fallback to simple string matching with position mapping
- **Cross-Node Text Support**: Handles text that spans multiple DOM nodes via `DOMPositionMapper`
- **Enhanced Text Normalization**: Uses `TextNormalizer` for comprehensive text variation handling
- **Ultra-Subtle Styling**: Uses design system's minimal gray overlays for sophisticated highlighting
- **Performance Optimized**: CSS-based highlighting with intelligent caching avoids DOM manipulation overhead
- **Confidence Scoring**: Each match includes confidence metrics for quality assessment

### Sidebar (`ui/sidebar.ts`)
Displays results in right sidebar with Notion-inspired design:
- **Clean Layout**: Uses design system colors and spacing
- **Card-based Design**: Subtle shadows and borders for content hierarchy
- **Minimal Interactions**: Hover states and smooth transitions
- **Typography**: System font stack with consistent sizing

### NotificationManager (`ui/notifications.ts`)
Manages different types of notification banners with automatic lifecycle:
- **Multiple Banner Types**: Progress, error, success, info, API key error, and provider-specific banners
- **Real-time Progress**: Displays analysis progress with provider information and timing
- **Provider Integration**: Shows provider metadata, response times, and model information
- **Ensemble Progress Support**: Specialized notifications for multi-run analysis with run counters
- **Rate Limiting Support**: Displays rate limiting messages with retry countdown
- **Auto-hide Behavior**: Automatic timeout for errors and success messages
- **Interactive Options**: Info banners can include buttons with custom actions
- **Single Banner Policy**: Only one banner shown at a time, with smart replacement
- **Design System Integration**: Uses design system colors, typography, and timing
- **Smooth Animations**: Fade-in and slide-in animations for professional feel

### Ensemble Mode UI Integration

Content script UI components include specialized features for ensemble mode analysis:

#### Enhanced Notification System
Ensemble-specific progress notifications with run tracking:
- **Ensemble Progress Messages**: Real-time updates during multi-run analysis
- **Run Counter**: Shows current run progress (e.g., "Run 2 of 3")
- **Cost Indication**: Clear display of multiplied API costs
- **Consensus Building**: Progress messages during similarity matching

#### Sidebar Ensemble Results
Enhanced sidebar display for ensemble analysis results:
- **Confidence Scoring**: Visual indicators showing nugget confidence levels
- **Consensus Metadata**: Run agreement statistics (e.g., "3/3 runs" or "2/3 runs")
- **Quality Indicators**: Visual cues for high-confidence vs moderate-confidence nuggets
- **Ensemble Badges**: Subtle indicators showing analysis was performed with ensemble mode

#### Example Ensemble UI Elements
```typescript
// Ensemble-specific progress notification
const ensembleProgressMessage = `🎯 Starting ensemble extraction (${runs} runs)`

// Consensus display in sidebar
const consensusElement = document.createElement('div')
consensusElement.style.cssText = `
  background: ${colors.background.secondary};
  border: 1px solid ${colors.border.light};
  border-radius: 4px;
  padding: ${spacing.xs};
  color: ${colors.text.secondary};
  font-size: ${typography.fontSize.xs};
`
consensusElement.textContent = `${runsSupportingThis}/${totalRuns} agreement`
```

#### Ensemble Mode Visual Design
- **Confidence Indicators**: Subtle opacity variations based on consensus strength
- **Agreement Badges**: Small text indicators showing run agreement
- **Enhanced Cards**: Additional metadata sections for ensemble-specific information
- **Cost Awareness**: Clear visual indicators when ensemble mode is active


#### Technical Integration Notes

**Content Script Architecture**
FullContent extraction uses a simplified, efficient architecture:
- Analysis requests use standard message format with provider and type filter parameters
- Progress messages handled through existing notification system
- Results displayed through enhanced UI components with confidence indicators

**Background Script Communication**
- Standard message passing with provider and configuration parameters
- `ContentValidator` service ensures response quality and consistency
- Results provided in normalized fullContent format with metadata

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

## New Dependencies and Integration

### dom-anchor-text-quote (v4.0.2)
Robust text anchoring library for precise text positioning:
- **Academic-Grade Accuracy**: Based on W3C Web Annotation standards
- **Context-Aware Matching**: Uses prefix/suffix context for disambiguation
- **Hint-Based Positioning**: Prioritizes matches near expected locations
- **Cross-Browser Support**: Handles various DOM structures and edge cases
- **Performance Optimized**: Efficient range creation and text search algorithms
- **Integration Point**: Used by `AnchorTextMatcher` as Phase 1 matching strategy

### uFuzzy.js (@leeoniya/ufuzzy v1.0.19)
Advanced fuzzy string matching library:
- **Configurable Tolerance**: Adjustable substitution, transposition, and deletion tolerance
- **High Performance**: Optimized for large text corpus searching
- **Multiple Match Modes**: Supports different matching strategies and scoring
- **Unicode Support**: Handles international characters and symbols
- **Integration Point**: Used by `TextMatcher` for Phase 2 fuzzy matching

### Enhanced Text Matching Capabilities
- **3-Phase Progressive Strategy**: Anchor → Fuzzy → Exact matching for maximum coverage
- **Cross-Node Text Support**: Handles text spanning multiple DOM elements
- **LLM Variation Handling**: Specialized support for AI-generated content variations
- **Confidence Scoring**: Quality metrics for all match types
- **Context Preservation**: Maintains semantic context during text matching

## Performance Considerations

### Progressive Text Matching Optimization
- **Phase-Based Performance**: Fast exact matching first, complex algorithms only when needed
- **Range Optimization**: Adjacent DOM ranges are merged for better CSS Highlight API performance
- **Text Node Caching**: Efficient text node mapping with intelligent caching
- **Confidence Thresholds**: Configurable quality thresholds to balance accuracy vs performance
- **Memory Management**: Proper cleanup of ranges and text matching resources

### Content Extraction Optimization
- Content extraction timing is measured using `measureContentExtraction()`
- ThreadsHarvester library operations are monitored for performance
- DOM operations are batched and measured with `measureDOMOperation()`
- Memory usage is tracked during analysis with `performanceMonitor.measureMemory()`
- **Text Matching Performance**: Progressive matching operations are monitored and optimized

### Dynamic Injection
- Content scripts are injected dynamically only when needed
- Uses `chrome.scripting.executeScript()` from background script
- ContentScraper is initialized on-demand to prevent unnecessary loading
- Prevents performance impact on all pages by using restrictive matches pattern
- **Progressive Services**: Text matching services are initialized only when highlighting is needed

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

### Working with Progressive Text Matching Services

#### TextMatcher Integration
1. **Fuzzy Matching Configuration**: Configure uFuzzy.js tolerance levels for different content types
2. **Confidence Thresholds**: Set appropriate confidence levels based on content quality requirements
3. **Word-Based Matching**: Leverage word sequence matching for better LLM content handling
4. **Performance Optimization**: Use exact matching first, fuzzy matching only when needed
5. **Error Handling**: Handle fuzzy matching failures gracefully with fallback strategies

#### DOMPositionMapper Usage
1. **Cross-Node Ranges**: Use for text that spans multiple DOM elements
2. **Range Optimization**: Enable optimized range merging for better performance
3. **Text Node Filtering**: Configure visibility filters for different site types
4. **Position Accuracy**: Validate global-to-local position conversion accuracy
5. **Debug Mode**: Use debug utilities to troubleshoot cross-node highlighting issues

#### AnchorTextMatcher Best Practices
1. **Context Extraction**: Extract meaningful prefix/suffix context for disambiguation
2. **Progressive Strategy**: Trust the phase-based fallback approach (anchor → fuzzy → exact)
3. **Confidence Validation**: Use appropriate confidence thresholds for different use cases
4. **Error Recovery**: Handle all match types gracefully with proper error messages
5. **Performance Monitoring**: Track match success rates and timing across different strategies

#### TextNormalizer Guidelines
1. **Matching vs Display**: Use `normalizeForMatching()` for fuzzy matching, `normalizeForDisplay()` for UI
2. **Key Word Extraction**: Leverage key word extraction for similarity calculations
3. **Equivalence Testing**: Use `areTextsEquivalent()` for high-confidence match validation
4. **Debug Analysis**: Use normalization diff tracking to understand match failures
5. **Stop Word Management**: Configure stop word filtering based on content domain

### Working with ContentScraper
1. **Automatic Detection**: ContentScraper automatically detects site types - no manual configuration needed
2. **Design System Integration**: Configure extraction with design-system-compliant checkbox styling
3. **Performance Monitoring**: Use `measureContentExtraction()` to monitor extraction performance
4. **Multi-Mode Support**: Supports both analysis mode and selection mode with checkboxes
5. **Site Types**: Test extraction across Reddit, Hacker News, and generic websites
6. **Content Reconstruction**: Extracted content is stored for golden nugget text reconstruction via progressive matching

### UI Component Guidelines
- **Design System Compliance**: Always use design system variables for styling
- **Provider Integration**: Display provider metadata and response times in UI
- **Real-time Updates**: Handle progress messages and provider switching notifications
- **Performance Optimization**: Keep components lightweight with efficient DOM operations
- **Error Handling**: Graceful degradation for provider failures and network issues
- **Memory Management**: Proper cleanup on page navigation and component destruction

### Progressive Text Matching Testing

#### Testing Strategy
1. **Multi-Phase Testing**: Test all phases of progressive matching (anchor → fuzzy → exact)
2. **Cross-Node Scenarios**: Test text that spans multiple DOM elements
3. **LLM Variation Testing**: Test with AI-generated content variations and paraphrases
4. **Confidence Validation**: Validate confidence scores across different match qualities
5. **Performance Benchmarking**: Monitor progressive matching performance on large pages
6. **Context Testing**: Test anchor matching with various prefix/suffix context patterns

#### Debugging Progressive Matching
1. **Match Strategy Analysis**: Use `debugAllStrategies()` to compare all matching approaches
2. **Text Node Mapping**: Use `DOMPositionMapper.debugTextNodeMapping()` for cross-node issues
3. **Normalization Debugging**: Use `TextNormalizer.getNormalizationDiff()` for text variation issues
4. **Confidence Metrics**: Monitor confidence scores to identify match quality issues
5. **Range Validation**: Verify DOM range creation and positioning accuracy

#### WXT Bundler Considerations
- **Template Literal Variables**: Always extract design system variables before template literals
- **Bundler Testing**: Test CSS styling in development and production builds
- **Variable Renaming**: Verify that CSS template literals receive actual color values
- **Content Script Isolation**: Test styling in various website contexts to ensure isolation

### Code Quality Enforcement
- **ALWAYS** use the `code-quality-enforcer` agent at the end of any content script development task
- When working with todo lists, add "Run code quality enforcement" as the **last** todo item
- This ensures all content script code passes formatting, linting, type checking, and testing
- Critical for content scripts since they inject into arbitrary websites and must be reliable
- **Progressive Matching Testing**: Ensure all new text matching features are comprehensively tested