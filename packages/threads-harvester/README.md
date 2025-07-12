# WebScraper.js

A TypeScript library for extracting structured content from web pages with site-specific optimizations and interactive selection UI.

## Features

- 🎯 **Site-specific extractors** for popular websites (HackerNews, Reddit, Twitter/X)
- 🔧 **Generic extractor** for any website
- ✅ **Interactive checkbox UI** for content selection
- 🎨 **Customizable styling** with TypeScript-first approach
- 📦 **Zero dependencies** - pure TypeScript/JavaScript
- 🔒 **Type-safe** with full TypeScript support
- 🚀 **Framework-agnostic** - works in any browser environment

## Installation

```bash
npm install web-scraper-js
```

## Quick Start

```typescript
import { ContentScraper } from 'web-scraper-js';

// Create and run the scraper
const scraper = new ContentScraper();
await scraper.run();

// Listen for user selections
scraper.on('selectionChanged', (content) => {
  console.log('Selected content:', content);
});

// Get current content
const content = scraper.getContent();
console.log('All content:', content);

// Clean up when done
scraper.destroy();
```

## API Reference

### ContentScraper

The main class for content extraction and UI management.

#### Constructor

```typescript
new ContentScraper(options?: ScraperOptions)
```

#### Methods

##### `run(): Promise<void>`

Extracts content from the current page and displays selection checkboxes.

```typescript
const scraper = new ContentScraper();
await scraper.run();
```

##### `getContent(): Content | null`

Returns the current content with selection states.

```typescript
const content = scraper.getContent();
if (content) {
  console.log(`Found ${content.items.length} items on ${content.pageURL}`);
}
```

##### `on(eventName: 'selectionChanged', callback: (content: Content) => void): void`

Registers an event listener for selection changes.

```typescript
scraper.on('selectionChanged', (content) => {
  const selectedItems = content.items.filter(item => item.selected);
  console.log(`${selectedItems.length} items selected`);
});
```

##### `destroy(): void`

Cleans up the UI and event listeners.

```typescript
scraper.destroy();
```

## Configuration

### ScraperOptions

```typescript
interface ScraperOptions {
  includeHtml?: boolean;           // Include HTML content in extraction
  checkboxStyling?: CheckboxStyling; // Custom styling for checkboxes
}
```

### Custom Styling

You can customize the checkbox appearance with the `CheckboxStyling` interface:

```typescript
import { ContentScraper, CheckboxStyling } from 'web-scraper-js';

const customStyling: CheckboxStyling = {
  getDefaultStyles: () => `
    position: absolute;
    width: 20px;
    height: 20px;
    border: 2px solid #007acc;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    z-index: 9999;
    transition: all 0.2s ease;
  `,
  
  getSelectedStyles: () => `
    position: absolute;
    width: 20px;
    height: 20px;
    border: 2px solid #007acc;
    border-radius: 4px;
    background: #007acc;
    cursor: pointer;
    z-index: 9999;
    color: white;
  `,
  
  getHoverStyles: () => `
    position: absolute;
    width: 20px;
    height: 20px;
    border: 2px solid #005999;
    border-radius: 4px;
    background: #f0f8ff;
    cursor: pointer;
    z-index: 9999;
    transition: all 0.2s ease;
  `,
  
  getPositioningStyles: (targetRect: DOMRect) => ({
    top: `${targetRect.top + window.pageYOffset - 5}px`,
    left: `${targetRect.left + window.pageXOffset - 30}px`
  })
};

const scraper = new ContentScraper({ 
  includeHtml: true,
  checkboxStyling: customStyling 
});
```

## Data Types

### Content

```typescript
interface Content {
  pageURL: string;    // URL of the current page
  title: string;      // Page title
  items: ContentItem[]; // Array of extracted content items
}
```

### ContentItem

```typescript
interface ContentItem {
  id: string;           // Unique identifier
  element: HTMLElement; // DOM element reference
  URL?: string;         // Item-specific URL (if available)
  textContent?: string; // Plain text content
  htmlContent?: string; // HTML content (if includeHtml: true)
  type: "post" | "comment"; // Content type
  selected: boolean;    // Selection state
}
```

## Site Support

### Supported Sites

- **HackerNews** (`news.ycombinator.com`) - Extracts posts and comments
- **Reddit** (`reddit.com`) - Extracts posts and comments  
- **Twitter/X** (`twitter.com`, `x.com`) - Extracts tweets and replies
- **Generic** - Fallback extractor for any website using article/paragraph detection

### Automatic Detection

The library automatically detects the current site and uses the appropriate extractor:

```typescript
// On news.ycombinator.com - uses HackerNewsExtractor
// On reddit.com - uses RedditExtractor  
// On twitter.com or x.com - uses TwitterExtractor
// On any other site - uses GenericExtractor

const scraper = new ContentScraper();
await scraper.run(); // Automatically uses the right extractor
```

## Usage Examples

### Basic Content Extraction

```typescript
import { ContentScraper } from 'web-scraper-js';

async function extractContent() {
  const scraper = new ContentScraper();
  
  try {
    await scraper.run();
    
    const content = scraper.getContent();
    if (content) {
      console.log(`Extracted ${content.items.length} items from ${content.title}`);
      
      content.items.forEach(item => {
        console.log(`${item.type}: ${item.textContent?.substring(0, 100)}...`);
      });
    }
  } catch (error) {
    console.error('Extraction failed:', error);
  } finally {
    scraper.destroy();
  }
}
```

### Real-time Selection Handling

```typescript
import { ContentScraper } from 'web-scraper-js';

const scraper = new ContentScraper();

// Set up event listener before running
scraper.on('selectionChanged', (content) => {
  const selected = content.items.filter(item => item.selected);
  
  if (selected.length > 0) {
    console.log('Selected content:');
    selected.forEach(item => {
      console.log(`- ${item.type}: ${item.textContent}`);
    });
    
    // Send to your backend, display in UI, etc.
    processSelectedContent(selected);
  }
});

await scraper.run();

function processSelectedContent(items) {
  // Your custom logic here
  const payload = items.map(item => ({
    type: item.type,
    content: item.textContent,
    url: item.URL
  }));
  
  fetch('/api/process-content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}
```

### Chrome Extension Content Script

```typescript
// content-script.ts
import { ContentScraper } from 'web-scraper-js';

let scraper: ContentScraper | null = null;

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startScraping') {
    startScraping();
    sendResponse({ success: true });
  } else if (message.action === 'getContent') {
    const content = scraper?.getContent();
    sendResponse({ content });
  } else if (message.action === 'cleanup') {
    cleanup();
    sendResponse({ success: true });
  }
});

async function startScraping() {
  try {
    scraper = new ContentScraper({ includeHtml: true });
    
    scraper.on('selectionChanged', (content) => {
      // Send selection updates to background script
      chrome.runtime.sendMessage({
        action: 'selectionChanged',
        content: content
      });
    });
    
    await scraper.run();
  } catch (error) {
    console.error('Scraping failed:', error);
  }
}

function cleanup() {
  if (scraper) {
    scraper.destroy();
    scraper = null;
  }
}

// Cleanup on page unload
window.addEventListener('beforeunload', cleanup);
```

## Browser Compatibility

- Chrome/Chromium 88+
- Firefox 78+  
- Safari 14+
- Edge 88+

## TypeScript Support

This library is written in TypeScript and includes full type definitions. No additional `@types` packages needed.

```typescript
import { ContentScraper, Content, ContentItem, ScraperOptions } from 'web-scraper-js';

// All types are available and fully typed
const options: ScraperOptions = {
  includeHtml: true
};

const scraper: ContentScraper = new ContentScraper(options);
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-site-extractor`
3. Make your changes and add tests
4. Commit using conventional commits: `git commit -m "feat: add LinkedIn extractor"`
5. Push and create a Pull Request

### Adding New Site Extractors

To add support for a new website:

1. Create a new extractor class extending `BaseExtractor`
2. Implement the `extract()` method
3. Add site detection logic to `ContentScraper` constructor
4. Add tests for the new extractor

```typescript
// src/extractors/linkedin.ts
import { BaseExtractor } from './base';
import { Content, ContentItem } from '../types';

export class LinkedInExtractor extends BaseExtractor {
  public async extract(): Promise<Content> {
    // Implementation here
    return {
      pageURL: window.location.href,
      title: document.title,
      items: [] // Your extracted items
    };
  }
}
```

## License

ISC License - see LICENSE file for details.