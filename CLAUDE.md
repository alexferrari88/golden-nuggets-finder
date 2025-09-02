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
- **Intelligent Content Extraction**: Advanced AI analysis with fullContent capture and confidence scoring
- **Ensemble Mode**: Research-backed multi-run analysis for 3-5% accuracy improvement at 3x cost
- **Type Filtering**: Filter analysis by nugget types (tool, media, aha! moments, analogy, model)
- **Modern Text Highlighting**: CSS Custom Highlight API with mark.js fallback for enhanced performance
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

## Golden Nugget Extraction System

### Overview
The extension uses a high recall extraction approach with confidence filtering that maximizes accuracy and simplicity. The system captures golden nuggets with a high recall strategy, then applies a 0.85 confidence threshold filter to ensure quality results, eliminating the complexity of boundary-based text matching while maintaining high precision.

### How FullContent Extraction Works

#### High Recall Extraction with Confidence Filtering
- **Purpose**: High recall identification and capture of complete golden nuggets
- **Strategy**: Prioritizes recall over precision during AI extraction phase
- **Filtering**: Post-extraction confidence threshold filtering at 0.85 to ensure quality
- **Output**: Nuggets with `fullContent` (complete text) and confidence scores (0.0-1.0)
- **Temperature**: Configurable per provider for optimal results
- **Performance**: Simplified architecture with enhanced accuracy

#### Progressive Text Matching
- **Phase 1**: uFuzzy.js integration for fuzzy text matching with configurable scoring
- **Phase 2**: Cross-node text highlighting with DOMPositionMapper for complex layouts
- **Phase 3**: dom-anchor-text-quote integration with AnchorTextMatcher for robust positioning
- **CSS Custom Highlight API**: Uses browser-native highlighting for superior performance
- **mark.js Fallback**: Graceful degradation for older browsers
- **Enhanced Matching**: Multiple fallback strategies ensure reliable text highlighting
- **Minimal Visual Impact**: Ultra-subtle design system styling

### User Interface Integration
- **Popup Interface**: Clean, streamlined analysis controls
- **Context Menu**: Direct analysis options with type filtering
- **Options Configuration**: Provider settings, type filtering, and prompt management
- **Progress Notifications**: Real-time progress updates during analysis
- **Results Display**: Enhanced UI with confidence indicators and provider metadata

### Technical Benefits
- **High Recall Strategy**: Maximizes nugget detection with post-extraction confidence filtering
- **Progressive Text Matching**: Multi-phase highlighting system with robust fallback strategies
- **Enhanced Performance**: CSS Custom Highlight API provides native browser performance
- **Reliable Positioning**: dom-anchor-text-quote integration ensures accurate text anchoring
- **Cross-Node Highlighting**: DOMPositionMapper handles complex text spans across multiple elements
- **Quality Assurance**: 0.85 confidence threshold filtering ensures high-quality results
- **Provider Agnostic**: Works consistently across all AI providers (Gemini, OpenAI, Anthropic, OpenRouter)
- **Maintainable Codebase**: Simplified architecture improves reliability and maintainability

## Ensemble Mode

### Overview
Ensemble mode is an advanced analysis feature that provides two distinct approaches for achieving higher accuracy and confidence in golden nugget extraction. Based on peer-reviewed research, ensemble approaches provide **3-5% accuracy improvement** over single-run analysis.

**Two Ensemble Modes Available:**
- **Single-Model Mode**: Multiple analysis runs with the same AI provider
- **Multi-Provider Mode**: Single analysis run across different AI providers simultaneously

### Key Benefits
- **Higher Accuracy**: 3-5% improvement in nugget detection precision
- **Confidence Scoring**: Each nugget includes confidence metrics based on consensus
- **Duplicate Elimination**: Advanced similarity matching removes redundant nuggets
- **Provider Diversity**: Multi-provider mode leverages different AI model strengths
- **Attribution Tracking**: Full provider attribution for each nugget and consensus group
- **Research-Backed**: Implementation based on 2024-2025 ensemble LLM studies

### How It Works

#### Single-Model Mode
1. **Multi-Run Extraction**: Executes 3 independent analysis runs (configurable) with the same provider
2. **Consensus Building**: Uses hybrid similarity matching to identify common nuggets across runs
3. **Confidence Calculation**: Assigns confidence scores based on run agreement
4. **Result Consolidation**: Merges results with metadata showing consensus strength

#### Multi-Provider Mode
1. **Provider Execution**: Executes one analysis call per configured provider (Gemini, OpenAI, Anthropic, OpenRouter)
2. **Cross-Provider Consensus**: Uses hybrid similarity matching to identify common nuggets across different providers
3. **Attribution Preservation**: Each nugget retains `sourceProvider` and `sourceModel` metadata
4. **Consensus Attribution**: Groups show all contributing providers via `contributingProviders` array
5. **Provider-Specific Strengths**: Leverages diverse AI capabilities for comprehensive analysis

### User Interface Integration

#### Popup Interface
- **Ensemble Mode Toggle**: Master toggle with mode indicator (providers vs. runs)
- **Dynamic Provider Selection**: Multi-provider mode shows live provider selection grid
- **Cost Indicators**: Clear cost display showing number of providers/runs
- **Smart Validation**: Prevents analysis without provider selection in multi-provider mode

#### Options Page Configuration
- **Mode Selection**: Radio buttons for single-model vs. multi-provider modes
- **Provider Configuration Grid**: Enable/disable individual providers with model selection
- **Saved Provider Sets**: Name and save common provider combinations
- **Run Count Settings**: Configure number of runs for single-model mode

#### Context Menu Integration
- **"Ensemble Analysis"**: Direct ensemble analysis with current mode settings
- **Provider Attribution**: Results display shows provider badges and source information

#### Results Display
- **Enhanced UI**: Confidence scores with consensus metadata
- **Provider Attribution**: Individual nuggets show source provider and model
- **Consensus Groups**: Grouped results show all contributing providers
- **Multi-Provider Badges**: Visual indicators for cross-provider consensus

### Configuration Options

#### Global Settings
- **Enable/Disable**: Master toggle for ensemble functionality
- **Mode Selection**: Choose between "single-model" and "multi-provider"
- **Default Provider Set**: Save preferred provider combinations

#### Single-Model Mode
- **Run Count**: Number of analysis runs (default: 3, affects cost linearly)
- **Provider Selection**: Uses currently selected provider for all runs

#### Multi-Provider Mode
- **Provider Configurations**: Array of enabled providers with model selection
  - `providerId`: Target AI provider (gemini, openai, anthropic, openrouter)
  - `modelId`: Specific model within provider
  - `enabled`: Toggle individual provider participation
- **Provider Sets**: Named combinations of providers (e.g., "All Providers", "Fast & Accurate")

### Cost Considerations

#### Single-Model Mode
- **Linear Cost Scaling**: 3-run ensemble = 3x API cost with same provider
- **Consistent Pricing**: Uses single provider's pricing model

#### Multi-Provider Mode
- **Per-Provider Costing**: Each enabled provider incurs its respective API cost
- **Mixed Pricing**: Different providers have different cost structures
- **Transparent Display**: UI shows exact number of providers and expected cost multiplier

#### Value Proposition
- **Higher Accuracy**: Significant improvement for important content analysis
- **User Control**: Completely optional, disabled by default
- **Smart Defaults**: Reasonable provider combinations for common use cases

### Technical Implementation

#### Core Services
- **EnsembleExtractor Service**: `src/background/services/ensemble-extractor.ts`
  - `extractWithEnsemble()`: Single-model ensemble (backward compatible)
  - `extractWithMultiProviderEnsemble()`: Multi-provider ensemble extraction
  - `extractWithMultiProvider()`: Core multi-provider logic with attribution

#### Storage System
- **Enhanced EnsembleSettings**: `src/shared/types.ts`
  - `mode`: "single-model" | "multi-provider"
  - `providerConfigurations`: Array of provider configs with enabled flags
  - `defaultProviderSet`: Named provider combinations
  - Backward compatible with existing single-model settings

#### Message Handling
- **Multi-Provider Support**: `src/background/message-handler.ts`
  - `handleMultiProviderEnsemble()`: Dedicated multi-provider message handler
  - Provider instance management with proper attribution
  - Enhanced response format with provider metadata

#### Attribution System
- **Nugget-Level Attribution**: Each nugget includes:
  - `sourceProvider`: Original provider that found the nugget
  - `sourceModel`: Specific model used
- **Consensus Attribution**: Grouped nuggets include:
  - `contributingProviders`: Array of all providers that found similar content
  - Cross-provider consensus strength indicators

#### Similarity Matching
- **Hybrid Similarity**: Advanced text matching for consensus building
- **Cross-Provider Normalization**: Handles different provider response formats
- **Embedding Analysis**: Semantic similarity for duplicate detection across providers
- **Confidence Scoring**: Consensus-based confidence calculation

#### Test Coverage
- **Comprehensive Testing**: 15+ test files covering both ensemble modes
- **Multi-Provider Scenarios**: E2E tests for cross-provider consensus
- **Attribution Validation**: Tests verify proper provider attribution

### When to Use Ensemble Mode

#### Single-Model Mode
- **Cost-Conscious Analysis**: Higher accuracy within single provider's cost structure
- **Provider-Specific Optimization**: Leverage known strengths of preferred provider
- **Consistent Model Behavior**: When uniform analysis style is preferred

#### Multi-Provider Mode
- **Maximum Accuracy**: Critical content requiring highest possible precision
- **Provider Diversity**: Leverage different AI model strengths simultaneously
- **Cross-Validation**: Important analysis requiring multiple AI perspectives
- **Research Applications**: Academic or professional content analysis
- **Complex Content**: Dense, technical, or nuanced material requiring diverse analysis approaches

#### General Use Cases
- **Quality Assurance**: When precision is more important than speed/cost
- **High-Stakes Analysis**: Business-critical or research-critical content
- **Unknown Content Types**: When unsure which provider performs best

## Development Workflow

### Making Changes
1. Run tests after changes: `pnpm test && pnpm test:e2e`
2. Check build succeeds: `pnpm build`
3. Test in browser with `pnpm dev`
4. Test content analysis with different providers and type filtering options

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

#### FullContent Analysis Flow
1. User triggers analysis via popup or context menu
2. Background script receives analysis request with provider and type filter configuration
3. Content script extracts page content using specialized extractors
4. **AI Analysis**: Background script sends content to selected AI provider for high recall fullContent extraction
5. **Confidence Filtering**: Post-extraction filtering applies 0.85 confidence threshold to ensure quality
6. **Text Highlighting**: Progressive text matching system with uFuzzy.js, cross-node highlighting, and dom-anchor-text-quote integration
7. Results with confidence scores and provider metadata are displayed via content script UI

#### Ensemble Analysis Flow

##### Single-Model Ensemble Flow
1. User enables ensemble mode via popup toggle or context menu with single-model mode
2. Background script receives ensemble request with run configuration
3. Content script extracts page content using specialized extractors
4. Background script executes multiple AI API calls to same provider (3 runs by default)
5. EnsembleExtractor processes multiple results using hybrid similarity matching
6. Consensus nuggets with confidence scores are generated based on run agreement
7. Enhanced results with ensemble metadata are displayed via content script UI

##### Multi-Provider Ensemble Flow
1. User enables ensemble mode and selects multi-provider mode with desired providers
2. Background script receives multi-provider ensemble request with provider configurations
3. Content script extracts page content using specialized extractors
4. Background script executes one AI API call per enabled provider (Gemini, OpenAI, Anthropic, OpenRouter)
5. `handleMultiProviderEnsemble()` manages provider instances with proper attribution
6. EnsembleExtractor processes cross-provider results using hybrid similarity matching
7. Cross-provider consensus nuggets with attribution metadata are generated
8. Enhanced results with multi-provider attribution and consensus data are displayed via content script UI

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
All AI providers (Gemini, Claude, OpenAI, OpenRouter) return responses in the standardized fullContent format with optional attribution metadata:

#### FullContent Extraction Schema
```json
{
  "golden_nuggets": [
    {
      "type": "tool|media|aha! moments|analogy|model",
      "fullContent": "Complete text of the golden nugget",
      "confidence": 0.92,
      "sourceProvider": "gemini",
      "sourceModel": "gemini-1.5-flash"
    }
  ]
}
```

#### Multi-Provider Ensemble Schema
```json
{
  "golden_nuggets": [
    {
      "type": "tool|media|aha! moments|analogy|model",
      "fullContent": "Complete text of the golden nugget",
      "confidence": 0.94,
      "runsSupportingThis": 2,
      "totalRuns": 3,
      "contributingProviders": [
        { "provider": "gemini", "model": "gemini-1.5-flash" },
        { "provider": "openai", "model": "gpt-4o" }
      ],
      "similarityMethod": "embedding"
    }
  ],
  "metadata": {
    "extractionMode": "multi-provider-ensemble",
    "totalRuns": 3,
    "successfulRuns": 3,
    "consensusReached": 12,
    "duplicatesRemoved": 8,
    "averageResponseTime": 2340,
    "providersUsed": [
      {
        "providerId": "gemini",
        "modelId": "gemini-1.5-flash",
        "responseTime": 1800,
        "successful": true
      },
      {
        "providerId": "openai", 
        "modelId": "gpt-4o",
        "responseTime": 2200,
        "successful": true
      }
    ]
  }
}
```

**Schema Features:**
- **fullContent**: Complete verbatim text of the golden nugget
- **confidence**: AI-assigned confidence score (0.0-1.0) for quality assessment
- **type**: Categorization for filtering and organization
- **sourceProvider/sourceModel**: Attribution for individual nuggets (single-provider scenarios)
- **contributingProviders**: Array of all providers that found similar content (ensemble consensus)
- **runsSupportingThis**: Number of runs/providers that found this nugget
- **similarityMethod**: Method used for consensus building ("embedding", "word_overlap", "fallback")
- **Consistent Format**: Same structure across all AI providers for reliable processing
- **Ensemble Metadata**: Complete information about consensus building and provider performance

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
  - `ensembleSettings`: Enhanced ensemble configuration with multi-provider support
    - `enabled`: Master toggle for ensemble functionality
    - `defaultRuns`: Number of runs for single-model mode (default: 3)
    - `mode`: "single-model" | "multi-provider" mode selection
    - `providerConfigurations`: Array of provider configs with enabled flags
    - `defaultProviderSet`: Named provider combinations for quick selection

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
- **Google Gemini**: Direct API integration with thinking budget configuration and structured output
- **Anthropic Claude**: LangChain integration with advanced reasoning capabilities and confidence scoring
- **OpenAI GPT**: LangChain integration with creative analysis strengths and reliable fullContent extraction
- **OpenRouter**: LangChain integration providing access to multiple models via single API with consistent fullContent format

### Multi-Provider FullContent System
- All providers implement unified `extractGoldenNuggets()` method
- Consistent fullContent + confidence response format across providers
- Provider-specific temperature and model configurations
- Confidence scoring standardized across all providers
- **Ensemble Attribution**: Automatic sourceProvider and sourceModel tagging for attribution
- **Multi-Provider Consensus**: Cross-provider similarity matching for ensemble mode
- **Response Normalization**: Unified processing across different provider response formats
- Fallback mechanisms ensure graceful degradation when providers are unavailable

### Provider Selection Logic
- Users can switch providers in real-time via Options page
- Provider validation occurs before API calls
- **Ensemble Mode Support**: Multi-provider configurations with individual provider toggles
- **Provider Set Management**: Named combinations for quick ensemble setup
- Fallback mechanisms for provider failures
- Cost tracking and comparison across providers