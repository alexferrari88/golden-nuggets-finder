
# Technical Specification: WebScraper.js

This document details the technical implementation of the WebScraper.js library.

## 1. File Structure

```
/web-scraper-js
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── index.ts                # Main entry point, exports ContentScraper
│   ├── types.ts                # Public-facing interfaces (Content, ContentItem, etc.)
│   ├── ui-manager.ts           # UIManager class
│   └── extractors/
│       ├── base.ts               # BaseExtractor abstract class
│       ├── generic.ts            # GenericExtractor for general articles
│       ├── hackernews.ts         # HackerNewsExtractor
│       ├── reddit.ts             # RedditExtractor
│       └── twitter.ts            # TwitterExtractor
└── dist/
    ├── index.js
    ├── index.d.ts
    └── ... (other compiled files)
```

## 2. Core Interfaces (`src/types.ts`)

```typescript
export interface ContentItem {
  id: string; // A unique identifier for the item (e.g., a hash of its content)
  element: HTMLElement; // The actual DOM element
  URL?: string;
  textContent?: string;
  htmlContent?: string;
  type: "post" | "comment";
  selected: boolean;
}

export interface Content {
  pageURL: string;
  title: string;
  items: ContentItem[];
}

export interface ScraperOptions {
  includeHtml?: boolean;
  checkboxStyles?: {
    selected?: string; // CSS class for selected state
    deselected?: string; // CSS class for deselected state
  };
}
```

## 3. Class Diagrams & API Contracts

### `ContentScraper` (`src/index.ts`)

This is the main class developers will interact with.

```typescript
import { UIManager } from './ui-manager';
import { BaseExtractor } from './extractors/base';
import { Content, ScraperOptions } from './types';

export class ContentScraper {
  private extractor: BaseExtractor;
  private uiManager: UIManager;
  private content: Content | null = null;
  private eventEmitter = new EventTarget();

  constructor(options: ScraperOptions = {}) {
    // 1. Detect the current site from window.location.href
    // 2. Instantiate the appropriate extractor (e.g., HackerNewsExtractor)
    // 3. Instantiate the UIManager with custom styles from options
  }

  public async run(): Promise<void> {
    // 1. Call this.extractor.extract() to get the initial content.
    // 2. Store the result in this.content.
    // 3. If content has items, call this.uiManager.displayCheckboxes().
    // 4. Listen for selection changes from the UI manager and update this.content.
  }

  public getContent(): Content | null {
    // Return a deep copy of the currently selected content.
  }

  public on(eventName: 'selectionChanged', callback: (content: Content) => void): void {
    // Register an event listener.
  }

  public destroy(): void {
    // Clean up: remove UI, remove event listeners.
  }
}
```

### `BaseExtractor` (`src/extractors/base.ts`)

The abstract class that all other extractors will implement.

```typescript
import { Content } from '../types';

export abstract class BaseExtractor {
  constructor(protected includeHtml: boolean) {}

  public abstract extract(): Promise<Content>;

  // Utility methods (reused from the original codebase)
  protected cleanText(text: string): string { /* ... */ }
  protected isElementVisible(element: Element): boolean { /* ... */ }
}
```

### `UIManager` (`src/ui-manager.ts`)

Handles all DOM manipulation.

```typescript
import { ContentItem } from './types';

export class UIManager {
  private checkboxes = new Map<HTMLElement, { item: ContentItem, checkboxEl: HTMLElement }>();
  private eventEmitter = new EventTarget();

  constructor(private styles: CheckboxStyles) {}

  public displayCheckboxes(items: ContentItem[]): void {
    // 1. Iterate through items.
    // 2. For each item, create a checkbox element.
    // 3. Apply default and custom styles.
    // 4. Position the checkbox relative to the item's element.
    // 5. Add a click listener to the checkbox that dispatches a 'selectionChanged' event.
  }

  public on(eventName: 'selectionChanged', callback: (selectedItems: ContentItem[]) => void): void {
    // Register an event listener.
  }

  public destroy(): void {
    // Remove all created checkboxes from the DOM.
  }
}
```

## 4. Site Detection Logic

The `ContentScraper` constructor will use a simple URL matching strategy:

```typescript
const url = window.location.href;
if (url.includes('news.ycombinator.com')) {
  this.extractor = new HackerNewsExtractor(options.includeHtml);
} else if (url.includes('reddit.com')) {
  this.extractor = new RedditExtractor(options.includeHtml);
} else if (url.includes('twitter.com') || url.includes('x.com')) {
  this.extractor = new TwitterExtractor(options.includeHtml);
} else {
  this.extractor = new GenericExtractor(options.includeHtml);
}
```
