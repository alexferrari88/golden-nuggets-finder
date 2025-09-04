import type { RateLimitedMessage, RetryingMessage } from "../../shared/types";
import type { ProviderId } from "../../shared/types/providers";
import { getAvailableProviders, getCurrentProvider } from "./provider-switcher";

// State for retry attempts
const retryAttempts = new Map<string, number>();
const MAX_RETRIES = 3;

export async function handleProviderError(
	error: Error,
	providerId: ProviderId,
	context: string,
	analysisId?: string,
	tabId?: number,
): Promise<{ shouldRetry: boolean; fallbackProvider?: ProviderId }> {
	const errorKey = `${providerId}-${context}`;
	const attempts = retryAttempts.get(errorKey) || 0;

	console.error(`Provider ${providerId} error in ${context}:`, error.message);

	// Categorize error
	if (isApiKeyError(error)) {
		// API key issues - don't retry, suggest re-configuration
		console.warn(`API key error for ${providerId}:`, error.message);
		return { shouldRetry: false };
	}

	if (isRateLimitError(error)) {
		// Rate limited - wait and retry
		console.warn(`Rate limit hit for ${providerId}, waiting...`);
		const waitTime = 2 * (attempts + 1); // In seconds

		// Notify user about rate limiting
		sendProgressMessage(
			"ANALYSIS_RATE_LIMITED",
			providerId,
			attempts + 1,
			analysisId,
			tabId,
			waitTime,
		);

		await sleep(waitTime * 1000); // Convert to milliseconds
		retryAttempts.set(errorKey, attempts + 1);

		// Notify user about retry
		if (attempts < MAX_RETRIES) {
			sendProgressMessage(
				"ANALYSIS_RETRYING",
				providerId,
				attempts + 1,
				analysisId,
				tabId,
			);
		}

		return { shouldRetry: attempts < MAX_RETRIES };
	}

	if (isTemporaryError(error)) {
		// Temporary issue - retry with backoff
		console.warn(`Temporary error for ${providerId}, retrying...`);
		await sleep(1000 * (attempts + 1));
		retryAttempts.set(errorKey, attempts + 1);
		return { shouldRetry: attempts < MAX_RETRIES };
	}

	// Serious error - try fallback provider
	const currentProvider = await getCurrentProvider();
	if (currentProvider === providerId) {
		const fallbackProvider = await getFallbackProvider(providerId);
		if (fallbackProvider) {
			console.log(
				`Falling back from ${providerId} to provider: ${fallbackProvider}`,
			);
			return { shouldRetry: false, fallbackProvider };
		}
	}

	return { shouldRetry: false };
}

function isApiKeyError(error: Error): boolean {
	const apiKeyErrors = [
		"invalid api key",
		"unauthorized",
		"authentication failed",
		"api key not found",
		"forbidden",
		"401",
		"403",
	];
	return apiKeyErrors.some((msg) => error.message.toLowerCase().includes(msg));
}

function isRateLimitError(error: Error): boolean {
	const rateLimitErrors = [
		"rate limit",
		"too many requests",
		"quota exceeded",
		"rate_limit_exceeded",
		"429",
		"requests per minute",
		"daily quota",
		// Secondary error patterns that may indicate masked rate limiting
		"error parsing failed - potential rate limiting",
		"provider returned error",
	];
	return rateLimitErrors.some((msg) =>
		error.message.toLowerCase().includes(msg),
	);
}

function isModelNotFoundError(error: Error): boolean {
	const modelNotFoundErrors = [
		"404",
		"not found",
		"model not found",
		"no allowed providers",
		"model_not_found",
		"model not available",
		"provider not available",
		"model does not exist",
	];
	return modelNotFoundErrors.some((msg) =>
		error.message.toLowerCase().includes(msg),
	);
}

function isTemporaryError(error: Error): boolean {
	const temporaryErrors = [
		"network error",
		"timeout",
		"service unavailable",
		"server error",
		"connection failed",
		"temporarily unavailable",
		"500",
		"502",
		"503",
		"504",
		"fetch failed",
		"network request failed",
		// Provider-specific errors that might indicate temporary issues
		"cannot read properties of undefined",
		"error parsing failed - potential provider issue",
	];
	return temporaryErrors.some((msg) =>
		error.message.toLowerCase().includes(msg),
	);
}

async function getFallbackProvider(
	failedProvider: ProviderId,
): Promise<ProviderId | null> {
	const availableProviders = await getAvailableProviders();

	// Filter out the failed provider
	const fallbackCandidates = availableProviders.filter(
		(p) => p !== failedProvider,
	);

	if (fallbackCandidates.length === 0) {
		return null;
	}

	// Prioritize providers in order of reliability: gemini > openai > anthropic > openrouter
	const priorityOrder: ProviderId[] = [
		"gemini",
		"openai",
		"anthropic",
		"openrouter",
	];

	for (const provider of priorityOrder) {
		if (fallbackCandidates.includes(provider)) {
			return provider;
		}
	}

	// Return first available if no priority match
	return fallbackCandidates[0];
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper to send progress messages during rate limiting
function sendProgressMessage(
	type: "ANALYSIS_RATE_LIMITED" | "ANALYSIS_RETRYING",
	providerId: ProviderId,
	attempts: number,
	analysisId?: string,
	tabId?: number,
	waitTime?: number,
): void {
	if (!analysisId || !tabId) return;

	let message: RateLimitedMessage | RetryingMessage;

	if (type === "ANALYSIS_RATE_LIMITED") {
		message = {
			type,
			provider: providerId,
			waitTime: waitTime || 0,
			attempt: attempts,
			maxAttempts: MAX_RETRIES,
			analysisId,
		} as RateLimitedMessage;
	} else {
		message = {
			type,
			provider: providerId,
			attempt: attempts,
			maxAttempts: MAX_RETRIES,
			analysisId,
		} as RetryingMessage;
	}

	// Send to tab specifically
	chrome.tabs.sendMessage(tabId, message).catch(() => {
		// Content script might not be ready, that's okay
	});

	// Also send to all extension contexts
	chrome.runtime.sendMessage(message).catch(() => {
		// Popup might not be open, that's okay
	});
}

export function resetRetryCount(providerId: ProviderId, context: string): void {
	const errorKey = `${providerId}-${context}`;
	retryAttempts.delete(errorKey);
}

export function clearAllRetryCount(): void {
	retryAttempts.clear();
}

/**
 * Gets a user-friendly error message for display
 */
export function getUserFriendlyMessage(
	error: Error,
	providerId: ProviderId,
): string {
	if (isApiKeyError(error)) {
		return `Invalid API key for ${providerId}. Please check your API key in the extension options.`;
	}

	if (isRateLimitError(error)) {
		return `Rate limit reached for ${providerId}. Please wait a moment and try again.`;
	}

	if (isModelNotFoundError(error)) {
		return `${providerId} provider error: ${error.message}. The selected model may not be available or you may need credits. Check the provider's website for model availability.`;
	}

	if (isTemporaryError(error)) {
		return `${providerId} service is temporarily unavailable. Trying again...`;
	}

	return `${providerId} encountered an error: ${error.message}`;
}

/**
 * Handles errors during provider switching operations
 */
export async function handleSwitchError(
	error: Error,
	targetProvider: ProviderId,
): Promise<{ success: boolean; message: string }> {
	if (isApiKeyError(error)) {
		return {
			success: false,
			message: `Cannot switch to ${targetProvider}: Invalid or missing API key. Please configure the API key in options.`,
		};
	}

	if (isTemporaryError(error)) {
		return {
			success: false,
			message: `Cannot switch to ${targetProvider}: Service temporarily unavailable. Please try again later.`,
		};
	}

	return {
		success: false,
		message: `Failed to switch to ${targetProvider}: ${error.message}`,
	};
}

/**
 * Gets retry delay in milliseconds based on attempt count
 */
export function getRetryDelay(attempt: number): number {
	return Math.min(1000 * 2 ** attempt, 30000); // Max 30 seconds
}
