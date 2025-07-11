import { test, expect } from './fixtures/extension-fixture';
import { TEST_API_KEY, DEFAULT_PROMPTS } from './fixtures/test-data';

test.describe('Extension Setup Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing storage
    await page.evaluate(() => {
      return new Promise((resolve) => {
        chrome.storage.sync.clear(() => resolve(undefined));
      });
    });
  });

  test('should install and load extension properly', async ({ page, extensionId }) => {
    expect(extensionId).toBeDefined();
    expect(extensionId).toMatch(/^[a-z]{32}$/);
    
    // Check that extension is loaded
    const extensionUrl = `chrome-extension://${extensionId}/popup.html`;
    await page.goto(extensionUrl);
    
    await expect(page.locator('text=Golden Nugget Finder')).toBeVisible();
  });

  test('should show API key configuration prompt when no key is set', async ({ popupPage }) => {
    // Should show API key prompt
    await expect(popupPage.locator('text=Please set your Gemini API key')).toBeVisible();
    await expect(popupPage.locator('text=options page')).toBeVisible();
  });

  test('should configure API key in options page', async ({ optionsPage }) => {
    // Should show options page
    await expect(optionsPage.locator('h1:has-text("Golden Nugget Finder Settings")')).toBeVisible();
    
    // Find and fill API key input
    const apiKeyInput = optionsPage.locator('input[type="password"]');
    await expect(apiKeyInput).toBeVisible();
    await apiKeyInput.fill(TEST_API_KEY);
    
    // Mock API validation
    await optionsPage.route('**/generativelanguage.googleapis.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          candidates: [{
            content: { parts: [{ text: 'test' }] }
          }]
        })
      });
    });
    
    // Click save button
    await optionsPage.locator('button:has-text("Save & Validate")').click();
    
    // Should show success message
    await expect(optionsPage.locator('text=API key saved and validated successfully!')).toBeVisible();
  });

  test('should handle invalid API key', async ({ optionsPage }) => {
    const apiKeyInput = optionsPage.locator('input[type="password"]');
    await apiKeyInput.fill('invalid-key');
    
    // Mock API validation error
    await optionsPage.route('**/generativelanguage.googleapis.com/**', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { code: 401, message: 'Invalid API key' }
        })
      });
    });
    
    await optionsPage.locator('button:has-text("Save & Validate")').click();
    
    // Should show error message
    await expect(optionsPage.locator('text=Invalid API key. Please check and try again.')).toBeVisible();
  });

  test('should create new prompt', async ({ optionsPage }) => {
    // First set up API key
    await optionsPage.locator('input[type="password"]').fill(TEST_API_KEY);
    
    // Mock API validation
    await optionsPage.route('**/generativelanguage.googleapis.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          candidates: [{
            content: { parts: [{ text: 'test' }] }
          }]
        })
      });
    });
    
    await optionsPage.locator('button:has-text("Save & Validate")').click();
    await expect(optionsPage.locator('text=API key saved and validated successfully!')).toBeVisible();
    
    // Click Add New Prompt
    await optionsPage.locator('button:has-text("Add New Prompt")').click();
    
    // Should show modal
    await expect(optionsPage.locator('text=Add New Prompt')).toBeVisible();
    
    // Fill prompt details
    await optionsPage.locator('input[type="text"]').fill('Test Prompt');
    await optionsPage.locator('textarea').fill('Find test-related content and examples.');
    
    // Save prompt
    await optionsPage.locator('button:has-text("Save")').click();
    
    // Should show in prompt list
    await expect(optionsPage.locator('text=Test Prompt')).toBeVisible();
    await expect(optionsPage.locator('text=Find test-related content and examples.')).toBeVisible();
  });

  test('should edit existing prompt', async ({ optionsPage, page }) => {
    // Set up API key and create a prompt first
    await optionsPage.locator('input[type="password"]').fill(TEST_API_KEY);
    
    await optionsPage.route('**/generativelanguage.googleapis.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          candidates: [{
            content: { parts: [{ text: 'test' }] }
          }]
        })
      });
    });
    
    await optionsPage.locator('button:has-text("Save & Validate")').click();
    await expect(optionsPage.locator('text=API key saved and validated successfully!')).toBeVisible();
    
    // Create a test prompt
    await page.evaluate(() => {
      return new Promise((resolve) => {
        chrome.storage.sync.set({
          userPrompts: [{
            id: 'test-1',
            name: 'Original Name',
            prompt: 'Original prompt text',
            isDefault: false
          }]
        }, () => resolve(undefined));
      });
    });
    
    // Reload page to see the new prompt
    await optionsPage.reload();
    
    // Click Edit button
    await optionsPage.locator('button:has-text("Edit")').click();
    
    // Should show modal with existing values
    await expect(optionsPage.locator('text=Edit Prompt')).toBeVisible();
    await expect(optionsPage.locator('input[type="text"]')).toHaveValue('Original Name');
    await expect(optionsPage.locator('textarea')).toHaveValue('Original prompt text');
    
    // Edit the prompt
    await optionsPage.locator('input[type="text"]').fill('Edited Name');
    await optionsPage.locator('textarea').fill('Edited prompt text');
    
    // Save changes
    await optionsPage.locator('button:has-text("Save")').click();
    
    // Should show updated values
    await expect(optionsPage.locator('text=Edited Name')).toBeVisible();
    await expect(optionsPage.locator('text=Edited prompt text')).toBeVisible();
  });

  test('should delete prompt', async ({ optionsPage, page }) => {
    // Set up API key and create a prompt first
    await optionsPage.locator('input[type="password"]').fill(TEST_API_KEY);
    
    await optionsPage.route('**/generativelanguage.googleapis.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          candidates: [{
            content: { parts: [{ text: 'test' }] }
          }]
        })
      });
    });
    
    await optionsPage.locator('button:has-text("Save & Validate")').click();
    await expect(optionsPage.locator('text=API key saved and validated successfully!')).toBeVisible();
    
    // Create a test prompt
    await page.evaluate(() => {
      return new Promise((resolve) => {
        chrome.storage.sync.set({
          userPrompts: [{
            id: 'test-delete',
            name: 'To Be Deleted',
            prompt: 'This will be deleted',
            isDefault: false
          }]
        }, () => resolve(undefined));
      });
    });
    
    // Reload page to see the new prompt
    await optionsPage.reload();
    
    // Confirm prompt exists
    await expect(optionsPage.locator('text=To Be Deleted')).toBeVisible();
    
    // Mock the confirm dialog
    optionsPage.on('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      expect(dialog.message()).toBe('Are you sure you want to delete this prompt?');
      await dialog.accept();
    });
    
    // Click Delete button
    await optionsPage.locator('button:has-text("Delete")').click();
    
    // Should be removed from the list
    await expect(optionsPage.locator('text=To Be Deleted')).not.toBeVisible();
  });

  test('should set default prompt', async ({ optionsPage, page }) => {
    // Set up API key and create prompts
    await optionsPage.locator('input[type="password"]').fill(TEST_API_KEY);
    
    await optionsPage.route('**/generativelanguage.googleapis.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          candidates: [{
            content: { parts: [{ text: 'test' }] }
          }]
        })
      });
    });
    
    await optionsPage.locator('button:has-text("Save & Validate")').click();
    await expect(optionsPage.locator('text=API key saved and validated successfully!')).toBeVisible();
    
    // Create test prompts
    await page.evaluate(() => {
      return new Promise((resolve) => {
        chrome.storage.sync.set({
          userPrompts: [
            {
              id: 'prompt-1',
              name: 'First Prompt',
              prompt: 'First prompt text',
              isDefault: true
            },
            {
              id: 'prompt-2',
              name: 'Second Prompt',
              prompt: 'Second prompt text',
              isDefault: false
            }
          ]
        }, () => resolve(undefined));
      });
    });
    
    // Reload page
    await optionsPage.reload();
    
    // First prompt should be default
    await expect(optionsPage.locator('text=First Prompt').locator('..').locator('button:has-text("Default")')).toBeVisible();
    
    // Set second prompt as default
    await optionsPage.locator('text=Second Prompt').locator('..').locator('button:has-text("Set Default")').click();
    
    // Should update to show second prompt as default
    await expect(optionsPage.locator('text=Second Prompt').locator('..').locator('button:has-text("Default")')).toBeVisible();
    await expect(optionsPage.locator('text=First Prompt').locator('..').locator('button:has-text("Set Default")')).toBeVisible();
  });

  test('should show prompts in popup after configuration', async ({ popupPage, page }) => {
    // Set up API key and prompts
    await page.evaluate(() => {
      return new Promise((resolve) => {
        chrome.storage.sync.set({
          geminiApiKey: TEST_API_KEY,
          userPrompts: DEFAULT_PROMPTS
        }, () => resolve(undefined));
      });
    });
    
    // Reload popup
    await popupPage.reload();
    
    // Should show prompts list
    await expect(popupPage.locator('text=Find Tools')).toBeVisible();
    await expect(popupPage.locator('text=Find Analogies')).toBeVisible();
    await expect(popupPage.locator('text=Find Explanations')).toBeVisible();
    
    // Default prompt should be marked with star
    await expect(popupPage.locator('text=Find Tools').locator('..').locator('text=⭐')).toBeVisible();
  });
});