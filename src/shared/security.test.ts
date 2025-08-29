import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockCrypto } from "../../tests/setup";
import {
	type AccessContext,
	type EncryptedData,
	SecurityManager,
} from "./security";

// Types for testing with invalid values
type InvalidAccessContext = Omit<AccessContext, "source"> & {
	source: string;
};

// Type for accessing private methods in tests
interface SecurityManagerTestAccess {
	checkRateLimit(source: string): boolean;
}

describe("SecurityManager", () => {
	let securityManager: SecurityManager;

	beforeEach(() => {
		vi.clearAllMocks();
		securityManager = SecurityManager.getInstance();
		// Clear any cached data
		securityManager.clearSensitiveData();
	});

	describe("Singleton Pattern", () => {
		it("should return the same instance", () => {
			const instance1 = SecurityManager.getInstance();
			const instance2 = SecurityManager.getInstance();
			expect(instance1).toBe(instance2);
		});
	});

	describe("API Key Encryption", () => {
		it("should encrypt API key successfully", async () => {
			const testApiKey = "test-api-key-123";

			const result = await securityManager.encryptApiKey(testApiKey);

			expect(result).toHaveProperty("encrypted");
			expect(result).toHaveProperty("iv");
			expect(result).toHaveProperty("salt");
			expect(result).toHaveProperty("timestamp");
			expect(result).toHaveProperty("version");
			expect(result.version).toBe("1.0");
			expect(typeof result.encrypted).toBe("string");
			expect(typeof result.iv).toBe("string");
			expect(typeof result.salt).toBe("string");
			expect(typeof result.timestamp).toBe("number");
		});

		it("should decrypt API key successfully", async () => {
			const encryptedData: EncryptedData = {
				encrypted: "0102030405060708",
				iv: "010203040506070809101112",
				salt: "0102030405060708090a0b0c0d0e0f10",
				timestamp: Date.now(),
				version: "1.0",
			};

			const result = await securityManager.decryptApiKey(encryptedData);

			expect(result).toBe("test-api-key"); // This comes from our mock
			expect(mockCrypto.subtle.decrypt).toHaveBeenCalled();
		});

		it("should handle encryption failure", async () => {
			mockCrypto.subtle.encrypt.mockRejectedValueOnce(
				new Error("Encryption failed"),
			);

			await expect(securityManager.encryptApiKey("test-key")).rejects.toThrow(
				"Failed to encrypt API key",
			);
		});

		it("should handle decryption failure", async () => {
			mockCrypto.subtle.decrypt.mockRejectedValueOnce(
				new Error("Decryption failed"),
			);

			const encryptedData: EncryptedData = {
				encrypted: "0102030405060708",
				iv: "010203040506070809101112",
				salt: "0102030405060708090a0b0c0d0e0f10",
				timestamp: Date.now(),
				version: "1.0",
			};

			await expect(
				securityManager.decryptApiKey(encryptedData),
			).rejects.toThrow(/Decryption failed|Failed to decrypt API key/);
		});
	});

	describe("Key Rotation", () => {
		it("should detect when key rotation is needed", () => {
			const oldEncryptedData: EncryptedData = {
				encrypted: "0102030405060708",
				iv: "010203040506070809101112",
				salt: "0102030405060708090a0b0c0d0e0f10",
				timestamp: Date.now() - 31 * 24 * 60 * 60 * 1000, // 31 days ago
				version: "1.0",
			};

			const result = securityManager.isKeyRotationNeeded(oldEncryptedData);
			expect(result).toBe(true);
		});

		it("should detect when key rotation is not needed", () => {
			const recentEncryptedData: EncryptedData = {
				encrypted: "0102030405060708",
				iv: "010203040506070809101112",
				salt: "0102030405060708090a0b0c0d0e0f10",
				timestamp: Date.now() - 10 * 24 * 60 * 60 * 1000, // 10 days ago
				version: "1.0",
			};

			const result = securityManager.isKeyRotationNeeded(recentEncryptedData);
			expect(result).toBe(false);
		});
	});

	describe("Access Control", () => {
		it("should allow valid access contexts", () => {
			const validContext: AccessContext = {
				source: "background",
				action: "read",
				timestamp: Date.now(),
			};

			const result = securityManager.validateAccess(validContext);
			expect(result).toBe(true);
		});

		it("should reject invalid source", () => {
			const invalidContext: InvalidAccessContext = {
				source: "invalid",
				action: "read",
				timestamp: Date.now(),
			};

			const result = securityManager.validateAccess(
				invalidContext as AccessContext,
			);
			expect(result).toBe(false);
		});

		it("should reject content script writing API keys", () => {
			const invalidContext: InvalidAccessContext = {
				source: "content",
				action: "write",
				timestamp: Date.now(),
			};

			const result = securityManager.validateAccess(
				invalidContext as AccessContext,
			);
			expect(result).toBe(false);
		});

		it("should allow content script reading API keys", () => {
			const validContext: AccessContext = {
				source: "content",
				action: "read",
				timestamp: Date.now(),
			};

			const result = securityManager.validateAccess(validContext);
			expect(result).toBe(true);
		});

		it("should enforce rate limiting", () => {
			const context: AccessContext = {
				source: "background",
				action: "read",
				timestamp: Date.now(),
			};

			// Make multiple requests quickly (background limit is now 50)
			for (let i = 0; i < 50; i++) {
				securityManager.validateAccess(context);
			}

			// The 51st request should be rate limited
			const result = securityManager.validateAccess(context);
			expect(result).toBe(false);
		});
	});

	describe("Storage Integrity", () => {
		it("should verify valid storage integrity", async () => {
			const validEncryptedData: EncryptedData = {
				encrypted: "0102030405060708",
				iv: "010203040506070809101112",
				salt: "0102030405060708090a0b0c0d0e0f10",
				timestamp: Date.now(),
				version: "1.0",
			};

			const result =
				await securityManager.verifyStorageIntegrity(validEncryptedData);
			expect(result).toBe(true);
		});

		it("should reject missing encrypted data", async () => {
			const invalidEncryptedData: EncryptedData = {
				encrypted: "",
				iv: "010203040506070809101112",
				salt: "0102030405060708090a0b0c0d0e0f10",
				timestamp: Date.now(),
				version: "1.0",
			};

			const result =
				await securityManager.verifyStorageIntegrity(invalidEncryptedData);
			expect(result).toBe(false);
		});

		it("should reject invalid version", async () => {
			const invalidEncryptedData: EncryptedData = {
				encrypted: "0102030405060708",
				iv: "010203040506070809101112",
				salt: "0102030405060708090a0b0c0d0e0f10",
				timestamp: Date.now(),
				version: "2.0",
			};

			const result =
				await securityManager.verifyStorageIntegrity(invalidEncryptedData);
			expect(result).toBe(false);
		});

		it("should reject future timestamp", async () => {
			const invalidEncryptedData: EncryptedData = {
				encrypted: "0102030405060708",
				iv: "010203040506070809101112",
				salt: "0102030405060708090a0b0c0d0e0f10",
				timestamp: Date.now() + 1000000, // Future timestamp
				version: "1.0",
			};

			const result =
				await securityManager.verifyStorageIntegrity(invalidEncryptedData);
			expect(result).toBe(false);
		});

		it("should reject invalid hex strings", async () => {
			const invalidEncryptedData: EncryptedData = {
				encrypted: "invalid-hex",
				iv: "010203040506070809101112",
				salt: "0102030405060708090a0b0c0d0e0f10",
				timestamp: Date.now(),
				version: "1.0",
			};

			const result =
				await securityManager.verifyStorageIntegrity(invalidEncryptedData);
			expect(result).toBe(false);
		});

		it("should reject invalid IV length", async () => {
			const invalidEncryptedData: EncryptedData = {
				encrypted: "0102030405060708",
				iv: "0102", // Too short
				salt: "0102030405060708090a0b0c0d0e0f10",
				timestamp: Date.now(),
				version: "1.0",
			};

			const result =
				await securityManager.verifyStorageIntegrity(invalidEncryptedData);
			expect(result).toBe(false);
		});

		it("should reject invalid salt length", async () => {
			const invalidEncryptedData: EncryptedData = {
				encrypted: "0102030405060708",
				iv: "010203040506070809101112",
				salt: "0102", // Too short
				timestamp: Date.now(),
				version: "1.0",
			};

			const result =
				await securityManager.verifyStorageIntegrity(invalidEncryptedData);
			expect(result).toBe(false);
		});
	});

	describe("Audit Logging", () => {
		it("should log access attempts", () => {
			const context: InvalidAccessContext = {
				source: "background",
				action: "read",
				timestamp: Date.now(),
			};

			securityManager.validateAccess(context as AccessContext);

			const logs = securityManager.getAuditLogs();
			expect(logs.length).toBeGreaterThan(0);
			expect(logs[logs.length - 1].context).toEqual(context);
			expect(logs[logs.length - 1].success).toBe(true);
		});

		it("should log failed access attempts", () => {
			const context: InvalidAccessContext = {
				source: "invalid",
				action: "read",
				timestamp: Date.now(),
			};

			securityManager.validateAccess(context as AccessContext);

			const logs = securityManager.getAuditLogs();
			expect(logs.length).toBeGreaterThan(0);
			expect(logs[logs.length - 1].context).toEqual(context);
			expect(logs[logs.length - 1].success).toBe(false);
			expect(logs[logs.length - 1].error).toBeDefined();
		});

		it("should limit audit log size", () => {
			const context: InvalidAccessContext = {
				source: "background",
				action: "read",
				timestamp: Date.now(),
			};

			// Generate more than 100 log entries
			for (let i = 0; i < 120; i++) {
				securityManager.validateAccess(context as AccessContext);
			}

			const logs = securityManager.getAuditLogs();
			expect(logs.length).toBeLessThanOrEqual(100);
		});
	});

	describe("Memory Management", () => {
		it("should clear sensitive data from memory", () => {
			const context: InvalidAccessContext = {
				source: "background",
				action: "read",
				timestamp: Date.now(),
			};

			// Generate some audit logs
			securityManager.validateAccess(context as AccessContext);

			let logs = securityManager.getAuditLogs();
			expect(logs.length).toBeGreaterThan(0);

			// Clear sensitive data
			securityManager.clearSensitiveData();

			logs = securityManager.getAuditLogs();
			expect(logs.length).toBe(0);
		});

		it("should handle errors gracefully during access validation", () => {
			const _context: InvalidAccessContext = {
				source: "background",
				action: "read",
				timestamp: Date.now(),
			};

			// Mock an error condition by using invalid context that will trigger internal error
			const errorContext: AccessContext = {
				source: "background",
				action: "read",
				timestamp: Date.now(),
			};

			// Force an internal error by mocking the rate limit check to throw
			const originalCheckRateLimit = (
				securityManager as unknown as SecurityManagerTestAccess
			).checkRateLimit;
			vi.spyOn(
				securityManager as unknown as SecurityManagerTestAccess,
				"checkRateLimit",
			).mockImplementation(() => {
				throw new Error("Test error");
			});

			const result = securityManager.validateAccess(errorContext);
			expect(result).toBe(false);

			// Restore original method
			(securityManager as unknown as SecurityManagerTestAccess).checkRateLimit =
				originalCheckRateLimit;
		});
	});
});
