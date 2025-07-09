import { MESSAGE_TYPES, SavedPrompt } from '../shared/types';
import { storage } from '../shared/storage';

class PopupManager {
  private promptList: HTMLElement;
  private loading: HTMLElement;
  private error: HTMLElement;
  private noApiKey: HTMLElement;

  constructor() {
    this.promptList = document.getElementById('prompt-list')!;
    this.loading = document.getElementById('loading')!;
    this.error = document.getElementById('error')!;
    this.noApiKey = document.getElementById('no-api-key')!;
    
    this.initialize();
  }

  private async initialize(): Promise<void> {
    // Set up options page links
    const optionsLinks = document.querySelectorAll('#options-link, #options-link-inline');
    optionsLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.runtime.openOptionsPage();
        window.close();
      });
    });

    // Load and display prompts
    await this.loadPrompts();
  }

  private async loadPrompts(): Promise<void> {
    try {
      this.showLoading();
      
      // Check if API key is configured
      const apiKey = await storage.getApiKey();
      if (!apiKey) {
        this.showNoApiKey();
        return;
      }

      // Load prompts
      const prompts = await storage.getPrompts();
      this.displayPrompts(prompts);
    } catch (error) {
      console.error('Failed to load prompts:', error);
      this.showError('Failed to load prompts. Please try again.');
    }
  }

  private displayPrompts(prompts: SavedPrompt[]): void {
    this.hideAllStates();
    this.promptList.style.display = 'block';
    
    // Clear existing items
    this.promptList.innerHTML = '';

    // Sort prompts to show default first
    const sortedPrompts = [...prompts].sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return a.name.localeCompare(b.name);
    });

    // Create prompt items
    sortedPrompts.forEach(prompt => {
      const promptItem = this.createPromptItem(prompt);
      this.promptList.appendChild(promptItem);
    });
  }

  private createPromptItem(prompt: SavedPrompt): HTMLElement {
    const li = document.createElement('li');
    li.className = `prompt-item ${prompt.isDefault ? 'default' : ''}`;
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'prompt-name';
    nameSpan.textContent = prompt.name;
    
    li.appendChild(nameSpan);
    
    if (prompt.isDefault) {
      const star = document.createElement('span');
      star.className = 'default-star';
      star.textContent = '★';
      li.appendChild(star);
    }
    
    // Add click handler
    li.addEventListener('click', () => {
      this.analyzeWithPrompt(prompt.id);
    });
    
    return li;
  }

  private async analyzeWithPrompt(promptId: string): Promise<void> {
    try {
      // Get the current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.id) {
        throw new Error('No active tab found');
      }

      // Send message to content script
      await chrome.tabs.sendMessage(tab.id, {
        type: MESSAGE_TYPES.ANALYZE_CONTENT,
        promptId: promptId
      });
      
      // Close popup
      window.close();
    } catch (error) {
      console.error('Failed to start analysis:', error);
      this.showError('Failed to start analysis. Please try again.');
    }
  }

  private showLoading(): void {
    this.hideAllStates();
    this.loading.style.display = 'block';
  }

  private showError(message: string): void {
    this.hideAllStates();
    this.error.textContent = message;
    this.error.style.display = 'block';
  }

  private showNoApiKey(): void {
    this.hideAllStates();
    this.noApiKey.style.display = 'block';
  }

  private hideAllStates(): void {
    this.loading.style.display = 'none';
    this.error.style.display = 'none';
    this.noApiKey.style.display = 'none';
    this.promptList.style.display = 'none';
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});