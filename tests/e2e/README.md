# E2E Tests for Golden Nugget Finder Chrome Extension

This directory contains comprehensive End-to-End (E2E) tests for the Golden Nugget Finder Chrome extension using Playwright.

## Overview

The E2E tests cover all major user workflows:

1. **Extension Setup Workflow** - Installation, API key configuration, prompt management
2. **Content Analysis Workflow** - Testing on Reddit, Hacker News, and generic pages
3. **Results Display Workflow** - Highlighting, synthesis popups, sidebar functionality
4. **Error Handling Workflow** - Invalid API keys, network errors, content extraction failures

## Prerequisites

1. **Build the extension**: The tests require the extension to be built first
   ```bash
   npm run build
   ```

2. **Install Playwright browsers** (if not already installed):
   ```bash
   npx playwright install
   ```

## Running Tests

### All E2E Tests
```bash
npm run test:e2e
```

### Interactive Mode (UI)
```bash
npm run test:e2e:ui
```

### Debug Mode
```bash
npm run test:e2e:debug
```

### Headed Mode (See browser)
```bash
npm run test:e2e:headed
```

### View Test Report
```bash
npm run test:e2e:report
```

### Run Specific Test File
```bash
npx playwright test tests/e2e/setup.spec.ts
```

### Run Specific Test
```bash
npx playwright test -g "should configure API key"
```

## Test Structure

```
tests/e2e/
├── fixtures/
│   ├── extension-fixture.ts    # Extension loading and setup
│   ├── test-data.ts           # Test data constants
│   └── mock-pages.ts          # Mock page responses
├── setup.spec.ts              # Extension setup tests
├── content-analysis.spec.ts   # Content analysis tests
├── results-display.spec.ts    # Results display tests
├── error-handling.spec.ts     # Error handling tests
└── README.md                  # This file
```

## Test Configuration

The tests are configured in `playwright.config.ts` with the following key settings:

- **Browser**: Chromium with extension support
- **Extension Path**: `./build/chrome-mv3-dev`
- **Parallelism**: Enabled for faster execution
- **Retries**: 2 on CI, 0 locally
- **Screenshots**: On failure
- **Video**: On failure

## Test Data and Mocking

### Test Data
- Mock API keys and prompts are defined in `test-data.ts`
- Mock Reddit, Hacker News, and blog content for consistent testing
- Mock API responses for different scenarios

### Mocking Strategy
- **API Responses**: Mock Gemini API responses for consistent testing
- **Page Content**: Mock webpage content to avoid external dependencies
- **Network Errors**: Mock various error conditions (401, 429, 500, timeout)

## Test Fixtures

### Extension Fixture
The `extension-fixture.ts` provides:
- **context**: Browser context with extension loaded
- **extensionId**: The extension ID for URL construction
- **page**: Main page for testing
- **optionsPage**: Pre-loaded options page
- **popupPage**: Pre-loaded popup page

### Usage Example
```typescript
import { test, expect } from './fixtures/extension-fixture';

test('should do something', async ({ page, popupPage, extensionId }) => {
  // Test implementation
});
```

## Writing New Tests

### Basic Test Structure
```typescript
import { test, expect } from './fixtures/extension-fixture';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup common to all tests
  });

  test('should do something specific', async ({ page, popupPage }) => {
    // Test implementation
  });
});
```

### Setting Up Test Data
```typescript
test.beforeEach(async ({ page }) => {
  // Set up storage data
  await page.evaluate(([apiKey, prompts]) => {
    return new Promise((resolve) => {
      chrome.storage.sync.set({
        geminiApiKey: apiKey,
        userPrompts: prompts
      }, () => resolve(undefined));
    });
  }, [TEST_API_KEY, DEFAULT_PROMPTS]);
});
```

### Mocking API Responses
```typescript
test('should handle API response', async ({ page }) => {
  await page.route('**/generativelanguage.googleapis.com/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({ golden_nuggets: [] })
            }]
          }
        }]
      })
    });
  });
});
```

## Common Test Patterns

### Testing Extension Communication
```typescript
// Trigger analysis from popup
await popupPage.bringToFront();
await popupPage.locator('text=Find Tools').click();
await page.bringToFront();

// Wait for results
await expect(page.locator('[data-testid="golden-nugget-sidebar"]')).toBeVisible();
```

### Testing Storage Operations
```typescript
// Set storage data
await page.evaluate(() => {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ key: 'value' }, () => resolve(undefined));
  });
});

// Get storage data
const data = await page.evaluate(() => {
  return new Promise((resolve) => {
    chrome.storage.sync.get('key', (result) => resolve(result.key));
  });
});
```

### Testing Error Scenarios
```typescript
// Mock API error
await page.route('**/api/**', async (route) => {
  await route.fulfill({
    status: 401,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'Unauthorized' })
  });
});

// Verify error handling
await expect(page.locator('text=Error message')).toBeVisible();
```

## Debugging Tests

### Debug Mode
Run tests in debug mode to step through them:
```bash
npm run test:e2e:debug
```

### Console Logs
Add console logs to tests:
```typescript
test('debug test', async ({ page }) => {
  console.log('Starting test');
  await page.goto('https://example.com');
  console.log('Page loaded');
});
```

### Screenshots
Take screenshots during tests:
```typescript
await page.screenshot({ path: 'debug-screenshot.png' });
```

### Page Content
Inspect page content:
```typescript
const content = await page.content();
console.log('Page HTML:', content);
```

## Troubleshooting

### Common Issues

1. **Extension Not Loading**
   - Ensure the extension is built: `npm run build`
   - Check the extension path in `playwright.config.ts`

2. **Test Timeouts**
   - Increase timeout for specific operations
   - Use `page.waitForTimeout()` for async operations

3. **Element Not Found**
   - Use `data-testid` attributes for reliable element selection
   - Check if elements are in the correct context (popup vs main page)

4. **Storage Issues**
   - Clear storage before tests: `chrome.storage.sync.clear()`
   - Use `page.evaluate()` for storage operations

### Best Practices

1. **Use Test IDs**: Add `data-testid` attributes to UI elements
2. **Mock External Dependencies**: Mock API calls and external content
3. **Clean State**: Clear storage and state between tests
4. **Descriptive Names**: Use clear, descriptive test names
5. **Async/Await**: Properly handle async operations
6. **Error Handling**: Test both success and failure scenarios

## CI/CD Integration

The tests are configured to run in CI environments:
- Retries are enabled (2 retries on CI)
- Parallel execution is disabled on CI for stability
- Screenshots and videos are captured on failure

### GitHub Actions Example
```yaml
- name: Run E2E tests
  run: |
    npm run build
    npm run test:e2e
```

## Performance

- Tests run in parallel by default for faster execution
- Use `fullyParallel: true` in config for maximum speed
- Consider test isolation to avoid conflicts between parallel tests

## Maintenance

### Updating Tests
- Update test data when UI changes
- Modify mocks when API responses change
- Add new tests for new features

### Reviewing Test Results
- Check HTML report: `npm run test:e2e:report`
- Review screenshots and videos for failed tests
- Update tests based on application changes

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Chrome Extension Testing](https://playwright.dev/docs/chrome-extensions)
- [Test Best Practices](https://playwright.dev/docs/best-practices)