# Implementation Plan - Gap Analysis

## Critical Issues Requiring Immediate Correction

### 1. Gemini Model Configuration
**Issue**: Wrong model specified
- **Spec requirement**: `gemini-2.0-flash-thinking-exp` with `thinkingBudget=-1`
- **Current plan**: `gemini-2.5-flash`
- **Impact**: Core functionality will fail

**Fix Required**:
```typescript
const geminiConfig = {
  model: "gemini-2.0-flash-thinking-exp", // CORRECTED
  config: {
    responseMimeType: "application/json",
    responseSchema: { /* ... */ },
    thinkingConfig: {
      thinkingBudget: -1 // Enable dynamic thinking
    }
  }
};
```

### 2. Prompt Construction Order
**Issue**: Missing critical performance optimization
- **Documentation**: "put your query / question at the end of the prompt"
- **Impact**: Suboptimal LLM performance

**Fix Required**:
```typescript
const prompt = `${extractedContent}\n\n${userSelectedPrompt}`;
```

### 3. Type System Implementation
**Issue**: Not using Google GenAI SDK properly
- **Documentation shows**: `import { Type } from "@google/genai"`
- **Plan shows**: Plain TypeScript interfaces

**Fix Required**: Update schema definition to use SDK

## Missing UI Components

### 1. Synthesis Popup
**Requirement**: Clicking tag/icon shows popup with synthesis
- Not detailed in current plan
- Needs z-index management, positioning logic

### 2. Progress Notification
**Requirement**: "Finding golden nuggets..." banner
- Missing implementation details
- Should be dismissible or auto-hide

### 3. Context Menu Sub-Menu
**Requirement**: Right-click → "Find Golden Nuggets" → [list of prompts]
- Current plan only mentions "context menu integration"

### 4. Options Page Star Icon
**Requirement**: ★ icon to set default prompt
- Visual indicator for current default

## Logical Inconsistencies

### 1. Storage Schema
**Issue**: Added non-spec field
- `LAST_ANALYSIS: 'lastAnalysisResults'` not in spec
- Chrome sync storage limit: 100KB total, 8KB per item
- Could cause quota issues

### 2. Highlighting Status Tracking
**Issue**: Dual-state system not addressed
- Some nuggets might not be found in DOM
- Sidebar must show status: "Highlighted" vs "Could not be located"

### 3. Error Handling
**Missing scenarios**:
- API key invalid
- Network timeout
- Rate limit exceeded
- Content too large for API
- Malformed API response

## Unstated Assumptions

### 1. Technical Assumptions
- **Plasmo capabilities**: Assumes handles all Manifest V3 complexity
- **Readability.js universality**: Won't work on all sites (SPAs, paywalls)
- **Text matching reliability**: Fuzzy matching might fail with transformed content
- **Storage limits**: No mention of 100KB sync limit

### 2. Performance Assumptions
- **Token limits**: No strategy for content exceeding Gemini limits
- **Memory usage**: Large DOM modifications could crash tabs
- **Concurrent requests**: Multiple tabs analyzing simultaneously

### 3. Security Assumptions
- **API key encryption**: How? Where's the key stored?
- **XSS prevention**: LLM responses could contain malicious content
- **CSP conflicts**: Injected styles/scripts might violate policies

## Missing Features

### 1. Dynamic Content Handling
- Infinite scroll sites
- AJAX-loaded content
- React/Vue/Angular SPAs

### 2. Internationalization
- Non-English content handling
- RTL language support
- Character encoding issues

### 3. Conflict Resolution
- Other extensions modifying DOM
- Ad blockers removing nuggets
- Site-specific CSS overrides

## Second-Order Effects

### 1. User Cost Awareness
- No indication of API costs per analysis
- Could lead to bill shock

### 2. Privacy Implications
- Sending page content to Google
- No user consent mechanism
- GDPR compliance?

### 3. Performance Degradation
- Each analysis adds DOM weight
- Memory leaks from event listeners
- Cumulative slowdown over time

## Systems-Level Gaps

### 1. State Management
- No clear Redux/Zustand pattern
- State sync between popup/content/background
- Persistence across sessions

### 2. Feedback Loops
- No way to improve prompts based on results
- No analytics on nugget usefulness
- No A/B testing framework

### 3. Graceful Degradation
- What if Gemini API is down?
- Fallback for unsupported sites?
- Offline mode considerations?

## Recommendations

### Immediate Actions
1. Correct Gemini model name and configuration
2. Add prompt ordering specification
3. Detail popup implementation for synthesis display
4. Add comprehensive error handling

### Architecture Updates
1. Add state management layer (Redux/Zustand)
2. Implement content chunking for large pages
3. Add telemetry for performance monitoring
4. Create abstraction for different content types

### Testing Additions
1. API mock server for development
2. Visual regression tests for highlighting
3. Performance benchmarks for large pages
4. Cross-browser compatibility tests

### Documentation Needs
1. User guide for writing effective prompts
2. Troubleshooting guide for common issues
3. API cost calculator/estimator
4. Privacy policy and data handling