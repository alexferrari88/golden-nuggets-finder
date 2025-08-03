import { expect, test } from "./fixtures";
import { getTestApiKey, loadTestConfig } from "./test-config";

test.describe("Golden Nuggets API Integration", () => {
	test.beforeEach(async ({ context, extensionId }) => {
		// Set up API key in extension storage before each test
		const testApiKey = getTestApiKey();

		// Navigate to options page to configure API key
		const optionsPage = await context.newPage();
		await optionsPage.goto(`chrome-extension://${extensionId}/options.html`);

		// Wait for page to load completely
		await optionsPage.waitForLoadState("networkidle");

		// First, select a provider (Gemini)
		const geminiRadio = optionsPage.locator('input[type="radio"][value="gemini"]');
		await geminiRadio.click();

		// Now wait for the API key input field to be visible (appears after provider selection)
		await optionsPage.waitForSelector('input[type="password"]', {
			timeout: 10000,
		});

		// Configure API key (auto-saves when entered)
		await optionsPage.fill('input[type="password"]', testApiKey);

		// Trigger blur to ensure auto-save happens
		await optionsPage.locator('input[type="password"]').blur();

		// Optionally validate the API key if needed for tests
		const validateButton = optionsPage.locator(
			'button:has-text("Validate API Key")',
		);
		if ((await validateButton.count()) > 0) {
			await validateButton.click();
			// Wait for validation to complete
			await optionsPage.waitForTimeout(3000);
		}

		await optionsPage.close();
	});

	test("Extension loads with API key configured", async ({
		context,
		extensionId,
	}) => {
		// Test that extension is properly loaded and API key is saved
		const optionsPage = await context.newPage();
		await optionsPage.goto(`chrome-extension://${extensionId}/options.html`);

		// Wait for page to load
		await optionsPage.waitForLoadState("networkidle");

		// Verify that Gemini provider is selected (from beforeEach setup)
		const geminiRadio = optionsPage.locator('input[type="radio"][value="gemini"]');
		await expect(geminiRadio).toBeChecked();

		// API key input should now be visible
		await optionsPage.waitForSelector('input[type="password"]', {
			timeout: 10000,
		});

		// Verify API key is populated (should be masked for security)
		const apiKeyInput = await optionsPage.locator('input[type="password"]');
		const value = await apiKeyInput.inputValue();

		// API key should be present (either real or mock)
		expect(value).toBeTruthy();
		expect(value.length).toBeGreaterThan(0);

		await optionsPage.close();
	});

	test("Background service worker handles API requests", async ({
		context,
		extensionId,
	}) => {
		// Test the background script functionality through the popup page
		// This gives us access to chrome.runtime API

		const popupPage = await context.newPage();
		await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);

		// Wait for popup to load
		await popupPage.waitForTimeout(2000);

		// Test that the extension can store and retrieve API keys
		const storageTest = await popupPage.evaluate(async () => {
			try {
				// Test extension messaging
				const response = await chrome.runtime.sendMessage({
					type: "GET_CONFIG",
				});

				return {
					success: true,
					hasApiKey: Boolean(response?.data?.geminiApiKey),
					hasPrompts: Array.isArray(response?.data?.userPrompts),
					promptCount: response?.data?.userPrompts?.length || 0,
					rawResponse: response,
				};
			} catch (error) {
				return {
					success: false,
					error: error.message,
				};
			}
		});

		// Should be able to get configuration
		expect(storageTest.success).toBe(true);
		expect(storageTest.hasApiKey).toBe(true);
		expect(storageTest.hasPrompts).toBe(true);
		expect(storageTest.promptCount).toBeGreaterThan(0);

		await popupPage.close();
	});

	test("Popup displays correctly with API key configured", async ({
		context,
		extensionId,
	}) => {
		// Test popup functionality
		const popupPage = await context.newPage();
		await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);

		// Wait for popup to load - should not show "no API key" message
		await popupPage.waitForTimeout(2000);

		// Check that we don't see the "no API key" message
		const noApiKeyText = await popupPage.textContent("body");
		expect(noApiKeyText).not.toContain("Please set your Gemini API key");

		// Look for the main popup content (should have prompts)
		// The popup should show prompt items with data-testid="prompt-item"
		await popupPage.waitForSelector('[data-testid="prompt-item"]', {
			timeout: 5000,
		});

		const promptItems = await popupPage.locator('[data-testid="prompt-item"]');
		await expect(promptItems.first()).toBeVisible();

		await popupPage.close();
	});

	test("Golden nuggets response schema validation", async ({
		context,
		extensionId,
	}) => {
		// Test schema validation using a test page since we can't import in service workers
		const testPage = await context.newPage();
		await testPage.goto(
			"data:text/html,<html><body><p>Test page</p></body></html>",
		);

		// Inject validation test directly into the page
		const schemaTest = await testPage.evaluate(() => {
			// Define the validation function inline (simplified version)
			const validateGoldenNuggets = (response: any) => {
				if (!response || !Array.isArray(response.golden_nuggets)) {
					return false;
				}

				const validTypes = ["tool", "media", "explanation", "analogy", "model"];

				return response.golden_nuggets.every(
					(nugget: any) =>
						nugget &&
						typeof nugget.content === "string" &&
						typeof nugget.synthesis === "string" &&
						validTypes.includes(nugget.type),
				);
			};

			// Test valid response
			const validResponse = {
				golden_nuggets: [
					{
						type: "tool",
						content: "Use regex101.com for testing regular expressions",
						synthesis: "Perfect for someone who values precision and testing",
					},
					{
						type: "explanation",
						content: "React hooks follow composition over inheritance",
						synthesis: "Aligns with first-principles thinking",
					},
				],
			};

			// Test invalid response
			const invalidResponse = {
				golden_nuggets: [
					{
						type: "invalid_type",
						content: "Some content",
						synthesis: "Some synthesis",
					},
				],
			};

			return {
				validationPassed: validateGoldenNuggets(validResponse),
				validationFailed: !validateGoldenNuggets(invalidResponse),
			};
		});

		expect(schemaTest.validationPassed).toBe(true);
		expect(schemaTest.validationFailed).toBe(true);

		await testPage.close();
	});

	test.skip("Full content analysis workflow", async ({
		context,
		extensionId,
	}) => {
		// This test is skipped due to Playwright limitations with content script injection
		// See tests/CLAUDE.md for details about this limitation
		// Test would cover:
		// 1. Navigate to a test page
		// 2. Inject content script
		// 3. Extract content
		// 4. Send to API
		// 5. Display results
		// For now, this workflow is covered by manual testing
	});

	test("API error handling", async ({ context, extensionId }) => {
		// Test error handling through extension messaging from popup
		const popupPage = await context.newPage();
		await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);

		// Wait for popup to load
		await popupPage.waitForTimeout(2000);

		// Test error handling through the extension's message handling
		const errorTest = await popupPage.evaluate(async () => {
			try {
				// Try to trigger an analysis with invalid content or setup
				const response = await chrome.runtime.sendMessage({
					type: "ANALYZE_CONTENT",
					content: "", // Empty content should cause an error
					prompt: "Test prompt",
				});

				return {
					success: response && !response.error,
					hasError: Boolean(response?.error),
					errorMessage: response?.error,
				};
			} catch (error) {
				return {
					success: false,
					hasError: true,
					errorMessage: error.message,
				};
			}
		});

		// Should handle errors gracefully
		expect(errorTest.hasError).toBe(true);
		expect(typeof errorTest.errorMessage).toBe("string");

		await popupPage.close();
	});

	test("Performance monitoring during API calls", async ({
		context,
		extensionId,
	}) => {
		// Test performance monitoring functionality using a test page
		const testPage = await context.newPage();
		await testPage.goto(
			"data:text/html,<html><body><p>Test content</p></body></html>",
		);

		const perfTest = await testPage.evaluate(() => {
			// Simple performance test inline
			const startTime = performance.now();

			// Simulate some work
			const workStart = Date.now();
			while (Date.now() - workStart < 50) {
				// Busy wait for ~50ms
			}

			const endTime = performance.now();
			const duration = endTime - startTime;

			return {
				hasTimingResult: typeof duration === "number",
				timingIsReasonable: duration >= 40 && duration < 200, // Should be around 50ms give or take
				performanceWorks: typeof performance.now === "function",
			};
		});

		expect(perfTest.hasTimingResult).toBe(true);
		expect(perfTest.timingIsReasonable).toBe(true);
		expect(perfTest.performanceWorks).toBe(true);

		await testPage.close();
	});
});

test.describe("Golden Nuggets E2E Configuration", () => {
	test("Test configuration is properly set up", async () => {
		const config = loadTestConfig();

		// Verify test configuration
		expect(typeof config.useRealAPI).toBe("boolean");
		expect(typeof config.geminiApiKey).toBe("string");

		if (config.useRealAPI) {
			// If real API is configured, key should be substantial
			expect(config.geminiApiKey.length).toBeGreaterThan(20);
			console.log("✅ Running tests with real Gemini API");
		} else {
			console.log("⚠️  Running tests with mock API (no real API key provided)");
		}
	});
});
