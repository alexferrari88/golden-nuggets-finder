import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GenericExtractor } from '../../extractors/generic';

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'https://example.com/test'
  },
  writable: true
});

describe('GenericExtractor', () => {
  let extractor: GenericExtractor;

  beforeEach(() => {
    extractor = new GenericExtractor(false);
    // Reset DOM
    document.body.innerHTML = '';
    document.title = 'Test Page Title';
    
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
  });

  describe('constructor', () => {
    it('should initialize with includeHtml option', () => {
      const extractorWithHtml = new GenericExtractor(true);
      const extractorWithoutHtml = new GenericExtractor(false);
      
      expect(extractorWithHtml).toBeInstanceOf(GenericExtractor);
      expect(extractorWithoutHtml).toBeInstanceOf(GenericExtractor);
    });
  });

  describe('extract', () => {
    it('should extract basic page information', async () => {
      document.title = 'Sample Page';
      
      const result = await extractor.extract();
      
      expect(result.pageURL).toBe('https://example.com/test');
      expect(result.title).toBe('Sample Page');
      expect(result.items).toEqual([]);
    });

    it('should use fallback title for untitled pages', async () => {
      document.title = '';
      
      const result = await extractor.extract();
      
      expect(result.title).toBe('Untitled Page');
    });

    it('should extract content from article elements', async () => {
      document.body.innerHTML = `
        <article>
          <p>This is a long enough article content that should be extracted by the generic extractor.</p>
        </article>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('post');
      expect(result.items[0].textContent).toContain('This is a long enough article content');
      expect(result.items[0].selected).toBe(false);
      expect(result.items[0].element.tagName).toBe('ARTICLE');
    });

    it('should extract content from main elements', async () => {
      document.body.innerHTML = `
        <main>
          <p>This is main content that is long enough to be extracted by the generic extractor.</p>
        </main>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('This is main content');
      expect(result.items[0].element.tagName).toBe('MAIN');
    });

    it('should extract content from role="main" elements', async () => {
      document.body.innerHTML = `
        <div role="main">
          <p>This is content in a main role element that should be extracted successfully.</p>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('This is content in a main role element');
    });

    it('should extract content from .content class elements', async () => {
      document.body.innerHTML = `
        <div class="content">
          <p>This is content in a content class div that should be extracted by the generic extractor.</p>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('This is content in a content class div');
    });

    it('should extract content from #content id elements', async () => {
      document.body.innerHTML = `
        <div id="content">
          <p>This is content in a content id div that should be extracted by the generic extractor.</p>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('This is content in a content id div');
    });

    it('should extract content from .post class elements', async () => {
      document.body.innerHTML = `
        <div class="post">
          <p>This is a post class div with enough content to be extracted by the generic extractor.</p>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('This is a post class div');
    });

    it('should extract content from .entry-content class elements', async () => {
      document.body.innerHTML = `
        <div class="entry-content">
          <p>This is entry content that should be extracted successfully by the generic extractor.</p>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('This is entry content');
    });

    it('should prioritize earlier selectors', async () => {
      document.body.innerHTML = `
        <article>
          <p>This is article content that should be extracted first by the generic extractor.</p>
        </article>
        <div class="content">
          <p>This is content class div that should not be extracted since article was found first.</p>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('This is article content');
      expect(result.items[0].element.tagName).toBe('ARTICLE');
    });

    it('should fall back to paragraphs when no main content found', async () => {
      document.body.innerHTML = `
        <p>This is a long paragraph that should be extracted as fallback content by the generic extractor.</p>
        <p>This is another long paragraph that should also be extracted by the generic extractor.</p>
        <p>Short</p>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(2);
      expect(result.items[0].textContent).toContain('This is a long paragraph');
      expect(result.items[1].textContent).toContain('This is another long paragraph');
      expect(result.items[0].element.tagName).toBe('P');
    });

    it('should filter out short content in fallback mode', async () => {
      document.body.innerHTML = `
        <p>This is a very long paragraph with more than fifty characters of content that should be extracted.</p>
        <p>Short</p>
        <p>Also short content</p>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('This is a very long paragraph');
    });

    it('should filter out invisible elements in fallback mode', async () => {
      document.body.innerHTML = `
        <p style="display: none;">This hidden paragraph should not be extracted even though it has enough content.</p>
        <p>This visible paragraph has enough content and should be extracted by the generic extractor.</p>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('This visible paragraph');
    });

    it('should ignore content shorter than minimum length', async () => {
      document.body.innerHTML = `
        <article>
          <p>Short</p>
        </article>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(0);
    });

    it('should include HTML content when includeHtml is true', async () => {
      const extractorWithHtml = new GenericExtractor(true);
      
      document.body.innerHTML = `
        <article>
          <p><strong>Bold</strong> content with <em>emphasis</em> that is long enough.</p>
        </article>
      `;
      
      const result = await extractorWithHtml.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].htmlContent).toContain('<strong>Bold</strong>');
      expect(result.items[0].htmlContent).toContain('<em>emphasis</em>');
    });

    it('should not include HTML content when includeHtml is false', async () => {
      document.body.innerHTML = `
        <article>
          <p><strong>Bold</strong> content with <em>emphasis</em> that is long enough.</p>
        </article>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].htmlContent).toBeUndefined();
    });

    it('should generate unique IDs for different content items', async () => {
      document.body.innerHTML = `
        <article>
          <p>First article content that is long enough to be extracted.</p>
        </article>
        <article>
          <p>Second article content that is also long enough to be extracted.</p>
        </article>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).not.toBe(result.items[1].id);
      expect(result.items[0].id).toBeTruthy();
      expect(result.items[1].id).toBeTruthy();
    });

    it('should handle multiple elements of same type', async () => {
      document.body.innerHTML = `
        <article>
          <p>First article with sufficient content for extraction.</p>
        </article>
        <article>
          <p>Second article with sufficient content for extraction.</p>
        </article>
        <article>
          <p>Third article with sufficient content for extraction.</p>
        </article>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(3);
      expect(result.items[0].textContent).toContain('First article');
      expect(result.items[1].textContent).toContain('Second article');
      expect(result.items[2].textContent).toContain('Third article');
    });

    it('should handle mixed content with nested elements', async () => {
      document.body.innerHTML = `
        <article>
          <h2>Article Title</h2>
          <p>Article paragraph with <a href="#">links</a> and other elements.</p>
          <ul>
            <li>List item one</li>
            <li>List item two</li>
          </ul>
        </article>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('Article Title');
      expect(result.items[0].textContent).toContain('Article paragraph');
      expect(result.items[0].textContent).toContain('links');
      expect(result.items[0].textContent).toContain('List item one');
      expect(result.items[0].textContent).toContain('List item two');
    });
  });
});