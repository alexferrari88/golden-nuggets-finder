import { test, expect } from './fixtures/extension-fixture';

test.describe('Basic Extension Test', () => {
  test('should load extension and get extension ID', async ({ context, extensionId, serviceWorker, chromeApiReady }) => {
    expect(extensionId).toBeDefined();
    expect(extensionId).toMatch(/^[a-z]{32}$/);
    
    // Should have a service worker available through fixture
    expect(serviceWorker).toBeDefined();
    expect(serviceWorker.url()).toContain(extensionId);
    
    // Chrome APIs should be ready
    expect(chromeApiReady).toBe(true);
    
    // Should be able to navigate to extension pages
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    
    // Should not throw an error
    await expect(page).toHaveURL(/chrome-extension:\/\/[a-z]+\/popup\.html/);
  });
});