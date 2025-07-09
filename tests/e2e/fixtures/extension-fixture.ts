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
    const pathToExtension = path.resolve('./build/chrome-mv3-dev');
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
        '--disable-web-security',
      ],
    });
    await use(context);
    await context.close();
  },

  extensionId: async ({ context }, use) => {
    // Get the extension ID from the context
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }
    
    const extensionId = background.url().split('/')[2];
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