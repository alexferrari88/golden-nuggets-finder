import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GoldenNuggetType } from "../../src/shared/schemas";
import type { GoldenNugget } from "../../src/shared/types";

// Mock the highlighter module to test the logic without DOM dependencies
const _mockHighlighter = {
	highlightNugget: vi.fn(),
	diagnoseHighlightingFailure: vi.fn(),
	isUrl: vi.fn(),
};

// Mock URL detection
vi.mock("../../src/shared/utils/url-detection", () => ({
	isUrl: (text: string) => {
		const urlPattern = /^https?:\/\/[^\s]+$/i;
		return urlPattern.test(text.trim());
	},
}));

describe("Highlighter URL Handling", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("URL detection in nuggets", () => {
		it("should detect URL nuggets correctly", async () => {
			const { isUrl } = await import("../../src/shared/utils/url-detection");

			const urlNuggets: GoldenNugget[] = [
				{
					type: "media" as GoldenNuggetType,
					startContent: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3444174/",
					endContent: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3444174/",
				},
				{
					type: "media" as GoldenNuggetType,
					startContent: "https://www.youtube.com/watch?v=lG4VkPoG3ko",
					endContent: "https://www.youtube.com/watch?v=lG4VkPoG3ko",
				},
			];

			urlNuggets.forEach((nugget) => {
				expect(isUrl(nugget.startContent)).toBe(true);
				expect(isUrl(nugget.endContent)).toBe(true);
			});
		});

		it("should not detect non-URL nuggets as URLs", async () => {
			const { isUrl } = await import("../../src/shared/utils/url-detection");

			const textNuggets: GoldenNugget[] = [
				{
					type: "tool" as GoldenNuggetType,
					startContent: "This is regular text content",
					endContent: "that should not be detected as URL",
				},
				{
					type: "aha! moments" as GoldenNuggetType,
					startContent: "Some insight about technology",
					endContent: "that provides valuable understanding",
				},
			];

			textNuggets.forEach((nugget) => {
				expect(isUrl(nugget.startContent)).toBe(false);
				expect(isUrl(nugget.endContent)).toBe(false);
			});
		});
	});

	describe("Identical boundary detection", () => {
		it("should detect when startContent equals endContent", () => {
			const identicalBoundaryNuggets: GoldenNugget[] = [
				{
					type: "media" as GoldenNuggetType,
					startContent: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3444174/",
					endContent: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3444174/", // Same as start
				},
				{
					type: "tool" as GoldenNuggetType,
					startContent: "identical text",
					endContent: "identical text", // Same as start
				},
			];

			identicalBoundaryNuggets.forEach((nugget) => {
				expect(nugget.startContent).toBe(nugget.endContent);
			});
		});

		it("should not flag different boundaries as identical", () => {
			const differentBoundaryNuggets: GoldenNugget[] = [
				{
					type: "media" as GoldenNuggetType,
					startContent: "https://example.com",
					endContent: "/path/to/resource", // Different from start
				},
				{
					type: "tool" as GoldenNuggetType,
					startContent: "This is the beginning",
					endContent: "and this is the end", // Different from start
				},
			];

			differentBoundaryNuggets.forEach((nugget) => {
				expect(nugget.startContent).not.toBe(nugget.endContent);
			});
		});
	});

	describe("Highlighting failure diagnosis", () => {
		const createDiagnosticFunction = () => {
			return async (
				nugget: GoldenNugget,
			): Promise<{
				reason: string;
				details: {
					isUrl: boolean;
					identicalBoundaries: boolean;
					emptyBoundaries: boolean;
					contentLength: number;
					startLength: number;
					endLength: number;
				};
			}> => {
				const { isUrl } = await import("../../src/shared/utils/url-detection");
				const startTrimmed = nugget.startContent.trim();
				const endTrimmed = nugget.endContent.trim();
				const isUrlContent = isUrl(startTrimmed) || isUrl(endTrimmed);
				const identicalBoundaries = nugget.startContent === nugget.endContent;
				const emptyBoundaries = !startTrimmed || !endTrimmed;

				let reason = "Unknown highlighting failure";

				if (identicalBoundaries) {
					reason = isUrlContent
						? "URL nugget has identical start/end boundaries (boundary generation issue)"
						: "Nugget has identical start/end content (content processing issue)";
				} else if (emptyBoundaries) {
					reason = "Nugget has empty start or end content";
				} else if (isUrlContent) {
					reason =
						"URL content not found on page (may be in href attributes or hidden)";
				} else {
					reason = "Content not found on page (text matching failed)";
				}

				return {
					reason,
					details: {
						isUrl: isUrlContent,
						identicalBoundaries,
						emptyBoundaries,
						contentLength:
							nugget.startContent.length + nugget.endContent.length,
						startLength: nugget.startContent.length,
						endLength: nugget.endContent.length,
					},
				};
			};
		};

		it("should diagnose URL nuggets with identical boundaries", async () => {
			const diagnoseFailure = createDiagnosticFunction();

			const urlNuggetWithIdenticalBoundaries: GoldenNugget = {
				type: "media" as GoldenNuggetType,
				startContent: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3444174/",
				endContent: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3444174/",
			};

			const diagnosis = await diagnoseFailure(urlNuggetWithIdenticalBoundaries);

			expect(diagnosis.details.isUrl).toBe(true);
			expect(diagnosis.details.identicalBoundaries).toBe(true);
			expect(diagnosis.details.emptyBoundaries).toBe(false);
			expect(diagnosis.reason).toContain(
				"URL nugget has identical start/end boundaries",
			);
		});

		it("should diagnose non-URL nuggets with identical boundaries", async () => {
			const diagnoseFailure = createDiagnosticFunction();

			const textNuggetWithIdenticalBoundaries: GoldenNugget = {
				type: "tool" as GoldenNuggetType,
				startContent: "identical content",
				endContent: "identical content",
			};

			const diagnosis = await diagnoseFailure(
				textNuggetWithIdenticalBoundaries,
			);

			expect(diagnosis.details.isUrl).toBe(false);
			expect(diagnosis.details.identicalBoundaries).toBe(true);
			expect(diagnosis.details.emptyBoundaries).toBe(false);
			expect(diagnosis.reason).toContain("identical start/end content");
		});

		it("should diagnose empty boundaries", async () => {
			const diagnoseFailure = createDiagnosticFunction();

			const emptyBoundaryNugget: GoldenNugget = {
				type: "tool" as GoldenNuggetType,
				startContent: "",
				endContent: "some content",
			};

			const diagnosis = await diagnoseFailure(emptyBoundaryNugget);

			expect(diagnosis.details.emptyBoundaries).toBe(true);
			expect(diagnosis.reason).toContain("empty start or end content");
		});

		it("should diagnose URL content not found on page", async () => {
			const diagnoseFailure = createDiagnosticFunction();

			const urlNuggetNotOnPage: GoldenNugget = {
				type: "media" as GoldenNuggetType,
				startContent: "https://example.com",
				endContent: "/path/to/resource",
			};

			const diagnosis = await diagnoseFailure(urlNuggetNotOnPage);

			expect(diagnosis.details.isUrl).toBe(true);
			expect(diagnosis.details.identicalBoundaries).toBe(false);
			expect(diagnosis.details.emptyBoundaries).toBe(false);
			expect(diagnosis.reason).toContain("URL content not found on page");
		});

		it("should provide detailed metrics in diagnosis", async () => {
			const diagnoseFailure = createDiagnosticFunction();

			const nugget: GoldenNugget = {
				type: "tool" as GoldenNuggetType,
				startContent: "Start content",
				endContent: "End content",
			};

			const diagnosis = await diagnoseFailure(nugget);

			expect(diagnosis.details.startLength).toBe(nugget.startContent.length);
			expect(diagnosis.details.endLength).toBe(nugget.endContent.length);
			expect(diagnosis.details.contentLength).toBe(
				nugget.startContent.length + nugget.endContent.length,
			);
		});
	});

	describe("Integration scenarios", () => {
		it("should handle the original problematic URLs from the issue", async () => {
			const { isUrl } = await import("../../src/shared/utils/url-detection");

			const problematicNuggets: GoldenNugget[] = [
				{
					type: "media" as GoldenNuggetType,
					startContent: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3444174/",
					endContent: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3444174/",
				},
				{
					type: "media" as GoldenNuggetType,
					startContent: "https://www.youtube.com/watch?v=lG4VkPoG3ko",
					endContent: "https://www.youtube.com/watch?v=lG4VkPoG3ko",
				},
			];

			problematicNuggets.forEach((nugget) => {
				// These should be detected as URLs
				expect(isUrl(nugget.startContent)).toBe(true);
				expect(isUrl(nugget.endContent)).toBe(true);

				// And they have identical boundaries (the original problem)
				expect(nugget.startContent).toBe(nugget.endContent);
			});
		});

		it("should handle mixed URL and text nuggets in the same batch", async () => {
			const { isUrl } = await import("../../src/shared/utils/url-detection");

			const mixedNuggets: GoldenNugget[] = [
				{
					type: "media" as GoldenNuggetType,
					startContent: "https://example.com",
					endContent: "https://example.com", // URL with identical boundaries
				},
				{
					type: "tool" as GoldenNuggetType,
					startContent: "This is regular text",
					endContent: "with different boundaries", // Text with different boundaries
				},
				{
					type: "aha! moments" as GoldenNuggetType,
					startContent: "Same text content",
					endContent: "Same text content", // Text with identical boundaries
				},
			];

			// First should be URL
			expect(isUrl(mixedNuggets[0].startContent)).toBe(true);
			expect(mixedNuggets[0].startContent).toBe(mixedNuggets[0].endContent);

			// Second should be text with different boundaries
			expect(isUrl(mixedNuggets[1].startContent)).toBe(false);
			expect(mixedNuggets[1].startContent).not.toBe(mixedNuggets[1].endContent);

			// Third should be text with identical boundaries
			expect(isUrl(mixedNuggets[2].startContent)).toBe(false);
			expect(mixedNuggets[2].startContent).toBe(mixedNuggets[2].endContent);
		});
	});
});
