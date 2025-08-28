import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	ProviderConfigurationError,
	type ProviderValidationResult,
	requireConfiguredProvider,
	validateCurrentProvider,
} from "./provider-validation-utils";

// Mock the provider services
vi.mock("../background/services/provider-factory", () => ({
	getSelectedModel: vi.fn(),
}));

vi.mock("../background/services/provider-switcher", () => ({
	getCurrentProvider: vi.fn(),
	isProviderConfigured: vi.fn(),
}));

import { getSelectedModel } from "../background/services/provider-factory";
import {
	getCurrentProvider,
	isProviderConfigured,
} from "../background/services/provider-switcher";

const mockGetSelectedModel = vi.mocked(getSelectedModel);
const mockGetCurrentProvider = vi.mocked(getCurrentProvider);
const mockIsProviderConfigured = vi.mocked(isProviderConfigured);

describe("provider validation utilities", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("validateCurrentProvider", () => {
		it("should return successful validation result", async () => {
			mockGetCurrentProvider.mockResolvedValue("openai");
			mockGetSelectedModel.mockResolvedValue("gpt-4");
			mockIsProviderConfigured.mockResolvedValue(true);

			const result: ProviderValidationResult = await validateCurrentProvider();

			expect(result).toEqual({
				isConfigured: true,
				provider: "openai",
				model: "gpt-4",
			});
		});

		it("should return unconfigured result", async () => {
			mockGetCurrentProvider.mockResolvedValue("anthropic");
			mockGetSelectedModel.mockResolvedValue("claude-3-sonnet");
			mockIsProviderConfigured.mockResolvedValue(false);

			const result: ProviderValidationResult = await validateCurrentProvider();

			expect(result).toEqual({
				isConfigured: false,
				provider: "anthropic",
				model: "claude-3-sonnet",
			});
		});

		it("should handle provider service errors gracefully", async () => {
			mockGetCurrentProvider.mockRejectedValue(
				new Error("Provider service error"),
			);
			mockGetSelectedModel.mockResolvedValue("");
			mockIsProviderConfigured.mockResolvedValue(false);

			const result: ProviderValidationResult = await validateCurrentProvider();

			expect(result).toEqual({
				isConfigured: false,
				provider: "gemini", // fallback
				model: "",
				error: "Provider service error",
			});
		});

		it("should handle all services failing", async () => {
			mockGetCurrentProvider.mockRejectedValue(new Error("Service 1 failed"));
			mockGetSelectedModel.mockRejectedValue(new Error("Service 2 failed"));
			mockIsProviderConfigured.mockRejectedValue(new Error("Service 3 failed"));

			const result: ProviderValidationResult = await validateCurrentProvider();

			expect(result.isConfigured).toBe(false);
			expect(result.provider).toBe("gemini");
			expect(result.error).toBeDefined();
		});

		it("should call provider services in parallel", async () => {
			mockGetCurrentProvider.mockResolvedValue("gemini");
			mockGetSelectedModel.mockResolvedValue("gemini-pro");
			mockIsProviderConfigured.mockResolvedValue(true);

			const startTime = Date.now();
			await validateCurrentProvider();
			const endTime = Date.now();

			// Should complete quickly since services run in parallel
			// (This is a simple check - in real scenarios we'd mock Promise.all)
			expect(endTime - startTime).toBeLessThan(100);
			expect(mockGetSelectedModel).toHaveBeenCalledWith("gemini");
			expect(mockIsProviderConfigured).toHaveBeenCalledWith("gemini");
		});
	});

	describe("requireConfiguredProvider", () => {
		it("should return result when provider is configured", async () => {
			mockGetCurrentProvider.mockResolvedValue("openai");
			mockGetSelectedModel.mockResolvedValue("gpt-4");
			mockIsProviderConfigured.mockResolvedValue(true);

			const result: ProviderValidationResult =
				await requireConfiguredProvider();

			expect(result).toEqual({
				isConfigured: true,
				provider: "openai",
				model: "gpt-4",
			});
		});

		it("should throw ProviderConfigurationError when not configured", async () => {
			mockGetCurrentProvider.mockResolvedValue("anthropic");
			mockGetSelectedModel.mockResolvedValue("claude-3-sonnet");
			mockIsProviderConfigured.mockResolvedValue(false);

			await expect(requireConfiguredProvider()).rejects.toThrow(
				ProviderConfigurationError,
			);

			await expect(requireConfiguredProvider()).rejects.toThrow(
				"Provider anthropic is not configured. Please set up your API key.",
			);
		});

		it("should throw with correct provider in error", async () => {
			mockGetCurrentProvider.mockResolvedValue("openrouter");
			mockGetSelectedModel.mockResolvedValue("some-model");
			mockIsProviderConfigured.mockResolvedValue(false);

			try {
				await requireConfiguredProvider();
				throw new Error("Should have thrown ProviderConfigurationError");
			} catch (error) {
				expect(error).toBeInstanceOf(ProviderConfigurationError);
				if (error instanceof ProviderConfigurationError) {
					expect(error.provider).toBe("openrouter");
				}
			}
		});

		it("should handle validation service errors", async () => {
			mockGetCurrentProvider.mockRejectedValue(
				new Error("Validation service failed"),
			);

			await expect(requireConfiguredProvider()).rejects.toThrow(
				ProviderConfigurationError,
			);
		});
	});
});

describe("ProviderConfigurationError", () => {
	it("should create error with correct properties", () => {
		const error = new ProviderConfigurationError("Test message", "openai");
		expect(error.message).toBe("Test message");
		expect(error.name).toBe("ProviderConfigurationError");
		expect(error.provider).toBe("openai");
		expect(error instanceof Error).toBe(true);
	});

	it("should work without provider parameter", () => {
		const error = new ProviderConfigurationError("Test message");
		expect(error.message).toBe("Test message");
		expect(error.provider).toBeUndefined();
	});
});
