# Threads Harvester

A TypeScript library for extracting threaded content from discussion platforms like Reddit, Twitter, and Hacker News with interactive selection UI and site-specific optimizations.

## Features

- 🧵 **Threaded content extraction** from popular discussion platforms
- 🎯 **Site-specific extractors** for HackerNews, Reddit, Twitter/X  
- 🔧 **Generic extractor** for any website with discussion content
- ✅ **Interactive checkbox UI** for content selection
- 🎨 **Customizable styling** with TypeScript-first approach
- 📦 **Zero dependencies** - pure TypeScript/JavaScript
- 🔒 **Type-safe** with full TypeScript support
- 🚀 **Framework-agnostic** - works in any browser environment

## Installation

```bash
npm install threads-harvester
```

## Quick Start

```typescript
import { ContentScraper } from 'threads-harvester';

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

The main class for threaded content extraction and UI management.

#### Constructor

```typescript
new ContentScraper(options?: ScraperOptions)
```

#### Methods

##### `run(): Promise<void>`

Extracts threaded content from the current page and optionally displays selection checkboxes.

```typescript
const scraper = new ContentScraper();
await scraper.run();
```

##### `displayCheckboxes(): void`

Manually display checkboxes for content selection (useful when `showCheckboxes` option is disabled).

```typescript
const scraper = new ContentScraper({ showCheckboxes: false });
await scraper.run();
scraper.displayCheckboxes(); // Show checkboxes on demand
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
  showCheckboxes?: boolean;        // Auto-display checkboxes after extraction
  checkboxStyling?: CheckboxStyling; // Custom styling for checkboxes
}
```

### Custom Styling

You can customize the checkbox appearance with the `CheckboxStyling` interface:

```typescript
import { ContentScraper, CheckboxStyling } from 'threads-harvester';

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
  showCheckboxes: true,
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

## Supported Platforms

### Thread-Aware Extractors

- **HackerNews** (`news.ycombinator.com`) - Extracts posts and threaded comments
- **Reddit** (`reddit.com`) - Extracts posts and nested comment threads  
- **Twitter/X** (`twitter.com`, `x.com`) - Extracts tweets and reply threads
- **Generic** - Fallback extractor for any website using article/paragraph detection

### Automatic Platform Detection

The library automatically detects the current platform and uses the appropriate extractor:

```typescript
// On news.ycombinator.com - uses HackerNewsExtractor
// On reddit.com - uses RedditExtractor  
// On twitter.com or x.com - uses TwitterExtractor
// On any other site - uses GenericExtractor

const scraper = new ContentScraper();
await scraper.run(); // Automatically uses the right extractor
```

## Usage Examples

### Basic Thread Extraction

```typescript
import { ContentScraper } from 'threads-harvester';

async function extractThreads() {
  const scraper = new ContentScraper();
  
  try {
    await scraper.run();
    
    const content = scraper.getContent();
    if (content) {
      console.log(`Extracted ${content.items.length} items from ${content.title}`);
      
      // Separate posts from comments
      const posts = content.items.filter(item => item.type === 'post');
      const comments = content.items.filter(item => item.type === 'comment');
      
      console.log(`Posts: ${posts.length}, Comments: ${comments.length}`);
    }
  } catch (error) {
    console.error('Thread extraction failed:', error);
  } finally {
    scraper.destroy();
  }
}
```

### Real-time Selection Handling

```typescript
import { ContentScraper } from 'threads-harvester';

const scraper = new ContentScraper({ showCheckboxes: true });

// Set up event listener before running
scraper.on('selectionChanged', (content) => {
  const selected = content.items.filter(item => item.selected);
  
  if (selected.length > 0) {
    console.log('Selected thread content:');
    selected.forEach(item => {
      console.log(`- ${item.type}: ${item.textContent}`);
    });
    
    // Send to your backend, display in UI, etc.
    processSelectedThreads(selected);
  }
});

await scraper.run();

function processSelectedThreads(items) {
  // Your custom logic here
  const payload = items.map(item => ({
    type: item.type,
    content: item.textContent,
    url: item.URL
  }));
  
  fetch('/api/process-threads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}
```

### Chrome Extension Content Script

```typescript
// content-script.ts
import { ContentScraper } from 'threads-harvester';

let scraper: ContentScraper | null = null;

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startHarvesting') {
    startHarvesting();
    sendResponse({ success: true });
  } else if (message.action === 'getThreads') {
    const content = scraper?.getContent();
    sendResponse({ content });
  } else if (message.action === 'cleanup') {
    cleanup();
    sendResponse({ success: true });
  }
});

async function startHarvesting() {
  try {
    scraper = new ContentScraper({ 
      includeHtml: true,
      showCheckboxes: true 
    });
    
    scraper.on('selectionChanged', (content) => {
      // Send selection updates to background script
      chrome.runtime.sendMessage({
        action: 'threadsSelected',
        content: content
      });
    });
    
    await scraper.run();
  } catch (error) {
    console.error('Thread harvesting failed:', error);
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
import { ContentScraper, Content, ContentItem, ScraperOptions } from 'threads-harvester';

// All types are available and fully typed
const options: ScraperOptions = {
  includeHtml: true,
  showCheckboxes: true
};

const scraper: ContentScraper = new ContentScraper(options);
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-platform-extractor`
3. Make your changes and add tests
4. Commit using conventional commits: `git commit -m "feat: add LinkedIn discussion extractor"`
5. Push and create a Pull Request

### Adding New Platform Extractors

To add support for a new discussion platform:

1. Create a new extractor class extending `BaseExtractor`
2. Implement the `extract()` method with platform-specific logic
3. Add platform detection logic to `ContentScraper` constructor
4. Add comprehensive tests for the new extractor

```typescript
// src/extractors/linkedin.ts
import { BaseExtractor } from './base';
import { Content, ContentItem } from '../types';

export class LinkedInExtractor extends BaseExtractor {
  public async extract(): Promise<Content> {
    // Implementation for LinkedIn discussion threads
    return {
      pageURL: window.location.href,
      title: document.title,
      items: [] // Your extracted posts and comments
    };
  }
}
```

## License

MIT License - see LICENSE file for details.