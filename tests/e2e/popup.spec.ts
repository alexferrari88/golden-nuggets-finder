import { expect, test } from "./fixtures";

test.describe("Popup Page", () => {
	test("popup page loads and displays basic elements", async ({
		context,
		extensionId,
	}) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		// Check that the page loads without errors
		await expect(page).toHaveURL(
			new RegExp(`chrome-extension://${extensionId}/popup.html`),
		);

		// Basic smoke test - page should have some content
		const body = page.locator("body");
		await expect(body).toBeVisible();

		await page.close();
	});

	test("popup handles persistent analysis state workflow", async ({
		context,
		extensionId,
	}) => {
		// This test verifies that the popup can handle analysis state persistence
		// without requiring real analysis (which needs API keys)

		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		// Wait for popup to load
		await expect(page.locator("body")).toBeVisible();

		// Check that popup loads without console errors related to analysis state
		const errors: string[] = [];
		page.on("console", (msg) => {
			if (msg.type() === "error") {
				errors.push(msg.text());
			}
		});

		// Wait a moment to capture any initialization errors
		await page.waitForTimeout(1000);

		// Filter out expected/unrelated errors and focus on analysis state errors
		const analysisStateErrors = errors.filter(
			(error) =>
				error.toLowerCase().includes("analysis") ||
				error.toLowerCase().includes("persistent") ||
				error.toLowerCase().includes("storage"),
		);

		// Should not have analysis state related errors
		expect(analysisStateErrors).toEqual([]);

		// Verify popup UI loads properly (basic elements should be present)
		// This indirectly tests that analysis state restoration doesn't break the UI
		const hasContent = await page.evaluate(() => {
			const body = document.body;
			return body && body.innerHTML.trim().length > 0;
		});

		expect(hasContent).toBe(true);

		await page.close();
	});

	test("popup analysis state storage integration", async ({
		context,
		extensionId,
	}) => {
		// Test analysis state storage without requiring API keys
		// This tests the storage integration layer

		const page = await context.newPage();

		// Test that we can access storage APIs from the popup context
		await page.goto(`chrome-extension://${extensionId}/popup.html`);
		await expect(page.locator("body")).toBeVisible();

		// Test storage accessibility
		const storageWorks = await page.evaluate(async () => {
			try {
				// Test that chrome.storage.local is accessible
				if (!chrome?.storage?.local) {
					return {
						success: false,
						error: "chrome.storage.local not available",
					};
				}

				// Test basic storage operations
				const testKey = "test-analysis-state";
				const testData = {
					analysisId: "e2e-test",
					promptName: "E2E Test",
					startTime: Date.now(),
					source: "popup" as const,
					currentPhase: 0,
					completedPhases: [],
				};

				// Save test data
				await chrome.storage.local.set({ [testKey]: testData });

				// Retrieve test data
				const result = await chrome.storage.local.get(testKey);
				const retrieved = result[testKey];

				// Clean up
				await chrome.storage.local.remove(testKey);

				// Verify data matches
				const matches =
					retrieved &&
					retrieved.analysisId === testData.analysisId &&
					retrieved.promptName === testData.promptName &&
					retrieved.source === testData.source;

				return { success: matches, retrieved, expected: testData };
			} catch (error) {
				return { success: false, error: error.message };
			}
		});

		expect(storageWorks.success).toBe(true);

		await page.close();
	});
});
