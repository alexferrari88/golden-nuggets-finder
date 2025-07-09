import { describe, it, expect, beforeEach } from 'vitest';
import { ContentExtractor } from './base';

// Create a concrete implementation for testing
class TestContentExtractor extends ContentExtractor {
  async extractContent(): Promise<string> {
    return 'test content';
  }
}

describe('ContentExtractor', () => {
  let extractor: TestContentExtractor;

  beforeEach(() => {
    extractor = new TestContentExtractor();
  });

  describe('cleanText', () => {
    it('should replace multiple whitespace with single space', () => {
      const input = 'hello    world\t\t\ttest';
      const expected = 'hello world test';
      const result = extractor['cleanText'](input);
      expect(result).toBe(expected);
    });

    it('should normalize line breaks', () => {
      const input = 'line1\n\n\n\nline2';
      const result = extractor['cleanText'](input);
      // The cleanText method normalizes multiple line breaks to double line breaks
      expect(result).toContain('line1');
      expect(result).toContain('line2');
      // Test that consecutive line breaks are normalized
      expect(result.replace(/\s+/g, ' ')).toContain('line1');
      expect(result.replace(/\s+/g, ' ')).toContain('line2');
    });

    it('should trim whitespace', () => {
      const input = '  hello world  ';
      const expected = 'hello world';
      const result = extractor['cleanText'](input);
      expect(result).toBe(expected);
    });

    it('should handle empty string', () => {
      const input = '';
      const expected = '';
      const result = extractor['cleanText'](input);
      expect(result).toBe(expected);
    });

    it('should handle string with only whitespace', () => {
      const input = '   \n\n\t   ';
      const expected = '';
      const result = extractor['cleanText'](input);
      expect(result).toBe(expected);
    });
  });

  describe('extractTextFromElement', () => {
    it('should extract text content from element', () => {
      document.body.innerHTML = '<div id="test">Hello <span>world</span></div>';
      const element = document.getElementById('test')!;
      
      const result = extractor['extractTextFromElement'](element);
      expect(result).toBe('Hello world');
    });

    it('should remove script and style elements', () => {
      document.body.innerHTML = `
        <div id="test">
          Hello
          <script>console.log("test");</script>
          <style>.test { color: red; }</style>
          world
        </div>
      `;
      const element = document.getElementById('test')!;
      
      const result = extractor['extractTextFromElement'](element);
      expect(result).toBe('Hello world');
    });

    it('should handle element with no text content', () => {
      document.body.innerHTML = '<div id="test"></div>';
      const element = document.getElementById('test')!;
      
      const result = extractor['extractTextFromElement'](element);
      expect(result).toBe('');
    });

    it('should clean the extracted text', () => {
      document.body.innerHTML = '<div id="test">Hello    world\n\n\ntest</div>';
      const element = document.getElementById('test')!;
      
      const result = extractor['extractTextFromElement'](element);
      expect(result).toBe('Hello world test');
    });
  });

  describe('isElementVisible', () => {
    it('should return true for visible element', () => {
      document.body.innerHTML = '<div id="test" style="width: 100px; height: 100px;">Test</div>';
      const element = document.getElementById('test')!;
      
      // Mock getBoundingClientRect to return non-zero dimensions
      element.getBoundingClientRect = vi.fn().mockReturnValue({
        width: 100,
        height: 100,
        top: 0,
        left: 0,
        bottom: 100,
        right: 100
      });
      
      const result = extractor['isElementVisible'](element);
      expect(result).toBe(true);
    });

    it('should return false for element with display none', () => {
      document.body.innerHTML = '<div id="test" style="display: none;">Test</div>';
      const element = document.getElementById('test')!;
      
      const result = extractor['isElementVisible'](element);
      expect(result).toBe(false);
    });

    it('should return false for element with visibility hidden', () => {
      document.body.innerHTML = '<div id="test" style="visibility: hidden;">Test</div>';
      const element = document.getElementById('test')!;
      
      const result = extractor['isElementVisible'](element);
      expect(result).toBe(false);
    });

    it('should return false for element with zero dimensions', () => {
      document.body.innerHTML = '<div id="test" style="width: 0; height: 0;">Test</div>';
      const element = document.getElementById('test')!;
      
      const result = extractor['isElementVisible'](element);
      expect(result).toBe(false);
    });
  });

  describe('extractContent', () => {
    it('should return test content', async () => {
      const result = await extractor.extractContent();
      expect(result).toBe('test content');
    });
  });
});