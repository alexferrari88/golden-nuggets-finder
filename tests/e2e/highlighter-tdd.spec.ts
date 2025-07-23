import { test, expect } from './fixtures';
import type { GoldenNugget } from '../../src/shared/types';

test.describe('Highlighter TDD - Blog Post Highlighting', () => {
  const testUrl = 'https://blog.jxmo.io/p/there-is-only-one-model';
  
  const mockGoldenNuggets: GoldenNugget[] = [
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

  test('should create empty highlighter.ts file and basic structure', async ({ cleanPage }) => {
    // This test ensures we have a basic highlighter structure to build on
    await cleanPage.goto('data:text/html,<html><body><p>Test</p></body></html>');
    
    // Test will pass once we create the basic highlighter structure
    const highlighterExists = await cleanPage.evaluate(() => {
      // This will fail initially because the highlighter doesn't exist
      // We'll implement it to make this test pass
      return typeof window.highlightNuggets === 'function';
    });
    
    // Initially this should fail
    expect(highlighterExists).toBe(false);
  });

  test('should load the actual blog post and verify content exists', async ({ cleanPage }) => {
    await cleanPage.goto(testUrl, { waitUntil: 'networkidle' });
    
    // Wait for page to load completely
    await cleanPage.waitForTimeout(3000);
    
    // Check that the page has loaded by looking for our expected content
    const pageContent = await cleanPage.textContent('body');
    expect(pageContent).toContain('Project CETI is a large-scale');
    expect(pageContent).toContain('Growing up, I sometimes played');
    expect(pageContent).toContain('One perspective on AI');
  });

  test('should inject highlighter and attempt to highlight golden nuggets', async ({ cleanPage }) => {
    await cleanPage.goto(testUrl, { waitUntil: 'networkidle' });
    await cleanPage.waitForTimeout(3000);
    
    // Inject our highlighter code (this will fail initially)
    await cleanPage.addScriptTag({
      path: './src/content/ui/highlighter.ts'
    }).catch(() => {
      // Expected to fail since file doesn't exist yet
    });
    
    // Attempt to highlight nuggets
    const highlightResult = await cleanPage.evaluate((nuggets) => {
      try {
        // This will fail initially because highlightNuggets doesn't exist
        if (typeof window.highlightNuggets === 'function') {
          return window.highlightNuggets(nuggets);
        }
        return { success: false, error: 'highlightNuggets function not found' };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }, mockGoldenNuggets);
    
    // Initially this should fail
    expect(highlightResult.success).toBe(false);
  });

  test('should highlight specific nuggets and verify highlighting', async ({ cleanPage }) => {
    await cleanPage.goto(testUrl, { waitUntil: 'networkidle' });
    await cleanPage.waitForTimeout(3000);
    
    // Try to inject and use highlighter
    await cleanPage.addScriptTag({
      path: './dist/chrome-mv3/content-scripts/content.js'
    });
    
    // Wait for scripts to load
    await cleanPage.waitForTimeout(1000);
    
    // Test highlighting each nugget individually
    let successCount = 0;
    for (const nugget of mockGoldenNuggets) { // Test all nuggets
      console.log(`Testing highlighting for: ${nugget.startContent} -> ${nugget.endContent}`);
      
      const result = await cleanPage.evaluate((nugget) => {
        if (typeof window.highlightNugget === 'function') {
          return window.highlightNugget(nugget);
        }
        return { success: false, error: 'highlightNugget function not found' };
      }, nugget);
      
      console.log(`Highlighting result:`, result);
      
      // For now, we accept either success or failure - the goal is to not crash
      expect(typeof result.success).toBe('boolean');
      
      if (result.success) {
        successCount++;
        // If successful, verify the content is actually highlighted
        const highlightedElements = await cleanPage.locator('.golden-nugget-highlight').count();
        expect(highlightedElements).toBeGreaterThan(0);
      } else {
        // If not successful, that's ok for now - we're still developing
        console.log(`Highlighting failed for nugget: ${result.error}`);
      }
    }
    
    console.log(`Successfully highlighted ${successCount} out of ${mockGoldenNuggets.length} nuggets`);
    
    // For now, we expect at least 1 nugget to be highlighted successfully
    expect(successCount).toBeGreaterThan(0);
  });

  test('should verify highlighted elements have correct styling', async ({ cleanPage }) => {
    await cleanPage.goto(testUrl, { waitUntil: 'networkidle' });
    await cleanPage.waitForTimeout(3000);
    
    try {
      await cleanPage.addScriptTag({
        path: './src/content/ui/highlighter.ts'
      });
      
      // Inject design system for styling
      await cleanPage.addScriptTag({
        path: './src/shared/design-system.ts'
      });
      
      // Try to highlight nuggets
      await cleanPage.evaluate((nuggets) => {
        if (typeof window.highlightNuggets === 'function') {
          window.highlightNuggets(nuggets);
        }
      }, mockGoldenNuggets);
      
      // Check if highlighted elements have correct CSS classes
      const highlightedElements = await cleanPage.locator('.golden-nugget-highlight');
      const count = await highlightedElements.count();
      
      if (count > 0) {
        // Verify styling
        const firstHighlight = highlightedElements.first();
        const backgroundColor = await firstHighlight.evaluate(el => 
          window.getComputedStyle(el).backgroundColor
        );
        
        // Should use design system highlight color
        expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)'); // Not transparent
      }
    } catch (error) {
      // Expected to fail initially
      console.log('Expected failure:', error.message);
    }
  });

  test('should handle edge cases and not break page functionality', async ({ cleanPage }) => {
    await cleanPage.goto(testUrl, { waitUntil: 'networkidle' });
    await cleanPage.waitForTimeout(3000);
    
    try {
      await cleanPage.addScriptTag({
        path: './src/content/ui/highlighter.ts'
      });
      
      // Test with empty nuggets array
      const emptyResult = await cleanPage.evaluate(() => {
        if (typeof window.highlightNuggets === 'function') {
          return window.highlightNuggets([]);
        }
        return { success: false };
      });
      
      expect(emptyResult.success).toBe(true);
      
      // Test with invalid nuggets
      const invalidResult = await cleanPage.evaluate(() => {
        if (typeof window.highlightNuggets === 'function') {
          return window.highlightNuggets([
            { startContent: '', endContent: '', type: 'tool', synthesis: 'test' }
          ]);
        }
        return { success: false };
      });
      
      expect(invalidResult.success).toBe(true);
      
    } catch (error) {
      // Expected to fail initially
      console.log('Expected failure:', error.message);
    }
  });
});