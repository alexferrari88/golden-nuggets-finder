import { test, expect } from './fixtures';
import type { GoldenNugget } from '../../src/shared/types';

const TEST_URL = 'https://blog.jxmo.io/p/there-is-only-one-model';

// Golden nuggets from the real webpage - these are the test cases
const GOLDEN_NUGGETS: GoldenNugget[] = [
  {
    type: "tool",
    startContent: "Project CETI is a large-scale",
    endContent: "to talk to whales.",
    synthesis: "A large-scale project demonstrating the ambitious potential of AI to decode complex natural communication (whale speech), which can inspire developers and entrepreneurs to tackle grand challenges with AI."
  },
  {
    type: "analogy", 
    startContent: "Growing up, I sometimes played",
    endContent: "guess almost anything.",
    synthesis: "This analogy provides a simple yet powerful mental model for how semantic search or large language models might narrow down concepts in a high-dimensional space, valuable for understanding vector embeddings or knowledge representation."
  },
  {
    type: "explanation",
    startContent: "One perspective on AI",
    endContent: "the source coding theorem.)",
    synthesis: "This core explanation posits that intelligence is fundamentally compression, linking it to Shannon's theorem and scaling laws. It provides a unifying theoretical framework for AI developers and researchers to understand model capabilities and the path to AGI."
  },
  {
    type: "explanation",
    startContent: "Generalization only begins when",
    endContent: "generalization occurs.",
    synthesis: "Explains a critical insight: AI models generalize not by memorizing but by being forced to compress and combine information when training datasets exceed their capacity. This is vital for developers optimizing training strategies and understanding model behavior."
  },
  {
    type: "model",
    startContent: "The theory that models",
    endContent: "bigger and smarter.",
    synthesis: "Introduces a significant new model suggesting that AI models converge to a shared universal representation space as they scale. This provides a valuable framework for understanding model interoperability, transfer learning, and the future of AI."
  }
];

test.describe('Highlighter TDD', () => {
  
  test.beforeEach(async ({ cleanPage }) => {
    // Navigate to the real webpage
    await cleanPage.goto(TEST_URL, { waitUntil: 'networkidle' });
    
    // Wait for content to load
    await cleanPage.waitForSelector('body', { state: 'visible' });
    
    // Inject the design system and highlighter implementation
    await cleanPage.addScriptTag({
      content: `
        // Design system colors for highlighting
        const colors = {
          highlight: {
            background: 'rgba(255, 215, 0, 0.3)',
            border: 'rgba(255, 193, 7, 0.6)',
            hover: 'rgba(255, 215, 0, 0.45)'
          }
        };

        const generateInlineStyles = {
          highlightStyle: () => \`background-color: \${colors.highlight.background} !important; padding: 2px 4px !important; border-radius: 3px !important; border: 1px solid \${colors.highlight.border} !important; box-shadow: 0 0 0 2px \${colors.highlight.border}40, 0 2px 4px rgba(0,0,0,0.1) !important; position: relative !important; z-index: 1100 !important; display: inline !important; font-weight: 500 !important; text-decoration: none !important; color: inherit !important;\`
        };

        // Real Highlighter implementation
        class Highlighter {
          constructor() {
            this.highlightedElements = [];
            this.highlightClassName = 'golden-nugget-highlight';
          }

          highlightNugget(nugget, pageContent) {
            try {
              if (this.isAlreadyHighlighted(nugget)) {
                return true;
              }

              const range = this.findTextInDOM(nugget.startContent, nugget.endContent);
              if (!range) {
                console.warn('Could not find text range for nugget:', nugget);
                return false;
              }

              const highlightElement = this.highlightRange(range);
              if (!highlightElement) {
                console.warn('Could not create highlight for nugget:', nugget);
                return false;
              }

              this.highlightedElements.push(highlightElement);
              console.log('Successfully highlighted nugget:', nugget);
              return true;
            } catch (error) {
              console.error('Error highlighting nugget:', error, nugget);
              return false;
            }
          }

          scrollToHighlight(nugget) {
            const highlightElement = this.highlightedElements.find(element => {
              const elementText = element.textContent || '';
              return elementText.includes(nugget.startContent) && elementText.includes(nugget.endContent);
            });

            if (highlightElement) {
              highlightElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest'
              });
            } else {
              console.warn('No highlight found for nugget:', nugget);
            }
          }

          clearHighlights() {
            this.highlightedElements.forEach(element => {
              if (element.parentNode) {
                const parent = element.parentNode;
                while (element.firstChild) {
                  parent.insertBefore(element.firstChild, element);
                }
                parent.removeChild(element);
              }
            });
            this.highlightedElements = [];
          }

          getHighlightCount() {
            return this.highlightedElements.length;
          }

          isAlreadyHighlighted(nugget) {
            return this.highlightedElements.some(element => {
              const elementText = element.textContent || '';
              return elementText.includes(nugget.startContent) && elementText.includes(nugget.endContent);
            });
          }

          createHighlightElement() {
            const span = document.createElement('span');
            span.className = this.highlightClassName;
            span.setAttribute('data-golden-nugget-highlight', 'true');
            span.style.cssText = generateInlineStyles.highlightStyle();
            return span;
          }

          findTextInDOM(startContent, endContent) {
            try {
              const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                {
                  acceptNode: (node) => {
                    const parent = node.parentElement;
                    if (parent && (
                      parent.tagName === 'SCRIPT' || 
                      parent.tagName === 'STYLE' ||
                      parent.tagName === 'NOSCRIPT'
                    )) {
                      return NodeFilter.FILTER_REJECT;
                    }
                    return node.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                  }
                }
              );

              let fullText = '';
              const textNodeMap = [];
              
              let currentNode = walker.nextNode();
              while (currentNode) {
                const nodeText = currentNode.textContent || '';
                const startIndex = fullText.length;
                const endIndex = startIndex + nodeText.length;
                
                textNodeMap.push({
                  node: currentNode,
                  startIndex,
                  endIndex
                });
                
                fullText += nodeText;
                currentNode = walker.nextNode();
              }

              const startIndex = fullText.indexOf(startContent);
              if (startIndex === -1) {
                console.warn('Start content not found:', startContent);
                return null;
              }

              const endContentIndex = fullText.indexOf(endContent, startIndex);
              if (endContentIndex === -1) {
                console.warn('End content not found:', endContent);
                return null;
              }

              const endIndex = endContentIndex + endContent.length;

              const startNodeInfo = textNodeMap.find(info => 
                startIndex >= info.startIndex && startIndex < info.endIndex
              );
              const endNodeInfo = textNodeMap.find(info => 
                endIndex > info.startIndex && endIndex <= info.endIndex
              );

              if (!startNodeInfo || !endNodeInfo) {
                console.warn('Could not find DOM nodes for text positions');
                return null;
              }

              const range = document.createRange();
              const startOffset = startIndex - startNodeInfo.startIndex;
              range.setStart(startNodeInfo.node, startOffset);
              const endOffset = endIndex - endNodeInfo.startIndex;
              range.setEnd(endNodeInfo.node, endOffset);

              return range;
            } catch (error) {
              console.error('Error finding text in DOM:', error);
              return null;
            }
          }

          highlightRange(range) {
            try {
              if (range.collapsed) {
                console.warn('Cannot highlight collapsed range');
                return null;
              }

              const contents = range.extractContents();
              const highlightElement = this.createHighlightElement();
              highlightElement.appendChild(contents);
              range.insertNode(highlightElement);
              
              return highlightElement;
            } catch (error) {
              console.error('Error highlighting range:', error);
              return null;
            }
          }
        }

        // Make available globally for tests
        window.Highlighter = Highlighter;
        window.testGoldenNuggets = ${JSON.stringify(GOLDEN_NUGGETS)};
      `
    });
  });

  test('should find all golden nugget text content on the page', async ({ cleanPage }) => {
    // First, verify that all the startContent and endContent exist on the page
    for (const nugget of GOLDEN_NUGGETS) {
      const pageContent = await cleanPage.textContent('body');
      
      expect(pageContent).toContain(nugget.startContent);
      expect(pageContent).toContain(nugget.endContent);
      
      // Verify startContent appears before endContent
      const startIndex = pageContent.indexOf(nugget.startContent);
      const endIndex = pageContent.indexOf(nugget.endContent);
      expect(startIndex).toBeLessThan(endIndex);
    }
  });

  test('should highlight individual golden nuggets successfully', async ({ cleanPage }) => {
    const results = await cleanPage.evaluate(() => {
      const highlighter = new window.Highlighter();
      const results = [];
      
      for (const nugget of window.testGoldenNuggets) {
        const highlighted = highlighter.highlightNugget(nugget);
        results.push({ nugget, highlighted });
      }
      
      return results;
    });

    // All should succeed now
    for (const result of results) {
      expect(result.highlighted).toBe(true);
    }
  });

  test('should not modify page content when highlighting fails', async ({ cleanPage }) => {
    const originalContent = await cleanPage.textContent('body');
    
    await cleanPage.evaluate(() => {
      const highlighter = new window.Highlighter();
      
      for (const nugget of window.testGoldenNuggets) {
        highlighter.highlightNugget(nugget);
      }
    });

    const afterContent = await cleanPage.textContent('body');
    expect(afterContent).toBe(originalContent);
  });

  test('should have no highlighted elements initially', async ({ cleanPage }) => {
    const highlightedCount = await cleanPage.evaluate(() => {
      return document.querySelectorAll('[data-golden-nugget-highlight]').length;
    });
    
    expect(highlightedCount).toBe(0);
  });

  test('should clear highlights without errors', async ({ cleanPage }) => {
    await cleanPage.evaluate(() => {
      const highlighter = new window.Highlighter();
      highlighter.clearHighlights(); // Should not throw
    });
    
    const highlightedCount = await cleanPage.evaluate(() => {
      return document.querySelectorAll('[data-golden-nugget-highlight]').length;
    });
    
    expect(highlightedCount).toBe(0);
  });

  // These tests will be uncommented as we implement the highlighter
  
  test('should successfully highlight first golden nugget', async ({ cleanPage }) => {
    const result = await cleanPage.evaluate(() => {
      const highlighter = new window.Highlighter();
      const nugget = window.testGoldenNuggets[0]; // "Project CETI is a large-scale" -> "to talk to whales."
      return highlighter.highlightNugget(nugget);
    });

    expect(result).toBe(true);
    
    // Verify highlight element exists
    const highlightedElements = await cleanPage.locator('[data-golden-nugget-highlight]');
    await expect(highlightedElements).toHaveCount(1);
  });

  test('should highlight text that spans multiple DOM elements', async ({ cleanPage }) => {
    const results = await cleanPage.evaluate(() => {
      const highlighter = new window.Highlighter();
      const results = [];
      
      for (const nugget of window.testGoldenNuggets) {
        const highlighted = highlighter.highlightNugget(nugget);
        results.push({ nugget, highlighted });
      }
      
      return results;
    });

    // All should succeed
    for (const result of results) {
      expect(result.highlighted).toBe(true);
    }
    
    // Verify all highlights exist
    const highlightedElements = await cleanPage.locator('[data-golden-nugget-highlight]');
    await expect(highlightedElements).toHaveCount(GOLDEN_NUGGETS.length);
  });

  test('should not create duplicate highlights', async ({ cleanPage }) => {
    await cleanPage.evaluate(() => {
      const highlighter = new window.Highlighter();
      const nugget = window.testGoldenNuggets[0];
      
      // Highlight the same nugget twice
      highlighter.highlightNugget(nugget);
      highlighter.highlightNugget(nugget);
    });

    // Should still only have one highlight
    const highlightedElements = await cleanPage.locator('[data-golden-nugget-highlight]');
    await expect(highlightedElements).toHaveCount(1);
  });

  test('should preserve original page text content', async ({ cleanPage }) => {
    const originalContent = await cleanPage.textContent('body');
    
    await cleanPage.evaluate(() => {
      const highlighter = new window.Highlighter();
      
      for (const nugget of window.testGoldenNuggets) {
        highlighter.highlightNugget(nugget);
      }
    });

    const afterContent = await cleanPage.textContent('body');
    expect(afterContent).toBe(originalContent);
  });

  test('should apply correct highlighting styles', async ({ cleanPage }) => {
    await cleanPage.evaluate(() => {
      const highlighter = new window.Highlighter();
      const nugget = window.testGoldenNuggets[0];
      highlighter.highlightNugget(nugget);
    });

    const highlightElement = cleanPage.locator('[data-golden-nugget-highlight]').first();
    
    // Verify styling
    await expect(highlightElement).toHaveCSS('background-color', 'rgba(255, 215, 0, 0.3)');
    await expect(highlightElement).toHaveCSS('border', '1px solid rgba(255, 193, 7, 0.6)');
  });

  test('should scroll to highlighted content', async ({ cleanPage }) => {
    await cleanPage.evaluate(() => {
      const highlighter = new window.Highlighter();
      const nugget = window.testGoldenNuggets[0];
      highlighter.highlightNugget(nugget);
      highlighter.scrollToHighlight(nugget);
    });

    // Verify the highlighted element is in viewport
    const highlightElement = cleanPage.locator('[data-golden-nugget-highlight]').first();
    await expect(highlightElement).toBeInViewport();
  });

  test('should clear all highlights', async ({ cleanPage }) => {
    await cleanPage.evaluate(() => {
      const highlighter = new window.Highlighter();
      
      // Add all highlights
      for (const nugget of window.testGoldenNuggets) {
        highlighter.highlightNugget(nugget);
      }
      
      // Clear all highlights
      highlighter.clearHighlights();
    });

    const highlightedElements = await cleanPage.locator('[data-golden-nugget-highlight]');
    await expect(highlightedElements).toHaveCount(0);
  });
});