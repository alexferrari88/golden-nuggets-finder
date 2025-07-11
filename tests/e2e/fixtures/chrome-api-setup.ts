import { Worker } from '@playwright/test';

/**
 * Chrome API setup utilities for extension testing
 * Provides functions to verify API availability, seed test data, and manage storage
 */

export interface ChromeAPISetup {
  chromeApiReady: boolean;
}

/**
 * Verify Chrome APIs are available in service worker context
 */
export const setupChromeAPIs = async (serviceWorker: Worker): Promise<void> => {
  await serviceWorker.evaluate(() => {
    if (!chrome || !chrome.storage || !chrome.storage.sync) {
      throw new Error('Chrome APIs not available in service worker context');
    }
    
    // Additional API checks for common extension APIs
    if (!chrome.runtime || !chrome.contextMenus) {
      throw new Error('Required Chrome extension APIs not available');
    }
  });
};

/**
 * Seed test data into extension storage
 */
export const seedTestData = async (serviceWorker: Worker, testData: Record<string, any>): Promise<void> => {
  await serviceWorker.evaluate((data) => {
    return new Promise<void>((resolve, reject) => {
      chrome.storage.sync.set(data, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(`Failed to seed test data: ${chrome.runtime.lastError.message}`));
        } else {
          resolve();
        }
      });
    });
  }, testData);
};

/**
 * Verify storage state matches expected values
 */
export const verifyStorageState = async (serviceWorker: Worker, expectedKeys: string[]): Promise<Record<string, any>> => {
  return await serviceWorker.evaluate((keys) => {
    return new Promise<Record<string, any>>((resolve, reject) => {
      chrome.storage.sync.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(`Failed to verify storage state: ${chrome.runtime.lastError.message}`));
        } else {
          resolve(result);
        }
      });
    });
  }, expectedKeys);
};

/**
 * Clear all extension storage data
 */
export const clearStorageData = async (serviceWorker: Worker): Promise<void> => {
  await serviceWorker.evaluate(() => {
    return new Promise<void>((resolve, reject) => {
      chrome.storage.sync.clear(() => {
        if (chrome.runtime.lastError) {
          reject(new Error(`Failed to clear storage: ${chrome.runtime.lastError.message}`));
        } else {
          resolve();
        }
      });
    });
  });
};

/**
 * Get all storage data for debugging
 */
export const getAllStorageData = async (serviceWorker: Worker): Promise<Record<string, any>> => {
  return await serviceWorker.evaluate(() => {
    return new Promise<Record<string, any>>((resolve, reject) => {
      chrome.storage.sync.get(null, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(`Failed to get storage data: ${chrome.runtime.lastError.message}`));
        } else {
          resolve(result);
        }
      });
    });
  });
};

/**
 * Verify specific storage keys exist
 */
export const verifyStorageKeys = async (serviceWorker: Worker, requiredKeys: string[]): Promise<boolean> => {
  const storageData = await getAllStorageData(serviceWorker);
  const missingKeys = requiredKeys.filter(key => !(key in storageData));
  
  if (missingKeys.length > 0) {
    throw new Error(`Missing required storage keys: ${missingKeys.join(', ')}`);
  }
  
  return true;
};

/**
 * Set up default test configuration in storage
 */
export const setupDefaultTestConfig = async (serviceWorker: Worker): Promise<void> => {
  const defaultConfig = {
    geminiApiKey: 'test-api-key',
    userPrompts: [
      {
        id: 'test-prompt-1',
        name: 'Test Prompt',
        content: 'Test prompt content',
        isDefault: true
      }
    ]
  };
  
  await seedTestData(serviceWorker, defaultConfig);
};

/**
 * Wait for Chrome APIs to be ready with timeout
 */
export const waitForChromeAPIs = async (serviceWorker: Worker, timeoutMs: number = 10000): Promise<void> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      await setupChromeAPIs(serviceWorker);
      return;
    } catch (error) {
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  throw new Error(`Chrome APIs not ready after ${timeoutMs}ms timeout`);
};