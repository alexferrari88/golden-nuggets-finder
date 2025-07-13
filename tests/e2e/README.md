# E2E Testing Setup

This directory contains end-to-end tests for the Golden Nugget Finder Chrome extension, rebuilt from scratch using Playwright's official Chrome extension testing approach.

## Overview

The tests use a minimal, clean setup based on Playwright's official documentation for Chrome extension testing. This replaces the previous complex setup that had numerous issues with content script injection.

## Architecture

### Fixtures (`fixtures.ts`)
- Simple fixture setup following Playwright's official Chrome extension testing pattern
- Automatically loads the extension from `dist/chrome-mv3-dev`
- Provides `context` and `extensionId` fixtures for tests
- No complex workarounds or custom APIs

### Test Structure
- **`extension-basics.spec.ts`**: Core extension functionality (service worker, extension ID, page access)
- **`popup.spec.ts`**: Popup page functionality
- **`options.spec.ts`**: Options page functionality

## Running Tests

```bash
# Build and run all e2e tests
pnpm test:e2e

# Run specific test files
pnpm playwright test tests/e2e/extension-basics.spec.ts
pnpm playwright test tests/e2e/popup.spec.ts
pnpm playwright test tests/e2e/options.spec.ts

# Run with UI
pnpm test:e2e:ui

# Run in debug mode
pnpm test:e2e:debug
```

## Prerequisites

1. Extension must be built: `pnpm build:dev` (automatically done by `pnpm test:e2e`)
2. Playwright browsers installed: `pnpm exec playwright install`

## What These Tests Cover

### ✅ Working Tests
- Extension loading and service worker initialization
- Extension ID generation and validation
- Extension page accessibility (popup.html, options.html)
- Basic page rendering and content verification

### ❌ Known Limitations
Based on Playwright's fundamental limitations with Chrome extension content script injection:
- Content script injection via `chrome.scripting.executeScript()` 
- Context menu interactions
- Full end-to-end content analysis workflows
- Dynamic content script functionality

## Testing Strategy

This new setup focuses on **what can be reliably tested**:

1. **Extension Infrastructure**: Service worker, extension pages, basic functionality
2. **UI Components**: Popup and options page rendering
3. **Extension APIs**: Background script functionality

For content script testing, we use:
- **Unit tests** for content extraction logic (`src/content/**/*.test.ts`)
- **Component tests** for UI highlighting and sidebar functionality
- **Manual testing** for full user workflows

## Comparison to Previous Setup

### Before (Broken)
- Complex fixture system with custom Chrome API mocking
- Multiple failing tests due to content script injection issues
- Overcomplicated setup with numerous workarounds
- Tests frequently timing out or failing intermittently

### After (Working)
- Simple, clean fixtures following Playwright official docs
- All tests passing consistently
- Minimal configuration with clear scope
- Focus on what can actually be tested reliably

## Adding New Tests

When adding new tests:

1. **For extension infrastructure**: Add to `extension-basics.spec.ts`
2. **For popup functionality**: Add to `popup.spec.ts` 
3. **For options functionality**: Add to `options.spec.ts`
4. **For content scripts**: Create unit tests in `src/content/` instead

Follow the existing patterns:
```typescript
import { test, expect } from './fixtures';

test.describe('Feature Name', () => {
  test('specific behavior', async ({ context, extensionId }) => {
    // Test implementation
  });
});
```

## Debugging

Use Playwright's excellent debugging tools:
```bash
# Run tests with browser UI
pnpm playwright test --headed

# Debug specific test
pnpm playwright test --debug tests/e2e/extension-basics.spec.ts

# Generate and view test report
pnpm playwright show-report
```