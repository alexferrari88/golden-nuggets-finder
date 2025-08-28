# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Core Principles

- Whenever you have unsolvable doubts or questions, stop everything and ask me.
- Commit using conventional commit at the end of important work.
- Do not produce reduntant documentation. Only create documentation if strictly necessary.
- This is a hobby project with currently no users. No need for any enterprise thinking/features.

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

### Code Quality
- `pnpm lint` - Run Biome linting checks
- `pnpm lint:fix` - Run Biome linting with automatic fixes

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
- **API**: Multi-provider AI integration (Gemini, OpenAI, Anthropic, OpenRouter) with structured JSON output
- **Code Quality**: Biome (linting, formatting, import organization) - configured in `biome.json`
- **Testing**: Vitest (unit), Playwright (E2E), happy-dom (test environment)
- **Build Output**: `dist/` directory

### Extension Architecture
The extension follows a standard Chrome extension architecture with three main components:

#### Key Features
- **Multi-Provider AI Support**: Seamlessly switch between Gemini, OpenAI, Anthropic, and OpenRouter
- **Ensemble Mode**: Research-backed multi-run analysis for 3-5% accuracy improvement at 3x cost
- **Type Filtering**: Filter analysis by nugget types (tool, media, aha! moments, analogy, model)
- **Dynamic Content Injection**: Content scripts injected only when needed, not on all pages
- **Secure Storage**: API keys encrypted with device-specific fingerprinting

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

## Ensemble Mode

### Overview
Ensemble mode is an advanced analysis feature that runs multiple AI analysis passes with the same provider to achieve higher accuracy and confidence in golden nugget extraction. Based on peer-reviewed research, ensemble approaches provide **3-5% accuracy improvement** over single-run analysis.

### Key Benefits
- **Higher Accuracy**: 3-5% improvement in nugget detection precision
- **Confidence Scoring**: Each nugget includes confidence metrics based on consensus
- **Duplicate Elimination**: Advanced similarity matching removes redundant nuggets
- **Research-Backed**: Implementation based on 2024-2025 ensemble LLM studies

### How It Works
1. **Multi-Run Extraction**: Executes 3 independent analysis runs (configurable)
2. **Consensus Building**: Uses hybrid similarity matching to identify common nuggets
3. **Confidence Calculation**: Assigns confidence scores based on run agreement
4. **Result Consolidation**: Merges results with metadata showing consensus strength

### User Interface Integration
- **Popup Toggle**: Ensemble mode toggle in extension popup
- **Context Menu**: "Ensemble Analysis" option for right-click activation
- **Options Configuration**: Full ensemble settings in options page
- **Progress Notifications**: Specialized progress messages during ensemble runs
- **Result Display**: Enhanced UI showing confidence scores and consensus data

### Configuration Options
- **Enable/Disable**: Master toggle for ensemble functionality
- **Run Count**: Number of analysis runs (default: 3, affects cost linearly)
- **Mode Selection**: Different ensemble strategies (balanced, precision-focused, etc.)
- **Cost Awareness**: Clear indication that ensemble mode increases API costs

### Cost Considerations
- **Linear Cost Scaling**: 3-run ensemble = 3x API cost
- **Value Proposition**: Higher accuracy for important content analysis
- **User Control**: Completely optional, disabled by default
- **Transparent Pricing**: Clear cost indicators in UI

### Technical Implementation
- **EnsembleExtractor Service**: `src/background/services/ensemble-extractor.ts`
- **Hybrid Similarity**: Advanced text matching for consensus building
- **Embedding Analysis**: Semantic similarity for duplicate detection
- **Storage Integration**: Ensemble preferences persisted securely
- **Test Coverage**: Comprehensive test suite with 15+ test files

### When to Use Ensemble Mode
- **Critical Analysis**: Important content requiring high accuracy
- **Research Applications**: Academic or professional content analysis
- **Quality Assurance**: When precision is more important than speed/cost
- **Complex Content**: Dense, technical, or nuanced material

## Development Workflow

### Making Changes
1. Run tests after changes: `pnpm test && pnpm test:e2e`
2. Check build succeeds: `pnpm build`
3. Test in browser with `pnpm dev`

### Code Quality Enforcement
- **ALWAYS** use the `code-quality-enforcer` agent at the end of any task involving code changes
- If using todo lists with multiple items, add "Run code quality enforcement" as the **last** todo item
- The code-quality-enforcer validates code through formatting, linting, type checking, and testing
- This ensures code quality and prevents regressions before committing changes

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

#### Standard Analysis Flow
1. User triggers analysis via context menu or popup
2. Background script receives request and injects content script
3. Content script extracts page content using specialized extractors
4. Background script sends content to AI provider API
5. Results are displayed via content script UI components

#### Ensemble Analysis Flow
1. User enables ensemble mode via popup toggle or context menu
2. Background script receives ensemble request with run configuration
3. Content script extracts page content using specialized extractors
4. Background script executes multiple AI API calls (3 runs by default)
5. EnsembleExtractor processes multiple results using hybrid similarity matching
6. Consensus nuggets with confidence scores are generated
7. Enhanced results with ensemble metadata are displayed via content script UI

### Backend Integration & Monitoring
The backend (`backend/`) provides feedback collection and DSPy-based prompt optimization with comprehensive monitoring:

- **Feedback Collection**: Chrome extension sends user feedback to `/feedback` endpoint
- **Optimization Triggers**: Automatic optimization based on feedback volume and quality thresholds
- **Enhanced Logging**: Structured logging with emoji indicators and progress tracking during optimizations
- **Monitoring API**: Real-time optimization progress via `/monitor/*` endpoints
- **Health Checks**: System health monitoring for DSPy, Gemini API, and database components

**Monitoring Endpoints:**
- `GET /monitor/health` - System health and component status
- `GET /monitor` - Complete monitoring dashboard with active runs
- `GET /monitor/status/{run_id}` - Real-time progress for specific optimizations

See `backend/MONITORING_GUIDE.md` for comprehensive monitoring documentation.

### AI Provider Response Schema
All AI providers (Gemini, Claude, OpenAI, OpenRouter) are normalized to this standard format:

```json
{
  "golden_nuggets": [
    {
      "type": "tool|media|aha! moments|analogy|model",
      "startContent": "First few words of original text",
      "endContent": "Last few words of original text"
    }
  ]
}
```

### Storage Structure

#### Chrome Extension Storage (Encrypted)
- **API Keys**: Encrypted storage for all AI provider API keys
  - `geminiApiKey`: Google Gemini API key
  - `anthropicApiKey`: Anthropic Claude API key
  - `openaiApiKey`: OpenAI GPT API key
  - `openrouterApiKey`: OpenRouter API key
- **Provider Configuration**:
  - `selectedProvider`: Currently selected AI provider
  - `providerModels`: Model configurations for each provider
- **User Preferences**:
  - `userPrompts`: Array of saved prompt objects with names, content, and default status
  - `defaultPrompt`: User's default prompt selection
  - `typeFilters`: Selected nugget types for analysis
  - `ensembleSettings`: Ensemble mode configuration (enabled, defaultRuns, defaultMode)

#### Backend Storage (SQLite)
- **Feedback Tables**: User ratings, corrections, and missing content feedback
- **Optimization History**: DSPy optimization runs and results
- **Training Data**: Converted feedback for DSPy training
- **Cost Tracking**: API usage and cost analytics across providers
- **System Metrics**: Performance monitoring and health data

#### Security Features
- **Device-Specific Encryption**: API keys encrypted using AES-GCM with device fingerprinting
- **Access Control**: Rate limiting and context validation for all security operations
- **Audit Logging**: Complete audit trail of all security events
- **Key Rotation**: Automatic detection and recommendations for key updates

## 3-Component System Architecture

The project consists of three integrated components working together:

### 1. Chrome Extension (Primary Component)
- **Location**: Root directory (`src/`, `tests/`, etc.)
- **Purpose**: Browser extension for content analysis and golden nugget extraction
- **Technologies**: WXT, TypeScript, React, Biome
- **Key Features**: Multi-provider AI, type filtering, dynamic injection

### 2. Backend API (Supporting Component)
- **Location**: `backend/` directory
- **Purpose**: Feedback collection, DSPy optimization, cost tracking, monitoring
- **Technologies**: FastAPI, SQLite, Pydantic, DSPy
- **Key Features**: Real-time monitoring, prompt optimization, health checks

### 3. Frontend Dashboard (Monitoring Component)
- **Location**: `frontend/` directory
- **Purpose**: Visual dashboard for monitoring backend operations and optimization progress
- **Technologies**: React, TypeScript, Vite, TailwindCSS, Biome
- **Key Features**: Real-time updates, optimization tracking, system health monitoring

## Multi-Component Development Guidelines

### Core Development Principles
- **Type Safety First**: Maintain strict TypeScript across extension, backend (Pydantic), and frontend dashboard
- **Provider Agnostic**: All new features must work across all AI providers
- **Security by Design**: Use SecurityManager for all sensitive operations
- **Test Coverage**: Unit, integration, and E2E tests for all components
- **Documentation**: Update relevant CLAUDE.md files when adding features

### Integration Testing
- **Cross-Component Testing**: Test extension → backend → frontend dashboard workflows
- **Provider Testing**: Validate all features work with each AI provider
- **Error Handling**: Test graceful degradation when components are unavailable
- **Performance Testing**: Monitor API costs and response times across providers

### Deployment Considerations
- **Chrome Extension**: Standard Chrome Web Store deployment
- **Backend**: Docker deployment with health monitoring
- **Frontend Dashboard**: Static hosting with API endpoint configuration
- **Environment Management**: Separate development, staging, and production environments

### Provider-Specific Considerations
- **Google Gemini**: Direct API integration with thinking budget configuration
- **Anthropic Claude**: LangChain integration with advanced reasoning capabilities
- **OpenAI GPT**: LangChain integration with creative analysis strengths
- **OpenRouter**: LangChain integration providing access to multiple models via single API

### Provider Selection Logic
- Users can switch providers in real-time via Options page
- Provider validation occurs before API calls
- Fallback mechanisms for provider failures
- Cost tracking and comparison across providers