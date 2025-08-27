/**
 * Security utilities for encryption, access control, and audit logging
 */

import { isDevMode } from "./debug";
import { performanceMonitor } from "./performance";

// Security configuration
const SECURITY_CONFIG = {
	ENCRYPTION_ALGORITHM: "AES-GCM",
	KEY_LENGTH: 256,
	IV_LENGTH: 12,
	SALT_LENGTH: 16,
	ITERATIONS: 100000,
	HASH_ALGORITHM: "SHA-256",
	KEY_ROTATION_DAYS: 30,
	MAX_ACCESS_ATTEMPTS: 10,
	RATE_LIMIT_WINDOW: 60000, // 1 minute
	// Source-specific rate limits to handle different usage patterns
	RATE_LIMIT_BY_SOURCE: {
		background: 50, // Background script needs more for analysis workflows
		popup: 30, // User interaction context needs moderate limit
		options: 30, // Configuration context needs moderate limit
		content: 20, // Content scripts need conservative limit
	},
	// Fallback for unknown sources
	RATE_LIMIT_DEFAULT: 10,
	// Legacy property for backwards compatibility (now uses source-specific limits)
	RATE_LIMIT_MAX_REQUESTS: 20,
} as const;

// Security types
export interface EncryptedData {
	encrypted: string;
	iv: string;
	salt: string;
	timestamp: number;
	version: string;
}

export interface AccessContext {
	source: "background" | "popup" | "options" | "content";
	action: "read" | "write" | "validate";
	timestamp: number;
	userAgent?: string;
}

export interface SecurityAuditLog {
	timestamp: number;
	context: AccessContext;
	success: boolean;
	error?: string;
	keyFingerprint?: string;
}

export interface RateLimitEntry {
	timestamp: number;
	count: number;
}

// Security manager class
export class SecurityManager {
	private static instance: SecurityManager;
	private auditLogs: SecurityAuditLog[] = [];
	private rateLimitMap: Map<string, RateLimitEntry> = new Map();
	private derivedKey: CryptoKey | null = null;
	private keyFingerprint: string | null = null;

	private constructor() {}

	public static getInstance(): SecurityManager {
		if (!SecurityManager.instance) {
			SecurityManager.instance = new SecurityManager();
		}
		return SecurityManager.instance;
	}

	/**
	 * Generate a device-specific salt using various browser fingerprints
	 */
	private async generateDeviceSalt(): Promise<Uint8Array> {
		// Use context-independent fingerprinting to ensure consistency across extension contexts
		const fingerprint = [
			navigator.userAgent,
			navigator.language,
			navigator.platform,
			new Date().getTimezoneOffset().toString(),
			// Use a consistent extension-specific identifier instead of screen dimensions
			"chrome-extension-context",
		].join("|");

		const encoder = new TextEncoder();
		const data = encoder.encode(fingerprint);
		const hashBuffer = await crypto.subtle.digest(
			SECURITY_CONFIG.HASH_ALGORITHM,
			data,
		);

		return new Uint8Array(hashBuffer).slice(0, SECURITY_CONFIG.SALT_LENGTH);
	}

	/**
	 * Derive encryption key from device characteristics
	 */
	private async deriveEncryptionKey(salt: Uint8Array): Promise<CryptoKey> {
		if (this.derivedKey) {
			return this.derivedKey;
		}

		const deviceSalt = await this.generateDeviceSalt();
		const combinedSalt = new Uint8Array(salt.length + deviceSalt.length);
		combinedSalt.set(salt);
		combinedSalt.set(deviceSalt, salt.length);

		const keyMaterial = await crypto.subtle.importKey(
			"raw",
			combinedSalt,
			{ name: "PBKDF2" },
			false,
			["deriveBits", "deriveKey"],
		);

		this.derivedKey = await crypto.subtle.deriveKey(
			{
				name: "PBKDF2",
				salt: combinedSalt,
				iterations: SECURITY_CONFIG.ITERATIONS,
				hash: SECURITY_CONFIG.HASH_ALGORITHM,
			},
			keyMaterial,
			{
				name: SECURITY_CONFIG.ENCRYPTION_ALGORITHM,
				length: SECURITY_CONFIG.KEY_LENGTH,
			},
			false,
			["encrypt", "decrypt"],
		);

		// Generate key fingerprint for audit logging using salt/device data
		const fingerprintData = new Uint8Array(combinedSalt.length + 8);
		fingerprintData.set(combinedSalt);
		fingerprintData.set(
			new Uint8Array(new ArrayBuffer(8)),
			combinedSalt.length,
		);
		const fingerprint = await crypto.subtle.digest(
			SECURITY_CONFIG.HASH_ALGORITHM,
			fingerprintData,
		);
		this.keyFingerprint = Array.from(new Uint8Array(fingerprint))
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("")
			.substring(0, 16);

		return this.derivedKey;
	}

	/**
	 * Encrypt API key with device-specific encryption
	 */
	async encryptApiKey(apiKey: string): Promise<EncryptedData> {
		try {
			performanceMonitor.startTimer("security_encrypt");

			const encoder = new TextEncoder();
			const data = encoder.encode(apiKey);

			// Generate random salt and IV
			const salt = crypto.getRandomValues(
				new Uint8Array(SECURITY_CONFIG.SALT_LENGTH),
			);
			const iv = crypto.getRandomValues(
				new Uint8Array(SECURITY_CONFIG.IV_LENGTH),
			);

			// Derive encryption key
			const key = await this.deriveEncryptionKey(salt);

			// Encrypt the data
			const encryptedBuffer = await crypto.subtle.encrypt(
				{
					name: SECURITY_CONFIG.ENCRYPTION_ALGORITHM,
					iv: iv,
				},
				key,
				data,
			);

			const result: EncryptedData = {
				encrypted: Array.from(new Uint8Array(encryptedBuffer))
					.map((b) => b.toString(16).padStart(2, "0"))
					.join(""),
				iv: Array.from(iv)
					.map((b) => b.toString(16).padStart(2, "0"))
					.join(""),
				salt: Array.from(salt)
					.map((b) => b.toString(16).padStart(2, "0"))
					.join(""),
				timestamp: Date.now(),
				version: "1.0",
			};

			performanceMonitor.logTimer("security_encrypt", "API key encryption");

			if (isDevMode()) {
				console.log("[Security] API key encrypted successfully", {
					keyFingerprint: this.keyFingerprint,
					encryptedSize: result.encrypted.length,
				});
			}

			return result;
		} catch (error) {
			if (isDevMode()) {
				console.error("[Security] API key encryption failed:", error);
			}
			throw new Error("Failed to encrypt API key");
		}
	}

	/**
	 * Decrypt API key with device-specific decryption
	 */
	async decryptApiKey(encryptedData: EncryptedData): Promise<string> {
		if (isDevMode()) {
			console.log(
				"[Security] decryptApiKey called from:",
				new Error().stack?.split("\n")[2]?.trim() || "unknown",
			);
		}

		try {
			performanceMonitor.startTimer("security_decrypt");

			// Convert hex strings back to Uint8Arrays
			const encryptedBuffer = new Uint8Array(
				encryptedData.encrypted
					.match(/.{1,2}/g)
					?.map((byte) => parseInt(byte, 16)),
			);
			const iv = new Uint8Array(
				encryptedData.iv.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)),
			);
			const salt = new Uint8Array(
				encryptedData.salt.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)),
			);

			// Derive decryption key
			const key = await this.deriveEncryptionKey(salt);

			// Decrypt the data
			const decryptedBuffer = await crypto.subtle.decrypt(
				{
					name: SECURITY_CONFIG.ENCRYPTION_ALGORITHM,
					iv: iv,
				},
				key,
				encryptedBuffer,
			);

			const decoder = new TextDecoder();
			const result = decoder.decode(decryptedBuffer);

			performanceMonitor.logTimer("security_decrypt", "API key decryption");

			this.logSecurityEvent("decryption", true, {
				keyFingerprint: this.keyFingerprint,
				encryptedDataVersion: encryptedData.version,
				encryptedDataAge: Date.now() - encryptedData.timestamp,
			});

			return result;
		} catch (error) {
			this.logSecurityEvent("decryption", false, {
				errorType: error instanceof DOMException ? error.name : "Unknown",
				errorMessage:
					error instanceof Error
						? error.message || `${error.name || "Unknown"} (no message)`
						: String(error),
				encryptedDataVersion: encryptedData.version,
				encryptedDataAge: Date.now() - encryptedData.timestamp,
			});

			// Create enhanced error - don't throw inside try block to avoid catching our own enhanced error
			let enhancedError: Error & {
				code?: string;
				originalError?: Error;
				canRecover?: boolean;
			};
			try {
				// Create a more descriptive error based on the type of failure
				let errorMessage = "Failed to decrypt API key";
				let errorCode = "DECRYPTION_FAILED";

				if (error instanceof DOMException) {
					if (error.name === "OperationError") {
						errorMessage =
							"Decryption failed - device characteristics may have changed";
						errorCode = "DEVICE_CHANGED";
					} else if (error.name === "InvalidAccessError") {
						errorMessage = "Invalid encryption key or corrupted data";
						errorCode = "INVALID_KEY";
					} else {
						errorMessage = `Crypto operation failed: ${error.name}`;
						errorCode = "CRYPTO_ERROR";
					}
				}

				// Create enhanced error with original details
				enhancedError = new Error(errorMessage) as Error & {
					code: string;
					originalError: Error;
					canRecover: boolean;
				};
				enhancedError.code = errorCode;
				enhancedError.originalError = error as Error;
				enhancedError.canRecover = errorCode === "DEVICE_CHANGED";
			} catch (enhancementError) {
				if (isDevMode()) {
					console.error(
						"[Security] ERROR in enhanced error creation:",
						enhancementError,
					);
				}
				// Fallback to original error if enhancement fails
				enhancedError = error;
			}

			throw enhancedError;
		}
	}

	/**
	 * Check if API key needs rotation based on age
	 */
	isKeyRotationNeeded(encryptedData: EncryptedData): boolean {
		const ageInDays =
			(Date.now() - encryptedData.timestamp) / (1000 * 60 * 60 * 24);
		return ageInDays > SECURITY_CONFIG.KEY_ROTATION_DAYS;
	}

	/**
	 * Validate access context and enforce access controls
	 */
	validateAccess(context: AccessContext): boolean {
		try {
			// Check rate limiting
			if (!this.checkRateLimit(context.source)) {
				// Get source-specific rate limit for error message
				const sourceLimit =
					SECURITY_CONFIG.RATE_LIMIT_BY_SOURCE[
						context.source as keyof typeof SECURITY_CONFIG.RATE_LIMIT_BY_SOURCE
					] || SECURITY_CONFIG.RATE_LIMIT_DEFAULT;
				const errorMsg = `Rate limit exceeded for source '${context.source}' (max ${sourceLimit} requests per ${SECURITY_CONFIG.RATE_LIMIT_WINDOW / 1000}s)`;
				this.logAccess(context, false, errorMsg);
				if (isDevMode()) {
					console.warn(`[Security] ${errorMsg}`);
				}
				return false;
			}

			// Validate context source
			const validSources = ["background", "popup", "options", "content"];
			if (!validSources.includes(context.source)) {
				const errorMsg = `Invalid access source '${context.source}'. Valid sources: ${validSources.join(", ")}`;
				this.logAccess(context, false, errorMsg);
				if (isDevMode()) {
					console.error(`[Security] ${errorMsg}`);
				}
				return false;
			}

			// Additional validation for sensitive operations
			if (context.action === "write" && context.source === "content") {
				const errorMsg =
					"Content script cannot write API keys - security policy violation";
				this.logAccess(context, false, errorMsg);
				if (isDevMode()) {
					console.error(`[Security] ${errorMsg}`);
				}
				return false;
			}

			this.logAccess(context, true);
			if (isDevMode()) {
				console.log(
					`[Security] Access granted for ${context.source}:${context.action}`,
				);
			}
			return true;
		} catch (error) {
			const errorMsg =
				error instanceof Error ? error.message : "Unknown validation error";
			this.logAccess(context, false, errorMsg);
			if (isDevMode()) {
				console.error(`[Security] Validation error: ${errorMsg}`);
			}
			return false;
		}
	}

	/**
	 * Rate limiting implementation
	 */
	private checkRateLimit(source: string): boolean {
		const now = Date.now();
		const key = `${source}_${Math.floor(now / SECURITY_CONFIG.RATE_LIMIT_WINDOW)}`;

		const entry = this.rateLimitMap.get(key);
		if (!entry) {
			this.rateLimitMap.set(key, { timestamp: now, count: 1 });
			this.cleanupRateLimitMap();
			return true;
		}

		// Get source-specific rate limit with fallback for unknown sources
		const sourceLimit =
			SECURITY_CONFIG.RATE_LIMIT_BY_SOURCE[
				source as keyof typeof SECURITY_CONFIG.RATE_LIMIT_BY_SOURCE
			] || SECURITY_CONFIG.RATE_LIMIT_DEFAULT;

		if (entry.count >= sourceLimit) {
			return false;
		}

		entry.count++;
		return true;
	}

	/**
	 * Clean up old rate limit entries
	 */
	private cleanupRateLimitMap(): void {
		const now = Date.now();
		const cutoff = now - SECURITY_CONFIG.RATE_LIMIT_WINDOW * 2;

		for (const [key, entry] of Array.from(this.rateLimitMap.entries())) {
			if (entry.timestamp < cutoff) {
				this.rateLimitMap.delete(key);
			}
		}
	}

	/**
	 * Log access attempts for audit trail
	 */
	public logAccess(
		context: AccessContext,
		success: boolean,
		error?: string,
	): void {
		const auditLog: SecurityAuditLog = {
			timestamp: Date.now(),
			context,
			success,
			error,
			keyFingerprint: this.keyFingerprint || undefined,
		};

		this.auditLogs.push(auditLog);

		// Keep only last 100 entries
		if (this.auditLogs.length > 100) {
			this.auditLogs = this.auditLogs.slice(-100);
		}

		if (isDevMode()) {
			console.log(
				"[Security] Access logged:",
				JSON.stringify(auditLog, null, 2),
			);
		}
	}

	/**
	 * Log security events with enhanced context
	 */
	logSecurityEvent(
		event: "encryption" | "decryption" | "recovery" | "validation" | "error",
		success: boolean,
		details?: Record<string, string | number | boolean | undefined>,
	): void {
		const logEntry = {
			timestamp: Date.now(),
			event,
			success,
			keyFingerprint: this.keyFingerprint || "none",
			details: details || {},
		};

		if (isDevMode()) {
			const logLevel = success ? "log" : "error";
			// Serialize the object properly for background script logging
			const serializedEntry = JSON.stringify(logEntry, null, 2);
			console[logLevel](
				`[Security] ${event.toUpperCase()}:\n${serializedEntry}`,
			);
		}

		// Add to audit logs if it's a security-sensitive event
		if (["decryption", "recovery", "error"].includes(event)) {
			this.auditLogs.push({
				timestamp: logEntry.timestamp,
				context: {
					source: "background",
					action: event === "recovery" ? "write" : "read",
					timestamp: logEntry.timestamp,
				},
				success,
				error: success
					? undefined
					: String(details?.errorMessage || `${event} failed`),
				keyFingerprint: this.keyFingerprint || undefined,
			});

			// Keep only last 100 entries
			if (this.auditLogs.length > 100) {
				this.auditLogs = this.auditLogs.slice(-100);
			}
		}
	}

	/**
	 * Verify storage integrity
	 */
	async verifyStorageIntegrity(encryptedData: EncryptedData): Promise<boolean> {
		try {
			// Check data structure
			if (
				!encryptedData.encrypted ||
				!encryptedData.iv ||
				!encryptedData.salt
			) {
				return false;
			}

			// Check version compatibility
			if (encryptedData.version !== "1.0") {
				return false;
			}

			// Check timestamp validity
			if (encryptedData.timestamp > Date.now() || encryptedData.timestamp < 0) {
				return false;
			}

			// Check hex string format
			const hexRegex = /^[0-9a-f]+$/i;
			if (
				!hexRegex.test(encryptedData.encrypted) ||
				!hexRegex.test(encryptedData.iv) ||
				!hexRegex.test(encryptedData.salt)
			) {
				return false;
			}

			// Check expected lengths
			if (
				encryptedData.iv.length !== SECURITY_CONFIG.IV_LENGTH * 2 ||
				encryptedData.salt.length !== SECURITY_CONFIG.SALT_LENGTH * 2
			) {
				return false;
			}

			return true;
		} catch (error) {
			if (isDevMode()) {
				console.error("[Security] Storage integrity check failed:", error);
			}
			return false;
		}
	}

	/**
	 * Get security audit logs
	 */
	getAuditLogs(): SecurityAuditLog[] {
		return [...this.auditLogs];
	}

	/**
	 * Clear sensitive data from memory
	 */
	clearSensitiveData(): void {
		this.derivedKey = null;
		this.keyFingerprint = null;
		this.auditLogs = [];
		this.rateLimitMap.clear();

		if (isDevMode()) {
			console.log("[Security] Sensitive data cleared from memory");
		}
	}
}

// Export singleton instance
export const securityManager = SecurityManager.getInstance();
