import { test, expect } from './fixtures';

test.describe('Reddit Analysis', () => {
  test('can load and analyze Reddit discussion page', async ({ cleanPage }) => {
    try {
      // Navigate to the specific Reddit discussion using clean browser (no extension)
      await cleanPage.goto('https://www.reddit.com/r/AskPhilosophyFAQ/comments/4ifqi3/im_interested_in_philosophy_where_should_i_start/');
      
      // Wait for page to load
      await cleanPage.waitForLoadState('networkidle');
      
      // Check if the page loaded properly
      const title = await cleanPage.title();
      console.log('Page title:', title);
      
      // With clean browser context, Reddit should load properly
      expect(title.length).toBeGreaterThan(0);
      
      // Look for the main post content
      const postSelector = '[data-test-id="post-content"]';
      const postExists = await cleanPage.locator(postSelector).count() > 0;
      
      if (!postExists) {
        // Try alternative selectors for Reddit post content
        const altSelectors = [
          '.Post',
          '[data-click-id="text"]',
          '.md',
          '.usertext-body'
        ];
        
        let foundContent = false;
        for (const selector of altSelectors) {
          const count = await cleanPage.locator(selector).count();
          if (count > 0) {
            console.log(`Found content with selector: ${selector}`);
            foundContent = true;
            break;
          }
        }
        expect(foundContent).toBe(true);
      }
      
      // Look for comments section
      const commentsExist = await cleanPage.evaluate(() => {
        const commentSelectors = [
          '[data-test-id="comment"]',
          '.Comment',
          '.commentarea',
          '.usertext-body'
        ];
        
        return commentSelectors.some(selector => 
          document.querySelectorAll(selector).length > 0
        );
      });
      
      console.log('Comments found:', commentsExist);
      
      // Check if there are any existing highlights (there shouldn't be any initially)
      const existingHighlights = await cleanPage.locator('.nugget-highlight').count();
      expect(existingHighlights).toBe(0);
      
      // Check if there are any comment highlights
      const existingCommentHighlights = await cleanPage.locator('.nugget-comment-highlight').count();
      expect(existingCommentHighlights).toBe(0);
      
    } catch (error) {
      console.error('Test failed:', error);
      
      // Take a screenshot for debugging
      await cleanPage.screenshot({ path: 'tests/debug-reddit-page.png', fullPage: true });
      
      throw error;
    }
  });

  test('can simulate extension analysis on Reddit page', async ({ cleanPage }) => {
    try {
      await cleanPage.goto('https://www.reddit.com/r/AskPhilosophyFAQ/comments/4ifqi3/im_interested_in_philosophy_where_should_i_start/');
      await cleanPage.waitForLoadState('networkidle');
      
      // With clean browser, Reddit should be accessible
      const title = await cleanPage.title();
      console.log('Page title for analysis test:', title);
      expect(title.length).toBeGreaterThan(0);
      
      // Test content extraction from Reddit structure
      const result = await cleanPage.evaluate(() => {
        // Simulate Reddit content extraction with multiple selector strategies
        const postSelectors = [
          '[data-test-id="post-content"]',
          '.Post',
          '[data-click-id="text"]',
          '.md',
          '.usertext-body'
        ];
        
        const commentSelectors = [
          '[data-test-id="comment"] .usertext-body',
          '.Comment .usertext-body',
          '.commentarea .usertext-body',
          '.usertext-body'
        ];
        
        let postText = '';
        for (const selector of postSelectors) {
          const element = document.querySelector(selector);
          if (element?.textContent) {
            postText = element.textContent;
            break;
          }
        }
        
        let commentElements: Element[] = [];
        for (const selector of commentSelectors) {
          const elements = Array.from(document.querySelectorAll(selector));
          if (elements.length > 0) {
            commentElements = elements;
            break;
          }
        }
        
        const commentTexts = commentElements
          .map(el => el.textContent || '')
          .filter(text => text.length > 20) // Filter out short comments
          .slice(0, 5); // First 5 substantial comments
        
        return {
          postText: postText.substring(0, 500) + '...',
          postLength: postText.length,
          commentCount: commentTexts.length,
          commentPreviews: commentTexts.map(text => text.substring(0, 100) + '...'),
          hasPost: postText.length > 0,
          hasComments: commentTexts.length > 0,
          totalCommentElements: commentElements.length
        };
      });
      
      console.log('Reddit content analysis:', JSON.stringify(result, null, 2));
      
      // Verify we can extract meaningful content from Reddit
      expect(result.postLength).toBeGreaterThan(10);
      
      // This is a FAQ post, so it should have substantial content
      if (result.hasPost) {
        expect(result.postText.length).toBeGreaterThan(50);
      }
      
    } catch (error) {
      console.error('Analysis simulation failed:', error);
      await cleanPage.screenshot({ path: 'tests/debug-reddit-analysis.png', fullPage: true });
      throw error;
    }
  });

  test('can test Reddit content structure for highlighting', async ({ cleanPage }) => {
    try {
      await cleanPage.goto('https://www.reddit.com/r/AskPhilosophyFAQ/comments/4ifqi3/im_interested_in_philosophy_where_should_i_start/');
      await cleanPage.waitForLoadState('networkidle');
      
      // With clean browser, Reddit should be accessible
      const title = await cleanPage.title();
      console.log('Page title for structure test:', title);
      expect(title.length).toBeGreaterThan(0);
      
      // Test the specific text structure of Reddit
      const result = await cleanPage.evaluate(() => {
        // Test Reddit-specific selectors and structure
        const titleElement = document.querySelector('h1') || document.querySelector('[data-test-id="post-content"] h1');
        const title = titleElement?.textContent || '';
        
        // Look for post metadata
        const metadataSelectors = [
          '[data-test-id="post-metadata"]',
          '.Post__header',
          '.thing .tagline'
        ];
        
        let metadata = '';
        for (const selector of metadataSelectors) {
          const element = document.querySelector(selector);
          if (element?.textContent) {
            metadata = element.textContent;
            break;
          }
        }
        
        // Analyze comment structure
        const allTextElements = document.querySelectorAll('.usertext-body, .md, [data-test-id="comment"]');
        const textElements = Array.from(allTextElements).map(element => {
          const text = element.textContent || '';
          return {
            length: text.length,
            hasSubstantialText: text.length > 100,
            preview: text.substring(0, 150) + '...',
            tagName: element.tagName,
            className: element.className
          };
        }).filter(item => item.hasSubstantialText).slice(0, 3);
        
        return {
          title: title.substring(0, 100),
          hasTitle: title.length > 0,
          metadata: metadata.substring(0, 100),
          hasMetadata: metadata.length > 0,
          substantialTextBlocks: textElements.length,
          textBlockSamples: textElements,
          totalTextElements: allTextElements.length
        };
      });
      
      console.log('Reddit structure analysis:', JSON.stringify(result, null, 2));
      
      // Verify the page has the expected structure
      expect(result.totalTextElements).toBeGreaterThan(0);
      
      // This should be a substantial FAQ post
      if (result.hasTitle) {
        expect(result.title.toLowerCase()).toContain('philosophy');
      }
      
    } catch (error) {
      console.error('Structure test failed:', error);
      throw error;
    }
  });
});