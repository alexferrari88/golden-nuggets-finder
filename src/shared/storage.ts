import { STORAGE_KEYS, DEFAULT_PROMPTS } from './constants';
import { ExtensionConfig, SavedPrompt } from './types';

export class StorageManager {
  private static instance: StorageManager;
  
  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  async getApiKey(): Promise<string> {
    const result = await chrome.storage.sync.get(STORAGE_KEYS.API_KEY);
    return result[STORAGE_KEYS.API_KEY] || '';
  }

  async saveApiKey(apiKey: string): Promise<void> {
    await chrome.storage.sync.set({ [STORAGE_KEYS.API_KEY]: apiKey });
  }

  async getPrompts(): Promise<SavedPrompt[]> {
    const result = await chrome.storage.sync.get(STORAGE_KEYS.PROMPTS);
    const prompts = result[STORAGE_KEYS.PROMPTS] || [];
    
    // If no prompts exist, return default prompts
    if (prompts.length === 0) {
      const defaultPrompts = DEFAULT_PROMPTS.map(p => ({ ...p }));
      await this.savePrompts(defaultPrompts);
      return defaultPrompts;
    }
    
    return prompts;
  }

  async savePrompts(prompts: SavedPrompt[]): Promise<void> {
    // Check size limit (chrome.storage.sync has 8KB per item limit)
    const data = { [STORAGE_KEYS.PROMPTS]: prompts };
    const size = new Blob([JSON.stringify(data)]).size;
    
    if (size > 8192) {
      throw new Error('Prompt data too large. Please reduce prompt count or length.');
    }
    
    await chrome.storage.sync.set(data);
  }

  async savePrompt(prompt: SavedPrompt): Promise<void> {
    const prompts = await this.getPrompts();
    const existingIndex = prompts.findIndex(p => p.id === prompt.id);
    
    if (existingIndex >= 0) {
      prompts[existingIndex] = prompt;
    } else {
      prompts.push(prompt);
    }
    
    await this.savePrompts(prompts);
  }

  async deletePrompt(promptId: string): Promise<void> {
    const prompts = await this.getPrompts();
    const filteredPrompts = prompts.filter(p => p.id !== promptId);
    await this.savePrompts(filteredPrompts);
  }

  async setDefaultPrompt(promptId: string): Promise<void> {
    const prompts = await this.getPrompts();
    const updatedPrompts = prompts.map(p => ({
      ...p,
      isDefault: p.id === promptId
    }));
    await this.savePrompts(updatedPrompts);
  }

  async getDefaultPrompt(): Promise<SavedPrompt | null> {
    const prompts = await this.getPrompts();
    return prompts.find(p => p.isDefault) || prompts[0] || null;
  }

  async getConfig(): Promise<ExtensionConfig> {
    const [apiKey, prompts] = await Promise.all([
      this.getApiKey(),
      this.getPrompts()
    ]);
    
    return {
      geminiApiKey: apiKey,
      userPrompts: prompts
    };
  }

  async saveConfig(config: Partial<ExtensionConfig>): Promise<void> {
    const updates: { [key: string]: any } = {};
    
    if (config.geminiApiKey !== undefined) {
      updates[STORAGE_KEYS.API_KEY] = config.geminiApiKey;
    }
    
    if (config.userPrompts !== undefined) {
      updates[STORAGE_KEYS.PROMPTS] = config.userPrompts;
    }
    
    await chrome.storage.sync.set(updates);
  }

  async clearAll(): Promise<void> {
    await chrome.storage.sync.clear();
  }
}

export const storage = StorageManager.getInstance();