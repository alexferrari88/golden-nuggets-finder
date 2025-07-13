import { test, expect } from './fixtures';

test.describe('Options Page', () => {
  test('options page loads and displays basic elements', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    
    // Check that the page loads without errors
    await expect(page).toHaveURL(new RegExp(`chrome-extension://${extensionId}/options.html`));
    
    // Basic smoke test - page should have some content
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    await page.close();
  });
});