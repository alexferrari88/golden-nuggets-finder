# Golden Nuggets E2E Test Suite

This document explains how to run and configure the golden nuggets e2e test suite.

## Overview

The golden nuggets e2e test suite tests the core functionality of the Golden Nugget Finder extension, including:

- Extension loading and configuration
- API key management and storage
- Background script messaging
- Popup functionality
- Schema validation
- Error handling
- Performance monitoring

## Running Tests

### Basic Test Run (Mock API)
```bash
# Run all golden nuggets e2e tests with mock API
pnpm playwright test tests/e2e/golden-nuggets-api.spec.ts
```

### With Real Gemini API Key

1. Create a `.env` file in the project root:
```bash
cp .env.example .env
```

2. Add your real Gemini API key to `.env`:
```env
GEMINI_API_KEY=your_actual_api_key_here
```

3. Run the tests:
```bash
pnpm playwright test tests/e2e/golden-nuggets-api.spec.ts
```

The test suite will automatically detect the real API key and run additional validation tests.

## Test Configuration

### Environment Variables

- `GEMINI_API_KEY`: Optional. If provided, enables real API testing mode.

### Test Files

- `golden-nuggets-api.spec.ts`: Main test suite
- `test-config.ts`: Configuration and environment variable handling
- `.env.example`: Template for environment variables

## Test Coverage

### ✅ Working Tests (7 tests)

1. **Extension loads with API key configured** - Verifies API key storage and retrieval
2. **Background service worker handles API requests** - Tests extension messaging system
3. **Popup displays correctly with API key configured** - Tests popup UI with valid config
4. **Golden nuggets response schema validation** - Tests JSON schema validation
5. **API error handling** - Tests graceful error handling
6. **Performance monitoring during API calls** - Tests performance measurement
7. **Test configuration is properly set up** - Validates test environment

### ⏭️ Skipped Tests (1 test)

1. **Full content analysis workflow** - Skipped due to Playwright limitations with content script injection

## Test Environment

### Prerequisites

- Extension must be built for development: `pnpm build --mode=development`
- Chrome/Chromium browser (handled automatically by Playwright)

### Test Data

Tests use mock data from `tests/fixtures/mock-data.ts` when no real API key is provided.

## Limitations

Due to Playwright's limitations with Chrome Extension Manifest V3 content script injection, the full end-to-end content analysis workflow cannot be automatically tested. This limitation is documented in detail in `tests/CLAUDE.md`.

For complete workflow testing, use the manual testing checklist at `tests/manual-testing-checklist.md`.

## Debugging

### Debug Mode
```bash
pnpm playwright test tests/e2e/golden-nuggets-api.spec.ts --debug
```

### HTML Report
```bash
pnpm test:e2e:report
```

### Console Logs

The test suite includes console output to show whether it's running with real API or mock mode:
- ✅ `Running tests with real Gemini API`
- ⚠️ `Running tests with mock API (no real API key provided)`

## API Key Security

- The `.env` file is automatically ignored by git (see `.gitignore`)
- API keys are stored securely using the extension's encrypted storage system
- Test API keys are only used within the test environment
- Never commit real API keys to the repository

## Adding New Tests

When adding new golden nuggets tests:

1. Follow the existing test patterns in `golden-nuggets-api.spec.ts`
2. Use extension pages (popup, options) for tests requiring `chrome.runtime` API
3. Avoid dynamic imports in service worker contexts
4. Test both success and error scenarios
5. Use descriptive test names and clear assertions

## Integration with CI/CD

The test suite is designed to work in CI environments:
- Runs with mock API by default (no API key required)
- Uses headless Chrome
- Provides clear pass/fail status
- Includes detailed error reporting and screenshots