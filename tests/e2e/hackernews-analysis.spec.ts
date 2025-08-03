import { expect, test } from "./fixtures";

test.describe("HackerNews Analysis", () => {
	test("can load and analyze HackerNews discussion page", async ({
		context,
		extensionId,
	}) => {
		const page = await context.newPage();

		try {
			// Navigate to the specific HackerNews discussion
			await page.goto("https://news.ycombinator.com/item?id=31647181");

			// Wait for page to load
			await page.waitForLoadState("networkidle");

			// Check if the page loaded properly
			await expect(page).toHaveTitle(/Hacker News/i);

			// Look for the main story content
			const storySelector = ".fatitem";
			await expect(page.locator(storySelector)).toBeVisible();

			// Look for comments section
			const commentsSelector = ".comment-tree";
			const commentsExist = (await page.locator(commentsSelector).count()) > 0;

			if (commentsExist) {
				console.log("Comments section found");
			} else {
				// Try alternative comment selector
				const altCommentsSelector = ".athing.comtr";
				await expect(page.locator(altCommentsSelector).first()).toBeVisible();
			}

			// Get some content to understand the structure
			const storyText = await page.locator(storySelector).textContent();
			console.log("Story preview:", `${storyText?.substring(0, 200)}...`);

			// Check if there are any existing highlights (there shouldn't be any initially)
			const existingHighlights = await page
				.locator(".nugget-highlight")
				.count();
			expect(existingHighlights).toBe(0);

			// Check if there are any comment highlights
			const existingCommentHighlights = await page
				.locator(".nugget-comment-highlight")
				.count();
			expect(existingCommentHighlights).toBe(0);
		} catch (error) {
			console.error("Test failed:", error);

			// Take a screenshot for debugging
			await page.screenshot({
				path: "tests/debug-hackernews-page.png",
				fullPage: true,
			});

			throw error;
		} finally {
			await page.close();
		}
	});

	test("can simulate extension analysis on HackerNews page", async ({
		context,
		extensionId,
	}) => {
		const page = await context.newPage();

		try {
			await page.goto("https://news.ycombinator.com/item?id=31647181");
			await page.waitForLoadState("networkidle");

			// Test content extraction from HackerNews structure
			const result = await page.evaluate(() => {
				// Simulate HackerNews content extraction
				const storyElement = document.querySelector(".fatitem");
				const commentElements = document.querySelectorAll(
					".comment-tree .comment, .athing.comtr .commtext",
				);

				const storyText = storyElement?.textContent || "";
				const commentTexts = Array.from(commentElements)
					.map((el) => el.textContent || "")
					.slice(0, 5); // First 5 comments

				return {
					storyText: `${storyText.substring(0, 500)}...`,
					commentCount: commentElements.length,
					commentPreviews: commentTexts.map(
						(text) => `${text.substring(0, 100)}...`,
					),
					hasStory: storyText.length > 0,
					hasComments: commentElements.length > 0,
				};
			});

			console.log(
				"HackerNews content analysis:",
				JSON.stringify(result, null, 2),
			);

			// Verify we can extract meaningful content
			expect(result.hasStory).toBe(true);
			expect(result.storyText.length).toBeGreaterThan(10);

			// Should have some comments on this discussion
			expect(result.hasComments).toBe(true);
		} catch (error) {
			console.error("Analysis simulation failed:", error);
			await page.screenshot({
				path: "tests/debug-hackernews-analysis.png",
				fullPage: true,
			});
			throw error;
		} finally {
			await page.close();
		}
	});

	test("can test HackerNews content structure for highlighting", async ({
		context,
		extensionId,
	}) => {
		const page = await context.newPage();

		try {
			await page.goto("https://news.ycombinator.com/item?id=31647181");
			await page.waitForLoadState("networkidle");

			// Test the specific text structure of HackerNews
			const result = await page.evaluate(() => {
				// Test HackerNews-specific selectors
				const storyTitle =
					document.querySelector(".titleline a")?.textContent || "";
				const storyMetadata =
					document.querySelector(".subtext")?.textContent || "";
				const comments = document.querySelectorAll(".commtext");

				// Check if we can find highlightable content
				const commentTexts = Array.from(comments)
					.map((comment) => {
						const text = comment.textContent || "";
						return {
							length: text.length,
							hasSubstantialText: text.length > 50,
							preview: `${text.substring(0, 100)}...`,
						};
					})
					.slice(0, 3); // First 3 comments

				return {
					title: storyTitle,
					hasTitle: storyTitle.length > 0,
					metadata: storyMetadata,
					totalComments: comments.length,
					substantialComments: commentTexts.filter((c) => c.hasSubstantialText)
						.length,
					commentSamples: commentTexts,
				};
			});

			console.log(
				"HackerNews structure analysis:",
				JSON.stringify(result, null, 2),
			);

			// Verify the page has the expected structure
			expect(result.hasTitle).toBe(true);
			expect(result.totalComments).toBeGreaterThan(0);
			expect(result.substantialComments).toBeGreaterThan(0);
		} catch (error) {
			console.error("Structure test failed:", error);
			throw error;
		} finally {
			await page.close();
		}
	});
});
