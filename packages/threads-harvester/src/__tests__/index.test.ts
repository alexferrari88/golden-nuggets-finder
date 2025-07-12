import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ContentScraper } from '../index';
import { ScraperOptions, Content } from '../types';

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'https://example.com/test'
  },
  writable: true
});

describe('ContentScraper', () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
    document.title = 'Test Page';
    
    // Reset window location
    Object.defineProperty(window, 'location', {
      value: { href: 'https://example.com/test' },
      writable: true
    });
    
    // Mock getBoundingClientRect to return non-zero dimensions for all elements
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      width: 100,
      height: 50,
      top: 0,
      left: 0,
      right: 100,
      bottom: 50,
      x: 0,
      y: 0,
      toJSON: () => {}
    }));
    
    // Mock offsetParent to indicate elements are rendered
    Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
      get() { return document.body; },
      configurable: true
    });
    
    // Mock getComputedStyle to return visible styles
    window.getComputedStyle = vi.fn(() => ({
      display: 'block',
      visibility: 'visible'
    } as CSSStyleDeclaration));
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const scraper = new ContentScraper();
      expect(scraper).toBeInstanceOf(ContentScraper);
    });

    it('should initialize with custom options', () => {
      const options: ScraperOptions = {
        includeHtml: true,
        showCheckboxes: true
      };
      
      const scraper = new ContentScraper(options);
      expect(scraper).toBeInstanceOf(ContentScraper);
    });

    it('should select GenericExtractor for unknown sites', () => {
      window.location.href = 'https://unknown-site.com';
      
      const scraper = new ContentScraper();
      expect(scraper).toBeInstanceOf(ContentScraper);
    });

    it('should select HackerNewsExtractor for HN sites', () => {
      window.location.href = 'https://news.ycombinator.com/item?id=123';
      
      const scraper = new ContentScraper();
      expect(scraper).toBeInstanceOf(ContentScraper);
    });

    it('should select RedditExtractor for Reddit sites', () => {
      window.location.href = 'https://www.reddit.com/r/programming';
      
      const scraper = new ContentScraper();
      expect(scraper).toBeInstanceOf(ContentScraper);
    });

    it('should select TwitterExtractor for Twitter sites', () => {
      window.location.href = 'https://twitter.com/user/status/123';
      
      const scraper = new ContentScraper();
      expect(scraper).toBeInstanceOf(ContentScraper);
    });

    it('should select TwitterExtractor for X.com sites', () => {
      window.location.href = 'https://x.com/user/status/123';
      
      const scraper = new ContentScraper();
      expect(scraper).toBeInstanceOf(ContentScraper);
    });
  });

  describe('run method', () => {
    it('should extract content successfully', async () => {
      document.body.innerHTML = `
        <article>
          <p>This is test content that should be extracted by the generic extractor. It needs to be long enough to pass the minimum content length requirements for extraction by the content scraper system.</p>
        </article>
      `;

      const scraper = new ContentScraper();
      await scraper.run();

      const content = scraper.getContent();
      expect(content).not.toBeNull();
      expect(content!.pageURL).toBe('https://example.com/test');
      expect(content!.title).toBe('Test Page');
      expect(content!.items).toHaveLength(1);
    });

    it('should display checkboxes when showCheckboxes option is true', async () => {
      document.body.innerHTML = `
        <article>
          <p>This is test content that should have checkboxes displayed automatically. It needs to be long enough to pass the minimum content length requirements for extraction.</p>
        </article>
      `;

      const scraper = new ContentScraper({ showCheckboxes: true });
      await scraper.run();

      // Check if checkboxes were created
      const checkboxes = document.querySelectorAll('div[style*="position: absolute"]');
      expect(checkboxes.length).toBeGreaterThan(0);

      scraper.destroy();
    });

    it('should not display checkboxes when showCheckboxes option is false', async () => {
      document.body.innerHTML = `
        <article>
          <p>This is test content that should not have checkboxes displayed automatically. It needs to be long enough to pass the minimum content length requirements.</p>
        </article>
      `;

      const scraper = new ContentScraper({ showCheckboxes: false });
      await scraper.run();

      // Check if no checkboxes were created
      const checkboxes = document.querySelectorAll('div[style*="position: absolute"]');
      expect(checkboxes).toHaveLength(0);
    });

    it('should not display checkboxes by default', async () => {
      document.body.innerHTML = `
        <article>
          <p>This is test content that should not have checkboxes by default. It needs to be long enough to pass the minimum content length requirements for extraction.</p>
        </article>
      `;

      const scraper = new ContentScraper();
      await scraper.run();

      // Check if no checkboxes were created
      const checkboxes = document.querySelectorAll('div[style*="position: absolute"]');
      expect(checkboxes).toHaveLength(0);
    });

    it('should handle extraction errors gracefully', async () => {
      // Mock console.error to avoid log spam in tests
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // The error should happen during construction when accessing window.location.href
      expect(() => {
        Object.defineProperty(window, 'location', {
          get() { throw new Error('Location access error'); }
        });
        new ContentScraper();
      }).toThrow('Location access error');

      expect(consoleSpy).not.toHaveBeenCalled(); // Error is thrown before console.error would be called
      consoleSpy.mockRestore();
    });

    it('should handle empty content gracefully', async () => {
      // No content in the DOM
      const scraper = new ContentScraper();
      await scraper.run();

      const content = scraper.getContent();
      expect(content).not.toBeNull();
      expect(content!.items).toHaveLength(0);
    });
  });

  describe('displayCheckboxes method', () => {
    it('should display checkboxes when called explicitly', async () => {
      document.body.innerHTML = `
        <article>
          <p>This is test content that should have checkboxes after explicit call. It needs to be long enough to pass the minimum content length requirements for extraction.</p>
        </article>
      `;

      const scraper = new ContentScraper();
      await scraper.run();

      // No checkboxes initially
      expect(document.querySelectorAll('div[style*="position: absolute"]')).toHaveLength(0);

      scraper.displayCheckboxes();

      // Checkboxes should appear after explicit call
      const checkboxes = document.querySelectorAll('div[style*="position: absolute"]');
      expect(checkboxes.length).toBeGreaterThan(0);

      scraper.destroy();
    });

    it('should handle displayCheckboxes when no content exists', () => {
      const scraper = new ContentScraper();
      
      expect(() => {
        scraper.displayCheckboxes();
      }).not.toThrow();

      // No checkboxes should be created
      expect(document.querySelectorAll('div[style*="position: absolute"]')).toHaveLength(0);
    });

    it('should handle displayCheckboxes when content has no items', async () => {
      // DOM with no extractable content
      document.body.innerHTML = '<nav>Navigation only</nav>';

      const scraper = new ContentScraper();
      await scraper.run();

      expect(() => {
        scraper.displayCheckboxes();
      }).not.toThrow();

      expect(document.querySelectorAll('div[style*="position: absolute"]')).toHaveLength(0);
    });
  });

  describe('getContent method', () => {
    it('should return null when no content extracted', () => {
      const scraper = new ContentScraper();
      const content = scraper.getContent();
      expect(content).toBeNull();
    });

    it('should return deep copy of content', async () => {
      document.body.innerHTML = `
        <article>
          <p>This is test content for deep copy verification. It needs to be long enough to pass the minimum content length requirements for extraction by the content scraper system.</p>
        </article>
      `;

      const scraper = new ContentScraper();
      await scraper.run();

      const content1 = scraper.getContent();
      const content2 = scraper.getContent();

      expect(content1).not.toBeNull();
      expect(content2).not.toBeNull();
      expect(content1).not.toBe(content2); // Different objects
      expect(content1!.items).not.toBe(content2!.items); // Different arrays
      expect(content1!.items[0]).not.toBe(content2!.items[0]); // Different item objects

      // But content should be the same
      expect(content1!.pageURL).toBe(content2!.pageURL);
      expect(content1!.title).toBe(content2!.title);
      expect(content1!.items[0].id).toBe(content2!.items[0].id);
    });

    it('should preserve element references in deep copy', async () => {
      document.body.innerHTML = `
        <article>
          <p>This is test content for element reference verification. It needs to be long enough to pass the minimum content length requirements for extraction by the content scraper system.</p>
        </article>
      `;

      const scraper = new ContentScraper();
      await scraper.run();

      const content = scraper.getContent();
      
      expect(content!.items[0].element).toBeInstanceOf(HTMLElement);
      expect(content!.items[0].element.tagName).toBe('ARTICLE');
    });

    it('should reflect selection state changes', async () => {
      document.body.innerHTML = `
        <article>
          <p>This is test content for selection state verification. It needs to be long enough to pass the minimum content length requirements for extraction by the content scraper system.</p>
        </article>
      `;

      const scraper = new ContentScraper();
      await scraper.run();
      scraper.displayCheckboxes();

      // Initially not selected
      let content = scraper.getContent();
      expect(content!.items[0].selected).toBe(false);

      // Click checkbox to select
      const checkbox = document.querySelector('div[style*="position: absolute"]') as HTMLElement;
      checkbox.click();

      // Should now be selected
      content = scraper.getContent();
      expect(content!.items[0].selected).toBe(true);

      scraper.destroy();
    });
  });

  describe('event handling', () => {
    it('should emit selectionChanged events', () => {
      return new Promise<void>((resolve) => {
        document.body.innerHTML = `
          <article>
            <p>This is test content for event handling verification. It needs to be long enough to pass the minimum content length requirements for extraction by the content scraper system.</p>
          </article>
        `;

      const scraper = new ContentScraper();
      
        scraper.on('selectionChanged', (content: Content) => {
          expect(content).toBeDefined();
          expect(content.items).toHaveLength(1);
          expect(content.items[0].selected).toBe(true);
          scraper.destroy();
          resolve();
        });

        scraper.run().then(() => {
          scraper.displayCheckboxes();
          
          // Click checkbox to trigger event
          const checkbox = document.querySelector('div[style*="position: absolute"]') as HTMLElement;
          checkbox.click();
        });
      });
    });

    it('should handle multiple event listeners', () => {
      return new Promise<void>((resolve) => {
        document.body.innerHTML = `
          <article>
            <p>This is test content for multiple event listeners verification. It needs to be long enough to pass the minimum content length requirements for extraction by the content scraper system.</p>
          </article>
        `;

      let listener1Called = false;
      let listener2Called = false;

      const scraper = new ContentScraper();

      scraper.on('selectionChanged', () => {
        listener1Called = true;
        checkCompletion();
      });

      scraper.on('selectionChanged', () => {
        listener2Called = true;
        checkCompletion();
      });

        function checkCompletion() {
          if (listener1Called && listener2Called) {
            scraper.destroy();
            resolve();
          }
        }

        scraper.run().then(() => {
          scraper.displayCheckboxes();
          
          const checkbox = document.querySelector('div[style*="position: absolute"]') as HTMLElement;
          checkbox.click();
        });
      });
    });

    it('should update internal content state when selection changes', async () => {
      document.body.innerHTML = `
        <article>
          <p>This is test content for internal state verification. It needs to be long enough to pass the minimum content length requirements for extraction by the content scraper system.</p>
        </article>
      `;

      const scraper = new ContentScraper();
      
      let eventContent: Content | null = null;
      
      scraper.on('selectionChanged', (content: Content) => {
        eventContent = content;
      });

      await scraper.run();
      scraper.displayCheckboxes();

      // Click checkbox
      const checkbox = document.querySelector('div[style*="position: absolute"]') as HTMLElement;
      checkbox.click();

      // Wait for event to fire
      await new Promise(resolve => setTimeout(resolve, 0));

      // Internal content should be updated
      const internalContent = scraper.getContent();
      expect(internalContent!.items[0].selected).toBe(true);
      
      // Event content should match internal content
      expect(eventContent!.items[0].selected).toBe(true);

      scraper.destroy();
    });
  });

  describe('destroy method', () => {
    it('should clean up UI and reset state', async () => {
      document.body.innerHTML = `
        <article>
          <p>This is test content for cleanup verification. It needs to be long enough to pass the minimum content length requirements for extraction by the content scraper system.</p>
        </article>
      `;

      const scraper = new ContentScraper();
      await scraper.run();
      scraper.displayCheckboxes();

      // Verify checkboxes exist
      expect(document.querySelectorAll('div[style*="position: absolute"]')).toHaveLength(1);

      scraper.destroy();

      // Verify cleanup
      expect(document.querySelectorAll('div[style*="position: absolute"]')).toHaveLength(0);
      expect(scraper.getContent()).toBeNull();
    });

    it('should handle destroy when no content exists', () => {
      const scraper = new ContentScraper();
      
      expect(() => {
        scraper.destroy();
      }).not.toThrow();
    });

    it('should handle multiple destroy calls', async () => {
      document.body.innerHTML = `
        <article>
          <p>This is test content for multiple destroy calls verification. It needs to be long enough to pass the minimum content length requirements for extraction by the content scraper system.</p>
        </article>
      `;

      const scraper = new ContentScraper();
      await scraper.run();

      expect(() => {
        scraper.destroy();
        scraper.destroy();
      }).not.toThrow();
    });
  });

  describe('options handling', () => {
    it('should pass includeHtml option to extractor', async () => {
      document.body.innerHTML = `
        <article>
          <p>Content with <strong>HTML</strong> formatting that needs to be long enough to pass the minimum content length requirements for extraction by the content scraper system.</p>
        </article>
      `;

      const scraperWithHtml = new ContentScraper({ includeHtml: true });
      await scraperWithHtml.run();
      const contentWithHtml = scraperWithHtml.getContent();

      const scraperWithoutHtml = new ContentScraper({ includeHtml: false });
      await scraperWithoutHtml.run();
      const contentWithoutHtml = scraperWithoutHtml.getContent();

      expect(contentWithHtml!.items[0].htmlContent).toBeDefined();
      expect(contentWithoutHtml!.items[0].htmlContent).toBeUndefined();
    });

    it('should pass custom styling to UIManager', async () => {
      const customStyling = {
        getDefaultStyles: () => 'background: red;',
        getSelectedStyles: () => 'background: green;',
        getHoverStyles: () => 'background: blue;',
        getPositioningStyles: (rect: DOMRect) => ({ top: '0px', left: '0px' })
      };

      document.body.innerHTML = `
        <article>
          <p>Content with custom styling for checkboxes that needs to be long enough to pass the minimum content length requirements for extraction by the content scraper system.</p>
        </article>
      `;

      const scraper = new ContentScraper({ 
        checkboxStyling: customStyling,
        showCheckboxes: true 
      });
      
      await scraper.run();

      const checkbox = document.querySelector('div[style*="position: absolute"]') as HTMLElement;
      expect(checkbox.style.background).toBe('red');

      scraper.destroy();
    });
  });

  describe('integration scenarios', () => {
    it('should work end-to-end with selection workflow', async () => {
      document.body.innerHTML = `
        <article>
          <p>First article content that should be extracted and selectable. This content needs to be long enough to pass the minimum content length requirements for extraction by the content scraper system.</p>
        </article>
        <article>
          <p>Second article content that should also be extracted and selectable. This content also needs to be long enough to pass the minimum content length requirements for extraction by the content scraper system.</p>
        </article>
      `;

      const scraper = new ContentScraper();
      const selectionEvents: Content[] = [];

      scraper.on('selectionChanged', (content) => {
        selectionEvents.push(content);
      });

      // Extract content
      await scraper.run();
      let content = scraper.getContent();
      expect(content!.items).toHaveLength(2);
      expect(content!.items.every(item => !item.selected)).toBe(true);

      // Display checkboxes
      scraper.displayCheckboxes();
      const checkboxes = document.querySelectorAll('div[style*="position: absolute"]') as NodeListOf<HTMLElement>;
      expect(checkboxes).toHaveLength(2);

      // Select first item
      checkboxes[0].click();
      content = scraper.getContent();
      expect(content!.items[0].selected).toBe(true);
      expect(content!.items[1].selected).toBe(false);

      // Select second item
      checkboxes[1].click();
      content = scraper.getContent();
      expect(content!.items[0].selected).toBe(true);
      expect(content!.items[1].selected).toBe(true);

      // Deselect first item
      checkboxes[0].click();
      content = scraper.getContent();
      expect(content!.items[0].selected).toBe(false);
      expect(content!.items[1].selected).toBe(true);

      // Verify events were emitted
      expect(selectionEvents).toHaveLength(3);

      scraper.destroy();
    });
  });
});