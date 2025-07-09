# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Core Principles

- The single source of truth of this project is in the @specs/ folder. Always refer to it. The code must always be in accordance with the specs in the @specs/ folder.
- Use the library and the right versions as indicated in the specs.
- Whenever you have unsolvable doubts or questions, stop everything and ask me.
- Commit using conventional commit at the end of important work.

## Common Development Commands

### Development and Build
- `pnpm dev` - Start development server with hot reloading
- `pnpm dev:firefox` - Start development server for Firefox
- `pnpm build` - Build for production
- `pnpm build:firefox` - Build for Firefox
- `pnpm package` - Create extension zip package
- `pnpm postinstall` - Run WXT preparation (automatically runs after install)

### Testing
- `pnpm test` - Run unit tests with Vitest
- `pnpm test:ui` - Run tests with UI
- `pnpm test:run` - Run tests once without watch mode
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:coverage` - Run tests with coverage report
- `pnpm test:e2e` - Run E2E tests with Playwright
- `pnpm test:e2e:ui` - Run E2E tests with UI
- `pnpm test:e2e:debug` - Run E2E tests in debug mode
- `pnpm test:e2e:headed` - Run E2E tests with browser UI
- `pnpm test:e2e:report` - Show E2E test report

### Running Single Tests
- `pnpm vitest run src/path/to/file.test.ts` - Run specific unit test file
- `pnpm playwright test tests/e2e/specific-test.spec.ts` - Run specific E2E test

## High-Level Architecture

### Framework and Core Technologies
- **Framework**: WXT (Web Extension Toolkit) - migrated from Plasmo
- **Language**: TypeScript
- **UI Framework**: React (for popup and options pages)
- **API**: Google Gemini API (`gemini-2.5-flash`) with structured JSON output
- **Testing**: Vitest (unit), Playwright (E2E), happy-dom (test environment)
- **Build Output**: `dist/` directory

### Extension Architecture
The extension follows a standard Chrome extension architecture with three main components:

1. **Background Script** (`src/entrypoints/background.ts`):
   - Service worker that handles API calls to Google Gemini
   - Manages context menu creation and interactions
   - Uses dynamic content script injection to prevent auto-loading on all pages
   - Communicates with content scripts via message passing

2. **Content Scripts** (`src/entrypoints/content.ts`):
   - Injected dynamically only when needed (not on all pages)
   - Extracts content from webpages using specialized extractors
   - Handles DOM manipulation for highlighting and UI rendering
   - Manages analysis workflow and performance monitoring

3. **Extension Pages**:
   - **Popup** (`src/entrypoints/popup.tsx`): Quick access to prompt selection
   - **Options** (`src/entrypoints/options.tsx`): Configuration for API keys and prompt management

### Key Components and Data Flow

#### Content Extraction System
- **Base Extractor** (`src/content/extractors/base.ts`): Abstract interface
- **Specialized Extractors**:
  - `RedditExtractor`: Uses `[slot='text-body']` and `[slot='comment']` selectors
  - `HackerNewsExtractor`: Uses `.toptext` and `.comment` selectors
  - `GenericExtractor`: Uses Mozilla's Readability.js for article extraction

#### AI Integration
- **Gemini Client** (`src/background/gemini-client.ts`): Handles API communication
  - Uses REST API (not SDK due to WXT/Vite limitations)
  - Implements structured JSON output with schema validation
  - Features retry logic, caching, and error handling
  - Optimizes content size and uses thinking budget configuration

#### UI Management
- **UI Manager** (`src/content/ui/ui-manager.ts`): Orchestrates all UI interactions
- **Highlighter** (`src/content/ui/highlighter.ts`): Handles text highlighting on pages
- **Sidebar** (`src/content/ui/sidebar.ts`): Displays results in right sidebar
- **Notifications** (`src/content/ui/notifications.ts`): Shows progress and status banners

#### Storage and Configuration
- **Storage Manager** (`src/shared/storage.ts`): Handles Chrome storage with caching
- **Types** (`src/shared/types.ts`): TypeScript interfaces for all data structures
- **Constants** (`src/shared/constants.ts`): Configuration values and defaults

#### Performance Monitoring
- **Performance Monitor** (`src/shared/performance.ts`): Tracks timing and memory usage
- Measures content extraction, API calls, and DOM operations
- Provides insights for optimization

### Data Models and APIs

#### Golden Nugget Response Schema
The extension expects Gemini API responses in this exact format:
```json
{
  "golden_nuggets": [
    {
      "type": "tool|media|explanation|analogy|model",
      "content": "Original text verbatim",
      "synthesis": "Why this is relevant to the user persona"
    }
  ]
}
```

#### Storage Structure
- `geminiApiKey`: User's Google Gemini API key
- `userPrompts`: Array of saved prompt objects with names, content, and default status

#### Message Passing
Uses typed message system with `MESSAGE_TYPES` constants for communication between background and content scripts.

## Development Workflow

### Making Changes
1. Always check `@specs/spec.md` for requirements
2. Run tests after changes: `pnpm test && pnpm test:e2e`
3. Check build succeeds: `pnpm build`
4. Test in browser with `pnpm dev`

### Testing Strategy
- **Unit Tests**: Focus on individual components and utilities
- **E2E Tests**: Test complete user workflows with real extension loading
- **Coverage**: Excludes UI entry points but covers core logic
- **Fixtures**: Use `tests/fixtures/` for test data and mocks

### Extension Loading for Testing
E2E tests load the extension from `./build/chrome-mv3-dev` directory. The Playwright config automatically configures Chrome with the extension loaded.

## Important Notes

### API Configuration
- Google Gemini API uses `gemini-2.5-flash` model
- Thinking enabled with `thinkingBudget: -1` (dynamic)
- Structured output enforced via `responseSchema`
- Content optimization limits requests to 30KB

### Content Script Injection
- Content scripts are injected dynamically only when needed
- Uses `chrome.scripting.executeScript` with `content-injector.js`
- Prevents unnecessary loading on all pages for performance

### Site-Specific Behavior
- **Reddit**: Uses shadow DOM selectors for modern Reddit
- **Hacker News**: Uses CSS class selectors for comments
- **Generic Sites**: Uses Readability.js for article extraction

### Performance Considerations
- Content extraction is measured and optimized
- API responses are cached for 5 minutes
- DOM operations are batched and measured
- Memory usage is tracked during analysis

### Error Handling
- Robust retry logic for API calls with exponential backoff
- User-friendly error messages for common issues
- Graceful degradation when content extraction fails
- Comprehensive logging for debugging

## File Structure Notes

- `src/entrypoints/` - WXT entry points (background, content, popup, options)
- `src/content/` - Content script logic and UI components
- `src/background/` - Background script services
- `src/shared/` - Common utilities and types
- `tests/e2e/` - End-to-end tests
- `tests/fixtures/` - Test data and mocks
- `@specs/` - Project specifications (single source of truth)