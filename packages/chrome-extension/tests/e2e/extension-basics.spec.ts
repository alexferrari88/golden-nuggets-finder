import { expect, test } from "./fixtures";

test.describe("Extension Basics", () => {
	test("extension loads and gets service worker", async ({
		context,
		extensionId,
	}) => {
		// Extension should have a valid ID
		expect(extensionId).toBeDefined();
		expect(extensionId).toMatch(/^[a-z]{32}$/);

		// Should have a service worker
		const serviceWorkers = context.serviceWorkers();
		expect(serviceWorkers.length).toBeGreaterThan(0);

		const serviceWorker = serviceWorkers[0];
		expect(serviceWorker.url()).toContain(extensionId);
	});

	test("extension pages are accessible", async ({ context, extensionId }) => {
		// Test popup page
		const popupPage = await context.newPage();
		await popupPage.goto(`chrome-extension://${extensionId}/popup.html`, {
			waitUntil: "networkidle",
		});
		await expect(popupPage).toHaveURL(
			new RegExp(`chrome-extension://${extensionId}/popup.html`),
		);

		// Clean up and wait properly before testing options page
		await popupPage.close();
		// Wait for page cleanup and extension stabilization
		await new Promise((resolve) => setTimeout(resolve, 500));

		const optionsPage = await context.newPage();
		try {
			await optionsPage.goto(`chrome-extension://${extensionId}/options.html`, {
				waitUntil: "networkidle",
				timeout: 15000, // Increase timeout for React app initialization
			});
			await expect(optionsPage).toHaveURL(
				new RegExp(`chrome-extension://${extensionId}/options.html`),
			);
		} catch (error) {
			// If navigation fails due to race condition, retry once
			console.log("Retrying options page navigation due to:", error.message);
			await optionsPage.close();
			await new Promise((resolve) => setTimeout(resolve, 1000));

			const retryOptionsPage = await context.newPage();
			await retryOptionsPage.goto(
				`chrome-extension://${extensionId}/options.html`,
				{
					waitUntil: "networkidle",
					timeout: 15000,
				},
			);
			await expect(retryOptionsPage).toHaveURL(
				new RegExp(`chrome-extension://${extensionId}/options.html`),
			);
			await retryOptionsPage.close();
			return;
		}

		await optionsPage.close();
	});
});
