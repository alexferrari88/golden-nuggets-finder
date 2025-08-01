import "dotenv/config";

// Use undici fetch for integration tests (better LangChain compatibility)
import { fetch, Headers, Request, Response } from "undici";
import { beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { ProviderFactory } from "../../src/background/services/provider-factory";
import { normalize as normalizeResponse, validate as validateResponse } from "../../src/background/services/response-normalizer";
import type {
	ProviderConfig,
	ProviderId,
} from "../../src/shared/types/providers";

// Override happy-dom's mocks with real HTTP client
global.fetch = fetch as any;
global.Headers = Headers;
global.Request = Request as any;
global.Response = Response as any;

console.log("Using undici fetch for real HTTP calls");

// Schema validation for golden nuggets response
const GoldenNuggetsResponseSchema = z.object({
	golden_nuggets: z.array(
		z.object({
			type: z.enum(["tool", "media", "explanation", "analogy", "model"]),
			startContent: z.string(),
			endContent: z.string(),
			synthesis: z.string(),
		}),
	),
});

describe("Multi-Provider Schema Validation Integration Tests", () => {
	// API keys from environment variables
	const apiKeys = {
		gemini: process.env.GEMINI_API_KEY,
		openai: process.env.OPENAI_API_KEY,
		anthropic: process.env.ANTHROPIC_API_KEY,
		openrouter: process.env.OPENROUTER_API_KEY,
	};

	// Test configurations for each provider
	const providerConfigs: Record<ProviderId, ProviderConfig> = {
		gemini: {
			providerId: "gemini",
			apiKey: apiKeys.gemini || "",
			modelName: ProviderFactory.getDefaultModel("gemini"),
		},
		openai: {
			providerId: "openai",
			apiKey: apiKeys.openai || "",
			modelName: ProviderFactory.getDefaultModel("openai"),
		},
		anthropic: {
			providerId: "anthropic",
			apiKey: apiKeys.anthropic || "",
			modelName: ProviderFactory.getDefaultModel("anthropic"),
		},
		openrouter: {
			providerId: "openrouter",
			apiKey: apiKeys.openrouter || "",
			modelName: ProviderFactory.getDefaultModel("openrouter"),
		},
	};

	// Test content for analysis
	const testContent = `
    JavaScript is a versatile programming language that powers modern web development. 
    One powerful tool is React, which helps build user interfaces efficiently. 
    When working with React, you can use hooks like useState and useEffect to manage component state and side effects.
    
    A useful mental model for understanding React is to think of components as functions that take props as input and return JSX as output.
    This functional approach makes code more predictable and easier to debug.
    
    For styling, many developers use CSS-in-JS libraries like styled-components, which allow you to write CSS directly in your JavaScript files.
  `;

	const _emptyContent = "";
	const _minimalContent = "This is a test.";

	const testPrompt = `Extract valuable insights from this content. Focus on:
- Tools and techniques mentioned
- Explanations of concepts
- Mental models or analogies
- Recommendations for media/resources
- Useful models or frameworks

Return only the most valuable insights that would be genuinely useful to a software developer.`;

	beforeAll(() => {
		// Skip tests if no API keys are provided
		const hasAnyApiKey = Object.values(apiKeys).some(
			(key) => key && key.length > 0,
		);
		if (!hasAnyApiKey) {
			console.warn(
				"⚠️  No API keys found in environment variables. Skipping integration tests.",
			);
			console.warn(
				"   Available keys: GEMINI_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, OPENROUTER_API_KEY",
			);
		}
	});

	describe.each(["openai", "anthropic"] as ProviderId[])(
		"%s provider",
		(providerId) => {
			const hasApiKey = !!apiKeys[providerId];

			it.skipIf(!hasApiKey)(
				"should return valid JSON response matching golden nuggets schema",
				async () => {
					const config = providerConfigs[providerId];
					console.log(`Testing ${providerId} with model: ${config.modelName}`);
					console.log(`API key length: ${config.apiKey?.length || 0}`);

					let response;
					try {
						const provider = await ProviderFactory.createProvider(config);
						console.log(`Provider created successfully for ${providerId}`);

						// Make API call
						console.log(`Making API call to ${providerId}...`);
						const rawResponse = await provider.extractGoldenNuggets(
							testContent,
							testPrompt,
						);
						console.log(`API call successful for ${providerId}`);

						// Normalize response to handle provider-specific quirks
						response = normalizeResponse(rawResponse, providerId);
						console.log(`Response normalized for ${providerId}`);

						// Verify response exists and is an object
						expect(response).toBeDefined();
						expect(typeof response).toBe("object");
						expect(response).not.toBeNull();

						// Verify response matches schema
						const validationResult =
							GoldenNuggetsResponseSchema.safeParse(response);
						if (!validationResult.success) {
							console.error(
								`Schema validation failed for ${providerId}:`,
								validationResult.error,
							);
							console.error(
								"Response received:",
								JSON.stringify(response, null, 2),
							);
						}
						expect(validationResult.success).toBe(true);

						// Verify golden_nuggets array exists
						expect(response.golden_nuggets).toBeDefined();
						expect(Array.isArray(response.golden_nuggets)).toBe(true);

						// If nuggets exist, verify each one has required fields
						if (response.golden_nuggets.length > 0) {
							response.golden_nuggets.forEach((nugget, _index) => {
								expect(nugget.type).toBeDefined();
								expect([
									"tool",
									"media",
									"explanation",
									"analogy",
									"model",
								]).toContain(nugget.type);
								expect(typeof nugget.startContent).toBe("string");
								expect(nugget.startContent.length).toBeGreaterThan(0);
								expect(typeof nugget.endContent).toBe("string");
								expect(nugget.endContent.length).toBeGreaterThan(0);
								expect(typeof nugget.synthesis).toBe("string");
								expect(nugget.synthesis.length).toBeGreaterThan(0);
							});
						}

						console.log(
							`✅ ${providerId}: Successfully extracted ${response.golden_nuggets.length} golden nuggets`,
						);
					} catch (error) {
						console.error(`Error in ${providerId} test:`, error);
						console.error(`Error stack:`, error.stack);
						throw error;
					}
				},
				60000,
			); // 60 second timeout for API calls

			// Skip test if no API key available
			if (!hasApiKey) {
				it.skip(`${providerId} tests skipped - no API key provided`, () => {});
			}
		},
	);

	describe("Response validation utilities", () => {
		it("should validate correct response format", () => {
			const validResponse = {
				golden_nuggets: [
					{
						type: "tool" as const,
						startContent: "React hooks",
						endContent: "like useState",
						synthesis: "Useful for managing component state",
					},
					{
						type: "explanation" as const,
						startContent: "Components are functions",
						endContent: "return JSX",
						synthesis: "This mental model helps understand React architecture",
					},
				],
			};

			const isValid = validateResponse(validResponse);
			expect(isValid).toBe(true);
		});

		it("should reject invalid response format", () => {
			const invalidResponse = {
				golden_nuggets: [
					{
						type: "invalid-type",
						startContent: "Some content",
						endContent: "Some content",
						synthesis: "Some synthesis",
					},
				],
			};

			const isValid = validateResponse(invalidResponse);
			expect(isValid).toBe(false);
		});

		it("should handle malformed response gracefully", () => {
			const malformedResponse = {
				golden_nuggets: "not an array",
			};

			const isValid = validateResponse(malformedResponse);
			expect(isValid).toBe(false);
		});
	});

	describe("Provider factory", () => {
		it("should support all expected providers", () => {
			const supportedProviders = ProviderFactory.getSupportedProviders();
			expect(supportedProviders).toContain("gemini");
			expect(supportedProviders).toContain("openai");
			expect(supportedProviders).toContain("anthropic");
			expect(supportedProviders).toContain("openrouter");
			expect(supportedProviders).toHaveLength(4);
		});

		it("should provide default models for all providers", () => {
			const providers: ProviderId[] = [
				"gemini",
				"openai",
				"anthropic",
				"openrouter",
			];

			providers.forEach((providerId) => {
				const defaultModel = ProviderFactory.getDefaultModel(providerId);
				expect(defaultModel).toBeDefined();
				expect(typeof defaultModel).toBe("string");
				expect(defaultModel.length).toBeGreaterThan(0);
			});
		});

		it("should create provider instances for all supported providers", async () => {
			const providers: ProviderId[] = [
				"gemini",
				"openai",
				"anthropic",
				"openrouter",
			];

			for (const providerId of providers) {
				const config: ProviderConfig = {
					providerId,
					apiKey: "test-key",
					modelName: ProviderFactory.getDefaultModel(providerId),
				};

				const provider = await ProviderFactory.createProvider(config);
				expect(provider).toBeDefined();
				expect(provider.providerId).toBe(providerId);
				expect(provider.modelName).toBe(config.modelName);
			}
		});

		it("should get selected model for providers (new functionality)", async () => {
			const providers: ProviderId[] = [
				"gemini",
				"openai", 
				"anthropic",
				"openrouter",
			];

			// Test that getSelectedModel returns default models when no custom selection exists
			for (const providerId of providers) {
				const selectedModel = await ProviderFactory.getSelectedModel(providerId);
				const defaultModel = ProviderFactory.getDefaultModel(providerId);
				
				expect(selectedModel).toBeDefined();
				expect(typeof selectedModel).toBe("string");
				expect(selectedModel.length).toBeGreaterThan(0);
				// Should return default model when no custom selection
				expect(selectedModel).toBe(defaultModel);
			}
		});

		it("should create provider with selected model (new functionality)", async () => {
			const providers: ProviderId[] = [
				"gemini",
				"openai",
				"anthropic", 
				"openrouter",
			];

			for (const providerId of providers) {
				const provider = await ProviderFactory.createProviderWithSelectedModel(
					providerId,
					"test-key"
				);
				
				expect(provider).toBeDefined();
				expect(provider.providerId).toBe(providerId);
				
				// Should use the selected model (which defaults to default model)
				const expectedModel = ProviderFactory.getDefaultModel(providerId);
				expect(provider.modelName).toBe(expectedModel);
			}
		});
	});
});
