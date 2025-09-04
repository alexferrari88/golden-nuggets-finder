import type { ProviderId } from "./providers";

/**
 * Platform-agnostic storage interface for AI provider configuration
 * Allows dependency injection for Chrome storage vs Node.js storage implementations
 */
export interface StorageInterface {
	// API key management
	getApiKey(providerId: ProviderId): Promise<string>;

	// Model selection
	getModel(providerId: ProviderId): Promise<string | null>;

	// Optional caching interface for performance optimization
	get?<T>(key: string): Promise<T | null>;
	set?<T>(key: string, value: T, ttl?: number): Promise<void>;
}

/**
 * Platform-agnostic logging interface for debugging and monitoring
 * Allows dependency injection for Chrome extension vs Node.js logging implementations
 */
export interface LoggerInterface {
	debug(message: string, data?: any): void;
	info(message: string, data?: any): void;
	warn(message: string, data?: any): void;
	error(message: string, error?: Error): void;
}
