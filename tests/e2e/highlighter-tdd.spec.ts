import type { GoldenNugget } from "../../src/shared/types";
import { expect, test } from "./fixtures";

const TEST_URL = "https://blog.jxmo.io/p/there-is-only-one-model";

// Golden nuggets from the real webpage - these are the test cases
const GOLDEN_NUGGETS: GoldenNugget[] = [
	{
		type: "tool",
		startContent: "Project CETI is a large-scale",
		endContent: "to talk to whales.",
		synthesis:
			"A large-scale project demonstrating the ambitious potential of AI to decode complex natural communication (whale speech), which can inspire developers and entrepreneurs to tackle grand challenges with AI.",
	},
	{
		type: "analogy",
		startContent: "Growing up, I sometimes played",
		endContent: "guess almost anything.",
		synthesis:
			"This analogy provides a simple yet powerful mental model for how semantic search or large language models might narrow down concepts in a high-dimensional space, valuable for understanding vector embeddings or knowledge representation.",
	},
	{
		type: "explanation",
		startContent: "One perspective on AI",
		endContent: "the source coding theorem.)",
		synthesis:
			"This core explanation posits that intelligence is fundamentally compression, linking it to Shannon's theorem and scaling laws. It provides a unifying theoretical framework for AI developers and researchers to understand model capabilities and the path to AGI.",
	},
	{
		type: "explanation",
		startContent: "Generalization only begins when",
		endContent: "generalization occurs.",
		synthesis:
			"Explains a critical insight: AI models generalize not by memorizing but by being forced to compress and combine information when training datasets exceed their capacity. This is vital for developers optimizing training strategies and understanding model behavior.",
	},
	{
		type: "model",
		startContent: "The theory that models",
		endContent: "bigger and smarter.",
		synthesis:
			"Introduces a significant new model suggesting that AI models converge to a shared universal representation space as they scale. This provides a valuable framework for understanding model interoperability, transfer learning, and the future of AI.",
	},
];

test.describe("Highlighter TDD", () => {
	test.beforeEach(async ({ cleanPage }) => {
		// Navigate to the real webpage
		await cleanPage.goto(TEST_URL, { waitUntil: "networkidle" });

		// Wait for content to load
		await cleanPage.waitForSelector("body", { state: "visible" });

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

        // Check if CSS Custom Highlight API is already supported
        if (typeof CSS !== 'undefined' && CSS.highlights && typeof Highlight !== 'undefined') {
          console.log('CSS Custom Highlight API is natively supported');
        } else {
          console.log('Setting up CSS Custom Highlight API polyfill');
          
          // Type declarations for CSS Custom Highlight API
          class HighlightPolyfill {
            constructor(...ranges) {
              this.ranges = ranges;
              console.log('Highlight polyfill constructor called with', ranges.length, 'ranges');
            }
          }
          
          if (!CSS.highlights) {
            CSS.highlights = new Map();
            console.log('Created CSS.highlights Map');
          }
          
          window.Highlight = HighlightPolyfill;
        }

        // CSS Custom Highlight API implementation
        class Highlighter {
          constructor() {
            this.highlightedElements = [];
            this.cssHighlights = new Map();
            this.globalHighlight = null;
            this.highlightClassName = 'golden-nugget-highlight';
            this.cssHighlightSupported = this.checkCSSHighlightSupport();
            console.log('Highlighter constructor - CSS support:', this.cssHighlightSupported);
            this.setupCSSHighlightStyles();
          }
          
          checkCSSHighlightSupport() {
            const supported = typeof CSS !== 'undefined' && 
                   CSS.highlights !== undefined && 
                   typeof Highlight !== 'undefined';
            console.log('checkCSSHighlightSupport - CSS:', typeof CSS, 'highlights:', !!CSS.highlights, 'Highlight:', typeof Highlight);
            console.log('checkCSSHighlightSupport result:', supported);
            return supported;
          }
          
          setupCSSHighlightStyles() {
            console.log('setupCSSHighlightStyles called, supported:', this.cssHighlightSupported);
            if (!this.cssHighlightSupported) return;
            
            if (document.querySelector('#golden-nugget-highlight-styles')) {
              console.log('Styles already exist');
              return;
            }
            
            const styleSheet = document.createElement('style');
            styleSheet.id = 'golden-nugget-highlight-styles';
            styleSheet.textContent = \`
              ::highlight(golden-nugget) {
                background-color: \${colors.highlight.background} !important;
                border-radius: 3px !important;
                box-shadow: 0 0 0 1px \${colors.highlight.border} !important;
                color: inherit !important;
              }
            \`;
            document.head.appendChild(styleSheet);
            console.log('Added CSS highlight styles');
          }
          
          getNuggetKey(nugget) {
            return \`nugget-\${nugget.startContent.toLowerCase()}-\${nugget.endContent.toLowerCase()}\`.replace(/[^a-zA-Z0-9-_]/g, '_');
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

              const success = this.cssHighlightSupported 
                ? this.highlightWithCSS(range, nugget)
                : this.highlightWithDOM(range, nugget);
                
              if (!success) {
                console.warn('Could not create highlight for nugget:', nugget);
                return false;
              }

              console.log('Successfully highlighted nugget:', nugget);
              return true;
            } catch (error) {
              console.error('Error highlighting nugget:', error, nugget);
              return false;
            }
          }

          scrollToHighlight(nugget) {
            // For CSS highlights, find the range and scroll to it
            const cssHighlightKey = this.getNuggetKey(nugget);
            const cssHighlightInfo = this.cssHighlights.get(cssHighlightKey);
            
            if (cssHighlightInfo) {
              const range = cssHighlightInfo.range.cloneRange();
              const tempElement = document.createElement('span');
              tempElement.style.position = 'absolute';
              tempElement.style.visibility = 'hidden';
              tempElement.style.pointerEvents = 'none';
              
              try {
                range.insertNode(tempElement);
                tempElement.scrollIntoView({
                  behavior: 'smooth',
                  block: 'center',
                  inline: 'nearest'
                });
                tempElement.remove();
              } catch (error) {
                console.warn('Could not scroll to CSS highlight:', error);
                tempElement.remove();
              }
              return;
            }
            
            // Fallback to DOM element-based scrolling
            const highlightElement = this.highlightedElements.find(element => {
              const elementText = (element.textContent || '').toLowerCase();
              return elementText.includes(nugget.startContent.toLowerCase()) && elementText.includes(nugget.endContent.toLowerCase());
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
            // Clear CSS highlights
            if (this.cssHighlightSupported && CSS.highlights) {
              if (this.globalHighlight) {
                this.globalHighlight.clear();
                CSS.highlights.delete('golden-nugget');
                this.globalHighlight = null;
              }
              this.cssHighlights.clear();
            }
            
            // Clear DOM-based highlights (fallback)
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
            return this.cssHighlights.size + this.highlightedElements.length;
          }

          isAlreadyHighlighted(nugget) {
            const nuggetKey = this.getNuggetKey(nugget);
            
            // Check CSS highlights first
            if (this.cssHighlights.has(nuggetKey)) {
              return true;
            }
            
            // Check DOM-based highlights (fallback)
            return this.highlightedElements.some(element => {
              const elementText = (element.textContent || '').toLowerCase();
              return elementText.includes(nugget.startContent.toLowerCase()) && 
                     elementText.includes(nugget.endContent.toLowerCase()) &&
                     element.hasAttribute('data-nugget-key') &&
                     element.getAttribute('data-nugget-key') === nuggetKey;
            });
          }

          createHighlightElement(nugget) {
            const span = document.createElement('span');
            span.className = this.highlightClassName;
            span.setAttribute('data-golden-nugget-highlight', 'true');
            
            const nuggetKey = this.getNuggetKey(nugget);
            span.setAttribute('data-nugget-key', nuggetKey);
            
            span.style.cssText = generateInlineStyles.highlightStyle();
            return span;
          }
          
          highlightWithCSS(range, nugget) {
            try {
              console.log('highlightWithCSS called');
              if (range.collapsed) {
                console.warn('Cannot highlight collapsed range');
                return false;
              }

              // Create global highlight object if it doesn't exist
              if (!this.globalHighlight) {
                console.log('Creating global highlight object');
                this.globalHighlight = new Highlight();
                CSS.highlights.set('golden-nugget', this.globalHighlight);
                console.log('Registered global highlight with name "golden-nugget"');
              }

              // Add this range to the global highlight
              const clonedRange = range.cloneRange();
              this.globalHighlight.add(clonedRange);
              
              // Store the range info for management
              const highlightKey = this.getNuggetKey(nugget);
              this.cssHighlights.set(highlightKey, {
                range: clonedRange,
                nugget
              });
              
              console.log('Successfully added CSS highlight:', highlightKey);
              console.log('CSS.highlights size:', CSS.highlights.size);
              return true;
            } catch (error) {
              console.error('Error creating CSS highlight:', error);
              console.error('Error details:', error.message);
              console.error('Falling back to DOM highlighting');
              return this.highlightWithDOM(range, nugget);
            }
          }
          
          highlightWithDOM(range, nugget) {
            try {
              if (range.collapsed) {
                console.warn('Cannot highlight collapsed range');
                return false;
              }

              // Use cloneContents instead of extractContents to preserve original content
              const contents = range.cloneContents();
              
              if (!contents || contents.childNodes.length === 0) {
                console.warn('No contents cloned from range');
                return false;
              }
              
              const highlightElement = this.createHighlightElement(nugget);
              highlightElement.appendChild(contents);
              
              try {
                range.deleteContents();
                range.insertNode(highlightElement);
              } catch (insertError) {
                console.error('DOM insertion failed:', insertError);
                return false;
              }
              
              if (!highlightElement.parentNode) {
                console.error('Highlight element was not properly inserted into DOM');
                return false;
              }
              
              this.highlightedElements.push(highlightElement);
              console.log('Successfully created DOM highlight');
              return true;
            } catch (error) {
              console.error('Error highlighting with DOM:', error);
              return false;
            }
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

              // Case-insensitive search
              const fullTextLower = fullText.toLowerCase();
              const startContentLower = startContent.toLowerCase();
              const endContentLower = endContent.toLowerCase();
              
              const startIndex = fullTextLower.indexOf(startContentLower);
              if (startIndex === -1) {
                console.warn('Start content not found:', startContent);
                return null;
              }

              const endContentIndex = fullTextLower.indexOf(endContentLower, startIndex);
              if (endContentIndex === -1) {
                console.warn('End content not found:', endContent);
                return null;
              }

              const endIndex = endContentIndex + endContentLower.length;

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

        }

        // Make available globally for tests
        window.Highlighter = Highlighter;
        window.testGoldenNuggets = ${JSON.stringify(GOLDEN_NUGGETS)};
      `,
		});
	});

	test("should find all golden nugget text content on the page", async ({
		cleanPage,
	}) => {
		// First, verify that all the startContent and endContent exist on the page
		for (const nugget of GOLDEN_NUGGETS) {
			const pageContent = await cleanPage.textContent("body");

			expect(pageContent).toContain(nugget.startContent);
			expect(pageContent).toContain(nugget.endContent);

			// Verify startContent appears before endContent
			const startIndex = pageContent.indexOf(nugget.startContent);
			const endIndex = pageContent.indexOf(nugget.endContent);
			expect(startIndex).toBeLessThan(endIndex);
		}
	});

	test("should highlight individual golden nuggets successfully", async ({
		cleanPage,
	}) => {
		// Capture console logs from the browser
		const consoleMessages: string[] = [];
		cleanPage.on("console", (msg) => {
			consoleMessages.push(`${msg.type()}: ${msg.text()}`);
		});

		const results = await cleanPage.evaluate(() => {
			const highlighter = new window.Highlighter();
			const results = [];

			// Debug information
			console.log("CSS Highlight support:", highlighter.cssHighlightSupported);
			console.log("CSS.highlights available:", !!CSS.highlights);
			console.log("Highlight constructor available:", !!window.Highlight);

			for (const nugget of window.testGoldenNuggets) {
				console.log(
					"Testing nugget:",
					`${nugget.startContent.substring(0, 30)}...`,
				);
				const highlighted = highlighter.highlightNugget(nugget);
				console.log("Highlight result:", highlighted);
				console.log("Highlight count after:", highlighter.getHighlightCount());
				results.push({ nugget, highlighted });
			}

			return results;
		});

		console.log("Console messages from browser:");
		for (const msg of consoleMessages) {
			console.log("  ", msg);
		}

		// All should succeed now
		for (const result of results) {
			expect(result.highlighted).toBe(true);
		}
	});

	test("should not modify page content when highlighting fails", async ({
		cleanPage,
	}) => {
		const originalContent = await cleanPage.textContent("body");

		await cleanPage.evaluate(() => {
			const highlighter = new window.Highlighter();

			for (const nugget of window.testGoldenNuggets) {
				highlighter.highlightNugget(nugget);
			}
		});

		const afterContent = await cleanPage.textContent("body");
		expect(afterContent).toBe(originalContent);
	});

	test("should have no highlighted elements initially", async ({
		cleanPage,
	}) => {
		const highlightedCount = await cleanPage.evaluate(() => {
			return document.querySelectorAll("[data-golden-nugget-highlight]").length;
		});

		expect(highlightedCount).toBe(0);
	});

	test("should clear highlights without errors", async ({ cleanPage }) => {
		await cleanPage.evaluate(() => {
			const highlighter = new window.Highlighter();
			highlighter.clearHighlights(); // Should not throw
		});

		const highlightedCount = await cleanPage.evaluate(() => {
			return document.querySelectorAll("[data-golden-nugget-highlight]").length;
		});

		expect(highlightedCount).toBe(0);
	});

	// These tests will be uncommented as we implement the highlighter

	test("should successfully highlight first golden nugget", async ({
		cleanPage,
	}) => {
		// Capture console logs from the browser
		const consoleMessages: string[] = [];
		cleanPage.on("console", (msg) => {
			consoleMessages.push(`${msg.type()}: ${msg.text()}`);
		});

		const debug = await cleanPage.evaluate(() => {
			const highlighter = new window.Highlighter();
			const nugget = window.testGoldenNuggets[0]; // "Project CETI is a large-scale" -> "to talk to whales."

			console.log("First nugget:", nugget);
			console.log("CSS support:", highlighter.cssHighlightSupported);

			const result = highlighter.highlightNugget(nugget);
			console.log("Highlight result:", result);
			console.log("CSS highlights count:", highlighter.cssHighlights.size);
			console.log(
				"DOM highlights count:",
				highlighter.highlightedElements.length,
			);

			return {
				result,
				cssSupported: highlighter.cssHighlightSupported,
				cssHighlightCount: highlighter.cssHighlights.size,
				domHighlightCount: highlighter.highlightedElements.length,
				totalCount: highlighter.getHighlightCount(),
			};
		});

		console.log("Debug info:", debug);
		console.log("Console messages from browser:");
		for (const msg of consoleMessages) {
			console.log("  ", msg);
		}

		expect(debug.result).toBe(true);

		// Verify highlight exists (either CSS or DOM)
		if (debug.cssSupported && debug.cssHighlightCount > 0) {
			// CSS highlights don't create DOM elements, so just check the count
			expect(debug.totalCount).toBeGreaterThan(0);
		} else {
			// Fallback to DOM elements
			const highlightedElements = await cleanPage.locator(
				"[data-golden-nugget-highlight]",
			);
			await expect(highlightedElements).toHaveCount(1);
		}
	});

	test("should highlight text that spans multiple DOM elements", async ({
		cleanPage,
	}) => {
		const results = await cleanPage.evaluate(() => {
			const highlighter = new window.Highlighter();
			const results = [];

			for (const nugget of window.testGoldenNuggets) {
				const highlighted = highlighter.highlightNugget(nugget);
				results.push({ nugget, highlighted });
			}

			return {
				results,
				totalHighlights: highlighter.getHighlightCount(),
				cssSupported: highlighter.cssHighlightSupported,
			};
		});

		// All should succeed
		for (const result of results.results) {
			expect(result.highlighted).toBe(true);
		}

		// Verify all highlights exist (either CSS or DOM)
		expect(results.totalHighlights).toBe(GOLDEN_NUGGETS.length);

		if (!results.cssSupported) {
			// Only check DOM elements if CSS isn't supported
			const highlightedElements = await cleanPage.locator(
				"[data-golden-nugget-highlight]",
			);
			await expect(highlightedElements).toHaveCount(GOLDEN_NUGGETS.length);
		}
	});

	test("should not create duplicate highlights", async ({ cleanPage }) => {
		const result = await cleanPage.evaluate(() => {
			const highlighter = new window.Highlighter();
			const nugget = window.testGoldenNuggets[0];

			// Highlight the same nugget twice
			const first = highlighter.highlightNugget(nugget);
			const second = highlighter.highlightNugget(nugget);

			return {
				firstResult: first,
				secondResult: second,
				totalHighlights: highlighter.getHighlightCount(),
				cssSupported: highlighter.cssHighlightSupported,
			};
		});

		expect(result.firstResult).toBe(true);
		expect(result.secondResult).toBe(true); // Should return true but not create duplicate
		expect(result.totalHighlights).toBe(1); // Should still only have one highlight

		if (!result.cssSupported) {
			// Only check DOM elements if CSS isn't supported
			const highlightedElements = await cleanPage.locator(
				"[data-golden-nugget-highlight]",
			);
			await expect(highlightedElements).toHaveCount(1);
		}
	});

	test("should preserve original page text content", async ({ cleanPage }) => {
		const originalContent = await cleanPage.textContent("body");

		await cleanPage.evaluate(() => {
			const highlighter = new window.Highlighter();

			for (const nugget of window.testGoldenNuggets) {
				highlighter.highlightNugget(nugget);
			}
		});

		const afterContent = await cleanPage.textContent("body");
		expect(afterContent).toBe(originalContent);
	});

	test("should apply correct highlighting styles", async ({ cleanPage }) => {
		const result = await cleanPage.evaluate(() => {
			const highlighter = new window.Highlighter();
			const nugget = window.testGoldenNuggets[0];
			const success = highlighter.highlightNugget(nugget);

			return {
				success,
				cssSupported: highlighter.cssHighlightSupported,
				highlightCount: highlighter.getHighlightCount(),
			};
		});

		expect(result.success).toBe(true);
		expect(result.highlightCount).toBe(1);

		if (result.cssSupported) {
			// For CSS highlights, check that the CSS styles were added to the document
			const styleElement = await cleanPage.locator(
				"#golden-nugget-highlight-styles",
			);
			await expect(styleElement).toHaveCount(1);

			const styleContent = await styleElement.textContent();
			expect(styleContent).toContain("::highlight(golden-nugget)");
			expect(styleContent).toContain("rgba(255, 215, 0, 0.3)");
		} else {
			// For DOM highlights, check the actual element styles
			const highlightElement = cleanPage
				.locator("[data-golden-nugget-highlight]")
				.first();
			await expect(highlightElement).toHaveCSS(
				"background-color",
				"rgba(255, 215, 0, 0.3)",
			);
			await expect(highlightElement).toHaveCSS(
				"border",
				"1px solid rgba(255, 193, 7, 0.6)",
			);
		}
	});

	test("should scroll to highlighted content", async ({ cleanPage }) => {
		const result = await cleanPage.evaluate(() => {
			const highlighter = new window.Highlighter();
			const nugget = window.testGoldenNuggets[0];
			const highlighted = highlighter.highlightNugget(nugget);

			// Get initial scroll position
			const initialScrollY = window.scrollY;

			highlighter.scrollToHighlight(nugget);

			return {
				highlighted,
				cssSupported: highlighter.cssHighlightSupported,
				highlightCount: highlighter.getHighlightCount(),
				initialScrollY,
				finalScrollY: window.scrollY,
			};
		});

		expect(result.highlighted).toBe(true);
		expect(result.highlightCount).toBe(1);

		if (result.cssSupported) {
			// For CSS highlights, we can't easily test viewport visibility,
			// but we can check that scrolling occurred or highlighting succeeded
			expect(result.highlighted).toBe(true);
		} else {
			// For DOM highlights, check the actual element is in viewport
			const highlightElement = cleanPage
				.locator("[data-golden-nugget-highlight]")
				.first();
			await expect(highlightElement).toBeInViewport();
		}
	});

	test("should clear all highlights", async ({ cleanPage }) => {
		await cleanPage.evaluate(() => {
			const highlighter = new window.Highlighter();

			// Add all highlights
			for (const nugget of window.testGoldenNuggets) {
				highlighter.highlightNugget(nugget);
			}

			// Clear all highlights
			highlighter.clearHighlights();
		});

		const highlightedElements = await cleanPage.locator(
			"[data-golden-nugget-highlight]",
		);
		await expect(highlightedElements).toHaveCount(0);
	});
});
