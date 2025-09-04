import type { StorageInterface, ProviderId } from '@golden-nuggets/core';
import { securityManager } from '../shared/security';

export class ChromeStorageAdapter implements StorageInterface {
  async getApiKey(providerId: ProviderId): Promise<string> {
    try {
      // Handle Gemini's special API key retrieval using SecurityManager
      if (providerId === 'gemini') {
        return await securityManager.getApiKey({
          source: 'background',
          action: 'read',
          timestamp: Date.now(),
        });
      } else {
        // Use regular Chrome storage for other providers
        const storageKey = `${providerId}ApiKey`;
        const result = await chrome.storage.sync.get(storageKey);
        const encryptedKey = result[storageKey];
        
        if (!encryptedKey) {
          throw new Error(`No API key configured for ${providerId}`);
        }
        
        return securityManager.decryptApiKey(encryptedKey);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to retrieve API key for ${providerId}: ${message}`);
    }
  }

  async getModel(providerId: ProviderId): Promise<string | null> {
    try {
      const storageKey = `${providerId}Model`;
      const result = await chrome.storage.sync.get(storageKey);
      return result[storageKey] || null;
    } catch (error) {
      // Return null on any error (non-critical)
      return null;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const result = await chrome.storage.local.get(key);
      const data = result[key];
      
      // Check for TTL expiration
      if (data && typeof data === 'object' && 'expires' in data) {
        if (Date.now() > data.expires) {
          // Expired, remove it
          await chrome.storage.local.remove(key);
          return null;
        }
        return data.value;
      }
      
      return data || null;
    } catch (error) {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const data = ttl ? { value, expires: Date.now() + ttl } : value;
      await chrome.storage.local.set({ [key]: data });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to store data for key ${key}: ${message}`);
    }
  }
}