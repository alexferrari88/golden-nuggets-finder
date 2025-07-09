import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Highlighter } from './highlighter';
import { GoldenNugget } from '../../shared/types';

describe('Highlighter', () => {
  let highlighter: Highlighter;

  beforeEach(() => {
    highlighter = new Highlighter();
    document.body.innerHTML = '';
    
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        href: 'https://example.com',
        hostname: 'example.com'
      },
      writable: true
    });
  });

  const createMockNugget = (content: string, type: 'tool' | 'media' | 'explanation' | 'analogy' | 'model' = 'explanation'): GoldenNugget => ({
    type,
    content,
    synthesis: 'Test synthesis'
  });

  describe('highlightNugget', () => {
    it('should highlight nugget content in text', async () => {
      const nugget = createMockNugget('test content');
      document.body.innerHTML = '<p>This is test content for highlighting</p>';

      const result = await highlighter.highlightNugget(nugget);
      
      expect(result).toBe(true);
      const highlight = document.querySelector('.nugget-highlight');
      expect(highlight).toBeTruthy();
      expect(highlight?.textContent).toContain('test content');
    });

    it('should not highlight if content not found', async () => {
      const nugget = createMockNugget('missing content');
      document.body.innerHTML = '<p>This is some other content</p>';

      const result = await highlighter.highlightNugget(nugget);
      
      expect(result).toBe(false);
      const highlight = document.querySelector('.nugget-highlight');
      expect(highlight).toBeFalsy();
    });

    it('should handle normalized text matching', async () => {
      const nugget = createMockNugget('test content');
      document.body.innerHTML = '<p>This is    test   content    with extra spaces</p>';

      const result = await highlighter.highlightNugget(nugget);
      
      expect(result).toBe(true);
      const highlight = document.querySelector('.nugget-highlight');
      expect(highlight).toBeTruthy();
    });

    it('should handle case insensitive matching', async () => {
      const nugget = createMockNugget('Test Content');
      document.body.innerHTML = '<p>This is test content for highlighting</p>';

      const result = await highlighter.highlightNugget(nugget);
      
      expect(result).toBe(true);
      const highlight = document.querySelector('.nugget-highlight');
      expect(highlight).toBeTruthy();
    });

    it('should handle punctuation in text matching', async () => {
      const nugget = createMockNugget('test content');
      document.body.innerHTML = '<p>This is test, content! for highlighting</p>';

      const result = await highlighter.highlightNugget(nugget);
      
      expect(result).toBe(true);
      const highlight = document.querySelector('.nugget-highlight');
      expect(highlight).toBeTruthy();
    });

    it('should skip already highlighted content', async () => {
      const nugget = createMockNugget('test content');
      document.body.innerHTML = '<p>This is <span class="nugget-highlight">test content</span> already highlighted</p>';

      const result = await highlighter.highlightNugget(nugget);
      
      expect(result).toBe(false);
    });

    it('should skip UI elements', async () => {
      const nugget = createMockNugget('test content');
      document.body.innerHTML = `
        <div class="nugget-sidebar">test content</div>
        <div class="nugget-notification-banner">test content</div>
        <p>This is test content for highlighting</p>
      `;

      const result = await highlighter.highlightNugget(nugget);
      
      expect(result).toBe(true);
      const highlights = document.querySelectorAll('.nugget-highlight');
      expect(highlights.length).toBe(1);
      expect(highlights[0].parentElement?.tagName).toBe('P');
    });

    it('should only highlight first occurrence', async () => {
      const nugget = createMockNugget('test content');
      document.body.innerHTML = '<p>This is test content and also test content again</p>';

      const result = await highlighter.highlightNugget(nugget);
      
      expect(result).toBe(true);
      const highlights = document.querySelectorAll('.nugget-highlight');
      expect(highlights.length).toBe(1);
    });

    it('should add clickable indicator', async () => {
      const nugget = createMockNugget('test content');
      document.body.innerHTML = '<p>This is test content for highlighting</p>';

      await highlighter.highlightNugget(nugget);
      
      const indicator = document.querySelector('.nugget-indicator');
      expect(indicator).toBeTruthy();
    });

    it('should show type tag for discussion sites', async () => {
      Object.defineProperty(window, 'location', {
        value: { href: 'https://reddit.com/r/test' },
        writable: true
      });

      const nugget = createMockNugget('test content', 'tool');
      document.body.innerHTML = '<p>This is test content for highlighting</p>';

      await highlighter.highlightNugget(nugget);
      
      const indicator = document.querySelector('.nugget-indicator');
      expect(indicator?.textContent).toBe('[tool]');
    });

    it('should show sparkle icon for generic pages', async () => {
      Object.defineProperty(window, 'location', {
        value: { href: 'https://example.com' },
        writable: true
      });

      const nugget = createMockNugget('test content');
      document.body.innerHTML = '<p>This is test content for highlighting</p>';

      await highlighter.highlightNugget(nugget);
      
      const indicator = document.querySelector('.nugget-indicator');
      expect(indicator?.textContent).toBe('✨');
    });

    it('should set nugget type in dataset', async () => {
      const nugget = createMockNugget('test content', 'analogy');
      document.body.innerHTML = '<p>This is test content for highlighting</p>';

      await highlighter.highlightNugget(nugget);
      
      const highlight = document.querySelector('.nugget-highlight');
      expect(highlight?.dataset.nuggetType).toBe('analogy');
    });
  });

  describe('clearHighlights', () => {
    it('should remove all highlights', async () => {
      const nugget = createMockNugget('test content');
      document.body.innerHTML = '<p>This is test content for highlighting</p>';

      await highlighter.highlightNugget(nugget);
      expect(document.querySelector('.nugget-highlight')).toBeTruthy();

      highlighter.clearHighlights();
      expect(document.querySelector('.nugget-highlight')).toBeFalsy();
    });

    it('should restore original text', async () => {
      const nugget = createMockNugget('test content');
      document.body.innerHTML = '<p>This is test content for highlighting</p>';

      await highlighter.highlightNugget(nugget);
      
      // Verify highlighting worked
      expect(document.querySelector('.nugget-highlight')).toBeTruthy();
      
      highlighter.clearHighlights();
      
      // After clearing, the highlight should be removed
      expect(document.querySelector('.nugget-highlight')).toBeFalsy();
      
      // The text should be restored (may have some formatting differences)
      const restoredText = document.body.textContent;
      expect(restoredText).toContain('This is');
      expect(restoredText).toContain('test content');
      expect(restoredText).toContain('for highlighting');
    });

    it('should remove popups', async () => {
      const nugget = createMockNugget('test content');
      document.body.innerHTML = '<p>This is test content for highlighting</p>';

      await highlighter.highlightNugget(nugget);
      
      // Simulate popup creation
      const popup = document.createElement('div');
      popup.className = 'nugget-synthesis-popup';
      document.body.appendChild(popup);
      highlighter['popups'].push(popup);

      highlighter.clearHighlights();
      expect(document.querySelector('.nugget-synthesis-popup')).toBeFalsy();
    });

    it('should handle empty highlights array', () => {
      expect(() => highlighter.clearHighlights()).not.toThrow();
    });
  });

  describe('showSynthesisPopup', () => {
    it('should show popup when indicator is clicked', async () => {
      const nugget = createMockNugget('test content');
      document.body.innerHTML = '<p>This is test content for highlighting</p>';

      await highlighter.highlightNugget(nugget);
      
      const indicator = document.querySelector('.nugget-indicator') as HTMLElement;
      indicator.click();

      const popup = document.querySelector('.nugget-synthesis-popup');
      expect(popup).toBeTruthy();
      expect(popup?.textContent).toContain('Test synthesis');
    });

    it('should remove existing popups when showing new one', async () => {
      const nugget = createMockNugget('test content');
      document.body.innerHTML = '<p>This is test content for highlighting</p>';

      await highlighter.highlightNugget(nugget);
      
      const indicator = document.querySelector('.nugget-indicator') as HTMLElement;
      
      // Click twice to create two popups
      indicator.click();
      indicator.click();

      const popups = document.querySelectorAll('.nugget-synthesis-popup');
      expect(popups.length).toBe(1);
    });

    it('should close popup when close button is clicked', async () => {
      const nugget = createMockNugget('test content');
      document.body.innerHTML = '<p>This is test content for highlighting</p>';

      await highlighter.highlightNugget(nugget);
      
      const indicator = document.querySelector('.nugget-indicator') as HTMLElement;
      indicator.click();

      const closeBtn = document.querySelector('.nugget-synthesis-popup button') as HTMLButtonElement;
      closeBtn.click();

      expect(document.querySelector('.nugget-synthesis-popup')).toBeFalsy();
    });
  });

  describe('normalizeText', () => {
    it('should normalize text correctly', () => {
      const input = '  Hello,   World!  \n\n  Test  ';
      const expected = 'hello world test';
      
      const result = highlighter['normalizeText'](input);
      expect(result).toBe(expected);
    });

    it('should handle empty string', () => {
      const result = highlighter['normalizeText']('');
      expect(result).toBe('');
    });

    it('should handle string with only whitespace', () => {
      const result = highlighter['normalizeText']('   \n\n\t   ');
      expect(result).toBe('');
    });

    it('should remove punctuation', () => {
      const input = 'Hello, world! How are you?';
      const expected = 'hello world how are you';
      
      const result = highlighter['normalizeText'](input);
      expect(result).toBe(expected);
    });

    it('should handle mixed case', () => {
      const input = 'HeLLo WoRLd';
      const expected = 'hello world';
      
      const result = highlighter['normalizeText'](input);
      expect(result).toBe(expected);
    });
  });

  describe('positionPopup', () => {
    it('should position popup correctly', async () => {
      const nugget = createMockNugget('test content');
      document.body.innerHTML = '<p>This is test content for highlighting</p>';

      await highlighter.highlightNugget(nugget);
      
      const indicator = document.querySelector('.nugget-indicator') as HTMLElement;
      indicator.click();

      const popup = document.querySelector('.nugget-synthesis-popup') as HTMLElement;
      expect(popup.style.position).toBe('absolute');
      expect(popup.style.top).toBeTruthy();
      expect(popup.style.left).toBeTruthy();
    });
  });
});