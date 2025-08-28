import { describe, expect, it } from "vitest";
import {
	advancedNormalize,
	getDisplayContent,
	improvedStartEndMatching,
	improvedStartEndTextMatching,
	reconstructFullContent,
	sanitizeEndContent,
} from "./content-reconstruction";
import type { GoldenNugget } from "./types";

describe("Content Reconstruction - Error Handling", () => {
	describe("advancedNormalize", () => {
		it("should handle undefined input gracefully", () => {
			expect(advancedNormalize(undefined as unknown as string)).toBe("");
		});

		it("should handle null input gracefully", () => {
			expect(advancedNormalize(null as unknown as string)).toBe("");
		});

		it("should handle empty string input", () => {
			expect(advancedNormalize("")).toBe("");
		});

		it("should handle non-string input gracefully", () => {
			expect(advancedNormalize(123 as unknown as string)).toBe("");
			expect(advancedNormalize({} as unknown as string)).toBe("");
			expect(advancedNormalize([] as unknown as string)).toBe("");
		});

		it("should normalize valid text correctly", () => {
			expect(advancedNormalize("Hello World")).toBe("hello world");
			expect(advancedNormalize("  Multiple   Spaces  ")).toBe(
				"multiple spaces",
			);
			expect(advancedNormalize("Smart 'quotes' and \"curly quotes\"")).toBe(
				"smart 'quotes' and \"curly quotes\"",
			);
		});
	});

	describe("reconstructFullContent", () => {
		it("should handle undefined nugget gracefully", () => {
			expect(
				reconstructFullContent(
					undefined as unknown as GoldenNugget,
					"some content",
				),
			).toBe("");
		});

		it("should handle null nugget gracefully", () => {
			expect(
				reconstructFullContent(null as unknown as GoldenNugget, "some content"),
			).toBe("");
		});

		it("should handle nugget with missing startContent", () => {
			const nugget = {
				endContent: "end",
			} as Partial<GoldenNugget> as GoldenNugget;
			expect(reconstructFullContent(nugget, "some content")).toBe("");
		});

		it("should handle nugget with missing endContent", () => {
			const nugget = {
				startContent: "start",
			} as Partial<GoldenNugget> as GoldenNugget;
			expect(reconstructFullContent(nugget, "some content")).toBe("");
		});

		it("should handle undefined pageContent gracefully", () => {
			const nugget: GoldenNugget = {
				type: "aha! moments",
				startContent: "start",
				endContent: "end",
			};
			expect(
				reconstructFullContent(nugget, undefined as unknown as string),
			).toBe("start...end");
		});

		it("should handle null pageContent gracefully", () => {
			const nugget: GoldenNugget = {
				type: "aha! moments",
				startContent: "start",
				endContent: "end",
			};
			expect(reconstructFullContent(nugget, null as unknown as string)).toBe(
				"start...end",
			);
		});

		it("should handle empty pageContent gracefully", () => {
			const nugget: GoldenNugget = {
				type: "aha! moments",
				startContent: "start",
				endContent: "end",
			};
			expect(reconstructFullContent(nugget, "")).toBe("start...end");
		});

		it("should work with valid inputs", () => {
			const nugget: GoldenNugget = {
				type: "aha! moments",
				startContent: "This is",
				endContent: "a test",
			};
			const pageContent = "This is some content that contains a test example.";
			const result = reconstructFullContent(nugget, pageContent);
			expect(result).toContain("This is");
			expect(result).toContain("a test");
		});
	});

	describe("getDisplayContent", () => {
		it("should handle undefined nugget gracefully", () => {
			expect(getDisplayContent(undefined as unknown as GoldenNugget)).toBe("");
		});

		it("should handle null nugget gracefully", () => {
			expect(getDisplayContent(null as unknown as GoldenNugget)).toBe("");
		});

		it("should handle nugget with missing startContent", () => {
			const nugget = {
				type: "aha! moments",
				endContent: "end",
			} as Partial<GoldenNugget> as GoldenNugget;
			expect(getDisplayContent(nugget)).toBe("");
		});

		it("should handle nugget with missing endContent", () => {
			const nugget = {
				type: "aha! moments",
				startContent: "start",
			} as Partial<GoldenNugget> as GoldenNugget;
			expect(getDisplayContent(nugget)).toBe("");
		});

		it("should handle undefined pageContent gracefully", () => {
			const nugget: GoldenNugget = {
				type: "aha! moments",
				startContent: "start",
				endContent: "end",
			};
			expect(getDisplayContent(nugget, undefined)).toBe("start...end");
		});

		it("should handle non-string pageContent gracefully", () => {
			const nugget: GoldenNugget = {
				type: "aha! moments",
				startContent: "start",
				endContent: "end",
			};
			expect(getDisplayContent(nugget, 123 as unknown as string)).toBe(
				"start...end",
			);
			expect(getDisplayContent(nugget, {} as unknown as string)).toBe(
				"start...end",
			);
		});

		it("should work with valid inputs", () => {
			const nugget: GoldenNugget = {
				type: "aha! moments",
				startContent: "start",
				endContent: "end",
			};
			expect(getDisplayContent(nugget, "valid page content")).toBe(
				"start...end",
			);
		});
	});

	describe("improvedStartEndMatching", () => {
		it("should handle undefined inputs gracefully", () => {
			const result = improvedStartEndMatching(
				undefined as unknown as string,
				"end",
				"content",
			);
			expect(result.success).toBe(false);
			// Since undefined becomes empty string, empty string is found at index 0,
			// but then 'end' content is searched for after that
			expect(result.reason).toBe("End content not found after start");
		});

		it("should handle null inputs gracefully", () => {
			const result = improvedStartEndMatching(
				"start",
				null as unknown as string,
				"content",
			);
			expect(result.success).toBe(false);
			// null endContent becomes empty string after sanitization
			expect(result.reason).toBe("End content is empty after sanitization");
		});

		it("should handle empty string inputs", () => {
			const result = improvedStartEndMatching("", "end", "content");
			expect(result.success).toBe(false);
		});

		it("should handle undefined pageContent gracefully", () => {
			const result = improvedStartEndMatching(
				"start",
				"end",
				undefined as unknown as string,
			);
			expect(result.success).toBe(false);
			expect(result.reason).toBe("Start content not found");
		});

		it("should work with valid inputs", () => {
			const result = improvedStartEndMatching(
				"This",
				"test",
				"This is a test content",
			);
			expect(result.success).toBe(true);
			expect(result.matchedContent).toContain("this");
			expect(result.matchedContent).toContain("test");
		});
	});

	describe("improvedStartEndTextMatching", () => {
		it("should handle undefined nugget gracefully", () => {
			expect(
				improvedStartEndTextMatching(
					undefined as unknown as GoldenNugget,
					"search text",
				),
			).toBe(false);
		});

		it("should handle null nugget gracefully", () => {
			expect(
				improvedStartEndTextMatching(
					null as unknown as GoldenNugget,
					"search text",
				),
			).toBe(false);
		});

		it("should handle nugget with missing content", () => {
			const nugget = {
				type: "aha! moments",
			} as Partial<GoldenNugget> as GoldenNugget;
			expect(improvedStartEndTextMatching(nugget, "search text")).toBe(false);
		});

		it("should handle undefined searchText gracefully", () => {
			const nugget: GoldenNugget = {
				type: "aha! moments",
				startContent: "start",
				endContent: "end",
			};
			expect(
				improvedStartEndTextMatching(nugget, undefined as unknown as string),
			).toBe(false);
		});

		it("should handle null searchText gracefully", () => {
			const nugget: GoldenNugget = {
				type: "aha! moments",
				startContent: "start",
				endContent: "end",
			};
			expect(
				improvedStartEndTextMatching(nugget, null as unknown as string),
			).toBe(false);
		});

		it("should work with valid inputs", () => {
			const nugget: GoldenNugget = {
				type: "aha! moments",
				startContent: "This is",
				endContent: "a test",
			};
			const searchText = "This is some content that contains a test example.";
			expect(improvedStartEndTextMatching(nugget, searchText)).toBe(true);
		});
	});
});

describe("Content Reconstruction - LLM Hallucinated EndContent", () => {
	describe("sanitizeEndContent", () => {
		it("should remove trailing punctuation from endContent", () => {
			// Test with various punctuation marks that LLMs commonly hallucinate
			expect(sanitizeEndContent("test content.")).toBe("test content");
			expect(sanitizeEndContent("test content,")).toBe("test content");
			expect(sanitizeEndContent("test content!")).toBe("test content");
			expect(sanitizeEndContent("test content;")).toBe("test content");
			expect(sanitizeEndContent("test content:")).toBe("test content");
			expect(sanitizeEndContent("test content?")).toBe("test content");
		});

		it("should remove trailing spaces from endContent", () => {
			expect(sanitizeEndContent("test content ")).toBe("test content");
			expect(sanitizeEndContent("test content  ")).toBe("test content");
			expect(sanitizeEndContent("test content\t")).toBe("test content");
			expect(sanitizeEndContent("test content\n")).toBe("test content");
		});

		it("should remove combination of trailing punctuation and spaces", () => {
			expect(sanitizeEndContent("test content. ")).toBe("test content");
			expect(sanitizeEndContent("test content, ")).toBe("test content");
			expect(sanitizeEndContent("test content!  ")).toBe("test content");
			expect(sanitizeEndContent("test content;\t")).toBe("test content");
			expect(sanitizeEndContent("test content:\n")).toBe("test content");
		});

		it("should handle multiple trailing punctuation marks", () => {
			expect(sanitizeEndContent("test content...")).toBe("test content");
			expect(sanitizeEndContent("test content!!!")).toBe("test content");
			expect(sanitizeEndContent("test content???")).toBe("test content");
			expect(sanitizeEndContent("test content.,!")).toBe("test content");
		});

		it("should preserve punctuation in the middle of content", () => {
			expect(sanitizeEndContent("Mr. Smith's test.")).toBe("Mr. Smith's test");
			expect(sanitizeEndContent("test, example, content.")).toBe(
				"test, example, content",
			);
			expect(sanitizeEndContent("What is this? A test.")).toBe(
				"What is this? A test",
			);
		});

		it("should handle edge cases gracefully", () => {
			expect(sanitizeEndContent("")).toBe("");
			expect(sanitizeEndContent("   ")).toBe("");
			expect(sanitizeEndContent("...")).toBe("");
			expect(sanitizeEndContent(undefined as unknown as string)).toBe("");
			expect(sanitizeEndContent(null as unknown as string)).toBe("");
		});

		it("should handle content that is only punctuation", () => {
			expect(sanitizeEndContent(".")).toBe("");
			expect(sanitizeEndContent(",")).toBe("");
			expect(sanitizeEndContent("!")).toBe("");
			expect(sanitizeEndContent("...")).toBe("");
		});

		it("should fix filename spacing issues", () => {
			// Common document formats
			expect(sanitizeEndContent("Naur. pdf")).toBe("Naur.pdf");
			expect(sanitizeEndContent("document. docx")).toBe("document.docx");
			expect(sanitizeEndContent("spreadsheet. xlsx")).toBe("spreadsheet.xlsx");
			expect(sanitizeEndContent("presentation. pptx")).toBe(
				"presentation.pptx",
			);
			expect(sanitizeEndContent("notes. txt")).toBe("notes.txt");

			// Image formats
			expect(sanitizeEndContent("image. jpg")).toBe("image.jpg");
			expect(sanitizeEndContent("photo. png")).toBe("photo.png");
			expect(sanitizeEndContent("animation. gif")).toBe("animation.gif");

			// Video and other formats
			expect(sanitizeEndContent("video. mp4")).toBe("video.mp4");
			expect(sanitizeEndContent("archive. zip")).toBe("archive.zip");
			expect(sanitizeEndContent("data. json")).toBe("data.json");
		});

		it("should handle multiple spaces before file extension", () => {
			expect(sanitizeEndContent("document.  pdf")).toBe("document.pdf");
			expect(sanitizeEndContent("file.   docx")).toBe("file.docx");
			expect(sanitizeEndContent("test.\t\tpng")).toBe("test.png");
			expect(sanitizeEndContent("data.\n\njson")).toBe("data.json");
		});

		it("should handle complex filenames with spaces", () => {
			expect(sanitizeEndContent("Peter Naur Programming. pdf")).toBe(
				"Peter Naur Programming.pdf",
			);
			expect(sanitizeEndContent("My Important Document. docx")).toBe(
				"My Important Document.docx",
			);
			expect(sanitizeEndContent("2023 Annual Report. xlsx")).toBe(
				"2023 Annual Report.xlsx",
			);
		});

		it("should not affect non-filename content with periods", () => {
			// These should use existing punctuation removal logic
			expect(sanitizeEndContent("This is a sentence.")).toBe(
				"This is a sentence",
			);
			expect(sanitizeEndContent("Mr. Smith said hello.")).toBe(
				"Mr. Smith said hello",
			);
			expect(sanitizeEndContent("Test content with U.S.A.")).toBe(
				"Test content with U.S.A",
			);
		});

		it("should handle edge cases for filename patterns", () => {
			// Common single character extensions
			expect(sanitizeEndContent("file. c")).toBe("file.c");
			expect(sanitizeEndContent("script. r")).toBe("script.r");
			expect(sanitizeEndContent("header. h")).toBe("header.h");

			// Uncommon extensions (not in whitelist - remains unchanged)
			expect(sanitizeEndContent("file. xyz")).toBe("file. xyz");
			expect(sanitizeEndContent("test. uncommon")).toBe("test. uncommon");

			// Extensions with numbers
			expect(sanitizeEndContent("backup. bak2")).toBe("backup.bak2");
			expect(sanitizeEndContent("file. mp3")).toBe("file.mp3");

			// Programming language extensions
			expect(sanitizeEndContent("script. py")).toBe("script.py");
			expect(sanitizeEndContent("component. ts")).toBe("component.ts");
			expect(sanitizeEndContent("style. css")).toBe("style.css");
		});

		it("should preserve existing behavior for ambiguous cases", () => {
			// When it's unclear if it's a filename or sentence,
			// our pattern should only match clear filename cases
			// These cases don't have recognized file extensions, so they remain unchanged
			expect(sanitizeEndContent("End of sentence. The")).toBe(
				"End of sentence. The",
			);
			expect(sanitizeEndContent("Chapter 1. Introduction")).toBe(
				"Chapter 1. Introduction",
			);
			expect(sanitizeEndContent("Version 2. Final")).toBe("Version 2. Final");
		});

		// ===============================================================================
		// HACKERS NEWS PUNCTUATION MISMATCH FIX - COMPREHENSIVE TEST COVERAGE
		// ===============================================================================
		describe("HackerNews-style LLM punctuation hallucination fixes", () => {
			it("should handle the reported HackerNews case: 'observations.\"\"' vs 'observations?'", () => {
				// This is the exact case reported by the user
				const llmHallucinated = 'these observations.""'; // LLM extracted with period + extra quotes
				const actualPageText = "these observations?"; // Actual page text with question mark

				// Both should normalize to the same base content for matching
				const normalizedLlm = sanitizeEndContent(llmHallucinated);
				const normalizedPage = sanitizeEndContent(actualPageText);

				expect(normalizedLlm).toBe("these observations");
				expect(normalizedPage).toBe("these observations");
				expect(normalizedLlm).toBe(normalizedPage); // Critical: they must match!
			});

			it("should aggressively strip all trailing punctuation variations", () => {
				const baseText = "these observations";

				// Test various punctuation + quote combinations that LLMs hallucinate
				const variations = [
					"these observations.",
					"these observations?",
					"these observations!",
					'these observations."',
					'these observations?"',
					'these observations!"',
					'these observations.""',
					'these observations?""',
					'these observations!""',
					"these observations.'",
					"these observations?'",
					"these observations!'",
					"these observations.''",
					"these observations?''",
					"these observations!''",
					"these observations.;",
					"these observations?:",
					"these observations!,",
					"these observations.,!",
					"these observations?;:",
					"these observations!.,",
				];

				// All variations should normalize to the same base content
				variations.forEach((variation) => {
					expect(sanitizeEndContent(variation)).toBe(baseText);
				});
			});

			it("should handle mixed punctuation and whitespace combinations", () => {
				const baseText = "observations";

				// Test combinations with trailing whitespace
				const complexVariations = [
					"observations. ",
					"observations? ",
					"observations! ",
					'observations."" ',
					'observations?"" ',
					'observations!"" ',
					"observations.\t",
					"observations?\n",
					"observations!\r\n",
					'observations."" \t\n',
					'observations?"" \t\r\n',
					'observations  . "" \t\n',
				];

				complexVariations.forEach((variation) => {
					expect(sanitizeEndContent(variation)).toBe(baseText);
				});
			});

			it("should preserve content when punctuation is essential (abbreviations)", () => {
				// Test cases where we don't want to over-strip
				expect(sanitizeEndContent("Mr.")).toBe("Mr"); // Still strip trailing period
				expect(sanitizeEndContent("Dr.")).toBe("Dr"); // Still strip trailing period
				expect(sanitizeEndContent("U.S.A.")).toBe("U.S.A"); // Strip only final period
				expect(sanitizeEndContent("Ph.D.")).toBe("Ph.D"); // Strip only final period
			});

			it("should handle edge case scenarios for very short content", () => {
				// Test the edge case logic for very short content
				expect(sanitizeEndContent("a.")).toBe("a");
				expect(sanitizeEndContent("I?")).toBe("I");
				expect(sanitizeEndContent("OK!")).toBe("OK");
				expect(sanitizeEndContent('No."')).toBe("No");

				// Test cases where we might over-strip
				expect(sanitizeEndContent("?")).toBe(""); // Pure punctuation should be empty
				expect(sanitizeEndContent('.""')).toBe(""); // Pure punctuation + quotes should be empty
				expect(sanitizeEndContent('  . " ')).toBe(""); // Whitespace + punctuation should be empty
			});

			it("should maintain backwards compatibility with quote normalization", () => {
				// Verify the quote normalization step still works before aggressive stripping
				expect(sanitizeEndContent("test content\u201D")).toBe("test content"); // Smart double quote (Unicode)
				expect(sanitizeEndContent("test content\u2019")).toBe("test content"); // Smart single quote (Unicode)
				expect(sanitizeEndContent("test content&quot;")).toBe("test content"); // HTML entity
				expect(sanitizeEndContent("test content&#39;")).toBe("test content"); // HTML entity
				expect(sanitizeEndContent("test content&apos;")).toBe("test content"); // HTML entity
			});
		});
	});

	describe("reconstructFullContent with sanitized endContent", () => {
		it("should successfully match content when endContent has trailing punctuation", () => {
			const pageContent =
				"This is a sample text that contains some important information for testing.";
			const nuggetWithHallucinatedEnd: GoldenNugget = {
				type: "aha! moments",
				startContent: "This is a sample",
				endContent: "information for testing.", // Hallucinated period
			};

			const result = reconstructFullContent(
				nuggetWithHallucinatedEnd,
				pageContent,
			);
			expect(result).toContain("This is a sample");
			expect(result).toContain("information for testing");
			expect(result).not.toBe("This is a sample...information for testing.");
		});

		it("should successfully match content when endContent has trailing spaces", () => {
			const pageContent =
				"The quick brown fox jumps over the lazy dog every morning.";
			const nuggetWithHallucinatedEnd: GoldenNugget = {
				type: "tool",
				startContent: "The quick brown",
				endContent: "lazy dog ", // Hallucinated space
			};

			const result = reconstructFullContent(
				nuggetWithHallucinatedEnd,
				pageContent,
			);
			expect(result).toContain("The quick brown");
			expect(result).toContain("lazy dog");
			expect(result).not.toBe("The quick brown...lazy dog ");
		});

		it("should successfully match content when endContent has multiple trailing issues", () => {
			const pageContent =
				"Advanced machine learning algorithms can solve complex problems efficiently.";
			const nuggetWithHallucinatedEnd: GoldenNugget = {
				type: "model",
				startContent: "Advanced machine learning",
				endContent: "complex problems efficiently.  ", // Hallucinated period and spaces
			};

			const result = reconstructFullContent(
				nuggetWithHallucinatedEnd,
				pageContent,
			);
			expect(result).toContain("Advanced machine learning");
			expect(result).toContain("complex problems efficiently");
			expect(result).not.toBe(
				"Advanced machine learning...complex problems efficiently.  ",
			);
		});
	});

	describe("improvedStartEndMatching with sanitized endContent", () => {
		it("should successfully match when endContent has trailing punctuation", () => {
			const pageContent = "This is important content for testing purposes.";
			const startContent = "This is important";
			const endContentWithPunctuation = "testing purposes."; // Hallucinated period

			const result = improvedStartEndMatching(
				startContent,
				endContentWithPunctuation,
				pageContent,
			);
			expect(result.success).toBe(true);
			expect(result.matchedContent).toContain("this is important");
			expect(result.matchedContent).toContain("testing purposes");
		});

		it("should successfully match when endContent has trailing whitespace", () => {
			const pageContent =
				"Learning new technologies requires consistent practice and dedication.";
			const startContent = "Learning new technologies";
			const endContentWithSpace = "practice and dedication "; // Hallucinated space

			const result = improvedStartEndMatching(
				startContent,
				endContentWithSpace,
				pageContent,
			);
			expect(result.success).toBe(true);
			expect(result.matchedContent).toContain("learning new technologies");
			expect(result.matchedContent).toContain("practice and dedication");
		});

		// ===============================================================================
		// END-TO-END INTEGRATION TESTS FOR HACKERS NEWS PUNCTUATION FIX
		// ===============================================================================
		it("should successfully match HackerNews-style content with punctuation mismatches", () => {
			// Simulate the exact HackerNews scenario reported by the user
			const hackerNewsPageContent = `
				I'd say rather that "statistically significance" is a measure of surprise. 
				It's saying "If this default (the null hypothesis) is true, how surprised would I be to make these observations?"
			`.trim();

			// LLM extracted nugget with hallucinated punctuation
			const nuggetWithHallucinatedPunctuation: GoldenNugget = {
				type: "analogy",
				startContent: "I'd say rather that",
				endContent: 'these observations.""', // LLM hallucinated period + extra quotes
			};

			// This should successfully match despite the punctuation mismatch
			const result = reconstructFullContent(
				nuggetWithHallucinatedPunctuation,
				hackerNewsPageContent,
			);

			// Should find the match and reconstruct the full content
			expect(result).toContain("I'd say rather that");
			expect(result).toContain("these observations");
			expect(result).not.toBe('I\'d say rather that...these observations.""');

			// Should contain the full sentence about statistical significance
			expect(result).toContain("statistically significance");
			expect(result).toContain("measure of surprise");
		});

		it("should handle multiple punctuation variations in the same text", () => {
			const pageContent =
				"The quick brown fox jumps. But wait, there's more? Indeed!";

			const testCases = [
				{
					nugget: {
						type: "tool" as const,
						startContent: "The quick brown",
						endContent: "jumps.", // Period in LLM
					},
					expectedMatch: true,
				},
				{
					nugget: {
						type: "tool" as const,
						startContent: "The quick brown",
						endContent: "jumps?", // Question mark hallucination
					},
					expectedMatch: true,
				},
				{
					nugget: {
						type: "tool" as const,
						startContent: "The quick brown",
						endContent: 'jumps!""', // Exclamation + quotes hallucination
					},
					expectedMatch: true,
				},
			];

			testCases.forEach((testCase, _index) => {
				const result = reconstructFullContent(testCase.nugget, pageContent);
				if (testCase.expectedMatch) {
					expect(result).toContain("The quick brown");
					expect(result).toContain("jumps");
					expect(result).not.toContain("...");
				}
			});
		});

		it("should maintain matching accuracy with improvedStartEndMatching", () => {
			// Test the core matching function with punctuation variations
			const pageContent =
				"Learning machine learning requires practice and patience with algorithms.";

			const startContent = "Learning machine learning";
			const testEndContents = [
				"algorithms.", // Period
				"algorithms?", // Question mark
				"algorithms!", // Exclamation
				'algorithms."', // Period + quote
				'algorithms?""', // Question + double quotes
				"algorithms!''", // Exclamation + single quotes
				'algorithms .;:"', // Multiple punctuation + quote
			];

			// All variations should successfully match
			testEndContents.forEach((endContent) => {
				const result = improvedStartEndMatching(
					startContent,
					endContent,
					pageContent,
				);
				expect(result.success).toBe(true);
				expect(result.matchedContent).toContain("learning machine learning");
				expect(result.matchedContent).toContain("algorithms");
			});
		});

		it("should preserve original behavior for non-punctuation content", () => {
			// Ensure we didn't break existing functionality
			const pageContent =
				"Complex systems require careful analysis and systematic approaches.";

			const workingNugget: GoldenNugget = {
				type: "model",
				startContent: "Complex systems",
				endContent: "systematic approaches", // No trailing punctuation
			};

			const result = reconstructFullContent(workingNugget, pageContent);
			expect(result).toContain("Complex systems");
			expect(result).toContain("systematic approaches");
			expect(result).toContain("careful analysis");
		});
	});
});

describe("Content Reconstruction - OpenRouter Error Integration", () => {
	it("should handle API failure scenario gracefully", () => {
		// Simulate what happens when OpenRouter API fails and undefined data is passed
		const malformedNugget = {
			type: undefined,
			startContent: undefined,
			endContent: undefined,
		} as unknown as GoldenNugget;

		// These should not throw errors even with malformed data
		expect(() => getDisplayContent(malformedNugget)).not.toThrow();
		expect(() =>
			reconstructFullContent(malformedNugget, undefined as unknown as string),
		).not.toThrow();
		expect(() =>
			advancedNormalize(undefined as unknown as string),
		).not.toThrow();

		// Results should be safe fallback values
		expect(getDisplayContent(malformedNugget)).toBe("");
		expect(
			reconstructFullContent(malformedNugget, undefined as unknown as string),
		).toBe("");
		expect(advancedNormalize(undefined as unknown as string)).toBe("");
	});

	it("should handle partial API response gracefully", () => {
		// Simulate partial response from API
		const partialNugget = {
			type: "aha! moments",
			startContent: "valid start",
			endContent: undefined,
		} as Partial<GoldenNugget> as GoldenNugget;

		expect(() => getDisplayContent(partialNugget)).not.toThrow();
		expect(() =>
			reconstructFullContent(partialNugget, "some page content"),
		).not.toThrow();

		// Should fallback to safe values
		expect(getDisplayContent(partialNugget)).toBe("");
		expect(reconstructFullContent(partialNugget, "some page content")).toBe("");
	});

	it("should handle edge case where text processing fails", () => {
		const nugget: GoldenNugget = {
			type: "aha! moments",
			startContent: "start",
			endContent: "end",
		};

		// Test with various invalid pageContent values that could come from failed API calls
		const invalidPageContents = [undefined, null, "", 0, false, {}, []];

		invalidPageContents.forEach((invalidContent) => {
			expect(() =>
				getDisplayContent(nugget, invalidContent as unknown as string),
			).not.toThrow();
			expect(() =>
				reconstructFullContent(nugget, invalidContent as unknown as string),
			).not.toThrow();

			// Should always return safe fallback
			const result = getDisplayContent(
				nugget,
				invalidContent as unknown as string,
			);
			expect(result).toBe("start...end");
		});
	});
});
