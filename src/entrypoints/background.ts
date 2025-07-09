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
      // Inject content script dynamically
      await injectContentScript(tab.id);
      
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

      // Inject the content script
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content-injector.js']
      });
    } catch (error) {
      console.error('Failed to inject content script:', error);
    }
  }
});