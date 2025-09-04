# Golden Nugget Finder 🔍✨

> ⚠️ **Active Development Notice**: This project is in active development and may experience breaking changes. Features and APIs are subject to change without notice. Use at your own discretion.
>
> **Latest Update**: Advanced multi-provider ensemble mode with research-backed consensus algorithms delivers 3-5% accuracy improvement over single-provider analysis.

An intelligent Chrome extension with advanced **multi-provider ensemble capabilities** that extracts high-signal, actionable insights ("Golden Nuggets") from any webpage. Features research-backed consensus algorithms across multiple AI providers (Gemini, Claude, OpenAI, OpenRouter) for **3-5% accuracy improvement**, with specialized functionality for discussion threads and comprehensive backend infrastructure for feedback optimization.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Usage](#usage)
- [Ensemble Mode](#ensemble-mode)
- [Technical Architecture](#technical-architecture)
- [Development](#development)
- [Configuration](#configuration)
- [Limitations](#limitations)
- [Contributing](#contributing)
- [Support](#support)

## Overview

Golden Nugget Finder is designed for the "Pragmatic Processor" persona - someone with ADHD who needs to quickly extract valuable insights from articles, blog posts, and long comment threads while bypassing low-value content. The system features advanced multi-provider ensemble capabilities that combine results from multiple AI providers (Google Gemini, Anthropic Claude, OpenAI, OpenRouter) using research-backed consensus algorithms, delivering 3-5% accuracy improvement over single-provider analysis. It includes a sophisticated backend for prompt optimization using DSPy framework.

### Key Features

#### Chrome Extension
- **Multi-Provider Ensemble Mode**: Research-backed ensemble analysis across different AI providers for 3-5% accuracy improvement
- **Multi-AI Provider Support**: Choose between Google Gemini, Anthropic Claude, OpenAI, and OpenRouter
- **Advanced Consensus Building**: Hybrid similarity matching and confidence scoring across provider results
- **Dual Ensemble Modes**: Single-model (multiple runs) and multi-provider (different providers) ensemble analysis
- **Intelligent Content Analysis**: Advanced AI analysis with confidence filtering and provider attribution
- **Multi-Prompt Management**: Create and save custom prompts for different types of analysis
- **On-Page Highlighting**: Highlights golden nuggets directly on the webpage with confidence indicators
- **Results Sidebar**: Displays a complete master list of all found nuggets with provider metadata
- **Type Filtering**: Focus analysis on specific nugget types (tool, media, aha! moments, analogy, model)
- **Discussion Thread Support**: Specialized scrapers for Hacker News and Reddit
- **Universal Compatibility**: Works on any website using content extraction
- **Feedback System**: Collect user feedback for prompt optimization

#### Backend Infrastructure
- **DSPy Optimization**: Automatic prompt optimization using feedback data
- **Cost Tracking**: Monitor API usage and costs across providers
- **Feedback Analytics**: Comprehensive feedback collection and analysis
- **Real-time Monitoring**: Live optimization progress tracking
- **Multi-Provider Management**: Support for switching between AI providers

#### Monitoring Dashboard
- **Real-time Analytics**: Live system health and performance monitoring
- **Cost Analytics**: Detailed cost tracking and trend analysis
- **Feedback Management**: Queue management and bulk operations
- **Operations Tracking**: Monitor optimization runs and system performance

## Installation

### Prerequisites

- **Node.js**: Version `^18.17.0 || ^20.3.0 || >=21.0.0` (for development)
- **pnpm**: Package manager (automatically set to version `10.13.1+sha512` via packageManager field)
- **Google Chrome browser**
- **At least one AI provider API key**:
  - Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))
  - Anthropic API key ([Get one here](https://console.anthropic.com/))
  - OpenAI API key ([Get one here](https://platform.openai.com/api-keys))
  - OpenRouter API key ([Get one here](https://openrouter.ai/keys))

### Install from Chrome Web Store

*Coming soon...*

### Install from Source

1. Clone the repository:
```bash
git clone https://github.com/alexferrari88/golden-nuggets-finder.git
cd golden-nuggets-finder
```

2. Install dependencies:
```bash
pnpm install
```

3. Build the extension:
```bash
pnpm build
```

4. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist/chrome-mv3` directory

## Usage

### Initial Setup

1. Click the extension icon in the Chrome toolbar
2. Go to Options to configure:
   - Select your preferred AI provider (Gemini, Claude, OpenAI, OpenRouter)
   - Enter your API key for the chosen provider
   - Create and manage your custom prompts
   - Set a default prompt
   - Configure type filtering preferences
   - Configure provider-specific settings
   - **Set up ensemble mode**: Choose between single-model or multi-provider ensemble
   - **Configure provider sets**: Create named configurations for quick multi-provider switching

### Analyzing Content

**Method 1: Extension Icon**
1. Click the extension icon in the Chrome toolbar
2. Select a prompt from the dropdown menu
3. Optional: Enable **Ensemble Mode** toggle for higher accuracy analysis
4. If using multi-provider ensemble, select which providers to include
5. Wait for analysis to complete

**Method 2: Right-Click Context Menu**
1. Right-click anywhere on the page
2. Select "Find Golden Nuggets" → Choose your prompt
3. Alternative: Select "🎯 Ensemble Analysis" for research-backed multi-run analysis
4. Wait for analysis to complete

### Understanding Results

After analysis, you'll see:
- **Highlighted text**: Golden nuggets highlighted on the page with confidence-based styling
- **Interactive elements**: Clickable tags/icons that show nugget details and provider attribution
- **Results sidebar**: Complete list of all found nuggets with their categories, confidence scores, and consensus metadata
- **Ensemble indicators**: For ensemble mode, see provider consensus data and confidence levels
- **Provider attribution**: View which AI providers contributed to each nugget's discovery

### Type Filtering

The extension includes **type filtering** to focus analysis on specific nugget categories:

- **Configuration**: Options page → Select nugget types of interest
- **Available Types**: Tool, Media, Explanation, Analogy, Model
- **Performance**: Filtering reduces processing time and API costs
- **UI Behavior**: Results sidebar shows only selected types
- **Export Impact**: Only filtered types are included in JSON/Markdown exports

**Recommendation**: Start with all types enabled, then filter to your areas of interest to optimize performance.

## Ensemble Mode

### Overview

The Golden Nugget Finder features an advanced **Ensemble Mode** that leverages research-backed consensus algorithms to achieve **3-5% accuracy improvement** over single-provider analysis. This feature runs multiple analyses and builds consensus for higher confidence golden nugget extraction.

### Key Benefits

- **Higher Accuracy**: 3-5% improvement in nugget detection precision through consensus building
- **Provider Diversity**: Reduces single-provider bias by combining results from multiple AI providers
- **Confidence Scoring**: Each nugget includes confidence metrics based on provider agreement
- **Duplicate Elimination**: Advanced similarity matching removes redundant nuggets across providers
- **Research-Backed**: Implementation based on peer-reviewed ensemble LLM studies from 2024-2025

### Ensemble Modes

#### Single-Model Ensemble
- Runs multiple analyses with the same AI provider (default: 3 runs)
- Uses confidence voting to identify the most reliable nuggets
- **Cost**: Linear scaling (3 runs = 3x API cost)
- **Best for**: Improving consistency with your preferred provider

#### Multi-Provider Ensemble
- Runs parallel analyses across different AI providers simultaneously
- Combines unique strengths of Gemini, Claude, OpenAI, and OpenRouter
- Uses hybrid similarity matching for cross-provider consensus
- **Cost**: Scales with number of selected providers
- **Best for**: Maximum accuracy and comprehensive nugget discovery

### How to Use Ensemble Mode

1. **Via Popup Interface**:
   - Click extension icon
   - Toggle **🎯 Ensemble Mode** switch
   - Select providers (multi-provider mode) or configure runs (single-model mode)
   - Run analysis as normal

2. **Via Context Menu**:
   - Right-click on any webpage
   - Select **🎯 Ensemble Analysis (3 runs)** option
   - Analysis runs automatically with default settings

3. **Configuration**:
   - Go to Options page → **🎯 Ensemble Mode Configuration**
   - Choose between single-model or multi-provider modes
   - Configure provider sets and default run counts
   - Save configurations for quick access

### Understanding Ensemble Results

Ensemble results include enhanced metadata showing:

- **Consensus Confidence**: Score based on how many providers/runs identified each nugget
- **Provider Attribution**: Which AI providers contributed to each discovery
- **Similarity Grouping**: How similar nuggets were consolidated using hybrid matching
- **Performance Metrics**: Response times and success rates across providers

### When to Use Ensemble Mode

- **Critical Analysis**: Important content requiring high accuracy
- **Research Applications**: Academic or professional content analysis  
- **Quality Assurance**: When precision is more important than speed/cost
- **Complex Content**: Dense, technical, or nuanced material that benefits from multiple perspectives
- **Comparative Analysis**: Understanding how different AI providers interpret the same content

### Cost Considerations

- **Transparent Pricing**: UI clearly shows cost multiplier (e.g., "3x cost" for 3-run ensemble)
- **Value Proposition**: Higher accuracy for important content analysis
- **User Control**: Completely optional, disabled by default
- **Flexible Configuration**: Choose the right balance of accuracy vs. cost for your needs

**Recommendation**: Use ensemble mode for high-value content analysis where accuracy is critical. For routine browsing, standard single-provider mode provides excellent results at lower cost.

### Golden Nugget Categories

- **Tool**: Useful software, services, or resources
- **Media**: Books, articles, videos, or other content recommendations
- **Aha! Moments**: Clear explanations of complex concepts that provide sudden insights
- **Analogy**: Helpful analogies that clarify ideas
- **Model**: Mental models or frameworks for thinking

## Technical Architecture

### Chrome Extension Tech Stack

- **Framework**: WXT (Web Extension Toolkit)
- **Language**: TypeScript
- **UI Framework**: React (for popup and options pages)
- **AI Integration**: Multi-provider support with ensemble capabilities
  - Google Gemini API (`gemini-2.5-flash`)
  - Anthropic Claude (via LangChain)
  - OpenAI GPT (via LangChain)  
  - OpenRouter (via LangChain)
- **Ensemble Engine**: Research-backed consensus algorithms with hybrid similarity matching
- **Content Extraction**: Specialized extractors for Reddit, Hacker News, and generic pages
- **Storage**: Chrome Storage Sync API with encryption
- **Validation**: Zod schemas for type safety
- **Testing**: Vitest (unit), Playwright (E2E), integration tests with ensemble coverage
- **Code Quality**: Biome for linting and formatting

### Backend Tech Stack

- **Framework**: FastAPI with async/await support
- **Database**: SQLite with aiosqlite for async operations
- **AI Optimization**: DSPy framework for prompt optimization
- **Validation**: Pydantic models for type safety
- **Testing**: pytest with async support
- **Deployment**: Docker with multi-stage builds

### Frontend Dashboard Tech Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite with hot module replacement
- **Styling**: Tailwind CSS with shadcn/ui components
- **Data Fetching**: TanStack Query with automated caching
- **State Management**: Zustand for client-side state
- **Charts**: Recharts for analytics visualization

### System Components

#### Chrome Extension
- **Content Script**: Injected dynamically into webpages for DOM manipulation and content extraction
- **Background Script**: Service worker handling API calls to multiple AI providers and dynamic content script injection
- **Ensemble Extractor**: Advanced service for multi-provider consensus building with hybrid similarity matching
- **Options Page**: React-based configuration interface for API keys, provider selection, ensemble configuration, and prompt management
- **Popup**: React-based extension toolbar interface for prompt selection, ensemble mode toggle, and provider switching
- **Provider System**: Factory pattern for supporting multiple AI providers with unified interface and ensemble capabilities

#### Backend Services
- **FastAPI Application**: REST API for feedback collection and prompt optimization
- **DSPy Optimization Service**: Automatic prompt improvement using user feedback
- **Cost Tracking Service**: Monitor API usage and costs across providers
- **Progress Tracking Service**: Real-time optimization progress monitoring
- **Feedback Service**: Comprehensive feedback analysis and management

#### Monitoring Dashboard
- **React Dashboard**: Real-time system monitoring and management interface
- **Analytics Components**: Cost tracking, performance metrics, and trend analysis
- **Operations Management**: Manual optimization triggers and system controls
- **Feedback Management**: Queue management and bulk operations interface

### Data Flow

#### Chrome Extension Flow (Standard Mode)
1. User activates extension on a webpage
2. Content script extracts text content from DOM using specialized extractors
3. Background script sends content + prompt to selected AI provider (Gemini/Claude/OpenAI/OpenRouter)
4. AI provider returns structured JSON with golden nuggets
5. Content script highlights nuggets on page and displays sidebar
6. User feedback is collected and sent to backend for optimization

#### Ensemble Analysis Flow
1. User enables ensemble mode via popup toggle or context menu
2. Content script extracts page content using specialized extractors
3. **Multi-Provider Mode**: Background script sends parallel requests to multiple configured providers
4. **Single-Model Mode**: Background script executes multiple runs with the same provider
5. **Consensus Building**: EnsembleExtractor processes multiple results using hybrid similarity matching
6. **Confidence Scoring**: Nuggets receive consensus-based confidence scores and provider attribution
7. Enhanced results with ensemble metadata are displayed via content script UI

#### Backend Optimization Flow
1. Backend collects user feedback from Chrome extension
2. Feedback is analyzed and converted to DSPy training examples
3. When optimization thresholds are met, DSPy optimization is triggered
4. Optimized prompts are generated and stored
5. Chrome extension polls for updated prompts
6. Monitoring dashboard provides real-time visibility into the process

## Development

### Chrome Extension Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Start development server for Firefox
pnpm dev:firefox

# Build for production
pnpm build

# Build for Firefox
pnpm build:firefox

# Create extension package
pnpm package

# Code quality
pnpm lint
pnpm lint:fix

# Testing
pnpm test                    # Unit tests
pnpm test:integration        # Integration tests  
pnpm test:e2e               # E2E tests with Playwright
pnpm test:coverage          # Coverage report
pnpm test:e2e:ui            # E2E tests with UI
pnpm test:e2e:debug         # E2E tests in debug mode
```

### Backend Development

```bash
cd backend

# Docker (Recommended)
cp .env.example .env
# Add your API keys to .env
docker-compose --profile dev up backend-dev

# Local Development
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python run.py

# Testing
pytest tests/integration tests/unit
pytest --cov=app tests/integration tests/unit

# Manual tests (requires FORCE_TEST_DB=1)
FORCE_TEST_DB=1 python3 tests/manual/test_monitoring.py
```

### Frontend Dashboard Development

```bash
cd frontend

# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Linting
pnpm lint
```

### Project Structure

```
# Chrome Extension
src/
├── entrypoints/        # WXT entry points (background, content, popup, options)
├── content/            # Content script logic and UI components
├── background/         # Background script services and AI providers
├── shared/             # Common utilities, types, security, and design system
│   ├── providers/      # Multi-AI provider implementations
│   ├── storage/        # Storage management with encryption
│   └── types/          # TypeScript definitions
├── styles/             # CSS styles
tests/
├── e2e/                # Playwright E2E tests
├── integration/        # Integration tests
├── unit/               # Unit tests  
├── fixtures/           # Test data and mocks
└── manual/             # Manual testing scripts

# Backend Infrastructure
backend/
├── app/
│   ├── main.py         # FastAPI application
│   ├── models.py       # Pydantic models
│   ├── database.py     # SQLite operations
│   └── services/       # Business logic services
├── tests/              # Backend tests
├── migrations/         # Database migrations
└── data/               # SQLite database

# Monitoring Dashboard
frontend/
├── src/
│   ├── components/     # React components
│   ├── pages/          # Application pages
│   ├── lib/            # API client and utilities
│   └── types/          # TypeScript definitions
└── public/             # Static assets

# Documentation and Configuration
├── specs/              # Technical specifications
├── plans/              # Implementation plans
├── CLAUDE.md           # AI assistant guidance (in each directory)
└── [component-specific READMEs]
```

### AI Provider Response Schema

All AI providers (Gemini, Claude, OpenAI, OpenRouter) return responses in this standardized fullContent format, which is enhanced with ensemble metadata when using ensemble mode:

```json
{
  "golden_nuggets": [
    {
      "type": "tool|media|aha! moments|analogy|model",
      "fullContent": "Complete text of the golden nugget",
      "confidence": 0.85,
      "runsSupportingThis": 2,
      "totalRuns": 3,
      "contributingProviders": [
        { "provider": "gemini", "model": "gemini-2.5-flash" },
        { "provider": "claude", "model": "claude-3.5-sonnet" }
      ]
    }
  ],
  "metadata": {
    "totalRuns": 3,
    "successfulRuns": 3,
    "consensusReached": 5,
    "duplicatesRemoved": 2,
    "averageResponseTime": 1250,
    "providersUsed": [
      { "providerId": "gemini", "modelId": "gemini-2.5-flash", "successful": true },
      { "providerId": "claude", "modelId": "claude-3.5-sonnet", "successful": true }
    ]
  }
}
```

**Schema Features:**
- **fullContent**: Complete verbatim text of the golden nugget
- **confidence**: Consensus-based confidence score (0.0-1.0) based on provider agreement
- **type**: Categorization for filtering and organization
- **runsSupportingThis**: Number of analysis runs that identified this nugget
- **contributingProviders**: Array of providers and models that discovered this nugget
- **metadata**: Ensemble analysis statistics including consensus metrics and provider performance
- **Consistent Format**: Same structure across all AI providers for reliable processing

### Backend API Endpoints

#### Feedback Collection
- `POST /feedback` - Submit user feedback from Chrome extension
- `GET /feedback/stats` - Get feedback statistics and optimization status
- `GET /feedback/pending` - Get pending feedback items for dashboard

#### Prompt Optimization
- `POST /optimize` - Manually trigger prompt optimization
- `GET /optimization/history` - Get optimization run history
- `GET /optimize/current` - Get current optimized prompt

#### Monitoring & Analytics
- `GET /monitor/health` - System health check
- `GET /monitor` - Complete monitoring dashboard
- `GET /costs/summary` - Cost analytics and trends
- `GET /dashboard/stats` - Dashboard statistics

## Configuration

### AI Provider Setup

**Google Gemini**:
- Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- Uses `gemini-2.5-flash` model
- Direct API integration

**Anthropic Claude**:
- Get API key from [Anthropic Console](https://console.anthropic.com/)
- Uses Claude 3.5 Sonnet via LangChain
- Supports advanced reasoning tasks

**OpenAI**:
- Get API key from [OpenAI Platform](https://platform.openai.com/api-keys)
- Uses GPT-4 via LangChain
- Excellent for creative analysis

**OpenRouter**:
- Get API key from [OpenRouter](https://openrouter.ai/keys)
- Access to multiple models via single API
- Cost-effective model switching

### Prompt Examples

**Default Prompt** (High Recall with Confidence Filtering):
```
Find golden nuggets that would interest a pragmatic processor with ADHD who loves:
- How things work (science/tech)
- How people think (cognition/philosophy)  
- How we got here (history/evolution)
- Meta-learning and elegant principles

Use ultra-high quality filtering - prefer zero results over mediocre ones.
```

**Custom Prompts**:
- "Find Analogies": Focus on helpful analogies and mental models
- "Find Tools": Identify useful software, services, and resources
- "Find Aha! Moments": Extract clear explanations of complex concepts that provide sudden insights
- "Find Models": Extract mental frameworks and thinking patterns

## Limitations

### Chrome Extension
- **Text-only analysis**: Cannot process images, videos, or other media
- **API dependency**: Requires at least one AI provider API key and internet connection
- **DOM-dependent**: Only analyzes content visible when activated
- **Site-specific**: Specialized scrapers may break if sites change their HTML structure
- **Provider limits**: Each AI provider has different rate limits and costs
- **Type filtering efficiency**: More types selected means longer processing times
- **Ensemble cost scaling**: Multi-provider ensemble mode increases API costs linearly with provider count
- **Consensus requirements**: Ensemble mode requires multiple successful provider responses for optimal results

### Backend Infrastructure
- **DSPy dependency**: Optimization requires DSPy framework and sufficient feedback data
- **Training time**: Expensive optimization mode can take 5-15 minutes
- **Database size**: SQLite database grows with feedback collection
- **API costs**: Optimization process consumes AI provider tokens

### Monitoring Dashboard
- **Backend dependency**: Requires backend infrastructure to be running
- **Real-time limitations**: Some data may have slight delays in real-time updates
- **Browser compatibility**: Optimized for modern browsers with ES2020+ support

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

#### Chrome Extension
- Follow TypeScript best practices with strict mode
- Use conventional commits for all changes
- Add comprehensive tests (Vitest for unit, Playwright for E2E, integration tests)
- Always use the design system - never hardcode design values
- Test with `pnpm test && pnpm test:integration && pnpm test:e2e` before committing
- Use Biome for code formatting and linting
- Update CLAUDE.md files when adding new features

#### Backend
- Use Pydantic models for all API validation
- Write async code with proper error handling
- Add tests for all new endpoints and services
- Use structured logging with emoji indicators
- Always use `FORCE_TEST_DB=1` for manual tests
- Document API changes in OpenAPI schema

#### Frontend Dashboard
- Use shadcn/ui components for consistency
- Implement proper error boundaries and loading states
- Use TanStack Query for all API calls
- Follow responsive design principles
- Test with real backend data

#### Multi-Component Integration
- Maintain type safety across extension, backend, and frontend
- Test integration points thoroughly
- Document API contracts and breaking changes
- Use consistent error handling patterns
- Update all affected components when making changes

## License

ISC License - see [LICENSE](LICENSE) file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/alexferrari88/golden-nuggets-finder/issues)
- **Discussions**: [GitHub Discussions](https://github.com/alexferrari88/golden-nuggets-finder/discussions)
- **API Costs**: Users are responsible for AI provider API usage costs (Gemini, Claude, OpenAI, OpenRouter). Ensemble mode increases costs linearly with provider count or run count.
- **Documentation**: See component-specific CLAUDE.md files for detailed guidance
- **Backend Monitoring**: Use the monitoring dashboard for system health and performance

## Quick Start Guide

### For Users
1. Install the Chrome extension from source or Chrome Web Store (coming soon)
2. Get an API key from your preferred AI provider
3. Configure the extension in Options page:
   - Add your API key
   - Configure type filtering preferences
   - Set up custom prompts if desired
   - **Optional**: Configure ensemble mode for higher accuracy analysis
4. Start analyzing web content with single or ensemble mode!

### For Developers
1. Clone the repository and install dependencies
2. Set up your preferred development environment (extension, backend, or dashboard)
3. Follow the development guidelines for your component
4. Run tests before submitting changes

### For System Administrators  
1. Deploy the backend using Docker
2. Set up the monitoring dashboard for system oversight
3. Configure cost tracking and optimization thresholds
4. Monitor system health and performance metrics

## Attribution

[Mineral icons created by Freepik - Flaticon](https://www.flaticon.com/free-icons/mineral)

---

*Built for the pragmatic processor who values signal over noise.*