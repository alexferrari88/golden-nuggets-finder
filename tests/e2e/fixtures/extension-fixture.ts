import { test as base, chromium, BrowserContext, Page, Worker } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { setupChromeAPIs, waitForChromeAPIs } from './chrome-api-setup';

export interface ExtensionFixtures {
  context: BrowserContext;
  serviceWorker: Worker;
  extensionId: string;
  chromeApiReady: boolean;
  page: Page;
  optionsPage: Page;
  popupPage: Page;
}

export const test = base.extend<ExtensionFixtures>({
  context: async ({}, use) => {
    // CRITICAL: Use development build for testing (CSP compatibility)
    // 
    // Rationale for development build:
    // - Production build CSP blocks localhost connections required for Playwright testing
    // - Development build allows localhost connections: script-src 'self' http://localhost:3000
    // - Development build includes additional 'tabs' permission for enhanced testing
    // - Development build has readable code for effective debugging of test failures
    // - 11x size increase (8.0 MB vs 711 kB) is acceptable for testing benefits
    const pathToExtension = path.resolve('./dist/chrome-mv3-dev');
    
    // Verify build exists before loading extension
    if (!fs.existsSync(path.join(pathToExtension, 'manifest.json'))) {
      throw new Error(`Build target not found: ${pathToExtension}. Run 'pnpm build' first.`);
    }
    
    const userDataDir = `/tmp/test-user-data-dir-${Date.now()}-${Math.random()}`;
    const context = await chromium.launchPersistentContext(userDataDir, {
      channel: 'chromium',
      headless: true,
      // Optimized browser args (7 essential args instead of 26)
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
        '--disable-component-extensions-with-background-pages',
        '--disable-web-security',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--enable-automation'
      ],
    });
    await use(context);
    await context.close();
  },

  serviceWorker: async ({ context }, use) => {
    // Get service worker with proper timeout and activation waiting
    let [serviceWorker] = context.serviceWorkers();
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent('serviceworker', { timeout: 30000 });
    }
    
    // Research-proven activation waiting pattern
    await serviceWorker.evaluate(() => {
      return new Promise((resolve) => {
        if (self.registration.active && self.registration.active.state === 'activated') {
          resolve(undefined);
        } else {
          self.addEventListener('install', () => {
            self.skipWaiting();
          });
          self.addEventListener('activate', () => {
            resolve(undefined);
          });
          // If already activated but we missed the event
          if (self.registration.active && self.registration.active.state === 'activated') {
            resolve(undefined);
          }
        }
      });
    });
    
    await use(serviceWorker);
  },

  extensionId: async ({ serviceWorker }, use) => {
    // Extract extension ID from service worker URL with validation
    const extensionId = serviceWorker.url().split('/')[2];
    if (!extensionId || extensionId.length !== 32) {
      throw new Error(`Invalid extension ID: ${extensionId}`);
    }
    await use(extensionId);
  },

  chromeApiReady: async ({ serviceWorker }, use) => {
    // Verify Chrome APIs are available and ready
    await waitForChromeAPIs(serviceWorker, 10000);
    await use(true);
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