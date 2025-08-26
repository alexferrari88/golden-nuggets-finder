# Golden Nugget Finder 🔍✨

> ⚠️ **Active Development Notice**: This project is in active development and may experience breaking changes. Features and APIs are subject to change without notice. Use at your own discretion.
>
> **Latest Update**: Enhanced type filtering system allows users to focus on specific nugget categories (v1.1.0).

An intelligent Chrome extension with backend infrastructure that extracts high-signal, actionable insights ("Golden Nuggets") from any webpage using multiple AI providers, with specialized functionality for discussion threads and comprehensive feedback optimization.

## Overview

Golden Nugget Finder is designed for the "Pragmatic Processor" persona - someone with ADHD who needs to quickly extract valuable insights from articles, blog posts, and long comment threads while bypassing low-value content. The system supports multiple AI providers (Google Gemini, Anthropic Claude, OpenAI, OpenRouter) and includes a sophisticated backend for prompt optimization using DSPy framework.

### Key Features

#### Chrome Extension
- **Multi-AI Provider Support**: Choose between Google Gemini, Anthropic Claude, OpenAI, and OpenRouter
- **Intelligent Content Analysis**: Advanced AI analysis to identify valuable insights
- **Multi-Prompt Management**: Create and save custom prompts for different types of analysis
- **On-Page Highlighting**: Highlights golden nuggets directly on the webpage
- **Results Sidebar**: Displays a complete master list of all found nuggets
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

### Analyzing Content

**Method 1: Extension Icon**
1. Click the extension icon in the Chrome toolbar
2. Select a prompt from the dropdown menu
3. Wait for analysis to complete

**Method 2: Right-Click Context Menu**
1. Right-click anywhere on the page
2. Select "Find Golden Nuggets" → Choose your prompt
3. Wait for analysis to complete

### Understanding Results

After analysis, you'll see:
- **Highlighted text**: Golden nuggets highlighted on the page with a golden background
- **Interactive elements**: Clickable tags/icons that show nugget details
- **Results sidebar**: Complete list of all found nuggets with their categories

### Type Filtering

The extension includes **type filtering** to focus analysis on specific nugget categories:

- **Configuration**: Options page → Select nugget types of interest
- **Available Types**: Tool, Media, Explanation, Analogy, Model
- **Performance**: Filtering reduces processing time and API costs
- **UI Behavior**: Results sidebar shows only selected types
- **Export Impact**: Only filtered types are included in JSON/Markdown exports

**Recommendation**: Start with all types enabled, then filter to your areas of interest to optimize performance.

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
- **AI Integration**: Multi-provider support
  - Google Gemini API (`gemini-2.5-flash`)
  - Anthropic Claude (via LangChain)
  - OpenAI GPT (via LangChain)  
  - OpenRouter (via LangChain)
- **Content Extraction**: Specialized extractors for Reddit, Hacker News, and generic pages
- **Storage**: Chrome Storage Sync API with encryption
- **Validation**: Zod schemas for type safety
- **Testing**: Vitest (unit), Playwright (E2E), integration tests
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
- **Options Page**: React-based configuration interface for API keys, provider selection, and prompt management
- **Popup**: React-based extension toolbar interface for prompt selection and provider switching
- **Provider System**: Factory pattern for supporting multiple AI providers with unified interface

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

#### Chrome Extension Flow
1. User activates extension on a webpage
2. Content script extracts text content from DOM using specialized extractors
3. Background script sends content + prompt to selected AI provider (Gemini/Claude/OpenAI/OpenRouter)
4. AI provider returns structured JSON with golden nuggets
5. Content script highlights nuggets on page and displays sidebar
6. User feedback is collected and sent to backend for optimization

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

All AI providers (Gemini, Claude, OpenAI, OpenRouter) return responses in this standardized format:

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

**Default Prompt** (Precision Over Recall):
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
- **API Costs**: Users are responsible for AI provider API usage costs (Gemini, Claude, OpenAI, OpenRouter)
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
4. Start analyzing web content!

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