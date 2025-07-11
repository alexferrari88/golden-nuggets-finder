# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Core Principles

- Whenever you have unsolvable doubts or questions, stop everything and ask me.
- Commit using conventional commit at the end of important work.

## ⚠️ CRITICAL WARNINGS - DO NOT IGNORE

### NEVER Change Content Script Matches to `<all_urls>`

**ABSOLUTELY NEVER** change the content script matches from `['https://example.com/*']` to `['<all_urls>']` or any broad pattern.

**Why this is critical:**
- Changing to `<all_urls>` causes Chrome to **reload every single open tab** when the extension is loaded/reloaded
- This creates terrible UX and users will be extremely frustrated
- The extension is designed to use **dynamic injection** via `chrome.scripting.executeScript()`
- Content scripts should only be injected when explicitly needed via context menu actions

**Current Architecture (DO NOT CHANGE):**
- Content script matches: `['https://example.com/*']` (restrictive pattern)
- Dynamic injection: Background script injects `content-scripts/content.js` on demand
- Error handling: Content script handles error messages even when dynamically injected

**If you need content scripts on different sites:**
- Use the existing dynamic injection system in `background.ts`
- Inject `content-scripts/content.js` using `chrome.scripting.executeScript()`
- Add proper timing delays and verification for injection
- Never change the matches pattern to be broader

**This warning exists because this mistake was made and caused significant UX problems.** The extension works perfectly with dynamic injection - do not try to "fix" it by changing the matches pattern.

### NEVER Use Hardcoded Design Values - Always Use Design System

**ABSOLUTELY NEVER** use hardcoded color values, shadows, spacing, or other design tokens directly in code.

**Why this is critical:**
- Hardcoded values create inconsistent visual design across the extension
- Makes it impossible to maintain a cohesive design system
- Prevents easy theming and design updates
- Breaks the Notion-inspired aesthetic we've carefully crafted
- Creates maintenance nightmares when design changes are needed

**ALWAYS use the design system instead:**
- **Colors**: Use `colors.text.primary`, `colors.background.secondary`, etc. from `src/shared/design-system.ts`
- **Shadows**: Use `shadows.md`, `generateInlineStyles.cardShadow()`, etc.
- **Spacing**: Use `spacing.md`, `spacing.lg`, etc.
- **Typography**: Use `typography.fontSize.sm`, `typography.fontWeight.medium`, etc.
- **Z-Index**: Use `zIndex.modal`, `zIndex.notification`, etc.

**Examples of FORBIDDEN hardcoded values:**
```typescript
// ❌ NEVER DO THIS
backgroundColor: 'rgba(0, 0, 0, 0.5)'
color: '#1A1A1A'
boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
fontSize: '14px'
```

**Examples of CORRECT design system usage:**
```typescript
// ✅ ALWAYS DO THIS
backgroundColor: colors.background.modalOverlay
color: colors.text.accent
boxShadow: shadows.md
fontSize: typography.fontSize.sm
```

**For dynamic styling in content scripts:**
- Use `generateInlineStyles.cardShadow()`, `generateInlineStyles.highlightStyle()`, etc.
- Import design system variables: `import { colors, shadows, spacing } from '../../shared/design-system'`

**The design system (`src/shared/design-system.ts`) is the single source of truth for all design decisions.**

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
- **Design System**: Notion-inspired minimalistic design with consistent colors, typography, and components
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
1. Run tests after changes: `pnpm test && pnpm test:e2e`
2. Check build succeeds: `pnpm build`
3. Test in browser with `pnpm dev`

## File Structure and Detailed Documentation

### Main Directories
- `src/entrypoints/` - WXT entry points (background, content, popup, options)
- `src/content/` - Content script logic and UI components → See [src/content/CLAUDE.md](src/content/CLAUDE.md)
- `src/background/` - Background script services → See [src/background/CLAUDE.md](src/background/CLAUDE.md)
- `src/shared/` - Common utilities and types → See [src/shared/CLAUDE.md](src/shared/CLAUDE.md)
- `tests/` - Testing files and fixtures → See [tests/CLAUDE.md](tests/CLAUDE.md)

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