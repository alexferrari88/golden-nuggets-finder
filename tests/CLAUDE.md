# Testing Strategy Documentation

This document covers the testing strategy, setup, and best practices for the Golden Nugget Finder extension.

## Testing Framework Overview

### Unit Testing
- **Framework**: Vitest
- **Environment**: happy-dom (test environment)
- **Focus**: Individual components and utilities
- **Coverage**: Excludes UI entry points but covers core logic
- **Locations**: Tests exist in both `src/` directories (component tests) and `tests/unit/` (integration unit tests)

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
- **Location**: Tests located in `src/` directories alongside source code

### Integration Testing
- **Framework**: Vitest with real HTTP calls
- **Focus**: Multi-provider integration, API response validation, schema compliance
- **Coverage**: Cross-component workflows and provider interoperability
- **Location**: Tests located in `tests/integration/` directory

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

### Affected Tests (SKIPPED)
- `golden-nuggets-api.spec.ts` - Contains a skipped test for full content analysis workflow due to content script injection limitations

### Working Test Files
- `extension-basics.spec.ts` - Extension loading, service worker, and page accessibility
- `popup.spec.ts` - Popup page functionality and rendering
- `options.spec.ts` - Options page functionality and rendering
- `highlighter-substack-tdd.spec.ts` - Substack page structure and content analysis
- `highlighter-tdd.spec.ts` - TDD tests for highlighter functionality
- `hackernews-analysis.spec.ts` - HackerNews discussion page analysis and content extraction
- `reddit-analysis.spec.ts` - Reddit discussion page analysis and content extraction  
- `golden-nuggets-api.spec.ts` - API integration tests (with one skipped test)
- `context-menu.spec.ts` - Context menu functionality and service worker integration
- `feedback-reset-flow.spec.ts` - Feedback reset workflow (contains skipped tests due to content script limitations)
- `multi-provider.spec.ts` - Multi-provider switching functionality and validation

### Alternative Testing Strategy
1. **Component Tests**: Extract and test core logic (extraction, UI components) without Chrome extension context
2. **Unit Tests**: Test background script logic and API integration with mocks
3. **Manual Testing**: Comprehensive checklist for workflows requiring user interaction
4. **Partial E2E**: Test extension setup, popup functionality, and background scripts

## Test Organization

### Running Tests by Category

To run tests by category:

```bash
# Run all unit tests (includes tests/unit/ and src/ component tests)
pnpm test

# Run only component tests in src/ directories
pnpm vitest run src/

# Run only integration unit tests
pnpm vitest run tests/unit/

# Run only integration tests with real API calls
pnpm vitest run tests/integration/

# Run only working E2E tests (without skipped content script tests)
pnpm playwright test tests/e2e/extension-basics.spec.ts tests/e2e/popup.spec.ts tests/e2e/options.spec.ts tests/e2e/context-menu.spec.ts tests/e2e/multi-provider.spec.ts

# Run all E2E tests (includes skipped ones - they'll show as skipped)
pnpm test:e2e
```

### Skipped Test Files

These test files contain `test.skip()` for some tests due to Playwright content script injection limitations:
- `tests/e2e/golden-nuggets-api.spec.ts` - Contains one skipped test for full content analysis workflow
- `tests/e2e/feedback-reset-flow.spec.ts` - Contains skipped tests for feedback reset workflow requiring content script injection

### Unit Test Directory (`tests/unit/`)

The `tests/unit/` directory contains integration-focused unit tests that test cross-component workflows:

**Provider Tests:**
- `anthropic-provider.test.ts` - Anthropic Claude provider integration with LangChain
- `gemini-direct-provider.test.ts` - Google Gemini direct API provider testing
- `openai-provider.test.ts` - OpenAI GPT provider integration with LangChain  
- `openrouter-provider.test.ts` - OpenRouter multi-model provider testing

**Integration Workflows:**
- `api-workflow-integration.test.ts` - End-to-end API workflow testing
- `message-flow-integration.test.ts` - Message passing between extension components
- `context-menu-integration.test.ts` - Context menu functionality integration
- `progress-tracking-integration.test.ts` - Progress tracking across components
- `storage-security-integration.test.ts` - Security integration with storage systems

**Background Services:**
- `background-context-menu.test.ts` - Background script context menu handling
- `background-security.test.ts` - Background script security features
- `backend-integration.test.ts` - Backend API integration testing

**Content and UI:**
- `content-extraction.test.ts` - Content extraction workflow testing
- `popup-error-handling.test.ts` - Popup error handling and display
- `sidebar-pagination.test.ts` - Sidebar pagination functionality

**Error Handling:**
- `error-handler.test.ts` - Comprehensive error handling service
- `feedback-reset.test.ts` - Feedback reset workflow testing

### Component Test Coverage (`src/` directories)

Component tests provide coverage for individual modules:
- `src/shared/schemas.test.ts` - Data validation schemas
- `src/shared/security.test.ts` - Security utilities and encryption
- `src/shared/storage.test.ts` - Storage utilities and management
- `src/shared/chrome-extension-utils.test.ts` - Chrome extension utility functions
- `src/shared/provider-validation-utils.test.ts` - Provider validation utilities
- `src/shared/content-reconstruction.test.ts` - Content reconstruction algorithms
- `src/background/gemini-client.test.ts` - Gemini API client functionality
- `src/background/message-handler.test.ts` - Message handling logic
- `src/background/error-handling.test.ts` - Error handling utilities
- `src/background/type-filter-service.test.ts` - Type filtering service
- `src/background/services/response-normalizer.test.ts` - Response normalization
- `src/background/services/model-service.test.ts` - Model configuration service
- `src/content/ui/notifications.test.ts` - Notification UI components
- `src/shared/storage/model-storage.test.ts` - Model-specific storage utilities

### Integration Test Directory (`tests/integration/`)

Integration tests that make real API calls to validate cross-provider functionality:
- `multi-provider-schema-validation.test.ts` - Validates that all AI providers return responses conforming to the golden nuggets schema

### Manual Test Directory (`tests/manual/`)

Documentation and guides for manual testing scenarios:
- `error-handling-demo.md` - Comprehensive guide for testing error handling, fallback mechanisms, and provider switching

## Test Commands

### Unit Tests
- `pnpm test` - Run unit tests with Vitest
- `pnpm test:ui` - Run tests with UI
- `pnpm test:run` - Run tests once without watch mode
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:coverage` - Run tests with coverage report

### E2E Tests
- `pnpm test:e2e` - Run E2E tests with Playwright (builds extension first with `build:dev`)
- `pnpm test:e2e:ui` - Run E2E tests with UI (builds extension first)
- `pnpm test:e2e:debug` - Run E2E tests in debug mode (builds extension first)
- `pnpm test:e2e:headed` - Run E2E tests with browser UI (builds extension first)
- `pnpm test:e2e:report` - Show E2E test report

### Running Single Tests
- `pnpm vitest run src/path/to/file.test.ts` - Run specific unit test file
- `pnpm playwright test tests/e2e/specific-test.spec.ts` - Run specific E2E test

## Extension Loading for Testing

### E2E Extension Setup
- E2E tests load the extension from `./dist/chrome-mv3-dev` directory
- Playwright fixtures automatically configure Chrome with the extension loaded
- Extension must be built with `pnpm build:dev` before running E2E tests

### Test Environment Setup
1. Build extension for testing: `pnpm build:dev` (automatically done by E2E test commands)
2. Playwright fixtures automatically load extension from `dist/chrome-mv3-dev` in test browser
3. Tests interact with extension through browser APIs and extension messaging

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