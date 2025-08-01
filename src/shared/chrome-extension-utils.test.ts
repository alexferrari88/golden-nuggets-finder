import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	injectContentScript,
	generateAnalysisId,
	ContentScriptError,
} from "./chrome-extension-utils";

// Mock Chrome APIs
const mockChrome = {
	tabs: {
		sendMessage: vi.fn(),
	},
	scripting: {
		executeScript: vi.fn(),
	},
};

global.chrome = mockChrome as any;

describe("chrome-extension-utils", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();
	});

	describe("injectContentScript", () => {
		const tabId = 123;

		it("should not inject if content script already exists", async () => {
			// Mock content script already responding to PING
			mockChrome.tabs.sendMessage.mockResolvedValue({ success: true });

			await injectContentScript(tabId);

			expect(mockChrome.tabs.sendMessage).toHaveBeenCalledTimes(1);
			expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(tabId, {
				type: "PING",
			});
			expect(mockChrome.scripting.executeScript).not.toHaveBeenCalled();
		});

		it("should inject content script and wait for readiness", async () => {
			// Mock initial PING failing (no content script)
			mockChrome.tabs.sendMessage
				.mockRejectedValueOnce(new Error("No content script"))
				.mockRejectedValueOnce(new Error("Still not ready"))
				.mockResolvedValueOnce({ success: true });

			mockChrome.scripting.executeScript.mockResolvedValue(undefined);

			await injectContentScript(tabId);

			expect(mockChrome.scripting.executeScript).toHaveBeenCalledWith({
				target: { tabId },
				files: ["content-scripts/content.js"],
			});
			expect(mockChrome.tabs.sendMessage).toHaveBeenCalledTimes(3);
		});

		it("should throw ContentScriptError after max attempts", async () => {
			// Mock content script never becoming ready
			mockChrome.tabs.sendMessage.mockRejectedValue(
				new Error("Content script not ready"),
			);
			mockChrome.scripting.executeScript.mockResolvedValue(undefined);

			// Test the error behavior without timer complexity
			await expect(
				injectContentScript(tabId),
			).rejects.toThrow(ContentScriptError);
			await expect(
				injectContentScript(tabId),
			).rejects.toThrow("Content script failed to initialize after injection");
		});

		it("should throw ContentScriptError on injection failure", async () => {
			// Mock initial PING failing (no content script)
			mockChrome.tabs.sendMessage.mockRejectedValue(
				new Error("No content script"),
			);
			mockChrome.scripting.executeScript.mockRejectedValue(
				new Error("Injection failed"),
			);

			await expect(
				injectContentScript(tabId),
			).rejects.toThrow(ContentScriptError);
			await expect(
				injectContentScript(tabId),
			).rejects.toThrow("Failed to inject content script");
		});
	});

	describe("generateAnalysisId", () => {
		it("should generate ID with correct format", () => {
			const id = generateAnalysisId();
			expect(id).toMatch(/^analysis_\d+_[a-z0-9]{9}$/);
		});

		it("should generate unique IDs", () => {
			const id1 = generateAnalysisId();
			const id2 = generateAnalysisId();
			expect(id1).not.toBe(id2);
		});

		it("should include timestamp and random component", () => {
			const beforeTime = Date.now();
			const id = generateAnalysisId();
			const afterTime = Date.now();

			const [, timestamp] = id.match(/^analysis_(\d+)_[a-z0-9]{9}$/) || [];
			const idTime = parseInt(timestamp, 10);

			expect(idTime).toBeGreaterThanOrEqual(beforeTime);
			expect(idTime).toBeLessThanOrEqual(afterTime);
		});
	});
});

describe("ContentScriptError", () => {
	it("should create error with correct properties", () => {
		const error = new ContentScriptError("Test message", 123);
		expect(error.message).toBe("Test message");
		expect(error.name).toBe("ContentScriptError");
		expect(error.tabId).toBe(123);
		expect(error instanceof Error).toBe(true);
	});

	it("should include cause when provided", () => {
		const cause = new Error("Original error");
		const error = new ContentScriptError("Test message", 123, cause);
		expect(error.cause).toBe(cause);
	});
});
