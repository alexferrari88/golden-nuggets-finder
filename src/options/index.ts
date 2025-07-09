import { SavedPrompt } from '../shared/types';
import { storage } from '../shared/storage';
import { GeminiClient } from '../background/gemini-client';

class OptionsManager {
  private apiKeyInput: HTMLInputElement;
  private apiKeyStatus: HTMLElement;
  private promptList: HTMLElement;
  private modal: HTMLElement;
  private modalTitle: HTMLElement;
  private promptNameInput: HTMLInputElement;
  private promptTextInput: HTMLTextAreaElement;
  private promptDefaultInput: HTMLInputElement;
  private alertContainer: HTMLElement;
  
  private currentEditingPrompt: SavedPrompt | null = null;
  private geminiClient: GeminiClient;

  constructor() {
    this.apiKeyInput = document.getElementById('api-key') as HTMLInputElement;
    this.apiKeyStatus = document.getElementById('api-key-status')!;
    this.promptList = document.getElementById('prompt-list')!;
    this.modal = document.getElementById('prompt-modal')!;
    this.modalTitle = document.getElementById('modal-title')!;
    this.promptNameInput = document.getElementById('prompt-name') as HTMLInputElement;
    this.promptTextInput = document.getElementById('prompt-text') as HTMLTextAreaElement;
    this.promptDefaultInput = document.getElementById('prompt-default') as HTMLInputElement;
    this.alertContainer = document.getElementById('alert-container')!;
    
    this.geminiClient = new GeminiClient();
    
    this.initialize();
  }

  private async initialize(): Promise<void> {
    // Load initial data
    await this.loadApiKey();
    await this.loadPrompts();
    
    // Set up event listeners
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // API Key management
    document.getElementById('save-api-key')!.addEventListener('click', () => {
      this.saveApiKey();
    });
    
    document.getElementById('test-api-key')!.addEventListener('click', () => {
      this.testApiKey();
    });
    
    // Prompt management
    document.getElementById('add-prompt')!.addEventListener('click', () => {
      this.openPromptModal();
    });
    
    document.getElementById('save-prompt')!.addEventListener('click', () => {
      this.savePrompt();
    });
    
    document.getElementById('cancel-prompt')!.addEventListener('click', () => {
      this.closePromptModal();
    });
    
    document.getElementById('modal-close')!.addEventListener('click', () => {
      this.closePromptModal();
    });
    
    // Close modal when clicking outside
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.closePromptModal();
      }
    });
  }

  private async loadApiKey(): Promise<void> {
    try {
      const apiKey = await storage.getApiKey();
      this.apiKeyInput.value = apiKey;
    } catch (error) {
      console.error('Failed to load API key:', error);
      this.showAlert('Failed to load API key', 'error');
    }
  }

  private async saveApiKey(): Promise<void> {
    try {
      const apiKey = this.apiKeyInput.value.trim();
      await storage.saveApiKey(apiKey);
      this.showAlert('API key saved successfully', 'success');
      
      // Clear status
      this.apiKeyStatus.textContent = '';
      this.apiKeyStatus.className = 'api-key-test';
    } catch (error) {
      console.error('Failed to save API key:', error);
      this.showAlert('Failed to save API key', 'error');
    }
  }

  private async testApiKey(): Promise<void> {
    const apiKey = this.apiKeyInput.value.trim();
    
    if (!apiKey) {
      this.showAlert('Please enter an API key first', 'error');
      return;
    }
    
    try {
      this.apiKeyStatus.textContent = 'Testing API key...';
      this.apiKeyStatus.className = 'api-key-test testing';
      
      const isValid = await this.geminiClient.validateApiKey(apiKey);
      
      if (isValid) {
        this.apiKeyStatus.textContent = '✓ API key is valid';
        this.apiKeyStatus.className = 'api-key-test valid';
      } else {
        this.apiKeyStatus.textContent = '✗ API key is invalid';
        this.apiKeyStatus.className = 'api-key-test invalid';
      }
    } catch (error) {
      console.error('Failed to test API key:', error);
      this.apiKeyStatus.textContent = '✗ Error testing API key';
      this.apiKeyStatus.className = 'api-key-test invalid';
    }
  }

  private async loadPrompts(): Promise<void> {
    try {
      const prompts = await storage.getPrompts();
      this.displayPrompts(prompts);
    } catch (error) {
      console.error('Failed to load prompts:', error);
      this.showAlert('Failed to load prompts', 'error');
    }
  }

  private displayPrompts(prompts: SavedPrompt[]): void {
    this.promptList.innerHTML = '';
    
    // Sort prompts to show default first
    const sortedPrompts = [...prompts].sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return a.name.localeCompare(b.name);
    });
    
    sortedPrompts.forEach(prompt => {
      const promptItem = this.createPromptItem(prompt);
      this.promptList.appendChild(promptItem);
    });
  }

  private createPromptItem(prompt: SavedPrompt): HTMLElement {
    const li = document.createElement('li');
    li.className = `prompt-item ${prompt.isDefault ? 'default' : ''}`;
    
    const promptInfo = document.createElement('div');
    promptInfo.className = 'prompt-info';
    
    const promptName = document.createElement('div');
    promptName.className = 'prompt-name';
    
    if (prompt.isDefault) {
      const star = document.createElement('span');
      star.className = 'default-star';
      star.textContent = '★';
      promptName.appendChild(star);
    }
    
    promptName.appendChild(document.createTextNode(prompt.name));
    
    const promptPreview = document.createElement('div');
    promptPreview.className = 'prompt-preview';
    promptPreview.textContent = prompt.prompt.length > 100 
      ? prompt.prompt.substring(0, 100) + '...'
      : prompt.prompt;
    
    promptInfo.appendChild(promptName);
    promptInfo.appendChild(promptPreview);
    
    const promptActions = document.createElement('div');
    promptActions.className = 'prompt-actions';
    
    // Edit button
    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-small';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => {
      this.editPrompt(prompt);
    });
    
    // Set Default button (if not already default)
    if (!prompt.isDefault) {
      const defaultBtn = document.createElement('button');
      defaultBtn.className = 'btn btn-small btn-secondary';
      defaultBtn.textContent = '★';
      defaultBtn.title = 'Set as default';
      defaultBtn.addEventListener('click', () => {
        this.setDefaultPrompt(prompt.id);
      });
      promptActions.appendChild(defaultBtn);
    }
    
    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-small btn-danger';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => {
      this.deletePrompt(prompt.id);
    });
    
    promptActions.appendChild(editBtn);
    promptActions.appendChild(deleteBtn);
    
    li.appendChild(promptInfo);
    li.appendChild(promptActions);
    
    return li;
  }

  private openPromptModal(prompt?: SavedPrompt): void {
    this.currentEditingPrompt = prompt || null;
    
    if (prompt) {
      this.modalTitle.textContent = 'Edit Prompt';
      this.promptNameInput.value = prompt.name;
      this.promptTextInput.value = prompt.prompt;
      this.promptDefaultInput.checked = prompt.isDefault;
    } else {
      this.modalTitle.textContent = 'Add New Prompt';
      this.promptNameInput.value = '';
      this.promptTextInput.value = '';
      this.promptDefaultInput.checked = false;
    }
    
    this.modal.style.display = 'block';
    this.promptNameInput.focus();
  }

  private closePromptModal(): void {
    this.modal.style.display = 'none';
    this.currentEditingPrompt = null;
  }

  private async savePrompt(): Promise<void> {
    const name = this.promptNameInput.value.trim();
    const promptText = this.promptTextInput.value.trim();
    const isDefault = this.promptDefaultInput.checked;
    
    if (!name || !promptText) {
      this.showAlert('Please fill in all fields', 'error');
      return;
    }
    
    try {
      const prompt: SavedPrompt = {
        id: this.currentEditingPrompt?.id || this.generateId(),
        name,
        prompt: promptText,
        isDefault
      };
      
      await storage.savePrompt(prompt);
      
      // If this is set as default, update other prompts
      if (isDefault) {
        await storage.setDefaultPrompt(prompt.id);
      }
      
      this.closePromptModal();
      await this.loadPrompts();
      
      this.showAlert(
        this.currentEditingPrompt ? 'Prompt updated successfully' : 'Prompt added successfully',
        'success'
      );
    } catch (error) {
      console.error('Failed to save prompt:', error);
      this.showAlert('Failed to save prompt', 'error');
    }
  }

  private editPrompt(prompt: SavedPrompt): void {
    this.openPromptModal(prompt);
  }

  private async setDefaultPrompt(promptId: string): Promise<void> {
    try {
      await storage.setDefaultPrompt(promptId);
      await this.loadPrompts();
      this.showAlert('Default prompt updated', 'success');
    } catch (error) {
      console.error('Failed to set default prompt:', error);
      this.showAlert('Failed to set default prompt', 'error');
    }
  }

  private async deletePrompt(promptId: string): Promise<void> {
    if (!confirm('Are you sure you want to delete this prompt?')) {
      return;
    }
    
    try {
      await storage.deletePrompt(promptId);
      await this.loadPrompts();
      this.showAlert('Prompt deleted successfully', 'success');
    } catch (error) {
      console.error('Failed to delete prompt:', error);
      this.showAlert('Failed to delete prompt', 'error');
    }
  }

  private showAlert(message: string, type: 'success' | 'error' | 'info'): void {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    this.alertContainer.appendChild(alert);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      alert.remove();
    }, 5000);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new OptionsManager();
});