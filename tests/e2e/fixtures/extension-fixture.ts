import { test as base, chromium, BrowserContext, Page } from '@playwright/test';
import path from 'path';

export interface ExtensionFixtures {
  context: BrowserContext;
  extensionId: string;
  page: Page;
  optionsPage: Page;
  popupPage: Page;
}

export const test = base.extend<ExtensionFixtures>({
  context: async ({}, use) => {
    const pathToExtension = path.resolve('./dist/chrome-mv3');
    const userDataDir = `/tmp/test-user-data-dir-${Date.now()}-${Math.random()}`;
    const context = await chromium.launchPersistentContext(userDataDir, {
      channel: 'chromium',
      headless: true,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
        '--disable-web-security',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--enable-automation',
        '--allow-running-insecure-content',
        '--disable-component-extensions-with-background-pages',
        '--disable-default-apps',
        '--disable-popup-blocking',
        '--disable-prompt-on-repost',
        '--disable-hang-monitor',
        '--disable-sync',
        '--disable-background-networking',
        '--disable-breakpad',
        '--disable-client-side-phishing-detection',
        '--disable-component-update',
        '--disable-domain-reliability'
      ],
    });
    await use(context);
    await context.close();
  },

  extensionId: async ({ context }, use) => {
    // Get the extension ID from the service worker
    let [serviceWorker] = context.serviceWorkers();
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent('serviceworker');
    }
    
    const extensionId = serviceWorker.url().split('/')[2];
    await use(extensionId);
  },

  page: async ({ context }, use) => {
    const page = await context.newPage();
    await use(page);
  },

  optionsPage: async ({ context, extensionId }, use) => {
    const optionsPage = await context.newPage();
    await optionsPage.goto(`chrome-extension://${extensionId}/options.html`);
    await use(optionsPage);
  },

  popupPage: async ({ context, extensionId }, use) => {
    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
    await use(popupPage);
  },
});

export { expect } from '@playwright/test';