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

## Development Workflow

### Making Changes
1. Always check `@specs/spec.md` for requirements
2. Run tests after changes: `pnpm test && pnpm test:e2e`
3. Check build succeeds: `pnpm build`
4. Test in browser with `pnpm dev`

## File Structure and Detailed Documentation

### Main Directories
- `src/entrypoints/` - WXT entry points (background, content, popup, options)
- `src/content/` - Content script logic and UI components → See [src/content/CLAUDE.md](src/content/CLAUDE.md)
- `src/background/` - Background script services → See [src/background/CLAUDE.md](src/background/CLAUDE.md)
- `src/shared/` - Common utilities and types → See [src/shared/CLAUDE.md](src/shared/CLAUDE.md)
- `tests/` - Testing files and fixtures → See [tests/CLAUDE.md](tests/CLAUDE.md)
- `@specs/` - Project specifications (single source of truth)

### Component-Specific Documentation
For detailed information about specific components, refer to the CLAUDE.md files in each directory:

- **Content Scripts**: [src/content/CLAUDE.md](src/content/CLAUDE.md) - Content extraction, UI management, site-specific behavior
- **Background Scripts**: [src/background/CLAUDE.md](src/background/CLAUDE.md) - AI integration, API management, message passing
- **Shared Utilities**: [src/shared/CLAUDE.md](src/shared/CLAUDE.md) - Storage, types, constants, performance monitoring
- **Testing**: [tests/CLAUDE.md](tests/CLAUDE.md) - Testing strategy, E2E setup, fixtures

## Key Integration Points

### Data Flow
1. User triggers analysis via context menu or popup
2. Background script receives request and injects content script
3. Content script extracts page content using specialized extractors
4. Background script sends content to Gemini API
5. Results are displayed via content script UI components

### Golden Nugget Response Schema
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

### Storage Structure
- `geminiApiKey`: User's Google Gemini API key
- `userPrompts`: Array of saved prompt objects with names, content, and default status