import type { LLMProvider, ProviderId, ProviderFactory } from '@golden-nuggets/core';
import { ProviderFactory as CoreProviderFactory } from '@golden-nuggets/core';
import { ChromeStorageAdapter } from '../adapters/chrome-storage-adapter';
import { ChromeLogger } from '../adapters/chrome-logger';

export class ProviderService {
  private providerFactory: ProviderFactory;

  constructor() {
    this.providerFactory = new CoreProviderFactory(
      new ChromeStorageAdapter(),
      new ChromeLogger()
    );
  }

  async createProvider(providerId: ProviderId, modelName?: string): Promise<LLMProvider> {
    return this.providerFactory.createProvider({ providerId, modelName });
  }

  async createMultipleProviders(
    configurations: Array<{ providerId: ProviderId; modelId?: string }>
  ): Promise<Array<{ providerId: ProviderId; provider: LLMProvider }>> {
    return this.providerFactory.createMultipleProviders(configurations);
  }

  // Convenience methods that delegate to provider factory
  getDefaultModel(providerId: ProviderId): string {
    return this.providerFactory.getDefaultModel(providerId);
  }

  getSupportedProviders(): ProviderId[] {
    return this.providerFactory.getSupportedProviders();
  }

  getKnownModelsForProvider(providerId: ProviderId): string[] {
    return this.providerFactory.getKnownModelsForProvider(providerId);
  }

  validateProviderConfigurations(
    configurations: Array<{ providerId: ProviderId; modelId?: string }>
  ): { valid: boolean; errors: string[] } {
    return this.providerFactory.validateProviderConfigurations(configurations);
  }
}

// Export singleton instance
export const providerService = new ProviderService();