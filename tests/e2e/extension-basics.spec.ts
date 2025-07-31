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
		await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
		await expect(popupPage).toHaveURL(
			new RegExp(`chrome-extension://${extensionId}/popup.html`),
		);

		// Test options page
		const optionsPage = await context.newPage();
		await optionsPage.goto(`chrome-extension://${extensionId}/options.html`);
		await expect(optionsPage).toHaveURL(
			new RegExp(`chrome-extension://${extensionId}/options.html`),
		);

		await popupPage.close();
		await optionsPage.close();
	});
});
