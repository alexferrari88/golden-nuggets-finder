import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock types based on usage in content.ts
interface MockContentItem {
	type: "post" | "comment";
	textContent?: string;
	htmlContent?: string;
}

interface MockContent {
	title: string;
	items: MockContentItem[];
}

// Extract the convertContentToText function logic for isolated testing
function convertContentToText(content: MockContent | null): string {
	if (!content || !content.items || content.items.length === 0) {
		return "";
	}

	// Combine all content items into a single text string with type delimiters
	const contentParts = [content.title];

	content.items.forEach((item) => {
		let textContent = "";

		if (item.textContent) {
			textContent = item.textContent;
		} else if (item.htmlContent) {
			// Strip HTML tags for text-only analysis
			textContent = item.htmlContent.replace(/<[^>]*>/g, "").trim();
		}

		if (textContent) {
			// Add delimiter to specify content type for LLM analysis
			const delimiter = item.type === "post" ? "[POST]" : "[COMMENT]";
			contentParts.push(`${delimiter} ${textContent}`);
		}
	});

	return contentParts.filter((part) => part && part.trim()).join("\n\n");
}

// Generate analysis ID function from content.ts
function generateAnalysisId(): string {
	return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

describe("Content Script Functions", () => {
	describe("convertContentToText", () => {
		it("should return empty string for null content", () => {
			const result = convertContentToText(null);
			expect(result).toBe("");
		});

		it("should return empty string for content with no items", () => {
			const content: MockContent = {
				title: "Test Title",
				items: [],
			};
			const result = convertContentToText(content);
			expect(result).toBe("");
		});

		it("should return empty string for content with empty items array", () => {
			const content: MockContent = {
				title: "Test Title",
				items: [],
			};
			const result = convertContentToText(content);
			expect(result).toBe("");
		});

		it("should include title and single post item with textContent", () => {
			const content: MockContent = {
				title: "Discussion Title",
				items: [
					{
						type: "post",
						textContent: "This is a post content",
					},
				],
			};
			const result = convertContentToText(content);
			expect(result).toBe("Discussion Title\n\n[POST] This is a post content");
		});

		it("should include title and single comment item with textContent", () => {
			const content: MockContent = {
				title: "Discussion Title",
				items: [
					{
						type: "comment",
						textContent: "This is a comment",
					},
				],
			};
			const result = convertContentToText(content);
			expect(result).toBe("Discussion Title\n\n[COMMENT] This is a comment");
		});

		it("should strip HTML tags from htmlContent", () => {
			const content: MockContent = {
				title: "HTML Discussion",
				items: [
					{
						type: "post",
						htmlContent:
							'<p>This is <strong>bold</strong> text with <a href="link">links</a></p>',
					},
				],
			};
			const result = convertContentToText(content);
			expect(result).toBe(
				"HTML Discussion\n\n[POST] This is bold text with links",
			);
		});

		it("should prefer textContent over htmlContent when both exist", () => {
			const content: MockContent = {
				title: "Mixed Content",
				items: [
					{
						type: "post",
						textContent: "Plain text content",
						htmlContent: "<p>HTML content</p>",
					},
				],
			};
			const result = convertContentToText(content);
			expect(result).toBe("Mixed Content\n\n[POST] Plain text content");
		});

		it("should handle multiple items with different types", () => {
			const content: MockContent = {
				title: "Multi-item Discussion",
				items: [
					{
						type: "post",
						textContent: "Original post content",
					},
					{
						type: "comment",
						textContent: "First comment",
					},
					{
						type: "comment",
						htmlContent: "<p>Second <em>comment</em> with HTML</p>",
					},
				],
			};
			const result = convertContentToText(content);
			expect(result).toBe(
				"Multi-item Discussion\n\n[POST] Original post content\n\n[COMMENT] First comment\n\n[COMMENT] Second comment with HTML",
			);
		});

		it("should skip items with no textContent or htmlContent", () => {
			const content: MockContent = {
				title: "Partial Content",
				items: [
					{
						type: "post",
						textContent: "Valid post",
					},
					{
						type: "comment",
						// No textContent or htmlContent
					},
					{
						type: "comment",
						textContent: "Valid comment",
					},
				],
			};
			const result = convertContentToText(content);
			expect(result).toBe(
				"Partial Content\n\n[POST] Valid post\n\n[COMMENT] Valid comment",
			);
		});

		it("should skip items with empty textContent", () => {
			const content: MockContent = {
				title: "Empty Content Test",
				items: [
					{
						type: "post",
						textContent: "",
					},
					{
						type: "comment",
						textContent: "Valid comment",
					},
				],
			};
			const result = convertContentToText(content);
			expect(result).toBe("Empty Content Test\n\n[COMMENT] Valid comment");
		});

		it("should skip items with empty htmlContent after stripping", () => {
			const content: MockContent = {
				title: "Empty HTML Test",
				items: [
					{
						type: "post",
						htmlContent: "<p></p><div></div>",
					},
					{
						type: "comment",
						textContent: "Valid comment",
					},
				],
			};
			const result = convertContentToText(content);
			expect(result).toBe("Empty HTML Test\n\n[COMMENT] Valid comment");
		});

		it("should handle empty title", () => {
			const content: MockContent = {
				title: "",
				items: [
					{
						type: "post",
						textContent: "Post content",
					},
				],
			};
			const result = convertContentToText(content);
			expect(result).toBe("[POST] Post content");
		});

		it("should handle whitespace-only title", () => {
			const content: MockContent = {
				title: "   ",
				items: [
					{
						type: "post",
						textContent: "Post content",
					},
				],
			};
			const result = convertContentToText(content);
			expect(result).toBe("[POST] Post content");
		});

		it("should handle complex HTML with nested tags and whitespace", () => {
			const content: MockContent = {
				title: "Complex HTML",
				items: [
					{
						type: "post",
						htmlContent: `
              <div class="post">
                <p>This is a <strong>complex</strong> post with:</p>
                <ul>
                  <li>List item 1</li>
                  <li>List item 2 with <a href="#link">link</a></li>
                </ul>
                <blockquote>A quote here</blockquote>
              </div>
            `,
					},
				],
			};
			const result = convertContentToText(content);
			expect(result).toContain("[POST]");
			expect(result).toContain("This is a complex post with:");
			expect(result).toContain("List item 1");
			expect(result).toContain("List item 2 with link");
			expect(result).toContain("A quote here");
			expect(result).not.toContain("<");
			expect(result).not.toContain(">");
		});

		it("should preserve order of items", () => {
			const content: MockContent = {
				title: "Ordered Content",
				items: [
					{
						type: "post",
						textContent: "First post",
					},
					{
						type: "comment",
						textContent: "First comment",
					},
					{
						type: "comment",
						textContent: "Second comment",
					},
					{
						type: "post",
						textContent: "Second post",
					},
				],
			};
			const result = convertContentToText(content);
			const parts = result.split("\n\n");
			expect(parts[0]).toBe("Ordered Content");
			expect(parts[1]).toBe("[POST] First post");
			expect(parts[2]).toBe("[COMMENT] First comment");
			expect(parts[3]).toBe("[COMMENT] Second comment");
			expect(parts[4]).toBe("[POST] Second post");
		});
	});

	describe("generateAnalysisId", () => {
		beforeEach(() => {
			// Mock Date.now and Math.random for predictable tests
			vi.useFakeTimers();
			vi.setSystemTime(new Date("2024-01-01T12:00:00.000Z"));
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("should generate ID with analysis prefix", () => {
			vi.spyOn(Math, "random").mockReturnValue(0.123456789);
			const id = generateAnalysisId();
			expect(id).toMatch(/^analysis_\d+_[a-z0-9]+$/);
			expect(id).toContain("analysis_");
		});

		it("should include timestamp in ID", () => {
			vi.spyOn(Math, "random").mockReturnValue(0.5);
			const id = generateAnalysisId();
			expect(id).toContain("1704110400000"); // Unix timestamp for 2024-01-01T12:00:00.000Z
		});

		it("should include random component in ID", () => {
			vi.spyOn(Math, "random").mockReturnValue(0.123456789);
			const id = generateAnalysisId();
			// Math.random().toString(36).substr(2, 9) with 0.123456789 should produce specific string
			expect(id).toMatch(/_[a-z0-9]{9}$/);
		});

		it("should generate unique IDs on successive calls", () => {
			const id1 = generateAnalysisId();
			// Advance time slightly
			vi.advanceTimersByTime(1);
			const id2 = generateAnalysisId();

			expect(id1).not.toBe(id2);
			expect(id1).toMatch(/^analysis_\d+_[a-z0-9]+$/);
			expect(id2).toMatch(/^analysis_\d+_[a-z0-9]+$/);
		});

		it("should have correct format structure", () => {
			const id = generateAnalysisId();
			const parts = id.split("_");

			expect(parts).toHaveLength(3);
			expect(parts[0]).toBe("analysis");
			expect(parts[1]).toMatch(/^\d+$/); // Timestamp (numeric)
			expect(parts[2]).toMatch(/^[a-z0-9]{9}$/); // Random string (9 chars, alphanumeric)
		});
	});

	describe("Content Script Integration Points", () => {
		it("should handle real-world Reddit-like content structure", () => {
			const redditLikeContent: MockContent = {
				title: "TIL about JavaScript async/await",
				items: [
					{
						type: "post",
						htmlContent:
							'<div class="usertext-body"><div class="md"><p>I just learned that async/await in JavaScript is syntactic sugar over Promises. This makes asynchronous code much more readable than callback hell.</p></div></div>',
					},
					{
						type: "comment",
						textContent:
							"Great explanation! I wish I had learned this earlier in my career.",
					},
					{
						type: "comment",
						htmlContent:
							'<div class="usertext-body"><div class="md"><p>Here\'s a great resource: <a href="https://example.com">MDN Async/Await Guide</a></p></div></div>',
					},
				],
			};

			const result = convertContentToText(redditLikeContent);

			expect(result).toContain("TIL about JavaScript async/await");
			expect(result).toContain("[POST] I just learned that async/await");
			expect(result).toContain("[COMMENT] Great explanation!");
			expect(result).toContain(
				"[COMMENT] Here's a great resource: MDN Async/Await Guide",
			);
			expect(result).not.toContain("<div>");
			expect(result).not.toContain("<a href");
		});

		it("should handle HackerNews-like content structure", () => {
			const hackerNewsLikeContent: MockContent = {
				title: "Show HN: I built a new productivity tool",
				items: [
					{
						type: "post",
						textContent:
							"After struggling with existing tools, I built my own productivity app. It uses the Pomodoro technique with customizable intervals.",
					},
					{
						type: "comment",
						textContent:
							"Nice work! How does this compare to existing Pomodoro apps like Forest or Be Focused?",
					},
					{
						type: "comment",
						textContent:
							"The key differentiator is the adaptive intervals based on your focus patterns. Traditional Pomodoro is too rigid for deep work.",
					},
				],
			};

			const result = convertContentToText(hackerNewsLikeContent);

			expect(result).toContain("Show HN: I built a new productivity tool");
			expect(result).toContain("[POST] After struggling with existing tools");
			expect(result).toContain("[COMMENT] Nice work! How does this compare");
			expect(result).toContain(
				"[COMMENT] The key differentiator is the adaptive",
			);
		});
	});
});
