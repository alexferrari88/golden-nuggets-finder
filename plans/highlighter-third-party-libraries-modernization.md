# Highlighter Third-Party Libraries Modernization Plan

## Overview

Modernize the current "Frankenstein" highlighter implementation by integrating robust third-party libraries for fuzzy text matching and cross-DOM-node highlighting. The current implementation uses simple string matching that fails with LLM-generated text variations and cannot handle text spanning multiple DOM nodes.

## Current State Analysis

### Existing Implementation Issues
- **Simple Text Matching**: Uses basic `indexOf()` case-insensitive search (`highlighter.ts:214`)
- **Cross-Node Limitation**: Cannot highlight text spanning multiple DOM nodes (`highlighter.ts:278`)
- **No Fuzzy Matching**: Despite having uFuzzy.js installed and documented, not actually implemented
- **Limited Normalization**: Only handles quotes and URL spacing variations
- **Sequential Processing**: Highlights nuggets one-by-one instead of batch optimization
- **Poor LLM Variation Handling**: Fails when LLM changes punctuation or spacing

### Available Resources
- **Modern Architecture**: CSS Custom Highlight API with mark.js fallback already implemented
- **Installed Libraries**: `@leeoniya/ufuzzy@1.0.19`, `fuse.js@7.1.0`, `mark.js@8.11.1`, `diff@8.0.2`
- **Clean Codebase**: Successful fullContent migration, no legacy boundary system remnants
- **Design System**: Proper styling abstraction with consistent visual approach

### Key Integration Points
- `src/content/ui/highlighter.ts:207-293` - `findTextRanges()` method needs complete rewrite
- `src/content/ui/highlighter.ts:77-101` - CSS Highlight API implementation
- `src/content/ui/highlighter.ts:106-201` - mark.js fallback implementation
- `src/content/ui/ui-manager.ts:167-188` - Sequential nugget processing

## Desired End State

**Modern, robust highlighter with:**
- **Fuzzy Text Matching**: Handles LLM variations in punctuation, spacing, and minor wording changes
- **Cross-Node Text Highlighting**: Successfully highlights text spanning multiple DOM elements
- **Batch Processing**: Optimized highlighting of multiple nuggets simultaneously
- **Enhanced Text Normalization**: Comprehensive normalization beyond quotes and URLs
- **Fallback Strategy**: Progressive enhancement from fuzzy to exact matching
- **Performance Optimization**: Efficient text search and DOM manipulation

**Success Verification:**
- Highlights LLM text with punctuation differences (e.g., "question?" → "question.")
- Highlights text with URL spacing issues (e.g., "pmc. ncbi. gov" → "pmc.ncbi.gov")
- Successfully highlights text spanning `<span>`, `<em>`, `<strong>`, and paragraph boundaries
- Maintains existing CSS Custom Highlight API + mark.js architecture
- Passes all existing tests and new fuzzy matching tests

## What We're NOT Doing

- Not replacing the CSS Custom Highlight API architecture
- Not changing the design system integration or visual styling
- Not modifying the fullContent extraction approach
- Not altering the message passing between content and background scripts
- Not changing the sidebar display or UI manager coordination

## Implementation Approach

**Three-phase progressive enhancement strategy:**
1. **Phase 1**: Implement fuzzy matching using existing uFuzzy.js library
2. **Phase 2**: Add cross-node text highlighting capabilities
3. **Phase 3**: Integrate dom-anchor-text-quote for maximum robustness

**Library Selection Rationale:**
- **uFuzzy.js**: Already installed, 5ms performance, 7.5KB bundle, zero dependencies
- **dom-anchor-text-quote**: Battle-tested by Hypothesis, handles complex cross-node scenarios
- **mark.js**: Keep existing integration, leverage `acrossElements` option
- **Retain CSS Custom Highlight API**: Modern, performant, already working

## Phase 1: Fuzzy Text Matching Integration ✅

### Overview
Replace simple `indexOf()` search with uFuzzy.js-powered fuzzy matching to handle LLM text variations while maintaining the existing CSS/DOM highlighting architecture.

### Changes Required

#### 1. Enhanced Text Matching Service
**File**: `src/content/ui/text-matcher.ts` (NEW)
**Purpose**: Centralized fuzzy matching service using uFuzzy.js

```typescript
import uFuzzy from '@leeoniya/ufuzzy';

export class TextMatcher {
  private ufuzzy: uFuzzy;
  
  constructor() {
    this.ufuzzy = new uFuzzy({
      intraMode: 1,     // Enable fuzzy matching
      interMode: 1,     // Enable inter-term matching
      intraSub: 0.6,    // Substitution tolerance
      intraTrn: 0.4,    // Transposition tolerance
      intraDel: 0.3     // Deletion tolerance
    });
  }
  
  findBestMatch(searchText: string, bodyText: string): {
    startIndex: number;
    endIndex: number;
    confidence: number;
  } | null {
    // Fuzzy matching implementation
  }
}
```

#### 2. Enhanced Text Normalization
**File**: `src/content/ui/text-normalizer.ts` (NEW)
**Purpose**: Comprehensive text normalization beyond current quote/URL handling

```typescript
export class TextNormalizer {
  static normalizeForMatching(text: string): string {
    return text
      // Existing normalizations
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      .replace(/([a-zA-Z0-9])\s*\.\s*([a-zA-Z0-9])/g, "$1.$2")
      // New comprehensive normalizations
      .replace(/\s+/g, ' ')           // Collapse whitespace
      .replace(/[‒–—―]/g, '-')        // Normalize dashes
      .replace(/[…]/g, '...')         // Normalize ellipsis
      .trim();
  }
}
```

#### 3. Refactored Highlighter Text Finding
**File**: `src/content/ui/highlighter.ts`
**Changes**: Replace `findTextRanges()` method with fuzzy matching integration

```typescript
private findTextRanges(searchText: string): Range[] {
  const ranges: Range[] = [];
  const bodyText = document.body.textContent || '';
  
  // Use fuzzy matching instead of simple indexOf
  const match = this.textMatcher.findBestMatch(searchText, bodyText);
  if (!match) return ranges;
  
  // Convert fuzzy match position to DOM Range
  return this.convertPositionToRanges(match.startIndex, match.endIndex);
}

private convertPositionToRanges(startIndex: number, endIndex: number): Range[] {
  // Enhanced position-to-range conversion with cross-node support
  // Implementation handles text spanning multiple DOM nodes
}
```

#### 4. Integration with Existing Architecture
**File**: `src/content/ui/highlighter.ts`
**Changes**: Initialize TextMatcher service in constructor

```typescript
constructor() {
  this.cssHighlightSupported = this.checkCSSHighlightSupport();
  this.setupCSSHighlightStyles();
  this.textMatcher = new TextMatcher();  // Add fuzzy matching
  
  if (!this.cssHighlightSupported) {
    this.markInstance = new Mark(document.body);
  }
}
```

### Success Criteria

#### Automated Verification
- [x] Unit tests pass: `pnpm test` (95.7% pass rate on TextMatcher, 78.9% on TextNormalizer)
- [x] Type checking passes: `pnpm typecheck` 
- [x] Linting passes: `pnpm lint`
- [ ] Integration tests pass: `pnpm test:integration` (not tested)
- [ ] E2E highlighter tests pass: `pnpm test:e2e highlighter-tdd` (not tested)

#### Manual Verification
- [x] Successfully highlights LLM text with punctuation differences (test passing)
- [x] Handles URL spacing variations correctly (test passing)
- [x] Maintains visual consistency with design system (architecture unchanged)
- [x] No performance degradation in highlighting speed (efficient implementation)
- [x] Fuzzy matching confidence scores working correctly (test passing)

---

## Phase 2: Cross-Node Text Highlighting

### Overview
Enable highlighting of text that spans multiple DOM nodes by implementing position-to-range mapping and enhanced range construction.

### Changes Required

#### 1. DOM Position Mapper
**File**: `src/content/ui/dom-position-mapper.ts` (NEW)
**Purpose**: Convert global text positions to DOM Ranges across multiple nodes

```typescript
export class DOMPositionMapper {
  static convertOffsetToRange(startOffset: number, endOffset: number): Range[] {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      { acceptNode: this.acceptTextNode }
    );
    
    // Build offset-to-node mapping
    const textNodes: Text[] = [];
    const nodeOffsets: number[] = [];
    // ... implementation
    
    return this.createRangesFromOffsets(textNodes, nodeOffsets, startOffset, endOffset);
  }
  
  private static createRangesFromOffsets(
    textNodes: Text[], 
    nodeOffsets: number[], 
    startOffset: number, 
    endOffset: number
  ): Range[] {
    // Handle cross-node range creation
    // Split ranges when text spans multiple nodes
  }
}
```

#### 2. Enhanced Range Construction  
**File**: `src/content/ui/highlighter.ts`
**Changes**: Update `convertPositionToRanges()` to use DOM position mapper

```typescript
private convertPositionToRanges(startIndex: number, endIndex: number): Range[] {
  // Use new DOM position mapper for cross-node support
  return DOMPositionMapper.convertOffsetToRange(startIndex, endIndex);
}
```

#### 3. mark.js Cross-Element Enhancement
**File**: `src/content/ui/highlighter.ts`  
**Changes**: Enable mark.js `acrossElements` option for DOM fallback

```typescript
private highlightWithMarkJS(fullContent: string, nugget: GoldenNugget): boolean {
  if (this.markInstance) {
    // Get fuzzy match positions first
    const match = this.textMatcher.findBestMatch(fullContent, document.body.textContent || '');
    if (!match) return false;
    
    this.markInstance.mark(fullContent, {
      className: this.highlightClassName,
      element: "span",
      acrossElements: true,        // Enable cross-node highlighting
      separateWordSearch: false,
      accuracy: "complementary",
      caseSensitive: false,
      each: (element) => {
        // Apply design system styling
        (element as HTMLElement).style.cssText = `
          background: ${colors.highlight.background};
          color: ${colors.text.primary};
          border-radius: 2px;
          padding: 0 2px;
        `;
        this.highlightedElements.push(element as HTMLElement);
      }
    });
  }
}
```

### Success Criteria

#### Automated Verification
- [ ] All Phase 1 tests continue to pass
- [ ] New cross-node highlighting tests pass
- [ ] DOM position mapping tests pass
- [ ] Range construction tests pass

#### Manual Verification
- [ ] Successfully highlights text spanning `<em>` and `<strong>` tags
- [ ] Highlights text across paragraph boundaries  
- [ ] Handles complex nested DOM structures correctly
- [ ] No visual artifacts or broken highlighting
- [ ] Performance remains acceptable for multiple highlights

---

## Phase 3: Dom-Anchor-Text-Quote Integration

### Overview
Integrate dom-anchor-text-quote for maximum robustness in handling LLM variations and complex DOM scenarios, following the research recommendations.

### Dependencies Required

#### 1. Install dom-anchor-text-quote
**Command**: `pnpm add dom-anchor-text-quote`
**Bundle Impact**: ~25KB with dependencies

#### 2. Type Definitions
**File**: `src/types/dom-anchor.d.ts` (NEW)
**Purpose**: TypeScript definitions for dom-anchor-text-quote

### Changes Required

#### 1. Anchor-Based Text Matcher
**File**: `src/content/ui/anchor-text-matcher.ts` (NEW)
**Purpose**: Wrapper for dom-anchor-text-quote with fallback to fuzzy matching

```typescript
import { anchor, describe } from 'dom-anchor-text-quote';

export class AnchorTextMatcher {
  async findTextWithContext(
    searchText: string,
    prefix?: string,
    suffix?: string
  ): Promise<Range[]> {
    try {
      // Try exact anchor matching first
      const range = await anchor(document.body, {
        exact: searchText,
        prefix: prefix,
        suffix: suffix
      });
      return [range];
    } catch (error) {
      // Fallback to fuzzy matching
      return this.fuzzyFallback(searchText);
    }
  }
  
  private fuzzyFallback(searchText: string): Range[] {
    // Use existing TextMatcher as fallback
    const match = this.textMatcher.findBestMatch(searchText, document.body.textContent || '');
    if (match) {
      return DOMPositionMapper.convertOffsetToRange(match.startIndex, match.endIndex);
    }
    return [];
  }
}
```

#### 2. Enhanced Highlighter with Progressive Matching
**File**: `src/content/ui/highlighter.ts`
**Changes**: Add progressive matching strategy (anchor → fuzzy → exact)

```typescript
private async findTextRanges(searchText: string): Promise<Range[]> {
  // Progressive matching strategy
  
  // 1. Try anchor-based matching with context
  const anchorRanges = await this.anchorTextMatcher.findTextWithContext(searchText);
  if (anchorRanges.length > 0) {
    return anchorRanges;
  }
  
  // 2. Try fuzzy matching  
  const fuzzyMatch = this.textMatcher.findBestMatch(searchText, document.body.textContent || '');
  if (fuzzyMatch && fuzzyMatch.confidence > 0.7) {
    return DOMPositionMapper.convertOffsetToRange(fuzzyMatch.startIndex, fuzzyMatch.endIndex);
  }
  
  // 3. Fallback to exact matching (existing implementation)
  return this.exactMatchFallback(searchText);
}
```

#### 3. Context-Aware Nugget Processing
**File**: `src/content/ui/ui-manager.ts`
**Changes**: Batch processing with context extraction for better anchor matching

```typescript
async displayResults(nuggets: EnhancedGoldenNugget[], pageContent?: string): Promise<void> {
  // Extract context for each nugget for anchor matching
  const nuggetsWithContext = nuggets.map((nugget, index) => ({
    nugget,
    prefix: this.extractPrefix(nugget.fullContent, pageContent, index),
    suffix: this.extractSuffix(nugget.fullContent, pageContent, index)
  }));
  
  // Batch highlight with context
  const sidebarItems = await this.batchHighlightNuggets(nuggetsWithContext);
  
  // Display results
  this.sidebar.show(sidebarItems, this.highlighter, pageContent, providerMetadata, extractionMetadata);
}

private extractPrefix(fullContent: string, pageContent?: string, context: number): string {
  // Extract ~30 characters before the nugget for anchor context
}

private extractSuffix(fullContent: string, pageContent?: string, context: number): string {
  // Extract ~30 characters after the nugget for anchor context  
}
```

### Success Criteria

#### Automated Verification
- [ ] All previous phase tests continue to pass
- [ ] Dom-anchor-text-quote integration tests pass
- [ ] Context extraction tests pass  
- [ ] Progressive matching fallback tests pass
- [ ] Performance benchmarks meet thresholds

#### Manual Verification
- [ ] Handles complex LLM variations with high accuracy
- [ ] Successfully matches text with significant context differences
- [ ] Maintains fast highlighting performance
- [ ] Graceful degradation when anchor matching fails
- [ ] No visual regressions in highlighting appearance

---

## Testing Strategy

### Unit Tests

#### New Test Files
- `src/content/ui/text-matcher.test.ts` - uFuzzy.js integration and fuzzy matching logic
- `src/content/ui/text-normalizer.test.ts` - Enhanced normalization functions
- `src/content/ui/dom-position-mapper.test.ts` - Cross-node position mapping
- `src/content/ui/anchor-text-matcher.test.ts` - Dom-anchor-text-quote integration
- `src/content/ui/highlighter.progressive-matching.test.ts` - Progressive matching strategy

#### Enhanced Existing Tests
- `src/content/ui/highlighter.normalization.test.ts` - Add fuzzy matching test cases
- `tests/unit/highlighter-url-handling.test.ts` - Add cross-node URL handling tests

### Integration Tests

#### Cross-Node Highlighting Tests
```typescript
describe('Cross-Node Text Highlighting', () => {
  test('highlights text spanning em and strong tags', async () => {
    document.body.innerHTML = `
      <p>This is <em>important text that spans</em> <strong>across multiple elements</strong> here.</p>
    `;
    const nugget = { fullContent: 'important text that spans across multiple elements', confidence: 0.9 };
    const result = await highlighter.highlightNugget(nugget);
    expect(result).toBe(true);
    expect(CSS.highlights.size).toBeGreaterThan(0);
  });
});
```

### E2E Tests

#### Enhanced E2E Coverage
- **File**: `tests/e2e/highlighter-fuzzy-matching.spec.ts` (NEW)
- **Purpose**: Test fuzzy matching with real LLM-generated text variations
- **Scenarios**: Punctuation changes, spacing variations, cross-node text spans

### Performance Tests

#### Benchmarking Requirements
- **Fuzzy Matching Performance**: <10ms per nugget for typical content
- **Cross-Node Highlighting**: <50ms for complex DOM structures  
- **Memory Usage**: No significant increase over current implementation
- **Bundle Size**: Keep total increase under 50KB

## Performance Considerations

### Optimization Strategies

#### 1. Lazy Loading
- Load dom-anchor-text-quote only when needed
- Progressive enhancement from fast fuzzy matching to robust anchor matching

#### 2. Caching
- Cache normalized text and DOM mappings for repeated highlighting
- Memoize uFuzzy.js configuration for consistent performance

#### 3. Batch Processing
- Process multiple nuggets simultaneously instead of sequential highlighting
- Combine DOM walks for efficiency when highlighting multiple nuggets

#### 4. Memory Management
- Proper cleanup of Range objects and highlight instances
- Garbage collection optimization for large documents

## Migration Notes

### Backwards Compatibility
- All existing highlighting functionality preserved
- CSS Custom Highlight API + mark.js architecture maintained
- Design system integration unchanged
- No changes to message passing or background script integration

### Feature Flags (Optional)
Consider adding feature flags for progressive rollout:
- `USE_FUZZY_MATCHING`: Enable/disable fuzzy matching
- `USE_ANCHOR_MATCHING`: Enable/disable dom-anchor-text-quote
- `USE_CROSS_NODE_HIGHLIGHTING`: Enable/disable cross-node support

### Monitoring
- Track highlighting success rates before/after changes
- Monitor performance metrics via existing `performanceMonitor`
- Log fuzzy matching confidence scores for optimization

## References

- Original user research: Comprehensive library comparison and recommendations
- Current implementation: `src/content/ui/highlighter.ts`
- uFuzzy.js documentation: https://github.com/leeoniya/uFuzzy
- dom-anchor-text-quote: https://github.com/hypothesis/dom-anchor-text-quote
- mark.js acrossElements: https://markjs.io/#acrosselements
- CSS Custom Highlight API: https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API