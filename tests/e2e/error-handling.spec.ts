import { test, expect } from './fixtures/extension-fixture';
import { TEST_API_KEY, INVALID_API_KEY, DEFAULT_PROMPTS } from './fixtures/test-data';
import { createMockRedditPage, setupMockApiError } from './fixtures/mock-pages';

test.describe('Error Handling Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Set up prompts (but not API key for most tests)
    await page.evaluate((prompts) => {
      return new Promise((resolve) => {
        chrome.storage.sync.set({
          userPrompts: prompts
        }, () => resolve(undefined));
      });
    }, [DEFAULT_PROMPTS]);
  });

  test('should handle invalid API key error', async ({ page, popupPage }) => {
    // Set up invalid API key
    await page.evaluate((apiKey) => {
      return new Promise((resolve) => {
        chrome.storage.sync.set({
          geminiApiKey: apiKey
        }, () => resolve(undefined));
      });
    }, [INVALID_API_KEY]);
    
    // Set up mock Reddit page
    await createMockRedditPage(page);
    
    // Mock API to return 401 error
    await setupMockApiError(page, 401);
    
    await page.goto('https://www.reddit.com/r/programming/comments/test123/what_are_your_favorite_developer_tools/');
    
    // Trigger analysis
    await popupPage.bringToFront();
    await popupPage.locator('text=Find Tools').click();
    await page.bringToFront();
    
    // Should show progress initially
    await expect(page.locator('text=Finding golden nuggets...')).toBeVisible();
    
    // Wait for error to appear
    await page.waitForTimeout(2000);
    
    // Should show error message
    await expect(page.locator('text=Analysis failed. Please try again.')).toBeVisible();
    
    // Should not show sidebar
    await expect(page.locator('[data-testid="golden-nugget-sidebar"]')).not.toBeVisible();
  });

  test('should handle network errors', async ({ page, popupPage }) => {
    // Set up valid API key
    await page.evaluate((apiKey) => {
      return new Promise((resolve) => {
        chrome.storage.sync.set({
          geminiApiKey: apiKey
        }, () => resolve(undefined));
      });
    }, [TEST_API_KEY]);
    
    // Set up mock Reddit page
    await createMockRedditPage(page);
    
    // Mock API to return network error (500)
    await setupMockApiError(page, 500);
    
    await page.goto('https://www.reddit.com/r/programming/comments/test123/what_are_your_favorite_developer_tools/');
    
    // Trigger analysis
    await popupPage.bringToFront();
    await popupPage.locator('text=Find Tools').click();
    await page.bringToFront();
    
    // Should show progress initially
    await expect(page.locator('text=Finding golden nuggets...')).toBeVisible();
    
    // Wait for error to appear
    await page.waitForTimeout(2000);
    
    // Should show error message
    await expect(page.locator('text=Analysis failed. Please try again.')).toBeVisible();
    
    // Should not show sidebar
    await expect(page.locator('[data-testid="golden-nugget-sidebar"]')).not.toBeVisible();
  });

  test('should handle API timeout', async ({ page, popupPage }) => {
    // Set up valid API key
    await page.evaluate((apiKey) => {
      return new Promise((resolve) => {
        chrome.storage.sync.set({
          geminiApiKey: apiKey
        }, () => resolve(undefined));
      });
    }, [TEST_API_KEY]);
    
    // Set up mock Reddit page
    await createMockRedditPage(page);
    
    // Mock API to never respond (timeout)
    await page.route('**/generativelanguage.googleapis.com/**', async (route) => {
      // Don't fulfill the request, causing a timeout
      await new Promise(resolve => setTimeout(resolve, 60000));
    });
    
    await page.goto('https://www.reddit.com/r/programming/comments/test123/what_are_your_favorite_developer_tools/');
    
    // Trigger analysis
    await popupPage.bringToFront();
    await popupPage.locator('text=Find Tools').click();
    await page.bringToFront();
    
    // Should show progress initially
    await expect(page.locator('text=Finding golden nuggets...')).toBeVisible();
    
    // Wait for timeout (should be handled by background script)
    await page.waitForTimeout(10000);
    
    // Should show error message
    await expect(page.locator('text=Analysis failed. Please try again.')).toBeVisible();
  });

  test('should handle malformed API responses', async ({ page, popupPage }) => {
    // Set up valid API key
    await page.evaluate((apiKey) => {
      return new Promise((resolve) => {
        chrome.storage.sync.set({
          geminiApiKey: apiKey
        }, () => resolve(undefined));
      });
    }, [TEST_API_KEY]);
    
    // Set up mock Reddit page
    await createMockRedditPage(page);
    
    // Mock API to return malformed response
    await page.route('**/generativelanguage.googleapis.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          candidates: [{
            content: {
              parts: [{
                text: 'Invalid JSON response that cannot be parsed'
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
    
    // Should show progress initially
    await expect(page.locator('text=Finding golden nuggets...')).toBeVisible();
    
    // Wait for error to appear
    await page.waitForTimeout(2000);
    
    // Should show error message
    await expect(page.locator('text=Analysis failed. Please try again.')).toBeVisible();
  });

  test('should handle missing API key', async ({ page, popupPage }) => {
    // Don't set any API key
    await createMockRedditPage(page);
    
    await page.goto('https://www.reddit.com/r/programming/comments/test123/what_are_your_favorite_developer_tools/');
    
    // Trigger analysis
    await popupPage.bringToFront();
    await popupPage.locator('text=Find Tools').click();
    await page.bringToFront();
    
    // Should show progress initially
    await expect(page.locator('text=Finding golden nuggets...')).toBeVisible();
    
    // Wait for error to appear
    await page.waitForTimeout(2000);
    
    // Should show error message
    await expect(page.locator('text=Analysis failed. Please try again.')).toBeVisible();
  });

  test('should handle content extraction failures', async ({ page, popupPage }) => {
    // Set up valid API key
    await page.evaluate((apiKey) => {
      return new Promise((resolve) => {
        chrome.storage.sync.set({
          geminiApiKey: apiKey
        }, () => resolve(undefined));
      });
    }, [TEST_API_KEY]);
    
    // Create a page that will fail content extraction
    await page.route('**/broken-page.com/**', async (route) => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head><title>Broken Page</title></head>
          <body>
            <div id="malformed-content">
              <!-- No readable content structure -->
            </div>
          </body>
        </html>
      `;
      await route.fulfill({ body: html, contentType: 'text/html' });
    });
    
    await page.goto('https://broken-page.com/');
    
    // Trigger analysis
    await popupPage.bringToFront();
    await popupPage.locator('text=Find Tools').click();
    await page.bringToFront();
    
    // Should show progress initially
    await expect(page.locator('text=Finding golden nuggets...')).toBeVisible();
    
    // Wait for error to appear
    await page.waitForTimeout(2000);
    
    // Should show content extraction error
    await expect(page.locator('text=No content found on this page.')).toBeVisible();
  });

  test('should handle API rate limiting', async ({ page, popupPage }) => {
    // Set up valid API key
    await page.evaluate((apiKey) => {
      return new Promise((resolve) => {
        chrome.storage.sync.set({
          geminiApiKey: apiKey
        }, () => resolve(undefined));
      });
    }, [TEST_API_KEY]);
    
    // Set up mock Reddit page
    await createMockRedditPage(page);
    
    // Mock API to return rate limit error (429)
    await page.route('**/generativelanguage.googleapis.com/**', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            code: 429,
            message: 'Rate limit exceeded'
          }
        })
      });
    });
    
    await page.goto('https://www.reddit.com/r/programming/comments/test123/what_are_your_favorite_developer_tools/');
    
    // Trigger analysis
    await popupPage.bringToFront();
    await popupPage.locator('text=Find Tools').click();
    await page.bringToFront();
    
    // Should show progress initially
    await expect(page.locator('text=Finding golden nuggets...')).toBeVisible();
    
    // Wait for error to appear
    await page.waitForTimeout(2000);
    
    // Should show error message
    await expect(page.locator('text=Analysis failed. Please try again.')).toBeVisible();
  });

  test('should handle missing prompt selection', async ({ page, popupPage }) => {
    // Set up valid API key but no prompts
    await page.evaluate((apiKey) => {
      return new Promise((resolve) => {
        chrome.storage.sync.set({
          geminiApiKey: apiKey,
          userPrompts: []
        }, () => resolve(undefined));
      });
    }, [TEST_API_KEY]);
    
    // Reload popup to reflect changes
    await popupPage.reload();
    
    // Should show empty state or error
    await expect(popupPage.locator('text=No prompts configured')).toBeVisible();
    await expect(popupPage.locator('text=Manage Prompts & Settings')).toBeVisible();
  });

  test('should handle errors gracefully during highlighting', async ({ page, popupPage }) => {
    // Set up valid API key
    await page.evaluate((apiKey) => {
      return new Promise((resolve) => {
        chrome.storage.sync.set({
          geminiApiKey: apiKey
        }, () => resolve(undefined));
      });
    }, [TEST_API_KEY]);
    
    // Create a page with dynamic content that changes during analysis
    await page.route('**/dynamic-page.com/**', async (route) => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head><title>Dynamic Page</title></head>
          <body>
            <div id="content">
              <p>Original content that will change</p>
            </div>
            <script>
              setTimeout(() => {
                document.getElementById('content').innerHTML = '<p>Changed content</p>';
              }, 1000);
            </script>
          </body>
        </html>
      `;
      await route.fulfill({ body: html, contentType: 'text/html' });
    });
    
    // Mock API to return nuggets based on original content
    await page.route('**/generativelanguage.googleapis.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  golden_nuggets: [{
                    type: 'explanation',
                    content: 'Original content that will change',
                    synthesis: 'This content explains something important.'
                  }]
                })
              }]
            }
          }]
        })
      });
    });
    
    await page.goto('https://dynamic-page.com/');
    
    // Trigger analysis
    await popupPage.bringToFront();
    await popupPage.locator('text=Find Explanations').click();
    await page.bringToFront();
    
    // Should show progress initially
    await expect(page.locator('text=Finding golden nuggets...')).toBeVisible();
    
    // Wait for analysis to complete
    await page.waitForTimeout(3000);
    
    // Should show sidebar even if highlighting fails
    await expect(page.locator('[data-testid="golden-nugget-sidebar"]')).toBeVisible();
    
    // Should show "Could not be located" status
    await expect(page.locator('text=Could not be located')).toBeVisible();
  });

  test('should handle extension communication failures', async ({ page, popupPage }) => {
    // Set up valid API key
    await page.evaluate((apiKey) => {
      return new Promise((resolve) => {
        chrome.storage.sync.set({
          geminiApiKey: apiKey
        }, () => resolve(undefined));
      });
    }, [TEST_API_KEY]);
    
    // Set up mock Reddit page
    await createMockRedditPage(page);
    
    // Mock successful API response
    await page.route('**/generativelanguage.googleapis.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  golden_nuggets: [{
                    type: 'tool',
                    content: 'VS Code with the Vim extension',
                    synthesis: 'This tool combines modern IDE features with vim efficiency.'
                  }]
                })
              }]
            }
          }]
        })
      });
    });
    
    // Simulate extension communication failure by overriding chrome.runtime
    await page.evaluate(() => {
      // @ts-ignore
      chrome.runtime.sendMessage = () => {
        throw new Error('Extension communication failed');
      };
    });
    
    await page.goto('https://www.reddit.com/r/programming/comments/test123/what_are_your_favorite_developer_tools/');
    
    // Trigger analysis
    await popupPage.bringToFront();
    await popupPage.locator('text=Find Tools').click();
    await page.bringToFront();
    
    // Should show progress initially
    await expect(page.locator('text=Finding golden nuggets...')).toBeVisible();
    
    // Wait for error to appear
    await page.waitForTimeout(2000);
    
    // Should show error message
    await expect(page.locator('text=Analysis failed. Please try again.')).toBeVisible();
  });

  test('should allow retry after error', async ({ page, popupPage }) => {
    // Set up valid API key
    await page.evaluate((apiKey) => {
      return new Promise((resolve) => {
        chrome.storage.sync.set({
          geminiApiKey: apiKey
        }, () => resolve(undefined));
      });
    }, [TEST_API_KEY]);
    
    // Set up mock Reddit page
    await createMockRedditPage(page);
    
    let requestCount = 0;
    
    // Mock API to fail first request, succeed second
    await page.route('**/generativelanguage.googleapis.com/**', async (route) => {
      requestCount++;
      
      if (requestCount === 1) {
        // First request fails
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: { code: 500, message: 'Internal server error' }
          })
        });
      } else {
        // Second request succeeds
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            candidates: [{
              content: {
                parts: [{
                  text: JSON.stringify({
                    golden_nuggets: [{
                      type: 'tool',
                      content: 'VS Code with the Vim extension',
                      synthesis: 'This tool combines modern IDE features with vim efficiency.'
                    }]
                  })
                }]
              }
            }]
          })
        });
      }
    });
    
    await page.goto('https://www.reddit.com/r/programming/comments/test123/what_are_your_favorite_developer_tools/');
    
    // First analysis attempt
    await popupPage.bringToFront();
    await popupPage.locator('text=Find Tools').click();
    await page.bringToFront();
    
    // Should show error
    await page.waitForTimeout(2000);
    await expect(page.locator('text=Analysis failed. Please try again.')).toBeVisible();
    
    // Second analysis attempt (retry)
    await popupPage.bringToFront();
    await popupPage.locator('text=Find Tools').click();
    await page.bringToFront();
    
    // Should succeed this time
    await page.waitForTimeout(2000);
    await expect(page.locator('[data-testid="golden-nugget-sidebar"]')).toBeVisible();
    await expect(page.locator('text=VS Code with the Vim extension')).toBeVisible();
  });
});