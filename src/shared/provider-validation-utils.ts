/**
 * Provider Validation Utilities
 * 
 * Shared utilities for validating AI provider configuration.
 * Extracted from popup.tsx and background.ts to eliminate code duplication
 * and provide consistent provider validation across the extension.
 */

import { getSelectedModel } from "../background/services/provider-factory";
import {
	getCurrentProvider,
	isProviderConfigured,
} from "../background/services/provider-switcher";
import type { ProviderId } from "./types/providers";

/**
 * Result of provider validation check
 */
export interface ProviderValidationResult {
	/** Whether the current provider is properly configured with API key */
	isConfigured: boolean;
	/** The current provider ID */
	provider: ProviderId;
	/** The current model for the provider */
	model: string;
	/** Error message if validation failed */
	error?: string;
}

/**
 * Custom error for provider configuration issues
 */
export class ProviderConfigurationError extends Error {
	constructor(
		message: string,
		public provider?: ProviderId,
	) {
		super(message);
		this.name = "ProviderConfigurationError";
	}
}

/**
 * Provider validation utility functions
 */
export class ProviderValidationUtils {
	/**
	 * Validates the current provider configuration
	 * Consolidates provider checking logic from popup.tsx and background.ts
	 * 
	 * @returns Promise<ProviderValidationResult> Complete provider validation info
	 */
	static async validateCurrentProvider(): Promise<ProviderValidationResult> {
		try {
			// Get all provider information in parallel for efficiency
			const provider = await getCurrentProvider();
			const [model, isConfigured] = await Promise.all([
				getSelectedModel(provider),
				isProviderConfigured(provider),
			]);

			return {
				isConfigured,
				provider,
				model,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown provider validation error";
			console.error("[ProviderValidation] Failed to validate provider:", error);
			
			return {
				isConfigured: false,
				provider: "gemini", // fallback to default
				model: "",
				error: errorMessage,
			};
		}
	}

	/**
	 * Validates provider configuration and throws error if not configured
	 * Useful for operations that require a configured provider
	 * 
	 * @throws {ProviderConfigurationError} When provider is not configured
	 * @returns Promise<ProviderValidationResult> Validated provider info
	 */
	static async requireConfiguredProvider(): Promise<ProviderValidationResult> {
		const result = await this.validateCurrentProvider();
		
		if (!result.isConfigured) {
			throw new ProviderConfigurationError(
				`Provider ${result.provider} is not configured. Please set up your API key.`,
				result.provider,
			);
		}

		return result;
	}
}