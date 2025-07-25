# E2E Testing Documentation

End-to-end tests for the Golden Nugget Finder Chrome extension using Playwright's official Chrome extension testing approach.

## Test Files Overview

### Working Test Files
- **`extension-basics.spec.ts`** - Extension loading, service worker, and page accessibility
- **`popup.spec.ts`** - Popup page functionality and rendering
- **`options.spec.ts`** - Options page functionality and rendering
- **`golden-nuggets-api.spec.ts`** - API integration, background messaging, and schema validation
- **`hackernews-analysis.spec.ts`** - HackerNews page analysis and content extraction
- **`reddit-analysis.spec.ts`** - Reddit page analysis and content extraction
- **`highlighter-tdd.spec.ts`** - Highlighter functionality testing
- **`highlighter-substack-tdd.spec.ts`** - Substack-specific highlighter testing

## Running Tests

### Basic Commands
```bash
# Run all E2E tests
pnpm test:e2e

# Run specific test file
pnpm playwright test tests/e2e/extension-basics.spec.ts

# Run with UI
pnpm test:e2e:ui

# Debug mode
pnpm test:e2e:debug

# Run with browser UI
pnpm test:e2e:headed
```

### Prerequisites
1. Extension must be built: `pnpm build:dev` (automatically done by `pnpm test:e2e`)
2. Playwright browsers installed: `pnpm exec playwright install`

## Golden Nuggets API Testing

The `golden-nuggets-api.spec.ts` suite tests core extension functionality including API integration, background messaging, and schema validation.

### Environment Setup

**Mock API Mode (Default):**
```bash
pnpm playwright test tests/e2e/golden-nuggets-api.spec.ts
```

**Real API Mode:**
1. Create `.env` file: `cp .env.example .env`
2. Add your Gemini API key: `GEMINI_API_KEY=your_actual_api_key_here`
3. Run tests: `pnpm playwright test tests/e2e/golden-nuggets-api.spec.ts`

### API Test Coverage
- Extension loading with API key configuration
- Background service worker API request handling  
- Popup functionality with API key configured
- Golden nuggets response schema validation
- API error handling and graceful degradation
- Performance monitoring during API calls

### API Key Security
- `.env` file is git-ignored
- API keys stored securely using extension's encrypted storage
- Test API keys only used in test environment
- Never commit real API keys to repository

## Architecture & Fixtures

### Fixtures (`fixtures.ts`)
Simple fixture setup following Playwright's official Chrome extension testing pattern:
- Loads extension from `dist/chrome-mv3-dev`
- Provides `context` and `extensionId` fixtures
- Includes clean browser context for bot detection bypass
- Enhanced stealth capabilities for external site testing

### Extension Loading
- E2E tests automatically load extension in test browser
- Extension must be built before running tests
- Tests interact with extension through browser APIs

## Known Limitations

### Playwright & Chrome Extension Content Scripts
Playwright has fundamental limitations with Chrome Extension Manifest V3 content script injection due to permission simulation issues. See: https://github.com/microsoft/playwright/issues/18854

**Impact:** Tests requiring `chrome.scripting.executeScript()` may fail with permission errors.

**Alternative Testing Strategy:**
1. **Component Tests** - Extract core logic for unit testing
2. **Extension Page Tests** - Test popup/options functionality  
3. **Manual Testing** - Use comprehensive manual checklist for full workflows
4. **Site Analysis Tests** - Test content extraction from external sites

## Testing Strategy

### What These Tests Cover ✅
- Extension loading and service worker initialization
- Extension ID generation and validation
- Extension page accessibility (popup.html, options.html)
- API integration and background messaging
- External site content analysis (HackerNews, Reddit, Substack)
- Schema validation and error handling
- Performance monitoring

### What Requires Manual Testing ❌
- Full end-to-end content analysis workflows with dynamic injection
- Context menu interactions
- Complete user interaction flows
- Content script injection on arbitrary sites

### Complementary Testing
- **Unit Tests**: `src/content/**/*.test.ts` for extraction logic
- **Component Tests**: UI highlighting and sidebar functionality  
- **Manual Testing**: `tests/manual-testing-checklist.md` for complete workflows

## Adding New Tests

### Test Organization
- **Extension infrastructure**: Add to `extension-basics.spec.ts`
- **Popup functionality**: Add to `popup.spec.ts`
- **Options functionality**: Add to `options.spec.ts`
- **API integration**: Add to `golden-nuggets-api.spec.ts`
- **Site-specific analysis**: Create new `{site}-analysis.spec.ts`

### Test Pattern
```typescript
import { test, expect } from './fixtures';

test.describe('Feature Name', () => {
  test('specific behavior', async ({ context, extensionId }) => {
    // Test implementation
  });
});
```

## Debugging

### Debug Tools
```bash
# Run with browser UI
pnpm playwright test --headed

# Debug specific test
pnpm playwright test --debug tests/e2e/extension-basics.spec.ts

# Generate test report
pnpm playwright show-report
```

### Console Output
Golden nuggets tests include status indicators:
- ✅ `Running tests with real Gemini API`
- ⚠️ `Running tests with mock API (no real API key provided)`

## CI/CD Integration

Tests run reliably in CI environments:
- Uses mock API by default (no API key required)
- Runs in headless Chrome
- Provides clear pass/fail status
- Includes detailed error reporting and screenshots