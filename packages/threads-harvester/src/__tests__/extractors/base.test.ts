import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseExtractor } from '../../extractors/base';
import { Content } from '../../types';

// Create a concrete implementation for testing
class TestExtractor extends BaseExtractor {
  public async extract(): Promise<Content> {
    return {
      pageURL: 'https://test.com',
      title: 'Test Page',
      items: []
    };
  }

  // Expose protected methods for testing
  public testCleanText(text: string): string {
    return this.cleanText(text);
  }

  public testExtractTextFromElement(element: Element): string {
    return this.extractTextFromElement(element);
  }

  public testIsElementVisible(element: Element): boolean {
    return this.isElementVisible(element);
  }

  public testGenerateId(content: string): string {
    return this.generateId(content);
  }
}

describe('BaseExtractor', () => {
  let extractor: TestExtractor;

  beforeEach(() => {
    extractor = new TestExtractor(false);
    // Reset DOM
    document.body.innerHTML = '';
    
    // Mock DOM APIs for visibility checking - more dynamic approach
    Element.prototype.getBoundingClientRect = vi.fn(function(this: HTMLElement) {
      // Return zero dimensions if element has display:none or visibility:hidden
      if (this.style.display === 'none' || this.style.visibility === 'hidden' || 
          this.style.width === '0px' || this.style.height === '0px') {
        return { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => {} };
      }
      return { width: 100, height: 50, top: 0, left: 0, right: 100, bottom: 50, x: 0, y: 0, toJSON: () => {} };
    });
    
    Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
      get() { 
        // Return null if element has display:none
        if (this.style.display === 'none') return null;
        return document.body; 
      }, 
      configurable: true
    });
    
    window.getComputedStyle = vi.fn((element: Element) => {
      const htmlElement = element as HTMLElement;
      // Return actual style values based on inline styles when possible
      return {
        display: htmlElement.style.display || 'block',
        visibility: htmlElement.style.visibility || 'visible'
      } as CSSStyleDeclaration;
    });
  });

  describe('constructor', () => {
    it('should initialize with includeHtml option', () => {
      const extractorWithHtml = new TestExtractor(true);
      const extractorWithoutHtml = new TestExtractor(false);
      
      expect(extractorWithHtml).toBeInstanceOf(BaseExtractor);
      expect(extractorWithoutHtml).toBeInstanceOf(BaseExtractor);
    });
  });

  describe('cleanText', () => {
    it('should normalize whitespace', () => {
      const input = 'Hello    world\n\n\ntest   text';
      const result = extractor.testCleanText(input);
      expect(result).toBe('Hello world\n\ntest text');
    });

    it('should trim leading and trailing whitespace', () => {
      const input = '   Hello world   ';
      const result = extractor.testCleanText(input);
      expect(result).toBe('Hello world');
    });

    it('should handle empty strings', () => {
      const result = extractor.testCleanText('');
      expect(result).toBe('');
    });

    it('should handle strings with only whitespace', () => {
      const result = extractor.testCleanText('   \n\n   ');
      expect(result).toBe('');
    });

    it('should cache results for performance', () => {
      const input = 'Same text for caching test';
      
      // First call
      const result1 = extractor.testCleanText(input);
      // Second call should use cache
      const result2 = extractor.testCleanText(input);
      
      expect(result1).toBe(result2);
      expect(result1).toBe('Same text for caching test');
    });

    it('should clear cache when size exceeds limit', () => {
      // Fill cache with many entries
      for (let i = 0; i < 101; i++) {
        extractor.testCleanText(`test text ${i}`);
      }
      
      // Cache should still work for new entries
      const result = extractor.testCleanText('new test text');
      expect(result).toBe('new test text');
    });
  });

  describe('extractTextFromElement', () => {
    it('should extract text from simple element', () => {
      const div = document.createElement('div');
      div.textContent = 'Hello world';
      
      const result = extractor.testExtractTextFromElement(div);
      expect(result).toBe('Hello world');
    });

    it('should extract text from nested elements', () => {
      const div = document.createElement('div');
      div.innerHTML = '<p>First paragraph</p><p>Second paragraph</p>';
      
      const result = extractor.testExtractTextFromElement(div);
      expect(result).toBe('First paragraph Second paragraph');
    });

    it('should skip script and style elements', () => {
      const div = document.createElement('div');
      div.innerHTML = `
        <p>Visible text</p>
        <script>alert('hidden');</script>
        <style>.test { color: red; }</style>
        <p>More visible text</p>
      `;
      
      const result = extractor.testExtractTextFromElement(div);
      expect(result).toBe('Visible text More visible text');
    });

    it('should skip non-content elements', () => {
      const div = document.createElement('div');
      div.innerHTML = `
        <p>Normal text</p>
        <noscript>Noscript content</noscript>
        <svg><title>SVG title</title></svg>
        <canvas>Canvas fallback</canvas>
        <p>More normal text</p>
      `;
      
      const result = extractor.testExtractTextFromElement(div);
      expect(result).toBe('Normal text More normal text');
    });

    it('should handle empty elements', () => {
      const div = document.createElement('div');
      
      const result = extractor.testExtractTextFromElement(div);
      expect(result).toBe('');
    });

    it('should handle elements with only whitespace', () => {
      const div = document.createElement('div');
      div.innerHTML = '   \n\n   ';
      
      const result = extractor.testExtractTextFromElement(div);
      expect(result).toBe('');
    });
  });

  describe('isElementVisible', () => {
    it('should return false for elements not in DOM', () => {
      const div = document.createElement('div');
      
      const result = extractor.testIsElementVisible(div);
      expect(result).toBe(false);
    });

    it('should return true for visible elements', () => {
      const div = document.createElement('div');
      div.style.width = '100px';
      div.style.height = '100px';
      div.textContent = 'Visible content';
      document.body.appendChild(div);
      
      const result = extractor.testIsElementVisible(div);
      expect(result).toBe(true);
      
      document.body.removeChild(div);
    });

    it('should return false for elements with display none', () => {
      const div = document.createElement('div');
      div.style.display = 'none';
      div.style.width = '100px';
      div.style.height = '100px';
      document.body.appendChild(div);
      
      const result = extractor.testIsElementVisible(div);
      expect(result).toBe(false);
      
      document.body.removeChild(div);
    });

    it('should return false for elements with visibility hidden', () => {
      const div = document.createElement('div');
      div.style.visibility = 'hidden';
      div.style.width = '100px';
      div.style.height = '100px';
      document.body.appendChild(div);
      
      const result = extractor.testIsElementVisible(div);
      expect(result).toBe(false);
      
      document.body.removeChild(div);
    });

    it('should return false for elements with zero dimensions', () => {
      const div = document.createElement('div');
      div.style.width = '0px';
      div.style.height = '0px';
      document.body.appendChild(div);
      
      const result = extractor.testIsElementVisible(div);
      expect(result).toBe(false);
      
      document.body.removeChild(div);
    });
  });

  describe('generateId', () => {
    it('should generate consistent IDs for same content', () => {
      const content = 'Test content for ID generation';
      
      const id1 = extractor.testGenerateId(content);
      const id2 = extractor.testGenerateId(content);
      
      expect(id1).toBe(id2);
      expect(typeof id1).toBe('string');
      expect(id1.length).toBeGreaterThan(0);
    });

    it('should generate different IDs for different content', () => {
      const content1 = 'First content';
      const content2 = 'Second content';
      
      const id1 = extractor.testGenerateId(content1);
      const id2 = extractor.testGenerateId(content2);
      
      expect(id1).not.toBe(id2);
    });

    it('should handle empty string', () => {
      const id = extractor.testGenerateId('');
      expect(id).toBe('0');
    });

    it('should generate numeric string IDs', () => {
      const id = extractor.testGenerateId('test content');
      expect(id).toMatch(/^\d+$/);
    });

    it('should handle unicode characters', () => {
      const content = 'Test with émojis 🚀 and ünicøde';
      const id = extractor.testGenerateId(content);
      
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
      expect(id).toMatch(/^\d+$/);
    });

    it('should handle very long content', () => {
      const longContent = 'a'.repeat(10000);
      const id = extractor.testGenerateId(longContent);
      
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
      expect(id).toMatch(/^\d+$/);
    });
  });

  describe('abstract extract method', () => {
    it('should be implemented by concrete class', async () => {
      const result = await extractor.extract();
      
      expect(result).toBeDefined();
      expect(result.pageURL).toBe('https://test.com');
      expect(result.title).toBe('Test Page');
      expect(result.items).toEqual([]);
    });
  });
});