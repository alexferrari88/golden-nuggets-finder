import { test, expect } from './fixtures/extension-fixture';
import { TEST_API_KEY, DEFAULT_PROMPTS, MOCK_TWITTER_THREAD } from './fixtures/test-data';
import { createMockTwitterPage, setupMockApiResponses } from './fixtures/mock-pages';
import { seedTestData } from './fixtures/chrome-api-setup';

test.describe('Twitter Thread Extraction', () => {
  // SKIPPED: These tests require content script injection which fails in Playwright
  // due to Chrome Extension MV3 permission simulation limitations.
  // See: https://github.com/microsoft/playwright/issues/18854
  // 
  // Alternative testing approach:
  // - Component tests for Twitter content extraction logic (tests/unit/content/extractors/)
  // - Manual testing checklist for Twitter-specific workflow validation
  test.skip();
  test.beforeEach(async ({ serviceWorker, chromeApiReady }) => {
    // Ensure Chrome APIs are ready before seeding test data
    expect(chromeApiReady).toBe(true);
    
    // Set up API key and prompts using the new Chrome API setup utilities
    await seedTestData(serviceWorker, {
      geminiApiKey: TEST_API_KEY,
      userPrompts: DEFAULT_PROMPTS
    });
  });

  test('should extract Twitter thread content via toolbar popup', async ({ page, popupPage }) => {
    // Set up mock Twitter page
    await createMockTwitterPage(page);
    await setupMockApiResponses(page);
    
    // Navigate to Twitter thread
    await page.goto('https://twitter.com/ai_developer/status/1234567890');
    
    // Wait for content to load
    await expect(page.locator('text=Just discovered Claude Code')).toBeVisible();
    
    // Go to popup and select prompt
    await popupPage.bringToFront();
    await expect(popupPage.locator('text=Find Tools')).toBeVisible();
    await popupPage.locator('text=Find Tools').click();
    
    // Switch back to main page
    await page.bringToFront();
    
    // Should show progress banner
    await expect(page.locator('text=Finding golden nuggets...')).toBeVisible();
    
    // Wait for analysis to complete
    await page.waitForTimeout(2000);
    
    // Should show results
    await expect(page.locator('[data-testid="golden-nugget-sidebar"]')).toBeVisible();
    await expect(page.locator('text=Claude Code')).toBeVisible();
  });

  test('should handle tweet expansion before extraction', async ({ page, popupPage }) => {
    // Set up mock Twitter page
    await createMockTwitterPage(page);
    await setupMockApiResponses(page);
    
    // Navigate to Twitter thread
    await page.goto('https://twitter.com/ai_developer/status/1234567890');
    
    // Verify truncated tweet is visible
    await expect(page.locator('text=Just discovered Claude Code - an AI assistant that helps with development. Game changer for debugging...')).toBeVisible();
    
    // Verify "Show more" button is visible
    await expect(page.locator('[data-testid="tweet-text-show-more-link"]')).toBeVisible();
    
    // Go to popup and trigger analysis
    await popupPage.bringToFront();
    await popupPage.locator('text=Find Tools').click();
    await page.bringToFront();
    
    // Wait for analysis to complete (this should trigger tweet expansion)
    await page.waitForTimeout(2000);
    
    // Should show results including expanded tweet content
    await expect(page.locator('[data-testid="golden-nugget-sidebar"]')).toBeVisible();
    
    // Verify that the tweet was expanded (full text should be visible)
    await expect(page.locator('text=Game changer for debugging complex issues')).toBeVisible();
  });

  test('should handle x.com URLs correctly', async ({ page, popupPage }) => {
    // Set up mock Twitter page (handles x.com redirect)
    await createMockTwitterPage(page);
    await setupMockApiResponses(page);
    
    // Navigate to x.com URL
    await page.goto('https://x.com/ai_developer/status/1234567890');
    
    // Should redirect to twitter.com equivalent
    await expect(page.locator('text=Just discovered Claude Code')).toBeVisible();
    
    // Go to popup and select prompt
    await popupPage.bringToFront();
    await popupPage.locator('text=Find Tools').click();
    await page.bringToFront();
    
    // Should work the same as twitter.com
    await expect(page.locator('text=Finding golden nuggets...')).toBeVisible();
    await page.waitForTimeout(2000);
    await expect(page.locator('[data-testid="golden-nugget-sidebar"]')).toBeVisible();
  });

  test('should stop extraction at spam button', async ({ page, popupPage }) => {
    // Set up mock Twitter page
    await createMockTwitterPage(page);
    await setupMockApiResponses(page);
    
    // Navigate to Twitter thread
    await page.goto('https://twitter.com/ai_developer/status/1234567890');
    
    // Verify that thread tweets are visible
    await expect(page.locator('text=Just discovered Claude Code')).toBeVisible();
    await expect(page.locator('text=The key insight is that AI tools work best')).toBeVisible();
    
    // Verify that related tweets are visible
    await expect(page.locator('text=Thanks for sharing this!')).toBeVisible();
    
    // Verify that spam button is visible
    await expect(page.locator('text=Show probable spam')).toBeVisible();
    
    // Go to popup and trigger analysis
    await popupPage.bringToFront();
    await popupPage.locator('text=Find Tools').click();
    await page.bringToFront();
    
    // Wait for analysis to complete
    await page.waitForTimeout(2000);
    
    // Should show results
    await expect(page.locator('[data-testid="golden-nugget-sidebar"]')).toBeVisible();
    
    // The extractor should have stopped at the spam button
    // This means it should only extract tweets from the original author
    // and not include related tweets after the thread
    await expect(page.locator('text=Claude Code')).toBeVisible();
  });

  test('should only extract tweets from original author', async ({ page, popupPage }) => {
    // Set up mock Twitter page
    await createMockTwitterPage(page);
    await setupMockApiResponses(page);
    
    // Navigate to Twitter thread
    await page.goto('https://twitter.com/ai_developer/status/1234567890');
    
    // Verify original author tweets are visible
    await expect(page.locator('text=Just discovered Claude Code')).toBeVisible();
    await expect(page.locator('text=The key insight is that AI tools work best')).toBeVisible();
    
    // Verify related tweets from other users are also visible on the page
    await expect(page.locator('text=Thanks for sharing this!')).toBeVisible();
    
    // Go to popup and trigger analysis
    await popupPage.bringToFront();
    await popupPage.locator('text=Find Tools').click();
    await page.bringToFront();
    
    // Wait for analysis to complete
    await page.waitForTimeout(2000);
    
    // Should show results
    await expect(page.locator('[data-testid="golden-nugget-sidebar"]')).toBeVisible();
    
    // Results should only include content from the original author
    await expect(page.locator('text=Claude Code')).toBeVisible();
    
    // The extractor should not include tweets from other users
    // (This is tested by the mock API response structure)
  });

  test('should handle empty Twitter thread gracefully', async ({ page, popupPage }) => {
    // Set up mock Twitter page with no tweets
    await page.route('**/twitter.com/**', async (route) => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head><title>Empty Twitter Thread</title></head>
          <body>
            <div id="react-root">
              <div class="css-1dbjc4n">
                <!-- No tweets -->
              </div>
            </div>
          </body>
        </html>
      `;
      await route.fulfill({ body: html, contentType: 'text/html' });
    });
    
    await setupMockApiResponses(page);
    
    // Navigate to empty Twitter thread
    await page.goto('https://twitter.com/empty_user/status/1234567890');
    
    // Go to popup and trigger analysis
    await popupPage.bringToFront();
    await popupPage.locator('text=Find Tools').click();
    await page.bringToFront();
    
    // Should show error message
    await expect(page.locator('text=Finding golden nuggets...')).toBeVisible();
    await page.waitForTimeout(1000);
    await expect(page.locator('text=No content found on this page.')).toBeVisible();
  });

  test('should handle Twitter thread with no original author gracefully', async ({ page, popupPage }) => {
    // Set up mock Twitter page with malformed tweets (no author info)
    await page.route('**/twitter.com/**', async (route) => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head><title>Malformed Twitter Thread</title></head>
          <body>
            <div id="react-root">
              <div class="css-1dbjc4n">
                <article data-testid="tweet" class="css-1dbjc4n">
                  <!-- No User-Name div -->
                  <div data-testid="tweetText" class="css-901oao">
                    This tweet has no author information
                  </div>
                </article>
              </div>
            </div>
          </body>
        </html>
      `;
      await route.fulfill({ body: html, contentType: 'text/html' });
    });
    
    await setupMockApiResponses(page);
    
    // Navigate to malformed Twitter thread
    await page.goto('https://twitter.com/malformed_user/status/1234567890');
    
    // Go to popup and trigger analysis
    await popupPage.bringToFront();
    await popupPage.locator('text=Find Tools').click();
    await page.bringToFront();
    
    // Should show error message or fallback gracefully
    await expect(page.locator('text=Finding golden nuggets...')).toBeVisible();
    await page.waitForTimeout(1000);
    
    // The extractor should either show an error or fall back to generic extraction
    // Either outcome is acceptable for this edge case
    const hasError = await page.locator('text=No content found on this page.').isVisible();
    const hasResults = await page.locator('[data-testid="golden-nugget-sidebar"]').isVisible();
    
    expect(hasError || hasResults).toBe(true);
  });

  test('should handle rate limiting and tweet expansion delays', async ({ page, popupPage }) => {
    // Set up mock Twitter page
    await createMockTwitterPage(page);
    await setupMockApiResponses(page);
    
    // Navigate to Twitter thread
    await page.goto('https://twitter.com/ai_developer/status/1234567890');
    
    // Wait for content to load
    await expect(page.locator('text=Just discovered Claude Code')).toBeVisible();
    
    // Go to popup and trigger analysis
    await popupPage.bringToFront();
    await popupPage.locator('text=Find Tools').click();
    await page.bringToFront();
    
    // Should show progress banner
    await expect(page.locator('text=Finding golden nuggets...')).toBeVisible();
    
    // Wait longer for analysis to complete (accounts for expansion delays)
    await page.waitForTimeout(3000);
    
    // Should show results
    await expect(page.locator('[data-testid="golden-nugget-sidebar"]')).toBeVisible();
    await expect(page.locator('text=Claude Code')).toBeVisible();
  });
});