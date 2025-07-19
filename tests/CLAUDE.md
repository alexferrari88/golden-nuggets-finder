# Testing Strategy Documentation

This document covers the testing strategy, setup, and best practices for the Golden Nugget Finder extension.

## Testing Framework Overview

### Unit Testing
- **Framework**: Vitest
- **Environment**: happy-dom (test environment)
- **Focus**: Individual components and utilities
- **Coverage**: Excludes UI entry points but covers core logic

### End-to-End Testing
- **Framework**: Playwright
- **Focus**: Extension infrastructure, popup, options page, and basic functionality
- **Environment**: Chrome browser with extension loaded via official Playwright extension testing
- **Coverage**: Extension loading, service worker, extension pages, basic UI smoke tests
- **Architecture**: Simple fixtures following Playwright's official Chrome extension documentation

### Component Testing
- **Framework**: Vitest
- **Focus**: Content extraction logic, UI components, and algorithms
- **Coverage**: Business logic without Chrome extension context
- **Benefits**: Fast, reliable, and comprehensive coverage of core functionality

### Manual Testing
- **Focus**: Full user workflows requiring content script injection
- **Coverage**: Complete analysis workflows, highlighting, sidebar display
- **Documentation**: Comprehensive checklist in `tests/manual-testing-checklist.md`

## Playwright Limitations with Chrome Extensions

### Known Issue
Playwright has a fundamental limitation with Chrome Extension Manifest V3 content script injection due to permission simulation issues. See: https://github.com/microsoft/playwright/issues/18854

### Impact
Tests requiring `chrome.scripting.executeScript()` fail with:
```
Cannot access contents of the page. Extension manifest must request permission to access the respective host.
```

### Affected Test Files (SKIPPED)
- `content-analysis.spec.ts` - Full analysis workflows
- `results-display.spec.ts` - Sidebar and highlighting tests  
- `twitter-extraction.spec.ts` - Twitter content analysis
- `error-handling.spec.ts` - End-to-end error scenarios

### Working Test Files
- `extension-basics.spec.ts` - Extension loading, service worker, and page accessibility
- `popup.spec.ts` - Popup page functionality and rendering
- `options.spec.ts` - Options page functionality and rendering
- `substack-highlighting.spec.ts` - Substack page structure and content analysis
- `hackernews-analysis.spec.ts` - HackerNews discussion page analysis and content extraction
- `reddit-analysis.spec.ts` - Reddit discussion page analysis and content extraction

### Alternative Testing Strategy
1. **Component Tests**: Extract and test core logic (extraction, UI components) without Chrome extension context
2. **Unit Tests**: Test background script logic and API integration with mocks
3. **Manual Testing**: Comprehensive checklist for workflows requiring user interaction
4. **Partial E2E**: Test extension setup, popup functionality, and background scripts

## Test Organization

### Running Tests Without Failures

To run only working tests (avoiding skipped content script tests):

```bash
# Run all unit tests (component and utilities) 
pnpm test

# Run only working E2E tests
pnpm playwright test tests/e2e/setup.spec.ts tests/e2e/basic-extension-test.spec.ts

# Run all E2E tests (includes skipped ones - they'll show as skipped)
pnpm test:e2e
```

### Skipped Test Files

These files contain `test.skip()` and won't run:
- `tests/e2e/content-analysis.spec.ts`
- `tests/e2e/results-display.spec.ts`
- `tests/e2e/twitter-extraction.spec.ts`
- `tests/e2e/error-handling.spec.ts`

### Component Test Coverage

Existing component tests provide coverage for core logic:
- `src/content/extractors/*.test.ts` - Content extraction algorithms
- `src/content/ui/highlighter.test.ts` - Highlighting logic
- `src/content/ui/notifications.test.ts` - Notification UI components

## Test Commands

### Unit Tests
- `pnpm test` - Run unit tests with Vitest
- `pnpm test:ui` - Run tests with UI
- `pnpm test:run` - Run tests once without watch mode
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:coverage` - Run tests with coverage report

### E2E Tests
- `pnpm test:e2e` - Run E2E tests with Playwright
- `pnpm test:e2e:ui` - Run E2E tests with UI
- `pnpm test:e2e:debug` - Run E2E tests in debug mode
- `pnpm test:e2e:headed` - Run E2E tests with browser UI
- `pnpm test:e2e:report` - Show E2E test report

### Running Single Tests
- `pnpm vitest run src/path/to/file.test.ts` - Run specific unit test file
- `pnpm playwright test tests/e2e/specific-test.spec.ts` - Run specific E2E test

## Extension Loading for Testing

### E2E Extension Setup
- E2E tests load the extension from `./build/chrome-mv3-dev` directory
- Playwright config automatically configures Chrome with the extension loaded
- Extension must be built before running E2E tests

### Test Environment Setup
1. Build extension for testing: `pnpm build`
2. Playwright automatically loads extension in test browser
3. Tests interact with extension through browser APIs

## Test Fixtures and Mocks

### Fixtures Directory (`fixtures/`)
- **Purpose**: Use `tests/fixtures/` for test data and mocks
- **Content**: Sample HTML pages, API responses, test data
- **Organization**: Organize by test type and component

### Mock Strategy
- Mock external APIs (Google Gemini) for predictable testing
- Use real DOM elements for content extraction testing
- Mock Chrome extension APIs for unit tests

## Testing Best Practices

### Unit Testing Guidelines
- Test individual functions and components in isolation
- Use descriptive test names that explain the behavior
- Group related tests using `describe` blocks
- Test both success and error scenarios

### E2E Testing Guidelines
- Test complete user workflows from start to finish
- Use page object model for better test organization
- Test across different website types (Reddit, HN, generic)
- Verify UI interactions and visual feedback

### Test Data Management
- Use fixtures for consistent test data
- Keep test data minimal but representative
- Version test data with code changes
- Document test data requirements

## Coverage Strategy

### What to Test
- Core business logic and algorithms
- Data transformation and validation
- API integration and error handling
- User interaction workflows

### What to Exclude
- UI entry points and boilerplate code
- Third-party library wrappers
- Simple getter/setter functions
- Configuration files

## Testing Different Components

### Content Script Testing
- Test content extraction from different website types
- Verify DOM manipulation and highlighting
- Test UI component rendering and interactions
- Mock Chrome extension messaging

### Background Script Testing
- Test API integration with mocked responses
- Verify message passing between scripts
- Test context menu functionality
- Test service worker lifecycle events

### Shared Utilities Testing
- Test utility functions with various inputs
- Verify type safety and validation
- Test error handling and edge cases
- Test performance under load

## Performance Testing

### Performance Metrics
- Measure content extraction time
- Monitor memory usage during tests
- Track API response times
- Verify UI responsiveness

### Performance Thresholds
- Set acceptable performance baselines
- Monitor performance regression in CI
- Profile tests for bottlenecks
- Optimize slow test scenarios

## Development Workflow

### Test-Driven Development
1. Write failing tests for new features
2. Implement minimal code to pass tests
3. Refactor while maintaining test coverage
4. Ensure all tests pass before committing

### Continuous Integration
- Run all tests on every commit
- Fail builds on test failures
- Monitor test coverage trends
- Report test results and coverage

## Debugging Tests

### Unit Test Debugging
- Use Vitest's debugging capabilities
- Add console logs for troubleshooting
- Use breakpoints in test files
- Inspect test state and variables

### E2E Test Debugging
- Use Playwright's debugging tools
- Take screenshots on test failures
- Record test execution videos
- Inspect browser console logs

## Adding New Tests

### For New Features
1. Create unit tests for core logic
2. Add E2E tests for user workflows
3. Update test fixtures as needed
4. Document test requirements

### For Bug Fixes
1. Write tests that reproduce the bug
2. Verify tests fail before fix
3. Implement fix and verify tests pass
4. Add regression tests for edge cases

## Test Maintenance

### Regular Maintenance Tasks
- Update test dependencies regularly
- Review and update test fixtures
- Remove obsolete tests
- Optimize slow-running tests

### Test Reliability
- Avoid flaky tests with proper waits
- Use deterministic test data
- Handle timing issues appropriately
- Monitor test failure patterns