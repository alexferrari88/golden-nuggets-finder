# Golden Nugget Finder 🔍✨

An intelligent Chrome extension that extracts high-signal, actionable insights ("Golden Nuggets") from any webpage, with specialized functionality for discussion threads on sites like Hacker News and Reddit.

## Overview

Golden Nugget Finder is designed for the "Pragmatic Synthesizer" persona - someone with ADHD who needs to quickly extract valuable insights from articles, blog posts, and long comment threads while bypassing low-value content. The extension leverages Google Gemini AI to analyze content and highlight the most relevant information based on customizable prompts.

### Key Features

- **Intelligent Content Analysis**: Uses Google Gemini AI to identify valuable insights
- **Multi-Prompt Management**: Create and save custom prompts for different types of analysis
- **On-Page Highlighting**: Highlights golden nuggets directly on the webpage
- **Results Sidebar**: Displays a complete master list of all found nuggets
- **Discussion Thread Support**: Specialized scrapers for Hacker News and Reddit
- **Universal Compatibility**: Works on any website using content extraction

## Installation

### Prerequisites

- Google Chrome browser
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

### Install from Chrome Web Store

*Coming soon...*

### Install from Source

1. Clone the repository:
```bash
git clone https://github.com/alexferrari88/golden-nugget-finder.git
cd golden-nugget-finder
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
   - Select the `dist/chrome-mv3-prod` directory

## Usage

### Initial Setup

1. Click the extension icon in the Chrome toolbar
2. Go to Options to configure:
   - Enter your Google Gemini API key
   - Create and manage your custom prompts
   - Set a default prompt

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
- **Interactive elements**: Clickable tags/icons that show detailed synthesis
- **Results sidebar**: Complete list of all found nuggets with their categories and explanations

### Golden Nugget Categories

- **Tool**: Useful software, services, or resources
- **Media**: Books, articles, videos, or other content recommendations
- **Explanation**: Clear explanations of complex concepts
- **Analogy**: Helpful analogies that clarify ideas
- **Model**: Mental models or frameworks for thinking

## Technical Architecture

### Tech Stack

- **Framework**: WXT (Web Extension Toolkit)
- **Language**: TypeScript
- **UI Framework**: React (for popup and options pages)
- **AI Integration**: Google Gemini API (`gemini-2.5-flash`)
- **Content Extraction**: Specialized extractors for Reddit, Hacker News, and generic pages
- **Storage**: Chrome Storage Sync API
- **Testing**: Vitest (unit), Playwright (E2E)

### Components

- **Content Script**: Injected dynamically into webpages for DOM manipulation and content extraction
- **Background Script**: Service worker handling API calls to Google Gemini and dynamic content script injection
- **Options Page**: React-based configuration interface for API keys and prompt management
- **Popup**: React-based extension toolbar interface for prompt selection

### Data Flow

1. User activates extension on a webpage
2. Content script extracts text content from DOM
3. Background script sends content + prompt to Google Gemini API
4. API returns structured JSON with golden nuggets
5. Content script highlights nuggets on page and displays sidebar

## Development

### Setup

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Run unit tests
pnpm test

# Run E2E tests
pnpm test:e2e

# Run with coverage
pnpm test:coverage
```

### Project Structure

```
src/
├── entrypoints/        # WXT entry points (background, content, popup, options)
├── content/            # Content script logic and UI components
├── background/         # Background script services
├── shared/             # Common utilities, types, and design system
├── components/         # Shared React components
tests/
├── e2e/                # Playwright E2E tests
├── fixtures/           # Test data and mocks
└── manual-testing-checklist.md
```

### API Response Schema

The extension expects Google Gemini to return responses in this exact format:

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

## Configuration

### Prompt Examples

**Default Prompt**:
```
Find golden nuggets that would interest a pragmatic synthesizer with ADHD who loves:
- How things work (science/tech)
- How people think (cognition/philosophy)  
- How we got here (history/evolution)
- Meta-learning and elegant principles
```

**Custom Prompts**:
- "Find Analogies": Focus on helpful analogies and mental models
- "Find Tools": Identify useful software, services, and resources
- "Find Explanations": Extract clear explanations of complex concepts

## Limitations

- **Text-only analysis**: Cannot process images, videos, or other media
- **API dependency**: Requires Google Gemini API key and internet connection
- **DOM-dependent**: Only analyzes content visible when activated
- **Site-specific**: Specialized scrapers may break if HN/Reddit change their HTML structure

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Use conventional commits
- Add tests for new features (Vitest for unit, Playwright for E2E)
- Always use the design system - never hardcode design values
- Test with `pnpm test && pnpm test:e2e` before committing
- Update documentation as needed

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/alexferrari88/golden-nugget-finder/issues)
- **Discussions**: [GitHub Discussions](https://github.com/alexferrari88/golden-nugget-finder/discussions)
- **API Costs**: Users are responsible for Google Gemini API usage costs

## Attribution

[Mine icons created by surang - Flaticon](https://www.flaticon.com/free-icons/mine)

---

*Built for the pragmatic synthesizer who values signal over noise.*