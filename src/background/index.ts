import { storage } from '../shared/storage';
import { MESSAGE_TYPES } from '../shared/types';
import { GeminiClient } from './gemini-client';
import { MessageHandler } from './message-handler';

class BackgroundService {
  private geminiClient: GeminiClient;
  private messageHandler: MessageHandler;

  constructor() {
    this.geminiClient = new GeminiClient();
    this.messageHandler = new MessageHandler(this.geminiClient);
    this.initialize();
  }

  private initialize(): void {
    // Set up message listeners
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.messageHandler.handleMessage(request, sender, sendResponse);
      return true; // Keep the message channel open for async responses
    });

    // Set up context menu
    chrome.runtime.onInstalled.addListener(() => {
      this.setupContextMenu();
    });

    // Update context menu when prompts change
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'sync' && changes.userPrompts) {
        this.setupContextMenu();
      }
    });

    // Handle context menu clicks
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      if (info.menuItemId && typeof info.menuItemId === 'string' && info.menuItemId.startsWith('prompt-')) {
        const promptId = info.menuItemId.replace('prompt-', '');
        this.handleContextMenuClick(promptId, tab);
      }
    });
  }

  private async setupContextMenu(): Promise<void> {
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

  private async handleContextMenuClick(promptId: string, tab?: chrome.tabs.Tab): Promise<void> {
    if (!tab?.id) return;

    try {
      // Send message to content script to start analysis
      await chrome.tabs.sendMessage(tab.id, {
        type: MESSAGE_TYPES.ANALYZE_CONTENT,
        promptId: promptId
      });
    } catch (error) {
      console.error('Failed to send message to content script:', error);
    }
  }
}

// Initialize the background service
new BackgroundService();