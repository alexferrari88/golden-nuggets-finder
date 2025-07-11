import { test, expect } from './fixtures/extension-fixture';
import { TEST_API_KEY, DEFAULT_PROMPTS } from './fixtures/test-data';
import { createMockRedditPage, createMockHackerNewsPage, createMockBlogPage, setupMockApiResponses } from './fixtures/mock-pages';
import { seedTestData } from './fixtures/chrome-api-setup';

test.describe('Content Analysis Workflow', () => {
  test.beforeEach(async ({ serviceWorker, chromeApiReady }) => {
    // Ensure Chrome APIs are ready before seeding test data
    expect(chromeApiReady).toBe(true);
    
    // Set up API key and prompts using the new Chrome API setup utilities
    await seedTestData(serviceWorker, {
      geminiApiKey: TEST_API_KEY,
      userPrompts: DEFAULT_PROMPTS
    });
  });

  test('should analyze Reddit thread via toolbar popup', async ({ page, popupPage }) => {
    // Set up mock Reddit page
    await createMockRedditPage(page);
    await setupMockApiResponses(page);
    
    // Navigate to Reddit thread
    await page.goto('https://www.reddit.com/r/programming/comments/test123/what_are_your_favorite_developer_tools/');
    
    // Wait for content to load
    await expect(page.locator('text=What are your favorite developer tools?')).toBeVisible();
    
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
    await expect(page.locator('text=VS Code with the Vim extension')).toBeVisible();
  });

  test('should analyze Hacker News thread via toolbar popup', async ({ page, popupPage }) => {
    // Set up mock HN page
    await createMockHackerNewsPage(page);
    await setupMockApiResponses(page);
    
    // Navigate to HN thread
    await page.goto('https://news.ycombinator.com/item?id=12345');
    
    // Wait for content to load
    await expect(page.locator('text=Show HN: My new productivity app')).toBeVisible();
    
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
  });

  test('should analyze generic blog post via toolbar popup', async ({ page, popupPage }) => {
    // Set up mock blog page
    await createMockBlogPage(page);
    await setupMockApiResponses(page);
    
    // Navigate to blog post
    await page.goto('https://example.com/react-hooks-guide');
    
    // Wait for content to load
    await expect(page.locator('text=Understanding React Hooks')).toBeVisible();
    
    // Go to popup and select prompt
    await popupPage.bringToFront();
    await expect(popupPage.locator('text=Find Explanations')).toBeVisible();
    await popupPage.locator('text=Find Explanations').click();
    
    // Switch back to main page
    await page.bringToFront();
    
    // Should show progress banner
    await expect(page.locator('text=Finding golden nuggets...')).toBeVisible();
    
    // Wait for analysis to complete
    await page.waitForTimeout(2000);
    
    // Should show results
    await expect(page.locator('[data-testid="golden-nugget-sidebar"]')).toBeVisible();
  });

  test('should analyze content via right-click context menu', async ({ page, context }) => {
    // Set up mock Reddit page
    await createMockRedditPage(page);
    await setupMockApiResponses(page);
    
    // Navigate to Reddit thread
    await page.goto('https://www.reddit.com/r/programming/comments/test123/what_are_your_favorite_developer_tools/');
    
    // Wait for content to load
    await expect(page.locator('text=What are your favorite developer tools?')).toBeVisible();
    
    // Right-click on page to open context menu
    await page.click('body', { button: 'right' });
    
    // Wait for context menu to appear
    await page.waitForTimeout(500);
    
    // Note: Context menu testing is complex in Playwright due to native browser behavior
    // This test demonstrates the approach but may need adjustment based on actual implementation
    
    // Look for our context menu item
    await expect(page.locator('text=Find Golden Nuggets')).toBeVisible();
    
    // Click on submenu item
    await page.locator('text=Find Tools').click();
    
    // Should show progress banner
    await expect(page.locator('text=Finding golden nuggets...')).toBeVisible();
    
    // Wait for analysis to complete
    await page.waitForTimeout(2000);
    
    // Should show results
    await expect(page.locator('[data-testid="golden-nugget-sidebar"]')).toBeVisible();
  });

  test('should handle content extraction from different page types', async ({ page, popupPage }) => {
    // Test Reddit extraction
    await createMockRedditPage(page);
    await setupMockApiResponses(page);
    
    await page.goto('https://www.reddit.com/r/programming/comments/test123/what_are_your_favorite_developer_tools/');
    await expect(page.locator('text=What are your favorite developer tools?')).toBeVisible();
    
    // Trigger analysis
    await popupPage.bringToFront();
    await popupPage.locator('text=Find Tools').click();
    await page.bringToFront();
    
    // Should extract Reddit-specific content
    await expect(page.locator('text=Finding golden nuggets...')).toBeVisible();
    await page.waitForTimeout(2000);
    await expect(page.locator('[data-testid="golden-nugget-sidebar"]')).toBeVisible();
    
    // Test Hacker News extraction
    await createMockHackerNewsPage(page);
    await page.goto('https://news.ycombinator.com/item?id=12345');
    await expect(page.locator('text=Show HN: My new productivity app')).toBeVisible();
    
    // Trigger analysis
    await popupPage.bringToFront();
    await popupPage.locator('text=Find Tools').click();
    await page.bringToFront();
    
    // Should extract HN-specific content
    await expect(page.locator('text=Finding golden nuggets...')).toBeVisible();
    await page.waitForTimeout(2000);
    await expect(page.locator('[data-testid="golden-nugget-sidebar"]')).toBeVisible();
    
    // Test generic page extraction
    await createMockBlogPage(page);
    await page.goto('https://example.com/react-hooks-guide');
    await expect(page.locator('text=Understanding React Hooks')).toBeVisible();
    
    // Trigger analysis
    await popupPage.bringToFront();
    await popupPage.locator('text=Find Explanations').click();
    await page.bringToFront();
    
    // Should extract generic content
    await expect(page.locator('text=Finding golden nuggets...')).toBeVisible();
    await page.waitForTimeout(2000);
    await expect(page.locator('[data-testid="golden-nugget-sidebar"]')).toBeVisible();
  });

  test('should handle empty pages with no content', async ({ page, popupPage }) => {
    // Create a page with no extractable content
    await page.route('**/empty-page.com/**', async (route) => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head><title>Empty Page</title></head>
          <body>
            <div id="ads">Advertisement</div>
            <div id="navigation">Nav Menu</div>
            <!-- No main content -->
          </body>
        </html>
      `;
      await route.fulfill({ body: html, contentType: 'text/html' });
    });
    
    await page.goto('https://empty-page.com/');
    
    // Trigger analysis
    await popupPage.bringToFront();
    await popupPage.locator('text=Find Tools').click();
    await page.bringToFront();
    
    // Should show error message
    await expect(page.locator('text=Finding golden nuggets...')).toBeVisible();
    await page.waitForTimeout(1000);
    await expect(page.locator('text=No content found on this page.')).toBeVisible();
  });

  test('should handle multiple prompt selections', async ({ page, popupPage }) => {
    // Set up mock Reddit page
    await createMockRedditPage(page);
    await setupMockApiResponses(page);
    
    await page.goto('https://www.reddit.com/r/programming/comments/test123/what_are_your_favorite_developer_tools/');
    await expect(page.locator('text=What are your favorite developer tools?')).toBeVisible();
    
    // First analysis with "Find Tools"
    await popupPage.bringToFront();
    await popupPage.locator('text=Find Tools').click();
    await page.bringToFront();
    
    await expect(page.locator('text=Finding golden nuggets...')).toBeVisible();
    await page.waitForTimeout(2000);
    await expect(page.locator('[data-testid="golden-nugget-sidebar"]')).toBeVisible();
    
    // Second analysis with "Find Analogies"
    await popupPage.bringToFront();
    await popupPage.locator('text=Find Analogies').click();
    await page.bringToFront();
    
    await expect(page.locator('text=Finding golden nuggets...')).toBeVisible();
    await page.waitForTimeout(2000);
    await expect(page.locator('[data-testid="golden-nugget-sidebar"]')).toBeVisible();
  });

  test('should show default prompt first in popup', async ({ popupPage }) => {
    // Should show prompts with default first
    await expect(popupPage.locator('svg')).toBeVisible();
    
    // Check order - default should be first
    const prompts = await popupPage.locator('[data-testid="prompt-item"]').all();
    const firstPromptText = await prompts[0].textContent();
    expect(firstPromptText).toContain('Find Tools');
  });

  test('should handle rapid consecutive analyses', async ({ page, popupPage }) => {
    // Set up mock Reddit page
    await createMockRedditPage(page);
    await setupMockApiResponses(page);
    
    await page.goto('https://www.reddit.com/r/programming/comments/test123/what_are_your_favorite_developer_tools/');
    await expect(page.locator('text=What are your favorite developer tools?')).toBeVisible();
    
    // Trigger first analysis
    await popupPage.bringToFront();
    await popupPage.locator('text=Find Tools').click();
    await page.bringToFront();
    
    // Immediately trigger second analysis
    await popupPage.bringToFront();
    await popupPage.locator('text=Find Analogies').click();
    await page.bringToFront();
    
    // Should handle gracefully
    await expect(page.locator('text=Finding golden nuggets...')).toBeVisible();
    await page.waitForTimeout(3000);
    await expect(page.locator('[data-testid="golden-nugget-sidebar"]')).toBeVisible();
  });
});