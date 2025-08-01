import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProviderId } from "../types/providers";
import { ModelStorage } from "./model-storage";

// Mock chrome.storage.local
const mockStorageLocal = {
	get: vi.fn(),
	set: vi.fn(),
	remove: vi.fn(),
};

global.chrome = {
	storage: {
		local: mockStorageLocal,
	},
} as any;

// Mock ProviderFactory
vi.mock("../../background/services/provider-factory", () => ({
	ProviderFactory: {
		getDefaultModel: vi.fn((providerId: ProviderId) => {
			const defaults = {
				gemini: "gemini-2.5-flash",
				openai: "gpt-4.1-mini",
				anthropic: "claude-sonnet-4-20250514",
				openrouter: "openai/gpt-3.5-turbo",
			};
			return defaults[providerId];
		}),
	},
}));

describe("ModelStorage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("store", () => {
		it("should store model selection for a provider", async () => {
			mockStorageLocal.set.mockResolvedValueOnce(undefined);

			await ModelStorage.store("gemini", "gemini-2.5-pro");

			expect(mockStorageLocal.set).toHaveBeenCalledWith({
				selected_model_gemini: "gemini-2.5-pro",
			});
		});

		it("should store model selection for different providers", async () => {
			mockStorageLocal.set.mockResolvedValueOnce(undefined);

			await ModelStorage.store("openai", "gpt-4o");

			expect(mockStorageLocal.set).toHaveBeenCalledWith({
				selected_model_openai: "gpt-4o",
			});
		});

		it("should handle storage errors", async () => {
			mockStorageLocal.set.mockRejectedValueOnce(new Error("Storage error"));

			await expect(
				ModelStorage.store("gemini", "gemini-2.5-pro"),
			).rejects.toThrow("Storage error");
		});
	});

	describe("get", () => {
		it("should return stored model when available", async () => {
			mockStorageLocal.get.mockResolvedValueOnce({
				selected_model_gemini: "gemini-2.5-pro",
			});

			const result = await ModelStorage.get("gemini");

			expect(result).toBe("gemini-2.5-pro");
			expect(mockStorageLocal.get).toHaveBeenCalledWith(
				"selected_model_gemini",
			);
		});

		it("should return null when no selection exists", async () => {
			mockStorageLocal.get.mockResolvedValueOnce({}); // Empty result

			const result = await ModelStorage.get("gemini");

			expect(result).toBe(null); // No default fallback in ModelStorage
		});

		it("should handle different providers correctly", async () => {
			mockStorageLocal.get.mockResolvedValueOnce({
				selected_model_openai: "gpt-4o",
			});

			const result = await ModelStorage.get("openai");

			expect(result).toBe("gpt-4o");
			expect(mockStorageLocal.get).toHaveBeenCalledWith(
				"selected_model_openai",
			);
		});

		it("should handle storage errors", async () => {
			mockStorageLocal.get.mockRejectedValueOnce(new Error("Storage error"));

			await expect(ModelStorage.get("gemini")).rejects.toThrow("Storage error");
		});
	});

	describe("remove", () => {
		it("should remove stored model selection", async () => {
			mockStorageLocal.remove.mockResolvedValueOnce(undefined);

			await ModelStorage.remove("gemini");

			expect(mockStorageLocal.remove).toHaveBeenCalledWith(
				"selected_model_gemini",
			);
		});

		it("should handle storage errors", async () => {
			mockStorageLocal.remove.mockRejectedValueOnce(new Error("Storage error"));

			await expect(ModelStorage.remove("gemini")).rejects.toThrow(
				"Storage error",
			);
		});
	});

	describe("getAll", () => {
		it("should return all selected models", async () => {
			// Mock individual get calls
			mockStorageLocal.get
				.mockResolvedValueOnce({ selected_model_gemini: "gemini-2.5-pro" }) // gemini
				.mockResolvedValueOnce({}) // openai (no selection, returns null)
				.mockResolvedValueOnce({
					selected_model_anthropic: "claude-3-5-sonnet-20241022",
				}) // anthropic
				.mockResolvedValueOnce({
					selected_model_openrouter: "anthropic/claude-sonnet-4",
				}); // openrouter

			const result = await ModelStorage.getAll();

			expect(result).toEqual({
				gemini: "gemini-2.5-pro",
				openai: null, // No selection stored
				anthropic: "claude-3-5-sonnet-20241022",
				openrouter: "anthropic/claude-sonnet-4",
			});

			expect(mockStorageLocal.get).toHaveBeenCalledTimes(4);
		});

		it("should handle partial errors gracefully", async () => {
			mockStorageLocal.get
				.mockResolvedValueOnce({ selected_model_gemini: "gemini-2.5-pro" })
				.mockRejectedValueOnce(new Error("Storage error")) // openai fails
				.mockResolvedValueOnce({
					selected_model_anthropic: "claude-3-5-sonnet-20241022",
				})
				.mockResolvedValueOnce({});

			await expect(ModelStorage.getAll()).rejects.toThrow("Storage error");
		});
	});

	describe("setAll", () => {
		it("should set models for multiple providers", async () => {
			mockStorageLocal.set.mockResolvedValueOnce(undefined);

			const models = {
				gemini: "gemini-2.5-pro",
				openai: "gpt-4o",
				anthropic: "claude-3-5-sonnet-20241022",
			};

			await ModelStorage.setAll(models);

			expect(mockStorageLocal.set).toHaveBeenCalledWith({
				selected_model_gemini: "gemini-2.5-pro",
				selected_model_openai: "gpt-4o",
				selected_model_anthropic: "claude-3-5-sonnet-20241022",
			});
		});

		it("should skip undefined or empty model names", async () => {
			mockStorageLocal.set.mockResolvedValueOnce(undefined);

			const models = {
				gemini: "gemini-2.5-pro",
				openai: "", // Empty string
				anthropic: undefined, // Undefined
			};

			await ModelStorage.setAll(models as any);

			expect(mockStorageLocal.set).toHaveBeenCalledWith({
				selected_model_gemini: "gemini-2.5-pro",
			});
		});

		it("should not call storage.set when no valid models provided", async () => {
			const models = {
				openai: "",
				anthropic: undefined,
			};

			await ModelStorage.setAll(models as any);

			expect(mockStorageLocal.set).not.toHaveBeenCalled();
		});

		it("should handle storage errors", async () => {
			mockStorageLocal.set.mockRejectedValueOnce(new Error("Storage error"));

			const models = { gemini: "gemini-2.5-pro" };

			await expect(ModelStorage.setAll(models)).rejects.toThrow(
				"Storage error",
			);
		});
	});

	describe("hasCustomModel", () => {
		it("should return true when custom model is selected", async () => {
			mockStorageLocal.get.mockResolvedValueOnce({
				selected_model_gemini: "gemini-2.5-pro",
			});

			const result = await ModelStorage.hasCustomModel("gemini");

			expect(result).toBe(true);
			expect(mockStorageLocal.get).toHaveBeenCalledWith(
				"selected_model_gemini",
			);
		});

		it("should return false when no custom model is selected", async () => {
			mockStorageLocal.get.mockResolvedValueOnce({}); // Empty result

			const result = await ModelStorage.hasCustomModel("gemini");

			expect(result).toBe(false);
		});

		it("should handle storage errors", async () => {
			mockStorageLocal.get.mockRejectedValueOnce(new Error("Storage error"));

			await expect(ModelStorage.hasCustomModel("gemini")).rejects.toThrow(
				"Storage error",
			);
		});
	});

	describe("resetToDefault", () => {
		it("should remove stored model selection", async () => {
			mockStorageLocal.remove.mockResolvedValueOnce(undefined);

			await ModelStorage.resetToDefault("gemini");

			expect(mockStorageLocal.remove).toHaveBeenCalledWith(
				"selected_model_gemini",
			);
		});
	});

	describe("resetAllToDefaults", () => {
		it("should remove all stored model selections", async () => {
			mockStorageLocal.remove.mockResolvedValueOnce(undefined);

			await ModelStorage.resetAllToDefaults();

			expect(mockStorageLocal.remove).toHaveBeenCalledWith([
				"selected_model_gemini",
				"selected_model_openai",
				"selected_model_anthropic",
				"selected_model_openrouter",
			]);
		});

		it("should handle storage errors", async () => {
			mockStorageLocal.remove.mockRejectedValueOnce(new Error("Storage error"));

			await expect(ModelStorage.resetAllToDefaults()).rejects.toThrow(
				"Storage error",
			);
		});
	});

	describe("storage key generation", () => {
		it("should use correct key prefix for all providers", async () => {
			const providers: ProviderId[] = [
				"gemini",
				"openai",
				"anthropic",
				"openrouter",
			];

			mockStorageLocal.get.mockResolvedValue({});

			for (const provider of providers) {
				await ModelStorage.get(provider);
				expect(mockStorageLocal.get).toHaveBeenCalledWith(
					`selected_model_${provider}`,
				);
			}
		});
	});

	describe("edge cases", () => {
		it("should handle malformed storage data", async () => {
			// Chrome storage returns empty object when key doesn't exist
			mockStorageLocal.get.mockResolvedValueOnce({});

			const result = await ModelStorage.get("gemini");

			expect(result).toBe(null); // No fallback in ModelStorage
		});

		it("should handle concurrent operations", async () => {
			mockStorageLocal.set.mockResolvedValue(undefined);

			// Start multiple store operations simultaneously
			const promises = [
				ModelStorage.store("gemini", "gemini-2.5-pro"),
				ModelStorage.store("openai", "gpt-4o"),
				ModelStorage.store("anthropic", "claude-3-5-sonnet-20241022"),
			];

			await Promise.all(promises);

			expect(mockStorageLocal.set).toHaveBeenCalledTimes(3);
		});

		it("should handle very long model names", async () => {
			const longModelName = "a".repeat(1000); // Very long model name
			mockStorageLocal.set.mockResolvedValueOnce(undefined);

			await ModelStorage.store("gemini", longModelName);

			expect(mockStorageLocal.set).toHaveBeenCalledWith({
				selected_model_gemini: longModelName,
			});
		});
	});
});
