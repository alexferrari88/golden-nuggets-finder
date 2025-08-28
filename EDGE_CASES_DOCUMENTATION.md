# Edge Cases Documentation for Enhanced Text Matching

This document comprehensively lists all edge cases currently handled by the existing text matching system that must be preserved in the enhanced implementation.

## Critical Edge Cases to Preserve

### 1. LLM Hallucination Handling

#### Punctuation Hallucination (`sanitizeEndContent()`)
- **Issue**: LLMs add trailing punctuation that doesn't exist in original text
- **Examples**: 
  - LLM: `"information for testing."` → Page: `"information for testing"`
  - LLM: `"complex problems efficiently.  "` → Page: `"complex problems efficiently"`
- **Current Solution**: Remove trailing `[.,!;:?\\s]+$` patterns
- **Test Coverage**: `content-reconstruction.test.ts` lines 288-433

#### Filename Pattern Hallucination 
- **Issue**: LLMs add spaces between filename and extension
- **Examples**: 
  - LLM: `"Naur. pdf"` → Page: `"Naur.pdf"`
  - LLM: `"document. docx"` → Page: `"document.docx"`
- **Current Solution**: Regex pattern matching common file extensions with space removal
- **Test Coverage**: `content-reconstruction.test.ts` lines 347-432

### 2. Unicode Character Normalization

#### Smart Quote Handling (`normalizeQuotes()`)
- **Issue**: Different quote types prevent matching
- **Examples**: 
  - `"statistically"` (smart quotes) vs `"statistically"` (straight quotes)
  - `'` (curly apostrophe) vs `'` (straight apostrophe)  
- **Current Solution**: Convert all quote variants to standard ASCII
- **Test Coverage**: `highlighter.normalization.test.ts` lines 39-72

#### URL Spacing Issues (`normalizeUrlSpacing()`)
- **Issue**: Spaces around dots in URLs breaking matching
- **Examples**: 
  - LLM: `"pmc. ncbi. nlm. nih. gov"` → Page: `"pmc.ncbi.nlm.nih.gov"`
- **Current Solution**: Regex to remove spaces around dots in URL patterns
- **Test Coverage**: `highlighter.normalization.test.ts` lines 74-105

#### Advanced Unicode Normalization (`advancedNormalize()`)
- **Character variants handled**:
  - Apostrophes: `[''`´]` → `'`
  - Quotes: `[""«»]` → `"`  
  - Dashes: `[–—−]` → `-`
  - Ellipsis: `[…]` → `"..."`
  - Whitespace: `\\s+` → `" "`
- **Test Coverage**: `content-reconstruction.test.ts` lines 32-40

### 3. Case Sensitivity Handling

#### Case-Insensitive Matching
- **Issue**: LLM-generated text case differs from page content
- **Examples**: 
  - LLM: `"My distractibility"` → Page: `"my distractibility"`
  - LLM: `"THE QUICK"` → Page: `"the quick"`
- **Current Solution**: `toLowerCase()` normalization in all matching strategies
- **Test Coverage**: `highlighter.case-sensitivity.test.ts` entire file

#### Mixed Case Scenarios
- **Title case vs sentence case differences**
- **Acronym handling (CEO vs ceo)**  
- **Sentence-start capitalization differences**
- **Test Coverage**: Lines 82-138 in case-sensitivity tests

### 4. Text Matching Strategies (6 Different Approaches)

#### Strategy 1: Exact Match (Case-Insensitive)
- Direct `indexOf()` with `toLowerCase()`

#### Strategy 2: Normalized Punctuation Matching
- Uses `normalizeTextForMatching()` to remove trailing punctuation
- Only applied if different from original text

#### Strategy 3: End Content Normalized Only
- Normalizes only endContent while keeping startContent exact
- Handles cases where only endContent has punctuation issues

#### Strategy 4: Both DOM and Search Text Normalized
- Creates normalized versions of both DOM text and search text
- Double normalization for severe mismatches

#### Strategy 5: Quote Character Normalization
- Conservative fallback using `normalizeQuotes()`
- Only applied if quote normalization changes something

#### Strategy 6: URL Spacing Normalization
- Final fallback using `normalizeUrlSpacing()`
- Handles URL-specific formatting issues

### 5. Error Handling and Malformed Data

#### Null/Undefined Input Handling
- **Functions affected**: All content reconstruction functions
- **Current behavior**: Return safe fallback values (`""` or `"start...end"`)
- **Test Coverage**: Lines 12-286 in content-reconstruction tests

#### API Failure Scenarios
- **OpenRouter API failures** resulting in undefined data
- **Partial API responses** with missing fields
- **Malformed nugget data** with undefined properties
- **Test Coverage**: Lines 526-596 in content-reconstruction tests

#### Empty/Invalid Content Handling
- Empty strings, whitespace-only content
- Non-string input types (numbers, objects, arrays)
- Corrupted data structures
- **Current behavior**: Graceful degradation without throwing errors

### 6. DOM Manipulation Edge Cases

#### Cross-Node Text Spanning
- **Issue**: Text spans multiple DOM nodes (text nodes, elements)
- **Current Solution**: TreeWalker to build text node map with position tracking
- **Implementation**: `highlighter.ts` lines 327-591

#### Script/Style Element Exclusion  
- **Issue**: Should not match text inside `<script>`, `<style>`, `<noscript>`
- **Current Solution**: NodeFilter.FILTER_REJECT for these elements
- **Implementation**: `highlighter.ts` lines 342-347

#### Empty/Collapsed Range Handling
- **Issue**: Range with no content can't be highlighted
- **Current behavior**: Return `false` and log warning
- **Implementation**: Multiple checks in `highlightWithCSS()` and `highlightWithDOM()`

### 7. Highlighting System Edge Cases

#### Duplicate Prevention
- **Issue**: Same content highlighted multiple times with different cases
- **Current Solution**: Nugget key generation with case-insensitive matching
- **Test Coverage**: Lines 213-233 in case-sensitivity tests
- **Implementation**: `getNuggetKey()` and `isAlreadyHighlighted()`

#### CSS Highlight API vs DOM Fallback
- **Feature detection**: Check for `CSS.highlights` and `window.Highlight`
- **Graceful degradation**: Fall back to DOM manipulation when API unavailable
- **Memory management**: Proper cleanup of both CSS and DOM highlights

#### Scroll-to-Highlight Edge Cases
- **CSS highlights**: Create temporary elements for scrolling
- **DOM highlights**: Direct element.scrollIntoView()
- **Error recovery**: Cleanup temporary elements on failure

### 8. Performance and Memory Edge Cases

#### Large Document Handling
- **Issue**: Performance degradation with very large documents
- **Current approach**: Efficient text mapping and range creation
- **TreeWalker optimization**: Skip empty text nodes

#### Memory Cleanup
- **CSS highlights**: Proper cleanup with `globalHighlight.clear()`
- **DOM highlights**: Unwrap elements and preserve content
- **Range management**: Clone ranges to prevent reference issues

### 9. Content Reconstruction Edge Cases

#### Start/End Content Validation
- **Missing or empty start/end content** 
- **Invalid text reconstruction scenarios**
- **Length-based validation** for reconstruction quality
- **Fallback to truncated version** when reconstruction fails

#### Multiple Matching Strategies
- **Exact matching first**, then fallbacks
- **Partial word matching** with 80% threshold
- **Reconstruction vs direct matching** comparison
- **Strategy selection** based on content characteristics

### 10. Browser Compatibility Edge Cases

#### CSS Custom Highlight API Support
- **Chrome 105+, Firefox 113+, Safari 17.2+**
- **Feature detection** before usage
- **Polyfill considerations** for older browsers

#### DOM Manipulation Compatibility  
- **Cross-browser TreeWalker support**
- **Range API differences** across browsers
- **Text node handling** variations

## Testing Requirements for Enhanced System

### Unit Test Coverage Required
1. All existing test cases in `content-reconstruction.test.ts` (597 lines)
2. All existing test cases in `highlighter.case-sensitivity.test.ts` (264 lines) 
3. All existing test cases in `highlighter.normalization.test.ts` (127 lines)

### New Test Cases for Enhanced System
1. **Fuse.js Integration Tests**:
   - Threshold tolerance validation
   - Performance with large text collections  
   - Unicode handling in fuzzy matching

2. **Diff Algorithm Tests**:
   - Myers diff accuracy for LLM mismatches
   - Performance with long text comparisons
   - Edge cases with very similar text

3. **Mark.js Integration Tests**:
   - Cross-node highlighting accuracy
   - Performance with complex DOM structures
   - Cleanup and memory management

### E2E Test Preservation
- All existing E2E tests must pass without modification
- Highlighting accuracy tests
- Multi-provider compatibility
- Real-world site testing (Reddit, HackerNews)

## Migration Safety Requirements

### Backward Compatibility
- **API signatures**: No changes to public method signatures
- **Return values**: Same types and structures expected by callers
- **Error handling**: Same error types and fallback behaviors
- **Configuration**: Same configuration options and defaults

### Feature Flag Approach
- **Runtime switching**: Ability to toggle between old/new systems
- **A/B testing**: Gradual rollout capability
- **Rollback plan**: Instant fallback to current system if needed
- **Performance monitoring**: Compare old vs new system performance

### Validation Requirements
- **Zero test regressions**: All existing tests must pass
- **Performance parity**: New system must not be slower than current
- **Bundle size control**: <50KB increase maximum
- **Memory usage**: Monitor and optimize memory consumption

## Implementation Notes

### Priority Preservation Order
1. **Critical**: LLM hallucination handling (most user-facing issues)
2. **High**: Unicode normalization and case sensitivity  
3. **High**: Error handling and malformed data safety
4. **Medium**: Advanced matching strategies optimization
5. **Medium**: Performance and memory optimizations
6. **Low**: Browser compatibility edge cases

### Quality Assurance Checklist
- [ ] All documented edge cases have corresponding test coverage
- [ ] New system handles every edge case from documentation  
- [ ] Performance benchmarks show improvement or parity
- [ ] Bundle size increase is within acceptable limits (<50KB)
- [ ] All existing tests pass without modification
- [ ] E2E tests pass on all supported browsers
- [ ] Code quality enforcement passes (linting, typing, testing)

This documentation serves as the specification for the enhanced text matching system implementation.