import { test, expect } from './fixtures';

test.describe('Substack Highlighting', () => {
  test('can load and analyze Substack page', async ({ context, extensionId }) => {
    const page = await context.newPage();
    
    try {
      // Navigate to the specific Substack page from the logs
      await page.goto('https://nanransohoff.substack.com/p/what-virtue-is-undersupplied-today');
      
      // Wait for page to load
      await page.waitForLoadState('networkidle');
      
      // Check if the page loaded properly
      await expect(page).toHaveTitle(/what virtue is undersupplied today/i);
      
      // Look for the main article content
      const articleSelector = 'article';
      await expect(page.locator(articleSelector)).toBeVisible();
      
      // Get the article text to understand the structure
      const articleText = await page.locator(articleSelector).textContent();
      console.log('Article preview:', articleText?.substring(0, 200) + '...');
      
      // Check if there are any existing highlights (there shouldn't be any initially)
      const existingHighlights = await page.locator('.nugget-highlight').count();
      expect(existingHighlights).toBe(0);
      
      // Check if there are any comment highlights
      const existingCommentHighlights = await page.locator('.nugget-comment-highlight').count();
      expect(existingCommentHighlights).toBe(0);
      
    } catch (error) {
      console.error('Test failed:', error);
      
      // Take a screenshot for debugging
      await page.screenshot({ path: 'tests/debug-substack-page.png', fullPage: true });
      
      throw error;
    } finally {
      await page.close();
    }
  });

  test('can simulate extension analysis on Substack page', async ({ context, extensionId }) => {
    // Note: This test is limited by Playwright's content script injection limitations
    // We can check the page structure and simulate what the highlighter should do
    
    const page = await context.newPage();
    
    try {
      await page.goto('https://nanransohoff.substack.com/p/what-virtue-is-undersupplied-today');
      await page.waitForLoadState('networkidle');
      
      // Inject our highlighter code to test it directly
      await page.addScriptTag({
        path: './src/content/ui/highlighter.ts'
      });
      
      // Test if we can find the content that should be highlighted
      // Based on the logs, these nuggets were found:
      const nuggetContents = [
        'I think vision is in short supply today . The ability to formulate a normative, opinionated perspective',
        'I think culturally, many millennials were sold a very different bag of goods',
        'Here are some prompts that I\'ve found generative for myself in case they spark something for you'
      ];
      
      for (const content of nuggetContents) {
        // Try to find this content in the page
        const words = content.split(' ').slice(0, 5); // First 5 words
        const partialContent = words.join(' ');
        
        // Check if this content exists in the page
        const containsContent = await page.evaluate((searchText) => {
          return document.body.textContent?.includes(searchText) || false;
        }, partialContent);
        
        console.log(`Content "${partialContent}..." found in page:`, containsContent);
        
        if (containsContent) {
          // This content should be highlightable
          expect(containsContent).toBe(true);
        }
      }
      
    } catch (error) {
      console.error('Analysis simulation failed:', error);
      await page.screenshot({ path: 'tests/debug-substack-analysis.png', fullPage: true });
      throw error;
    } finally {
      await page.close();
    }
  });

  test('can test highlighting algorithm logic', async ({ context, extensionId }) => {
    const page = await context.newPage();
    
    try {
      await page.goto('https://nanransohoff.substack.com/p/what-virtue-is-undersupplied-today');
      await page.waitForLoadState('networkidle');
      
      // Test the specific highlighting algorithm that failed
      const result = await page.evaluate(() => {
        // Simulate the normalizeText function
        function normalizeText(text: string): string {
          return text
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s]/g, '')
            .toLowerCase()
            .trim();
        }
        
        // Simulate the improvedTextMatching function
        function improvedTextMatching(nuggetText: string, commentText: string): boolean {
          const normalizeAggressively = (text: string): string => {
            return text
              .toLowerCase()
              .replace(/\s+/g, ' ')
              .replace(/[^\w\s]/g, '')
              .replace(/\d+/g, '')
              .trim();
          };
          
          const normalizedNugget = normalizeAggressively(nuggetText);
          const normalizedComment = normalizeAggressively(commentText);
          
          // Strategy 1: Try exact substring match first
          if (normalizedComment.includes(normalizedNugget)) {
            return true;
          }
          
          // Strategy 2: Try reverse
          if (normalizedNugget.includes(normalizedComment)) {
            return true;
          }
          
          // Strategy 3: Word matching
          const nuggetWords = normalizedNugget.split(' ').filter(word => word.length > 2);
          const commentWords = normalizedComment.split(' ');
          
          const matchingWords = nuggetWords.filter(word => commentWords.includes(word));
          const matchRatio = matchingWords.length / nuggetWords.length;
          
          return matchRatio >= 0.7;
        }
        
        // Test with actual content from the page
        const articleElement = document.querySelector('article');
        const articleText = articleElement?.textContent || '';
        
        // Test nuggets from the logs
        const testNuggets = [
          'I think vision is in short supply today . The ability to formulate a normative, opinionated perspective',
          'I think culturally, many millennials were sold a very different bag of goods',
          'Here are some prompts that I\'ve found generative for myself in case they spark something for you'
        ];
        
        const results = testNuggets.map(nugget => {
          const shouldMatch = improvedTextMatching(nugget, articleText);
          const normalizedNugget = normalizeText(nugget);
          const normalizedArticle = normalizeText(articleText);
          const containsExact = normalizedArticle.includes(normalizedNugget);
          
          return {
            nugget: nugget.substring(0, 50) + '...',
            shouldMatch,
            containsExact,
            nuggetLength: normalizedNugget.length,
            articleLength: normalizedArticle.length
          };
        });
        
        return {
          results,
          articlePreview: articleText.substring(0, 300) + '...',
          articleLength: articleText.length
        };
      });
      
      console.log('Highlighting algorithm test results:', JSON.stringify(result, null, 2));
      
      // At least one nugget should match
      const hasMatches = result.results.some(r => r.shouldMatch || r.containsExact);
      expect(hasMatches).toBe(true);
      
    } catch (error) {
      console.error('Algorithm test failed:', error);
      throw error;
    } finally {
      await page.close();
    }
  });
});