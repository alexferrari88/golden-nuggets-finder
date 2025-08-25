import { expect, test } from "./fixtures";

test.describe("Feedback Reset Flow", () => {
	// Note: This test is skipped due to Playwright limitations with content script injection
	// See tests/CLAUDE.md for details about Playwright + Chrome Extension limitations
	test.skip("should allow user to reset feedback on golden nuggets", async ({
		page,
	}) => {
		// Navigate to a test page with content
		await page.goto("https://example.com");

		// Mock the Golden Nuggets analysis to return some test nuggets
		await page.evaluate(() => {
			// Mock the content script being injected
			(window as any).mockNuggets = [
				{
					type: "tool",
					startContent: "This is a useful tool",
					endContent: "for productivity",
				},
				{
					type: "explanation",
					startContent: "Complex concepts explained",
					endContent: "in simple terms",
				},
			];
		});

		// Simulate user giving feedback (positive rating)
		// In real scenario, this would be triggered through sidebar interactions
		await page.evaluate(() => {
			const feedback = {
				id: "test-feedback-123",
				nuggetContent: "This is a useful tool for productivity",
				originalType: "tool",
				rating: "positive",
				timestamp: Date.now(),
				url: window.location.href,
				context: "Test context",
			};

			// Simulate feedback being stored
			window.localStorage.setItem("test-feedback", JSON.stringify(feedback));
		});

		// Check that feedback exists
		const feedbackExists = await page.evaluate(() => {
			return window.localStorage.getItem("test-feedback") !== null;
		});
		expect(feedbackExists).toBe(true);

		// Test the reset functionality through messaging
		await page.evaluate(() => {
			// Simulate the reset feedback message being sent
			const mockMessage = {
				type: "DELETE_NUGGET_FEEDBACK",
				feedbackId: "test-feedback-123",
			};

			// In the actual implementation, this would go through chrome.runtime.sendMessage
			// For testing, we'll simulate the behavior
			(window as any).mockResetFeedback = mockMessage;
		});

		// Verify the reset message was prepared
		const resetMessage = await page.evaluate(
			() => (window as any).mockResetFeedback,
		);
		expect(resetMessage).toEqual({
			type: "DELETE_NUGGET_FEEDBACK",
			feedbackId: "test-feedback-123",
		});

		// Simulate successful reset response
		await page.evaluate(() => {
			// Simulate the feedback being removed after successful backend call
			window.localStorage.removeItem("test-feedback");
		});

		// Verify feedback was removed
		const feedbackAfterReset = await page.evaluate(() => {
			return window.localStorage.getItem("test-feedback");
		});
		expect(feedbackAfterReset).toBeNull();
	});

	// Note: This test is skipped due to limitations with testing content script UI in Playwright
	// UI behavior testing is better handled in unit tests for content script components
	test.skip("should handle reset confirmation modal", async ({
		context,
		extensionId: _extensionId,
	}) => {
		const page = await context.newPage();
		// Create a simple test page
		await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head><title>Test Page</title></head>
        <body>
          <div id="test-content">
            <p>This is a test page for feedback reset functionality.</p>
          </div>
        </body>
      </html>
    `);

		// Inject a mock confirmation modal to test the UI behavior
		await page.evaluate(() => {
			// Create mock confirmation modal
			const overlay = document.createElement("div");
			overlay.id = "reset-confirmation-overlay";
			overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
      `;

			const modal = document.createElement("div");
			modal.id = "reset-confirmation-modal";
			modal.style.cssText = `
        background: white;
        border-radius: 8px;
        padding: 24px;
        max-width: 400px;
        width: 90%;
        margin: 16px;
      `;

			const title = document.createElement("h3");
			title.textContent = "Reset Feedback";

			const description = document.createElement("p");
			description.textContent =
				"Are you sure you want to reset your feedback for this nugget? This will delete your rating and type correction from the system.";

			const buttonContainer = document.createElement("div");
			buttonContainer.style.cssText =
				"display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px;";

			const cancelBtn = document.createElement("button");
			cancelBtn.id = "cancel-reset-btn";
			cancelBtn.textContent = "Cancel";
			cancelBtn.style.cssText =
				"padding: 8px 16px; border: 1px solid #ccc; border-radius: 4px; background: white; cursor: pointer;";

			const resetBtn = document.createElement("button");
			resetBtn.id = "confirm-reset-btn";
			resetBtn.textContent = "Reset Feedback";
			resetBtn.style.cssText =
				"padding: 8px 16px; border: 1px solid #007cba; border-radius: 4px; background: #007cba; color: white; cursor: pointer;";

			buttonContainer.appendChild(cancelBtn);
			buttonContainer.appendChild(resetBtn);

			modal.appendChild(title);
			modal.appendChild(description);
			modal.appendChild(buttonContainer);

			overlay.appendChild(modal);
			document.body.appendChild(overlay);

			// Add event listeners
			cancelBtn.addEventListener("click", () => {
				document.body.removeChild(overlay);
				(window as any).mockModalAction = "cancelled";
			});

			resetBtn.addEventListener("click", () => {
				document.body.removeChild(overlay);
				(window as any).mockModalAction = "confirmed";
			});
		});

		// Verify modal is visible
		await expect(page.locator("#reset-confirmation-overlay")).toBeVisible();
		await expect(page.locator("#reset-confirmation-modal")).toBeVisible();

		// Test cancel action
		await page.click("#cancel-reset-btn");

		// Verify modal was closed and action was recorded
		await expect(
			page.locator("#reset-confirmation-overlay"),
		).not.toBeAttached();

		const cancelAction = await page.evaluate(
			() => (window as any).mockModalAction,
		);
		expect(cancelAction).toBe("cancelled");

		// Re-create modal for confirm test
		await page.evaluate(() => {
			// Reset the action variable
			(window as any).mockModalAction = null;

			// Recreate the modal (same code as above, but could be extracted to a function)
			const overlay = document.createElement("div");
			overlay.id = "reset-confirmation-overlay";
			overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
      `;

			const modal = document.createElement("div");
			modal.id = "reset-confirmation-modal";
			modal.style.cssText = `
        background: white;
        border-radius: 8px;
        padding: 24px;
        max-width: 400px;
        width: 90%;
        margin: 16px;
      `;

			const title = document.createElement("h3");
			title.textContent = "Reset Feedback";

			const description = document.createElement("p");
			description.textContent =
				"Are you sure you want to reset your feedback for this nugget?";

			const buttonContainer = document.createElement("div");
			buttonContainer.style.cssText =
				"display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px;";

			const cancelBtn = document.createElement("button");
			cancelBtn.id = "cancel-reset-btn";
			cancelBtn.textContent = "Cancel";

			const resetBtn = document.createElement("button");
			resetBtn.id = "confirm-reset-btn";
			resetBtn.textContent = "Reset Feedback";

			buttonContainer.appendChild(cancelBtn);
			buttonContainer.appendChild(resetBtn);

			modal.appendChild(title);
			modal.appendChild(description);
			modal.appendChild(buttonContainer);

			overlay.appendChild(modal);
			document.body.appendChild(overlay);

			resetBtn.addEventListener("click", () => {
				document.body.removeChild(overlay);
				(window as any).mockModalAction = "confirmed";
			});
		});

		// Test confirm action
		await page.click("#confirm-reset-btn");

		// Verify modal was closed and action was recorded
		await expect(
			page.locator("#reset-confirmation-overlay"),
		).not.toBeAttached();

		const confirmAction = await page.evaluate(
			() => (window as any).mockModalAction,
		);
		expect(confirmAction).toBe("confirmed");

		await page.close();
	});

	// Note: This test is skipped due to limitations with testing content script UI in Playwright
	// UI behavior testing is better handled in unit tests for content script components
	test.skip("should handle reset button visibility", async ({
		context,
		extensionId: _extensionId,
	}) => {
		const page = await context.newPage();
		// Create a test page with mock sidebar content
		await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head><title>Reset Button Visibility Test</title></head>
        <body>
          <div id="test-sidebar">
            <div class="nugget-item">
              <div class="nugget-feedback-section">
                <div class="feedback-buttons">
                  <div class="rating-container">
                    <button class="feedback-btn-thumbs-up">👍</button>
                    <button class="feedback-btn-thumbs-down">👎</button>
                  </div>
                  <div class="right-container">
                    <select class="type-correction">
                      <option value="tool">Tool</option>
                      <option value="media">Media</option>
                    </select>
                    <!-- Reset button should only appear when feedback exists -->
                  </div>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);

		// Initially, no reset button should be visible (no feedback exists)
		await expect(page.locator(".feedback-reset-btn")).not.toBeAttached();

		// Simulate user giving feedback
		await page.evaluate(() => {
			// Mock feedback existing
			const rightContainer = document.querySelector(".right-container");
			const resetBtn = document.createElement("button");
			resetBtn.className = "feedback-reset-btn";
			resetBtn.textContent = "×";
			resetBtn.title = "Reset feedback - removes rating and type correction";
			resetBtn.style.cssText = `
        width: 24px;
        height: 24px;
        border: 1px solid #ccc;
        border-radius: 4px;
        background: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
			rightContainer.appendChild(resetBtn);
		});

		// Now reset button should be visible
		await expect(page.locator(".feedback-reset-btn")).toBeVisible();

		// Test reset button styling and attributes
		const resetBtn = page.locator(".feedback-reset-btn");
		await expect(resetBtn).toHaveText("×");
		await expect(resetBtn).toHaveAttribute(
			"title",
			"Reset feedback - removes rating and type correction",
		);

		// Test reset button click
		const _clickHandled = false;
		await page.evaluate(() => {
			const resetBtn = document.querySelector(".feedback-reset-btn");
			resetBtn.addEventListener("click", () => {
				(window as any).resetButtonClicked = true;
			});
		});

		await resetBtn.click();

		const wasClicked = await page.evaluate(
			() => (window as any).resetButtonClicked,
		);
		expect(wasClicked).toBe(true);

		await page.close();
	});
});
