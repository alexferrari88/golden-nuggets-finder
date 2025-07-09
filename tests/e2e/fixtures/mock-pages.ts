import { Page } from '@playwright/test';
import { MOCK_REDDIT_THREAD, MOCK_HACKERNEWS_THREAD, MOCK_BLOG_POST } from './test-data';

export async function createMockRedditPage(page: Page) {
  await page.route('**/reddit.com/**', async (route) => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>${MOCK_REDDIT_THREAD.title}</title></head>
        <body>
          <div id="AppRouter-main-content">
            <div data-testid="post-container">
              <h1>${MOCK_REDDIT_THREAD.title}</h1>
              <div data-testid="comment-tree">
                ${MOCK_REDDIT_THREAD.comments.map(comment => `
                  <div data-testid="comment">
                    <div data-testid="comment-author">${comment.author}</div>
                    <div data-testid="comment-content">${comment.content}</div>
                    ${comment.replies.map(reply => `
                      <div data-testid="comment" style="margin-left: 20px;">
                        <div data-testid="comment-author">${reply.author}</div>
                        <div data-testid="comment-content">${reply.content}</div>
                      </div>
                    `).join('')}
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
    await route.fulfill({ body: html, contentType: 'text/html' });
  });
}

export async function createMockHackerNewsPage(page: Page) {
  await page.route('**/news.ycombinator.com/**', async (route) => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>${MOCK_HACKERNEWS_THREAD.title}</title></head>
        <body>
          <table id="hnmain">
            <tr>
              <td>
                <table>
                  <tr>
                    <td><span class="titleline">${MOCK_HACKERNEWS_THREAD.title}</span></td>
                  </tr>
                </table>
                <table class="comment-tree">
                  ${MOCK_HACKERNEWS_THREAD.comments.map(comment => `
                    <tr>
                      <td>
                        <div class="comhead">
                          <a href="#" class="hnuser">${comment.author}</a>
                        </div>
                        <div class="comment">
                          <span class="commtext">${comment.content}</span>
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
    await route.fulfill({ body: html, contentType: 'text/html' });
  });
}

export async function createMockBlogPage(page: Page) {
  await page.route('**/example.com/**', async (route) => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>${MOCK_BLOG_POST.title}</title></head>
        <body>
          <article>
            <h1>${MOCK_BLOG_POST.title}</h1>
            <div class="content">
              ${MOCK_BLOG_POST.content.split('\n').map(paragraph => 
                paragraph.trim() ? `<p>${paragraph.trim()}</p>` : ''
              ).join('')}
            </div>
          </article>
        </body>
      </html>
    `;
    await route.fulfill({ body: html, contentType: 'text/html' });
  });
}

export async function setupMockApiResponses(page: Page) {
  // Mock successful Gemini API response
  await page.route('**/generativelanguage.googleapis.com/**', async (route) => {
    const requestBody = await route.request().postDataJSON();
    
    // Simulate different responses based on content
    if (requestBody.contents?.[0]?.parts?.[0]?.text?.includes('no golden nuggets')) {
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
    } else {
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
                    }
                  ]
                })
              }]
            }
          }]
        })
      });
    }
  });
}

export async function setupMockApiError(page: Page, errorCode = 401) {
  await page.route('**/generativelanguage.googleapis.com/**', async (route) => {
    await route.fulfill({
      status: errorCode,
      contentType: 'application/json',
      body: JSON.stringify({
        error: {
          code: errorCode,
          message: errorCode === 401 ? 'Invalid API key' : 'Network error'
        }
      })
    });
  });
}