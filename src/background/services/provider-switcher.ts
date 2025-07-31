import { ProviderFactory } from './provider-factory';
import { ApiKeyStorage } from '../../shared/storage/api-key-storage';
import { ProviderId, ProviderConfig } from '../../shared/types/providers';

export class ProviderSwitcher {
  static async switchProvider(providerId: ProviderId): Promise<boolean> {
    try {
      // Validate provider has API key
      let apiKey: string;
      if (providerId === 'gemini') {
        const result = await chrome.storage.local.get(['geminiApiKey']);
        apiKey = result.geminiApiKey;
      } else {
        apiKey = await ApiKeyStorage.get(providerId);
      }
      
      if (!apiKey) {
        throw new Error(`No API key configured for ${providerId}`);
      }
      
      // Test provider connection
      const config: ProviderConfig = {
        providerId,
        apiKey,
        modelName: ProviderFactory.getDefaultModel(providerId)
      };
      
      const provider = await ProviderFactory.createProvider(config);
      const isValid = await provider.validateApiKey();
      
      if (!isValid) {
        throw new Error(`Invalid API key for ${providerId}`);
      }
      
      // Save new selection
      await chrome.storage.local.set({ selectedProvider: providerId });
      
      // Notify content scripts of provider change
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        try {
          await chrome.tabs.sendMessage(tab.id!, {
            type: 'provider-changed',
            providerId
          });
        } catch {
          // Tab may not have content script
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Failed to switch to provider ${providerId}:`, error);
      return false;
    }
  }
  
  static async getAvailableProviders(): Promise<ProviderId[]> {
    const available: ProviderId[] = [];
    
    // Check Gemini
    const geminiResult = await chrome.storage.local.get(['geminiApiKey']);
    if (geminiResult.geminiApiKey) {
      available.push('gemini');
    }
    
    // Check other providers
    const configuredProviders = await ApiKeyStorage.listConfiguredProviders();
    available.push(...configuredProviders);
    
    return [...new Set(available)]; // Remove duplicates
  }
  
  static async getFallbackProvider(): Promise<ProviderId | null> {
    const available = await this.getAvailableProviders();
    return available.length > 0 ? available[0] : null;
  }
  
  static async getCurrentProvider(): Promise<ProviderId> {
    const result = await chrome.storage.local.get(['selectedProvider']);
    return result.selectedProvider || 'gemini';
  }
  
  static async isProviderConfigured(providerId: ProviderId): Promise<boolean> {
    if (providerId === 'gemini') {
      const result = await chrome.storage.local.get(['geminiApiKey']);
      return !!result.geminiApiKey;
    } else {
      const apiKey = await ApiKeyStorage.get(providerId);
      return !!apiKey;
    }
  }
  
  static async switchToFallbackProvider(): Promise<ProviderId | null> {
    const fallbackProvider = await this.getFallbackProvider();
    if (fallbackProvider) {
      const success = await this.switchProvider(fallbackProvider);
      return success ? fallbackProvider : null;
    }
    return null;
  }
}