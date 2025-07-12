import { Page } from '@playwright/test';
import { MOCK_REDDIT_THREAD, MOCK_HACKERNEWS_THREAD, MOCK_BLOG_POST, MOCK_TWITTER_THREAD } from './test-data';

export async function createMockRedditPage(page: Page) {
  await page.route('https://www.reddit.com/**', async (route) => {
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
  await page.route('https://news.ycombinator.com/**', async (route) => {
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
  await page.route('https://example.com/**', async (route) => {
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

export async function createMockTwitterPage(page: Page) {
  await page.route('https://twitter.com/**', async (route) => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>${MOCK_TWITTER_THREAD.title}</title></head>
        <body>
          <div id="react-root">
            <div class="css-1dbjc4n">
              <!-- Thread tweets -->
              ${MOCK_TWITTER_THREAD.tweets.map((tweet, index) => `
                <article data-testid="tweet" class="css-1dbjc4n">
                  <div data-testid="User-Name" class="css-1dbjc4n">
                    <a href="${MOCK_TWITTER_THREAD.author}" class="css-4rbku5">
                      <span>AI Developer</span>
                    </a>
                  </div>
                  <div data-testid="tweetText" class="css-901oao">
                    ${tweet.needsExpansion ? tweet.truncatedText : tweet.fullText}
                  </div>
                  ${tweet.needsExpansion ? `
                    <button data-testid="tweet-text-show-more-link" class="css-901oao">
                      Show more
                    </button>
                  ` : ''}
                </article>
              `).join('')}
              
              <!-- Related tweets (after thread) -->
              ${MOCK_TWITTER_THREAD.relatedTweets.map((tweet, index) => `
                <article data-testid="tweet" class="css-1dbjc4n">
                  <div data-testid="User-Name" class="css-1dbjc4n">
                    <a href="/other_user" class="css-4rbku5">
                      <span>Other User</span>
                    </a>
                  </div>
                  <div data-testid="tweetText" class="css-901oao">
                    ${tweet.fullText}
                  </div>
                </article>
              `).join('')}
              
              <!-- Spam button indicator (end of thread) -->
              <div class="css-1dbjc4n">
                <button class="css-1dbjc4n">
                  <span>Show probable spam</span>
                </button>
              </div>
            </div>
          </div>
          
          <script>
            // Mock the tweet expansion functionality
            document.addEventListener('click', (event) => {
              if (event.target.matches('[data-testid="tweet-text-show-more-link"]')) {
                const tweetText = event.target.previousElementSibling;
                const expandedText = '${MOCK_TWITTER_THREAD.tweets[0].fullText}';
                tweetText.textContent = expandedText;
                event.target.remove();
              }
            });
          </script>
        </body>
      </html>
    `;
    await route.fulfill({ body: html, contentType: 'text/html' });
  });
  
  // Also handle x.com URLs
  await page.route('https://x.com/**', async (route) => {
    // Redirect x.com to twitter.com for consistency
    await route.fulfill({ 
      status: 302, 
      headers: { 'Location': route.request().url().replace('x.com', 'twitter.com') }
    });
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