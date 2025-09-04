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
- **Content Extraction**: Intelligent content extraction using the `threads-harvester` library with site-specific optimizations
- **DOM Manipulation**: Sophisticated highlighting and UI rendering with design system integration and progressive text matching
- **Multi-Provider Analysis**: Complete multi-provider workflow support with provider attribution and visual identification
- **Provider Attribution System**: Comprehensive provider badges, tooltips, and metadata display for individual nuggets
- **Ensemble Mode Integration**: Advanced ensemble UI with confidence scoring, consensus visualization, and run agreement statistics
- **Enhanced Notifications**: Multi-provider and ensemble-specific progress messages with real-time updates
- **Provider Metadata Display**: Sidebar header integration showing multi-provider analysis metadata
- **Background Communication**: Advanced message passing supporting multi-provider coordination and metadata preservation

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
Displays results in right sidebar with Notion-inspired design and multi-provider attribution:
- **Clean Layout**: Uses design system colors and spacing
- **Card-based Design**: Subtle shadows and borders for content hierarchy
- **Multi-Provider Attribution**: Provider badges with color-coded visual identification
- **Enhanced Metadata Display**: Provider information in sidebar header for multi-provider results
- **Provider Badge System**: Individual nugget cards display source provider and model information
- **Visual Provider Identification**: Color-coded provider badges with tooltip information
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

### Provider Attribution & Visual Identification System

The content script includes a comprehensive provider attribution system that visually identifies and attributes nuggets to their source providers:

#### Provider Color Coding System
Consistent color coding for visual provider identification across all UI components:
- **Google Gemini**: `#4285F4` (Google Blue) - Official Google brand color
- **OpenAI**: `#10A37F` (OpenAI Green) - OpenAI brand color
- **Anthropic Claude**: `#FF6B35` (Anthropic Orange) - Anthropic brand color
- **OpenRouter**: `#8B5CF6` (Purple) - Distinct purple for multi-model access

#### Provider Badge Implementation
Individual nugget cards display source provider information through styled badges:
```typescript
private getProviderColor(providerId: ProviderId): string {
  const providerColors = {
    gemini: "#4285F4",     // Google Blue
    openai: "#10A37F",     // OpenAI Green
    anthropic: "#FF6B35",  // Anthropic Orange
    openrouter: "#8B5CF6", // Purple
  };
  return providerColors[providerId] || colors.text.secondary;
}
```

#### Visual Design Features
- **Transparency Integration**: Provider colors use 15% background transparency (`${providerColor}15`)
- **Border Styling**: Subtle borders with 33% color opacity (`${providerColor}33`)
- **Typography Integration**: Uses design system font sizes and weights
- **Tooltip Enhancement**: Rich tooltips showing "Found by [Provider] ([Model])"
- **Design System Compliance**: All provider UI elements follow design system patterns

### Multi-Provider Ensemble UI Integration

Content script UI components include comprehensive multi-provider and ensemble mode features:

#### Enhanced Results Display with Provider Attribution
Multi-provider nugget cards with comprehensive attribution system:
- **Provider Badge System**: Color-coded badges showing source provider and model for each nugget
- **Visual Provider Identification**: Provider-specific color coding with design system integration:
  - **Google Gemini**: `#4285F4` (Google Blue) with transparency and border styling
  - **OpenAI**: `#10A37F` (OpenAI Green) with consistent visual treatment
  - **Anthropic Claude**: `#FF6B35` (Anthropic Orange) with subtle background
  - **OpenRouter**: `#8B5CF6` (Purple) with matching border and text colors
- **Provider Tooltip Information**: Detailed tooltips showing full model names and provider information
- **Source Attribution Display**: Each nugget card shows "Found by [Provider] ([Model])" in tooltip

#### Multi-Provider Sidebar Header Integration
Enhanced sidebar header with multi-provider metadata display:
- **Multi-Provider Detection**: Automatic detection and display when multiple providers are used
- **Provider Summary**: Single-line display showing "Multi-Provider Ensemble" for multi-provider analysis
- **Model Aggregation**: Aggregated model information from successful providers
- **Response Time Integration**: Combined response time metadata for multi-provider operations

#### Enhanced Notification System
Ensemble and multi-provider-specific progress notifications:
- **Ensemble Progress Messages**: Real-time updates during multi-run analysis with predefined messages:
  - `🎯 Starting ensemble extraction (${runs} runs)`
  - `🧮 Building consensus across ${runs} runs`
  - `✨ Processed ${consensus} consensus nuggets`
- **Run Counter**: Shows current run progress (e.g., "Run 2 of 3")
- **Cost Indication**: Clear display of multiplied API costs for ensemble mode
- **Consensus Building**: Progress messages during similarity matching and consensus building

#### Advanced Consensus Display System
Sophisticated consensus visualization for ensemble results:
- **Confidence Tier System**: Three-tier confidence classification (High/Medium/Low)
- **Visual Confidence Indicators**: Icon-based indicators with checkmarks and warning symbols
- **Run Agreement Statistics**: Display showing run agreement (e.g., "3/3 runs" or "2/3 runs")
- **Provider Attribution Tooltips**: Comprehensive tooltips showing all contributing providers and models
- **Consensus Badge Styling**: Styled badges with design system colors showing confidence tiers

#### Provider Badge Implementation
```typescript
// Multi-provider attribution badge system
const providerBadge = document.createElement("div");
const providerColor = this.getProviderColor(enhancedNugget.sourceProvider);
providerBadge.style.cssText = `
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 1px 6px;
  border-radius: 6px;
  font-size: ${typography.fontSize.xs};
  font-weight: ${typography.fontWeight.medium};
  background-color: ${providerColor}15;
  color: ${providerColor};
  border: 1px solid ${providerColor}33;
`;
```

#### Ensemble Consensus Display
```typescript
// Ensemble consensus badge with confidence tiers
const consensusBadge = document.createElement("div");
consensusBadge.textContent = `${confidenceTier.icon} ${confidenceTier.tier}`;
consensusBadge.title = generateProviderTooltip(providers);
consensusBadge.style.cssText = `
  background: ${confidenceTier.badgeColor};
  color: ${confidenceTier.textColor};
  padding: ${spacing.xs} ${spacing.sm};
  border-radius: ${borderRadius.sm};
  font-size: ${typography.fontSize.xs};
  font-weight: ${typography.fontWeight.medium};
  cursor: help;
  white-space: nowrap;
`;
```

#### Visual Design Integration
- **Design System Compliance**: All multi-provider UI elements use design system colors and typography
- **Provider Color Consistency**: Consistent color coding across all provider-related UI elements
- **Subtle Visual Hierarchy**: Provider information displayed without overwhelming main content
- **Enhanced Tooltips**: Rich tooltip information showing complete provider and model details
- **Consensus Visualization**: Clear visual indicators for ensemble agreement levels


#### Technical Integration Notes

**Multi-Provider Content Script Architecture**
Enhanced content script architecture supporting multi-provider analysis:
- **Enhanced Message Format**: Analysis requests include provider configuration and multi-provider parameters
- **Attribution Preservation**: UI components preserve and display `sourceProvider`, `sourceModel`, and `contributingProviders` metadata
- **Progress Message Enhancement**: Notification system handles multi-provider and ensemble-specific progress messages
- **Provider Metadata Integration**: Sidebar and nugget cards display comprehensive provider attribution information
- **Consensus Display**: Advanced consensus visualization for ensemble results with confidence tiers

**Enhanced Background Script Communication**
Advanced message passing for multi-provider coordination:
- **Provider Metadata Passing**: Complete provider metadata including response times and model information
- **Multi-Provider Detection**: Automatic detection and handling of multi-provider analysis results
- **Enhanced Result Format**: Results include complete attribution metadata for UI display
- **Consensus Metadata**: Ensemble results include run agreement statistics and confidence scoring

**UI State Management for Multi-Provider Results**
- **Enhanced Nugget Types**: `EnhancedGoldenNugget` interface with complete attribution metadata
- **Provider Color System**: Consistent color coding system for visual provider identification
- **Tooltip Generation**: Dynamic tooltip generation showing complete provider and model information
- **Consensus Visualization**: Advanced confidence tier system with visual indicators

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
- **Design System Compliance**: Always use design system variables for styling - never hardcode values
- **Multi-Provider Attribution**: Display provider badges with consistent color coding and attribution information
- **Provider Badge Integration**: Implement provider badges with transparency, borders, and tooltip information
- **Ensemble Consensus Display**: Show confidence tiers, run agreement statistics, and consensus metadata
- **Enhanced Tooltips**: Generate rich tooltips with complete provider and model information
- **Real-time Updates**: Handle multi-provider progress messages and ensemble-specific notifications
- **Provider Color Consistency**: Use the established provider color system across all UI components
- **Attribution Preservation**: Maintain `sourceProvider`, `sourceModel`, and `contributingProviders` metadata in UI state
- **Performance Optimization**: Keep components lightweight with efficient DOM operations
- **Error Handling**: Graceful degradation for provider failures and multi-provider analysis issues
- **Memory Management**: Proper cleanup of provider metadata and consensus display elements

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