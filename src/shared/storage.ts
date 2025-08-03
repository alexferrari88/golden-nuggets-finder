import { DEFAULT_PROMPTS, STORAGE_KEYS } from "./constants";
import { isDevMode } from "./debug";
import {
	type AccessContext,
	type EncryptedData,
	securityManager,
} from "./security";
import type { ExtensionConfig, SavedPrompt } from "./types";

export class StorageManager {
	private static instance: StorageManager;
	private cache = new Map<string, { data: unknown; timestamp: number }>();
	private readonly CACHE_DURATION = 30 * 1000; // 30 seconds

	static getInstance(): StorageManager {
		if (!StorageManager.instance) {
			StorageManager.instance = new StorageManager();
		}
		return StorageManager.instance;
	}

	async getApiKey(
		context: AccessContext = {
			source: "background",
			action: "read",
			timestamp: Date.now(),
		},
	): Promise<string> {
		if (isDevMode()) {
			console.log(`[Storage] getApiKey called from: ${context.source}`);
		}

		// Validate access
		if (!securityManager.validateAccess(context)) {
			// Get the latest audit log entry for more specific error details
			const auditLogs = securityManager.getAuditLogs();
			const latestEntry = auditLogs[auditLogs.length - 1];
			const specificError = latestEntry?.error || "Invalid access context";
			throw new Error(`Access denied: ${specificError}`);
		}

		const cached = this.getFromCache(STORAGE_KEYS.API_KEY);
		if (cached !== null) {
			if (isDevMode()) {
				console.log("[Storage] Returning cached API key");
			}
			return cached;
		}

		const result = await chrome.storage.sync.get(STORAGE_KEYS.API_KEY);
		const storedData = result[STORAGE_KEYS.API_KEY];

		if (!storedData) {
			if (isDevMode()) {
				console.log("[Storage] No API key found in storage");
			}
			return "";
		}

		// Handle both encrypted and legacy plain text data
		if (typeof storedData === "string") {
			// Legacy plain text API key - migrate to encrypted format
			if (isDevMode()) {
				console.log("[Storage] Migrating legacy API key to encrypted format");
			}
			await this.saveApiKey(storedData, context);
			return storedData;
		}

		// Encrypted data
		const encryptedData = storedData as EncryptedData;

		if (isDevMode()) {
			console.log(
				`[Storage] Found encrypted API key data - age: ${Date.now() - encryptedData.timestamp}ms`,
			);
		}

		// Verify storage integrity
		if (!(await securityManager.verifyStorageIntegrity(encryptedData))) {
			throw new Error("Storage integrity check failed");
		}

		// Check if key needs rotation
		if (securityManager.isKeyRotationNeeded(encryptedData)) {
			if (isDevMode()) {
				console.warn(
					"[Storage] API key rotation needed - key is older than 30 days",
				);
			}
			// Note: Actual rotation should be triggered by user action
		}

		// Decrypt the API key
		if (isDevMode()) {
			console.log("[Storage] Starting API key decryption...");
		}

		try {
			const decryptedKey = await securityManager.decryptApiKey(encryptedData);

			this.setCache(STORAGE_KEYS.API_KEY, decryptedKey);

			if (isDevMode()) {
				console.log("[Storage] API key decryption successful, returning key");
			}

			return decryptedKey;
		} catch (error: unknown) {
			const typedError = error as {
				code?: string;
				canRecover?: boolean;
				message?: string;
				originalError?: { name?: string };
				constructor?: { name?: string };
			};

			if (isDevMode()) {
				console.log(
					"[Storage] Caught decryption error:",
					JSON.stringify(
						{
							hasCode: !!typedError.code,
							code: typedError.code || "NO_CODE",
							hasCanRecover: typeof typedError.canRecover !== "undefined",
							canRecover: typedError.canRecover || false,
							message: typedError.message || "NO_MESSAGE",
							errorType: typedError.constructor?.name || "Unknown",
						},
						null,
						2,
					),
				);
			}

			// Handle specific decryption errors
			if (typedError.code === "DEVICE_CHANGED" && typedError.canRecover) {
				if (isDevMode()) {
					console.warn(
						"[Storage] Device characteristics changed - triggering recovery",
						JSON.stringify(
							{
								errorCode: typedError.code,
								canRecover: typedError.canRecover,
								originalError: typedError.originalError?.name || "Unknown",
							},
							null,
							2,
						),
					);
				}

				try {
					// Use the recovery method to properly clean up
					await this.handleApiKeyRecovery("device_changed");

					if (isDevMode()) {
						console.log(
							"[Storage] Recovery completed successfully - API key cleared",
						);
					}

					// Return empty string to trigger re-entry workflow
					if (isDevMode()) {
						console.log(
							"[Storage] Returning empty string after recovery to trigger re-entry",
						);
					}

					return "";
				} catch (recoveryError) {
					if (isDevMode()) {
						console.error("[Storage] Recovery failed:", recoveryError);
						console.log(
							"[Storage] Returning empty string despite recovery failure",
						);
					}

					// Even if recovery fails, return empty string to trigger re-entry workflow
					// This prevents throwing errors that get caught by background script
					return "";
				}
			}

			// For other errors, log and re-throw
			if (isDevMode()) {
				console.error(
					"[Storage] API key decryption failed:",
					JSON.stringify(
						{
							errorCode: typedError.code || "UNKNOWN",
							message: typedError.message,
							canRecover: typedError.canRecover || false,
						},
						null,
						2,
					),
				);
			}

			if (isDevMode()) {
				console.log("[Storage] Throwing non-recoverable error");
			}

			throw typedError;
		}
	}

	async saveApiKey(
		apiKey: string,
		context: AccessContext = {
			source: "background",
			action: "write",
			timestamp: Date.now(),
		},
	): Promise<void> {
		// Validate access
		if (!securityManager.validateAccess(context)) {
			// Get the latest audit log entry for more specific error details
			const auditLogs = securityManager.getAuditLogs();
			const latestEntry = auditLogs[auditLogs.length - 1];
			const specificError = latestEntry?.error || "Invalid access context";
			throw new Error(`Access denied: ${specificError}`);
		}

		// Encrypt the API key
		const encryptedData = await securityManager.encryptApiKey(apiKey);

		this.setCache(STORAGE_KEYS.API_KEY, apiKey);
		await chrome.storage.sync.set({ [STORAGE_KEYS.API_KEY]: encryptedData });
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
			const defaultPrompts = DEFAULT_PROMPTS.map((p) => ({ ...p }));
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
			throw new Error(
				"Prompt data too large. Please reduce prompt count or length.",
			);
		}

		this.setCache(STORAGE_KEYS.PROMPTS, prompts);
		await chrome.storage.sync.set(data);
	}

	async savePrompt(prompt: SavedPrompt): Promise<void> {
		const prompts = await this.getPrompts();
		const existingIndex = prompts.findIndex((p) => p.id === prompt.id);

		if (existingIndex >= 0) {
			prompts[existingIndex] = prompt;
		} else {
			prompts.push(prompt);
		}

		await this.savePrompts(prompts);
	}

	async deletePrompt(promptId: string): Promise<void> {
		const prompts = await this.getPrompts();
		const filteredPrompts = prompts.filter((p) => p.id !== promptId);
		await this.savePrompts(filteredPrompts);
	}

	async setDefaultPrompt(promptId: string): Promise<void> {
		const prompts = await this.getPrompts();
		const updatedPrompts = prompts.map((p) => ({
			...p,
			isDefault: p.id === promptId,
		}));
		await this.savePrompts(updatedPrompts);
	}

	async getDefaultPrompt(): Promise<SavedPrompt | null> {
		const prompts = await this.getPrompts();
		return prompts.find((p) => p.isDefault) || prompts[0] || null;
	}

	async getSynthesisEnabled(): Promise<boolean> {
		try {
			const cached = this.getFromCache(STORAGE_KEYS.SYNTHESIS_ENABLED);
			if (cached !== null) {
				return cached;
			}

			const result = await chrome.storage.local.get(
				STORAGE_KEYS.SYNTHESIS_ENABLED,
			);
			const enabled = result[STORAGE_KEYS.SYNTHESIS_ENABLED] ?? false; // Default false for new users

			this.setCache(STORAGE_KEYS.SYNTHESIS_ENABLED, enabled);
			return enabled;
		} catch (error) {
			console.warn("Failed to get synthesis preference:", error);
			return false; // Safe default
		}
	}

	/**
	 * Synchronous version that returns cached value or default.
	 * Use this when you need immediate access and can accept a fallback.
	 */
	getSynthesisEnabledSync(): boolean {
		const cached = this.getFromCache(STORAGE_KEYS.SYNTHESIS_ENABLED);
		return cached ?? false; // Default false for new users
	}

	async setSynthesisEnabled(enabled: boolean): Promise<void> {
		try {
			await chrome.storage.local.set({
				[STORAGE_KEYS.SYNTHESIS_ENABLED]: enabled,
			});
			this.setCache(STORAGE_KEYS.SYNTHESIS_ENABLED, enabled);
			this.clearCache("full_config"); // Clear config cache since it includes synthesis preference
		} catch (error) {
			console.error("Failed to save synthesis preference:", error);
			throw error;
		}
	}

	async getConfig(
		context: AccessContext = {
			source: "background",
			action: "read",
			timestamp: Date.now(),
		},
	): Promise<ExtensionConfig> {
		const configKey = "full_config";
		const cached = this.getFromCache(configKey);
		if (cached !== null) {
			return cached;
		}

		const [apiKey, prompts, synthesisEnabled] = await Promise.all([
			this.getApiKey(context),
			this.getPrompts(),
			this.getSynthesisEnabled(),
		]);

		const config = {
			geminiApiKey: apiKey,
			userPrompts: prompts,
			synthesisEnabled: synthesisEnabled,
		};

		this.setCache(configKey, config);
		return config;
	}

	async saveConfig(
		config: Partial<ExtensionConfig>,
		context: AccessContext = {
			source: "background",
			action: "write",
			timestamp: Date.now(),
		},
	): Promise<void> {
		const updates: Record<string, unknown> = {};

		if (config.geminiApiKey !== undefined) {
			await this.saveApiKey(config.geminiApiKey, context);
		}

		if (config.userPrompts !== undefined) {
			updates[STORAGE_KEYS.PROMPTS] = config.userPrompts;
			this.setCache(STORAGE_KEYS.PROMPTS, config.userPrompts);
		}

		if (config.synthesisEnabled !== undefined) {
			await this.setSynthesisEnabled(config.synthesisEnabled);
		}

		// Clear full config cache
		this.clearCache("full_config");

		if (Object.keys(updates).length > 0) {
			await chrome.storage.sync.set(updates);
		}
	}

	async clearAll(): Promise<void> {
		this.cache.clear();
		securityManager.clearSensitiveData();
		await chrome.storage.sync.clear();
	}

	private getFromCache<T>(key: string): T | null {
		const cached = this.cache.get(key);
		if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
			return cached.data as T;
		}

		// Remove expired cache entry
		if (cached) {
			this.cache.delete(key);
		}

		return null;
	}

	private setCache(key: string, data: unknown): void {
		// Limit cache size to prevent memory issues
		if (this.cache.size > 10) {
			const oldestKey = this.cache.keys().next().value;
			this.cache.delete(oldestKey);
		}

		this.cache.set(key, {
			data,
			timestamp: Date.now(),
		});
	}

	private clearCache(key: string): void {
		this.cache.delete(key);
	}

	/**
	 * Handle API key recovery scenarios
	 */
	async handleApiKeyRecovery(
		reason: "device_changed" | "corruption" | "manual_reset",
	): Promise<void> {
		if (isDevMode()) {
			console.log(`[Storage] Starting API key recovery: ${reason}`);
		}

		try {
			// Check what data exists before clearing
			const beforeClear = await chrome.storage.sync.get(STORAGE_KEYS.API_KEY);
			const hasEncryptedData = !!beforeClear[STORAGE_KEYS.API_KEY];

			if (isDevMode()) {
				console.log(
					`[Storage] Before recovery - encrypted data exists: ${hasEncryptedData}`,
				);
			}

			// Clear all API key related data
			await chrome.storage.sync.remove(STORAGE_KEYS.API_KEY);
			this.clearCache(STORAGE_KEYS.API_KEY);
			this.clearCache("full_config");

			// Clear security manager sensitive data
			securityManager.clearSensitiveData();

			// Verify data was cleared
			const afterClear = await chrome.storage.sync.get(STORAGE_KEYS.API_KEY);
			const dataCleared = !afterClear[STORAGE_KEYS.API_KEY];

			if (isDevMode()) {
				console.log(`[Storage] After recovery - data cleared: ${dataCleared}`);
			}

			// Log the recovery event
			securityManager.logSecurityEvent("recovery", dataCleared, {
				reason,
				timestamp: Date.now(),
				recoveryAction: "clear_encrypted_data",
				hadEncryptedData: hasEncryptedData,
				dataCleared,
			});

			if (!dataCleared) {
				throw new Error("Failed to clear encrypted data from storage");
			}

			if (isDevMode()) {
				console.log(
					"[Storage] API key recovery completed successfully - user needs to re-enter API key",
				);
			}
		} catch (error) {
			if (isDevMode()) {
				console.error("[Storage] API key recovery failed:", error);
			}

			// Log the recovery failure
			securityManager.logSecurityEvent("recovery", false, {
				reason,
				timestamp: Date.now(),
				recoveryAction: "clear_encrypted_data",
				error: error instanceof Error ? error.message : String(error),
			});

			throw error;
		}
	}

	// For testing purposes - clear all cache
	clearAllCache(): void {
		this.cache.clear();
	}

	/**
	 * Check if API key needs rotation
	 */
	async isApiKeyRotationNeeded(): Promise<boolean> {
		try {
			const result = await chrome.storage.sync.get(STORAGE_KEYS.API_KEY);
			const storedData = result[STORAGE_KEYS.API_KEY];

			if (!storedData || typeof storedData === "string") {
				return false; // No encrypted data or legacy format
			}

			const encryptedData = storedData as EncryptedData;
			return securityManager.isKeyRotationNeeded(encryptedData);
		} catch (error) {
			if (isDevMode()) {
				console.error("[Storage] Error checking key rotation:", error);
			}
			return false;
		}
	}

	/**
	 * Get security audit logs
	 */
	getSecurityAuditLogs() {
		return securityManager.getAuditLogs();
	}

	/**
	 * Clear sensitive data from memory
	 */
	clearSensitiveData(): void {
		securityManager.clearSensitiveData();
		// Clear API key from cache
		this.clearCache(STORAGE_KEYS.API_KEY);
		this.clearCache("full_config");
	}
}

// Migration module for multi-provider support
const MIGRATION_VERSION = "2.0.0";

export async function checkAndRunMigration(): Promise<void> {
	const storage = await chrome.storage.sync.get([
		"migrationVersion",
		"geminiApiKey",
	]);

	// Skip if already migrated
	if (storage.migrationVersion === MIGRATION_VERSION) {
		return;
	}

	if (isDevMode()) {
		console.log("Running storage migration to multi-provider format...");
	}

	try {
		await migrateToMultiProvider(storage);

		// Mark migration as complete
		await chrome.storage.sync.set({
			migrationVersion: MIGRATION_VERSION,
		});

		if (isDevMode()) {
			console.log("Migration completed successfully");
		}

		// Show migration notification to user
		showMigrationNotification();
	} catch (error) {
		if (isDevMode()) {
			console.error("Migration failed:", error);
		}
		// Don't break existing functionality if migration fails
	}
}

async function migrateToMultiProvider(
	currentStorage: Record<string, unknown>,
): Promise<void> {
	const updates: Record<string, unknown> = {};

	// Set default provider based on existing configuration
	if (currentStorage.geminiApiKey) {
		updates.selectedProvider = "gemini";
		updates.providerSettings = {
			gemini: {
				modelName: "gemini-2.5-flash",
				lastUsed: new Date().toISOString(),
				isConfigured: true,
			},
		};
	} else {
		// No existing API key - default to Gemini but not configured
		updates.selectedProvider = "gemini";
		updates.providerSettings = {
			gemini: {
				modelName: "gemini-2.5-flash",
				lastUsed: new Date().toISOString(),
				isConfigured: false,
			},
		};
	}

	// Preserve all existing data
	updates.migrationDate = new Date().toISOString();

	await chrome.storage.sync.set(updates);
}

function showMigrationNotification(): void {
	// Show user-friendly notification about new features
	if (typeof chrome !== "undefined" && chrome.notifications) {
		chrome.notifications.create({
			type: "basic",
			iconUrl: "/assets/icon128.png",
			title: "Golden Nuggets Finder Updated!",
			message:
				"New: Choose from multiple AI providers! Check the options page to explore OpenAI, Claude, and more.",
		});
	}
}

export async function validateMigration(): Promise<boolean> {
	try {
		const storage = await chrome.storage.sync.get();

		// Check required fields exist
		const hasSelectedProvider = !!storage.selectedProvider;
		const hasProviderSettings = !!storage.providerSettings;
		const hasMigrationVersion = storage.migrationVersion === MIGRATION_VERSION;

		return hasSelectedProvider && hasProviderSettings && hasMigrationVersion;
	} catch (error) {
		if (isDevMode()) {
			console.error("Migration validation failed:", error);
		}
		return false;
	}
}

export const storage = StorageManager.getInstance();

// Export the new multi-provider API key storage
export { ApiKeyStorage } from "./storage/api-key-storage";
