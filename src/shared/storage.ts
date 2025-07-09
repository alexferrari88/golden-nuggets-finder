import { STORAGE_KEYS, DEFAULT_PROMPTS } from './constants';
import { ExtensionConfig, SavedPrompt } from './types';

export class StorageManager {
  private static instance: StorageManager;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 30 * 1000; // 30 seconds
  
  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  async getApiKey(): Promise<string> {
    const cached = this.getFromCache(STORAGE_KEYS.API_KEY);
    if (cached !== null) {
      return cached;
    }
    
    const result = await chrome.storage.sync.get(STORAGE_KEYS.API_KEY);
    const apiKey = result[STORAGE_KEYS.API_KEY] || '';
    
    this.setCache(STORAGE_KEYS.API_KEY, apiKey);
    return apiKey;
  }

  async saveApiKey(apiKey: string): Promise<void> {
    this.setCache(STORAGE_KEYS.API_KEY, apiKey);
    await chrome.storage.sync.set({ [STORAGE_KEYS.API_KEY]: apiKey });
  }

  async getPrompts(): Promise<SavedPrompt[]> {
    const cached = this.getFromCache(STORAGE_KEYS.PROMPTS);
    if (cached !== null) {
      return cached;
    }
    
    const result = await chrome.storage.sync.get(STORAGE_KEYS.PROMPTS);
    const prompts = result[STORAGE_KEYS.PROMPTS] || [];
    
    // If no prompts exist, return default prompts
    if (prompts.length === 0) {
      const defaultPrompts = DEFAULT_PROMPTS.map(p => ({ ...p }));
      await this.savePrompts(defaultPrompts);
      return defaultPrompts;
    }
    
    this.setCache(STORAGE_KEYS.PROMPTS, prompts);
    return prompts;
  }

  async savePrompts(prompts: SavedPrompt[]): Promise<void> {
    // Check size limit (chrome.storage.sync has 8KB per item limit)
    const data = { [STORAGE_KEYS.PROMPTS]: prompts };
    const size = new Blob([JSON.stringify(data)]).size;
    
    if (size > 8192) {
      throw new Error('Prompt data too large. Please reduce prompt count or length.');
    }
    
    this.setCache(STORAGE_KEYS.PROMPTS, prompts);
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
    const configKey = 'full_config';
    const cached = this.getFromCache(configKey);
    if (cached !== null) {
      return cached;
    }
    
    const [apiKey, prompts] = await Promise.all([
      this.getApiKey(),
      this.getPrompts()
    ]);
    
    const config = {
      geminiApiKey: apiKey,
      userPrompts: prompts
    };
    
    this.setCache(configKey, config);
    return config;
  }

  async saveConfig(config: Partial<ExtensionConfig>): Promise<void> {
    const updates: { [key: string]: any } = {};
    
    if (config.geminiApiKey !== undefined) {
      updates[STORAGE_KEYS.API_KEY] = config.geminiApiKey;
      this.setCache(STORAGE_KEYS.API_KEY, config.geminiApiKey);
    }
    
    if (config.userPrompts !== undefined) {
      updates[STORAGE_KEYS.PROMPTS] = config.userPrompts;
      this.setCache(STORAGE_KEYS.PROMPTS, config.userPrompts);
    }
    
    // Clear full config cache
    this.clearCache('full_config');
    
    await chrome.storage.sync.set(updates);
  }

  async clearAll(): Promise<void> {
    this.cache.clear();
    await chrome.storage.sync.clear();
  }
  
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    
    // Remove expired cache entry
    if (cached) {
      this.cache.delete(key);
    }
    
    return null;
  }
  
  private setCache(key: string, data: any): void {
    // Limit cache size to prevent memory issues
    if (this.cache.size > 10) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
  
  private clearCache(key: string): void {
    this.cache.delete(key);
  }
  
  // For testing purposes - clear all cache
  clearAllCache(): void {
    this.cache.clear();
  }
}

export const storage = StorageManager.getInstance();