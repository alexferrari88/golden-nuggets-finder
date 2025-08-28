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
- Content extraction from webpages using the `threads-harvester` library
- DOM manipulation for highlighting and UI rendering with design system integration
- Analysis workflow and performance monitoring with real-time progress updates
- Communication with background scripts via message passing
- Multi-provider analysis support with provider metadata display
- Ensemble mode UI integration with confidence scoring and consensus visualization

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
Orchestrates all UI interactions and coordinates between components:
- Manages lifecycle of UI components
- Handles state synchronization
- Coordinates highlighting and sidebar display

### Highlighter (`ui/highlighter.ts`)
Modern text highlighting using CSS Custom Highlight API with DOM fallback and enhanced text matching:
- **CSS Custom Highlight API**: Uses modern browser API for performance and native behavior
- **DOM Fallback**: Graceful degradation to DOM-based highlighting for older browsers
- **Enhanced Text Matching Integration**: Uses `EnhancedTextMatchingAdapter` for improved accuracy and reliability
- **Multi-Strategy Matching**: Combines exact matching, fuzzy matching, and content reconstruction for robust highlighting
- **Ultra-Subtle Styling**: Uses design system's minimal gray overlays for sophisticated highlighting
- **Minimal Visual Impact**: Small, unobtrusive indicators with hover states using design system colors
- **Performance Optimized**: CSS-based highlighting with intelligent caching avoids DOM manipulation overhead
- **Accessibility**: Maintains proper contrast while being visually minimal using neutral grays

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

### Two-Phase Extraction UI Integration

Content script UI components include comprehensive integration for two-phase extraction mode, which provides higher precision by using a two-step analysis process:

#### User Interface Integration

**Popup Toggle Switch**
- **Quick Toggle**: Prominent "✨ Two-Phase Mode (Higher Precision)" toggle in extension popup
- **Visual Feedback**: Toggle switch with accent color highlighting when enabled
- **Cost Indication**: Tooltip warns "Toggle two-phase extraction for higher precision results (higher cost)"
- **State Persistence**: Toggle state is remembered across popup sessions
- **Mode Selection**: Can be used alongside type filtering and analysis modes

#### Options Page Integration

**Comprehensive Settings Configuration**
The options page provides detailed two-phase extraction settings:

- **Master Enable Toggle**: Primary checkbox to enable/disable two-phase extraction
- **Confidence Threshold Slider**: Adjustable range from 0.5 to 0.95 (default: 0.85)
  - Controls when Phase 1 results are considered high-confidence enough to proceed to Phase 2
  - Lower values allow more nuggets through to Phase 2 (higher recall, higher cost)
  - Higher values require more confident Phase 1 results (lower recall, lower cost)
- **Phase 1 Temperature Slider**: Range from 0.0 to 1.0 (default: 0.7)
  - Controls creativity vs consistency in initial nugget discovery
  - Higher values encourage more diverse nugget detection
- **Advanced Configuration**: Additional settings stored but not exposed in UI:
  - Phase 2 Temperature (always 0.0 for maximum precision)
  - Maximum nuggets per type limits
  - Fuzzy matching tolerance settings

**Auto-Save Functionality**
- **Immediate Persistence**: Settings save automatically when changed
- **Visual Feedback**: Success/error indicators with checkmarks or warning icons
- **Setting Validation**: Invalid configurations are prevented with UI constraints

#### User Workflow Updates

**Analysis Process Changes**
When two-phase mode is enabled, the analysis workflow differs significantly:

1. **Phase 1 - High Recall Discovery**: 
   - Uses higher temperature (0.7) for creative nugget discovery
   - Focuses on finding all potential nuggets with confidence scores
   - Returns nuggets with `fullContent` and confidence metadata

2. **Confidence Filtering**: 
   - Nuggets below confidence threshold are filtered out
   - If insufficient high-confidence nuggets found, analysis may abort early

3. **Phase 2 - High Precision Boundary Detection**: 
   - Uses lower temperature (0.0) for precise text boundary identification
   - Converts `fullContent` to exact `startContent` and `endContent` boundaries
   - Applies fuzzy matching for improved text reconstruction

**User Experience Impact**
- **Longer Processing Time**: Two AI API calls instead of one
- **Higher API Costs**: Approximately 1.5-2x the cost of standard analysis
- **Improved Accuracy**: Better text boundary precision and reduced false positives
- **Quality Indicators**: Results include two-phase metadata for transparency

#### Progress Tracking

**Enhanced Progress Messages**
Two-phase extraction includes specialized progress notifications:

- **Phase 1 Start**: "🔍 Phase 1: Discovering potential nuggets..."
- **Confidence Filtering**: "🎯 Filtering nuggets by confidence threshold..."
- **Phase 2 Start**: "✨ Phase 2: Refining boundaries with high precision..."
- **Boundary Detection**: "📍 Locating exact text boundaries..."
- **Fuzzy Matching**: "🔗 Applying fuzzy matching for precise reconstruction..."

**Progress Phase Integration**
Two-phase extraction integrates with the existing three-phase popup progress system:
- **Setup Phase**: Content extraction and preparation
- **AI Thinking Phase**: Extended to show two-phase processing stages
- **Finalize Phase**: Results processing and display

#### Error Handling

**Confidence Threshold Failures**
When Phase 1 results don't meet confidence requirements:

- **Early Abort**: Analysis stops after Phase 1 if no nuggets meet confidence threshold
- **User Notification**: Clear error message: "Two-phase analysis found insufficient high-confidence nuggets. Try lowering the confidence threshold in settings or using standard analysis mode."
- **Fallback Suggestion**: UI suggests either adjusting settings or switching to standard mode
- **Settings Link**: Error message includes direct link to options page for threshold adjustment

**Phase 2 Boundary Detection Failures**
When Phase 2 cannot locate precise boundaries:

- **Fuzzy Fallback**: Automatic fallback to fuzzy matching algorithms
- **Partial Results**: Returns nuggets that could be precisely located
- **Quality Indicators**: Marks results that used fuzzy vs LLM boundary detection
- **Metadata Transparency**: Shows success rates for both phases in results

#### Analysis Options Integration

**Context Menu Integration**
- **Standard Menu**: "Analyze with Two-Phase Mode" appears when two-phase is enabled in settings
- **Quick Analysis**: Two-phase toggle in popup affects all triggered analyses
- **Selection Mode**: Two-phase works with both quick analysis and custom content selection

**Type Filter Compatibility**
- **Full Integration**: Two-phase mode works with all nugget type filters
- **Per-Type Limits**: Advanced settings allow maximum nugget limits per type
- **Quality Preservation**: Type filtering applied after both phases complete

#### Two-Phase Mode Visual Design

**Result Display Enhancements**
- **Precision Indicators**: Visual badges showing "High Precision" for two-phase results
- **Phase Metadata**: Small indicators showing which nuggets used fuzzy vs LLM boundary detection
- **Quality Scores**: Subtle confidence indicators based on Phase 1 confidence scores
- **Cost Awareness**: Clear visual indication that two-phase mode was used (higher cost)

**Settings UI Design**
- **Progressive Disclosure**: Basic toggle with expandable advanced settings
- **Real-time Preview**: Confidence threshold changes show immediate impact
- **Help Integration**: Contextual help text explaining each setting's impact
- **Visual Hierarchy**: Clear separation between basic and advanced configurations

#### Technical Integration Notes

**Content Script Modifications**
Two-phase extraction requires minimal content script changes:
- Analysis requests include `useTwoPhase: boolean` parameter
- Progress messages handled through existing notification system
- Results displayed through standard UI components with enhanced metadata

**Background Script Communication**
- Standard message passing with additional two-phase parameters
- `TwoPhaseExtractor` service handles complex orchestration
- Results normalized to standard format with additional metadata fields

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
1. **Automatic Detection**: ContentScraper automatically detects site types - no manual configuration needed
2. **Design System Integration**: Configure extraction with design-system-compliant checkbox styling
3. **Performance Monitoring**: Use `measureContentExtraction()` to monitor extraction performance
4. **Multi-Mode Support**: Supports both analysis mode and selection mode with checkboxes
5. **Site Types**: Test extraction across Reddit, Hacker News, and generic websites
6. **Content Reconstruction**: Extracted content is stored for golden nugget text reconstruction

### UI Component Guidelines
- **Design System Compliance**: Always use design system variables for styling
- **Provider Integration**: Display provider metadata and response times in UI
- **Real-time Updates**: Handle progress messages and provider switching notifications
- **Performance Optimization**: Keep components lightweight with efficient DOM operations
- **Error Handling**: Graceful degradation for provider failures and network issues
- **Memory Management**: Proper cleanup on page navigation and component destruction

### Code Quality Enforcement
- **ALWAYS** use the `code-quality-enforcer` agent at the end of any content script development task
- When working with todo lists, add "Run code quality enforcement" as the **last** todo item
- This ensures all content script code passes formatting, linting, type checking, and testing
- Critical for content scripts since they inject into arbitrary websites and must be reliable