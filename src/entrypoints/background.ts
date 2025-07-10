import { storage } from '../shared/storage';
import { MESSAGE_TYPES } from '../shared/types';
import { GeminiClient } from '../background/gemini-client';
import { MessageHandler } from '../background/message-handler';

export default defineBackground(() => {
  const geminiClient = new GeminiClient();
  const messageHandler = new MessageHandler(geminiClient);

  // Set up message listeners
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    messageHandler.handleMessage(request, sender, sendResponse);
    return true; // Keep the message channel open for async responses
  });

  // Set up context menu
  chrome.runtime.onInstalled.addListener(() => {
    setupContextMenu();
  });

  // Update context menu when prompts change
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.userPrompts) {
      setupContextMenu();
    }
  });

  // Handle context menu clicks
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId && typeof info.menuItemId === 'string' && info.menuItemId.startsWith('prompt-')) {
      const promptId = info.menuItemId.replace('prompt-', '');
      handleContextMenuClick(promptId, tab);
    }
  });

  async function setupContextMenu(): Promise<void> {
    try {
      // Clear existing menu items
      await chrome.contextMenus.removeAll();

      // Get current prompts
      const prompts = await storage.getPrompts();

      // Create parent menu item
      chrome.contextMenus.create({
        id: 'golden-nugget-finder',
        title: 'Find Golden Nuggets',
        contexts: ['page', 'selection']
      });

      // Create sub-menu items for each prompt
      prompts.forEach(prompt => {
        chrome.contextMenus.create({
          id: `prompt-${prompt.id}`,
          parentId: 'golden-nugget-finder',
          title: prompt.isDefault ? `★ ${prompt.name}` : prompt.name,
          contexts: ['page', 'selection']
        });
      });
    } catch (error) {
      console.error('Failed to setup context menu:', error);
    }
  }

  async function handleContextMenuClick(promptId: string, tab?: chrome.tabs.Tab): Promise<void> {
    if (!tab?.id) return;

    try {
      // Check if API key is configured before proceeding
      const apiKey = await storage.getApiKey({ source: 'background', action: 'read', timestamp: Date.now() });
      
      // Inject content script dynamically
      await injectContentScript(tab.id);
      
      if (!apiKey) {
        // Show error message if API key is not configured
        // Add a small delay to ensure content script is ready
        await new Promise(resolve => setTimeout(resolve, 100));
        await chrome.tabs.sendMessage(tab.id, {
          type: MESSAGE_TYPES.SHOW_ERROR,
          message: 'Gemini API key not configured. Please set it in the extension options.'
        });
        return;
      }
      
      // Send message to content script to start analysis
      await chrome.tabs.sendMessage(tab.id, {
        type: MESSAGE_TYPES.ANALYZE_CONTENT,
        promptId: promptId
      });
    } catch (error) {
      console.error('Failed to send message to content script:', error);
    }
  }

  async function injectContentScript(tabId: number): Promise<void> {
    try {
      // Check if content script is already injected by trying to send a test message
      const testResponse = await chrome.tabs.sendMessage(tabId, { type: 'PING' }).catch(() => null);
      
      if (testResponse) {
        // Content script already exists
        return;
      }

      // Inject the content script dynamically using the built file
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content-scripts/content.js']
      });

      // Give the content script a moment to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify injection worked
      const verifyResponse = await chrome.tabs.sendMessage(tabId, { type: 'PING' }).catch(() => null);
      
      if (!verifyResponse) {
        throw new Error('Content script failed to inject properly');
      }
    } catch (error) {
      console.error('Failed to inject content script:', error);
      throw error;
    }
  }
});