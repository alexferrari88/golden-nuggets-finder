import { test, expect } from './fixtures/extension-fixture';
import { TEST_API_KEY, DEFAULT_PROMPTS } from './fixtures/test-data';
import { createMockRedditPage, createMockHackerNewsPage, createMockBlogPage, setupMockApiResponses } from './fixtures/mock-pages';
import { seedTestData } from './fixtures/chrome-api-setup';

test.describe('Results Display Workflow', () => {
  // SKIPPED: These tests require content script injection which fails in Playwright
  // due to Chrome Extension MV3 permission simulation limitations.
  // See: https://github.com/microsoft/playwright/issues/18854
  // 
  // Alternative testing approach:
  // - Component tests for UI rendering logic (tests/unit/content/ui/)
  // - Component tests for highlighting algorithms (tests/unit/content/highlighting/)
  // - Manual testing checklist for visual validation
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

  test('should display sidebar with analysis results', async ({ page, popupPage }) => {
    // Set up mock Reddit page
    await createMockRedditPage(page);
    await setupMockApiResponses(page);
    
    await page.goto('https://www.reddit.com/r/programming/comments/test123/what_are_your_favorite_developer_tools/');
    await expect(page.locator('text=What are your favorite developer tools?')).toBeVisible();
    
    // Trigger analysis
    await popupPage.bringToFront();
    await popupPage.locator('text=Find Tools').click();
    await page.bringToFront();
    
    // Wait for analysis to complete
    await page.waitForTimeout(2000);
    
    // Should show sidebar
    const sidebar = page.locator('[data-testid="golden-nugget-sidebar"]');
    await expect(sidebar).toBeVisible();
    
    // Should show header
    await expect(sidebar.locator('text=Golden Nuggets Found')).toBeVisible();
    
    // Should show nugget count
    await expect(sidebar.locator('text=1 nugget found')).toBeVisible();
    
    // Should show individual nuggets
    await expect(sidebar.locator('[data-testid="nugget-item"]')).toBeVisible();
    
    // Should show nugget type
    await expect(sidebar.locator('text=tool')).toBeVisible();
    
    // Should show nugget content
    await expect(sidebar.locator('text=VS Code with the Vim extension')).toBeVisible();
    
    // Should show synthesis
    await expect(sidebar.locator('text=This tool combines modern IDE features with vim efficiency.')).toBeVisible();
  });

  test('should highlight nuggets on the page', async ({ page, popupPage }) => {
    // Set up mock Reddit page with specific content
    await page.route('**/reddit.com/**', async (route) => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head><title>Test Thread</title></head>
          <body>
            <div id="AppRouter-main-content">
              <div data-testid="post-container">
                <h1>What are your favorite developer tools?</h1>
                <div data-testid="comment-tree">
                  <div data-testid="comment">
                    <div data-testid="comment-author">user1</div>
                    <div data-testid="comment-content">I love using VS Code with the Vim extension. It gives me the best of both worlds.</div>
                  </div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;
      await route.fulfill({ body: html, contentType: 'text/html' });
    });
    
    await setupMockApiResponses(page);
    
    await page.goto('https://www.reddit.com/r/programming/comments/test123/what_are_your_favorite_developer_tools/');
    
    // Trigger analysis
    await popupPage.bringToFront();
    await popupPage.locator('text=Find Tools').click();
    await page.bringToFront();
    
    // Wait for analysis to complete
    await page.waitForTimeout(2000);
    
    // Should highlight the nugget text
    const highlightedText = page.locator('[data-testid="golden-nugget-highlight"]');
    await expect(highlightedText).toBeVisible();
    
    // Should have the golden highlight style
    await expect(highlightedText).toHaveCSS('background-color', 'rgba(255, 215, 0, 0.3)');
  });

  test('should show synthesis popup when clicking highlighted text', async ({ page, popupPage }) => {
    // Set up mock Reddit page
    await createMockRedditPage(page);
    await setupMockApiResponses(page);
    
    await page.goto('https://www.reddit.com/r/programming/comments/test123/what_are_your_favorite_developer_tools/');
    
    // Trigger analysis
    await popupPage.bringToFront();
    await popupPage.locator('text=Find Tools').click();
    await page.bringToFront();
    
    // Wait for analysis to complete
    await page.waitForTimeout(2000);
    
    // Find and click the clickable tag/icon
    const clickableElement = page.locator('[data-testid="nugget-click-target"]');
    await expect(clickableElement).toBeVisible();
    await clickableElement.click();
    
    // Should show synthesis popup
    const synthesisPopup = page.locator('[data-testid="synthesis-popup"]');
    await expect(synthesisPopup).toBeVisible();
    
    // Should show synthesis content
    await expect(synthesisPopup.locator('text=This tool combines modern IDE features with vim efficiency.')).toBeVisible();
    
    // Should show nugget type
    await expect(synthesisPopup.locator('text=Type: tool')).toBeVisible();
    
    // Should have close button
    await expect(synthesisPopup.locator('[data-testid="close-popup"]')).toBeVisible();
  });

  test('should close synthesis popup when clicking close button', async ({ page, popupPage }) => {
    // Set up mock Reddit page
    await createMockRedditPage(page);
    await setupMockApiResponses(page);
    
    await page.goto('https://www.reddit.com/r/programming/comments/test123/what_are_your_favorite_developer_tools/');
    
    // Trigger analysis
    await popupPage.bringToFront();
    await popupPage.locator('text=Find Tools').click();
    await page.bringToFront();
    
    // Wait for analysis to complete
    await page.waitForTimeout(2000);
    
    // Click to open synthesis popup
    const clickableElement = page.locator('[data-testid="nugget-click-target"]');
    await clickableElement.click();
    
    const synthesisPopup = page.locator('[data-testid="synthesis-popup"]');
    await expect(synthesisPopup).toBeVisible();
    
    // Click close button
    await synthesisPopup.locator('[data-testid="close-popup"]').click();
    
    // Should hide popup
    await expect(synthesisPopup).not.toBeVisible();
  });

  test('should close synthesis popup when clicking outside', async ({ page, popupPage }) => {
    // Set up mock Reddit page
    await createMockRedditPage(page);
    await setupMockApiResponses(page);
    
    await page.goto('https://www.reddit.com/r/programming/comments/test123/what_are_your_favorite_developer_tools/');
    
    // Trigger analysis
    await popupPage.bringToFront();
    await popupPage.locator('text=Find Tools').click();
    await page.bringToFront();
    
    // Wait for analysis to complete
    await page.waitForTimeout(2000);
    
    // Click to open synthesis popup
    const clickableElement = page.locator('[data-testid="nugget-click-target"]');
    await clickableElement.click();
    
    const synthesisPopup = page.locator('[data-testid="synthesis-popup"]');
    await expect(synthesisPopup).toBeVisible();
    
    // Click outside the popup
    await page.click('body', { position: { x: 100, y: 100 } });
    
    // Should hide popup
    await expect(synthesisPopup).not.toBeVisible();
  });

  test('should show "no results" message when no nuggets found', async ({ page, popupPage }) => {
    // Set up mock page
    await createMockRedditPage(page);
    
    // Mock API to return no results
    await page.route('**/generativelanguage.googleapis.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({ golden_nuggets: [] })
              }]
            }
          }]
        })
      });
    });
    
    await page.goto('https://www.reddit.com/r/programming/comments/test123/what_are_your_favorite_developer_tools/');
    
    // Trigger analysis
    await popupPage.bringToFront();
    await popupPage.locator('text=Find Tools').click();
    await page.bringToFront();
    
    // Wait for analysis to complete
    await page.waitForTimeout(2000);
    
    // Should show no results message
    await expect(page.locator('text=Analysis complete. No golden nuggets were found.')).toBeVisible();
    
    // Should not show sidebar
    await expect(page.locator('[data-testid="golden-nugget-sidebar"]')).not.toBeVisible();
  });

  test('should show nugget status in sidebar (highlighted vs not found)', async ({ page, popupPage }) => {
    // Set up mock page with specific content
    await page.route('**/reddit.com/**', async (route) => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head><title>Test Thread</title></head>
          <body>
            <div id="AppRouter-main-content">
              <div data-testid="post-container">
                <h1>What are your favorite developer tools?</h1>
                <div data-testid="comment-tree">
                  <div data-testid="comment">
                    <div data-testid="comment-author">user1</div>
                    <div data-testid="comment-content">I love using VS Code with the Vim extension.</div>
                  </div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;
      await route.fulfill({ body: html, contentType: 'text/html' });
    });
    
    // Mock API to return nuggets with different highlighting success
    await page.route('**/generativelanguage.googleapis.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  golden_nuggets: [
                    {
                      type: 'tool',
                      content: 'VS Code with the Vim extension',
                      synthesis: 'This tool combines modern IDE features with vim efficiency.'
                    },
                    {
                      type: 'tool',
                      content: 'Some text that is not on the page',
                      synthesis: 'This won\'t be found on the page.'
                    }
                  ]
                })
              }]
            }
          }]
        })
      });
    });
    
    await page.goto('https://www.reddit.com/r/programming/comments/test123/what_are_your_favorite_developer_tools/');
    
    // Trigger analysis
    await popupPage.bringToFront();
    await popupPage.locator('text=Find Tools').click();
    await page.bringToFront();
    
    // Wait for analysis to complete
    await page.waitForTimeout(2000);
    
    // Should show sidebar with both nuggets
    const sidebar = page.locator('[data-testid="golden-nugget-sidebar"]');
    await expect(sidebar).toBeVisible();
    
    // Should show highlighted status for first nugget
    await expect(sidebar.locator('[data-testid="nugget-item"]').first().locator('text=Highlighted on page')).toBeVisible();
    
    // Should show not found status for second nugget
    await expect(sidebar.locator('[data-testid="nugget-item"]').last().locator('text=Could not be located')).toBeVisible();
  });

  test('should handle different nugget types with appropriate styling', async ({ page, popupPage }) => {
    // Mock API to return different nugget types
    await page.route('**/generativelanguage.googleapis.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  golden_nuggets: [
                    {
                      type: 'tool',
                      content: 'VS Code with the Vim extension',
                      synthesis: 'This tool combines modern IDE features with vim efficiency.'
                    },
                    {
                      type: 'analogy',
                      content: 'Like a Swiss Army knife for developers',
                      synthesis: 'This analogy explains the versatility of the tool.'
                    },
                    {
                      type: 'explanation',
                      content: 'This explains how React hooks work',
                      synthesis: 'Clear technical explanation.'
                    }
                  ]
                })
              }]
            }
          }]
        })
      });
    });
    
    await createMockRedditPage(page);
    await page.goto('https://www.reddit.com/r/programming/comments/test123/what_are_your_favorite_developer_tools/');
    
    // Trigger analysis
    await popupPage.bringToFront();
    await popupPage.locator('text=Find Tools').click();
    await page.bringToFront();
    
    // Wait for analysis to complete
    await page.waitForTimeout(2000);
    
    // Should show sidebar with different nugget types
    const sidebar = page.locator('[data-testid="golden-nugget-sidebar"]');
    await expect(sidebar).toBeVisible();
    
    // Should show different type badges
    await expect(sidebar.locator('text=tool')).toBeVisible();
    await expect(sidebar.locator('text=analogy')).toBeVisible();
    await expect(sidebar.locator('text=explanation')).toBeVisible();
    
    // Should show correct nugget count
    await expect(sidebar.locator('text=3 nuggets found')).toBeVisible();
  });

  test('should handle multiple nuggets highlighting', async ({ page, popupPage }) => {
    // Set up mock page with multiple nuggets
    await page.route('**/reddit.com/**', async (route) => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head><title>Test Thread</title></head>
          <body>
            <div id="AppRouter-main-content">
              <div data-testid="post-container">
                <h1>What are your favorite developer tools?</h1>
                <div data-testid="comment-tree">
                  <div data-testid="comment">
                    <div data-testid="comment-author">user1</div>
                    <div data-testid="comment-content">I love using VS Code with the Vim extension.</div>
                  </div>
                  <div data-testid="comment">
                    <div data-testid="comment-author">user2</div>
                    <div data-testid="comment-content">Docker has completely changed how I deploy applications.</div>
                  </div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;
      await route.fulfill({ body: html, contentType: 'text/html' });
    });
    
    // Mock API to return multiple nuggets
    await page.route('**/generativelanguage.googleapis.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  golden_nuggets: [
                    {
                      type: 'tool',
                      content: 'VS Code with the Vim extension',
                      synthesis: 'This tool combines modern IDE features with vim efficiency.'
                    },
                    {
                      type: 'tool',
                      content: 'Docker has completely changed how I deploy applications',
                      synthesis: 'Docker solves deployment consistency issues.'
                    }
                  ]
                })
              }]
            }
          }]
        })
      });
    });
    
    await page.goto('https://www.reddit.com/r/programming/comments/test123/what_are_your_favorite_developer_tools/');
    
    // Trigger analysis
    await popupPage.bringToFront();
    await popupPage.locator('text=Find Tools').click();
    await page.bringToFront();
    
    // Wait for analysis to complete
    await page.waitForTimeout(2000);
    
    // Should highlight multiple nuggets
    const highlights = page.locator('[data-testid="golden-nugget-highlight"]');
    await expect(highlights).toHaveCount(2);
    
    // Should show multiple nuggets in sidebar
    const sidebar = page.locator('[data-testid="golden-nugget-sidebar"]');
    await expect(sidebar.locator('[data-testid="nugget-item"]')).toHaveCount(2);
    
    // Should show correct count
    await expect(sidebar.locator('text=2 nuggets found')).toBeVisible();
  });

  test('should persist sidebar until page reload', async ({ page, popupPage }) => {
    // Set up mock Reddit page
    await createMockRedditPage(page);
    await setupMockApiResponses(page);
    
    await page.goto('https://www.reddit.com/r/programming/comments/test123/what_are_your_favorite_developer_tools/');
    
    // Trigger analysis
    await popupPage.bringToFront();
    await popupPage.locator('text=Find Tools').click();
    await page.bringToFront();
    
    // Wait for analysis to complete
    await page.waitForTimeout(2000);
    
    // Should show sidebar
    const sidebar = page.locator('[data-testid="golden-nugget-sidebar"]');
    await expect(sidebar).toBeVisible();
    
    // Scroll and interact with page
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(1000);
    
    // Sidebar should still be visible
    await expect(sidebar).toBeVisible();
    
    // Navigate away and back
    await page.goto('https://google.com');
    await page.goBack();
    
    // Sidebar should be gone after page reload
    await expect(sidebar).not.toBeVisible();
  });
});