import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LLMProvider } from "../../shared/types/providers";
import { TwoPhaseExtractor } from "./two-phase-extractor";

interface MockProvider extends LLMProvider {
	extractGoldenNuggets: ReturnType<typeof vi.fn>;
	extractPhase1HighRecall: ReturnType<typeof vi.fn>;
	extractPhase2HighPrecision: ReturnType<typeof vi.fn>;
}

function createMockProvider(): MockProvider {
	return {
		providerId: "gemini",
		modelName: "test-model",
		extractGoldenNuggets: vi.fn(),
		extractPhase1HighRecall: vi.fn(),
		extractPhase2HighPrecision: vi.fn(),
		validateApiKey: vi.fn().mockResolvedValue(true),
	};
}

describe("TwoPhaseExtractor", () => {
	let extractor: TwoPhaseExtractor;
	let mockProvider: MockProvider;

	beforeEach(() => {
		extractor = new TwoPhaseExtractor();
		mockProvider = createMockProvider();
		vi.clearAllMocks();
	});

	describe("Critical abort logic fix", () => {
		it("should continue with high-confidence nuggets when >60% are low confidence", async () => {
			// Arrange: Phase 1 returns 5 nuggets, but only 2 have high confidence (40%)
			// This was causing the old code to abort entirely, losing the 2 good nuggets
			const phase1Response = {
				golden_nuggets: [
					{
						type: "tool" as const,
						fullContent: "High confidence nugget 1",
						confidence: 0.9, // HIGH CONFIDENCE - should be kept
					},
					{
						type: "media" as const,
						fullContent: "Low confidence nugget 1",
						confidence: 0.6, // LOW CONFIDENCE - will be filtered
					},
					{
						type: "aha! moments" as const,
						fullContent: "Low confidence nugget 2",
						confidence: 0.7, // LOW CONFIDENCE - will be filtered
					},
					{
						type: "analogy" as const,
						fullContent: "Low confidence nugget 3",
						confidence: 0.55, // LOW CONFIDENCE - will be filtered
					},
					{
						type: "model" as const,
						fullContent: "High confidence nugget 2",
						confidence: 0.92, // HIGH CONFIDENCE - should be kept
					},
				],
			};

			// Mock Phase 2 to return the high-confidence nuggets with boundaries
			const phase2MockResult = {
				fuzzyMatched: [
					{
						type: "tool" as const,
						startContent: "High confidence",
						endContent: "nugget 1",
						confidence: 0.9,
						matchMethod: "fuzzy" as const,
					},
				],
				llmMatched: [
					{
						type: "model" as const,
						startContent: "High confidence",
						endContent: "nugget 2",
						confidence: 0.92,
						matchMethod: "llm" as const,
					},
				],
			};

			mockProvider.extractPhase1HighRecall.mockResolvedValue(phase1Response);

			// Mock executePhase2 by spying on the extractor's method
			const executePhase2Spy = vi
				.spyOn(extractor, "executePhase2" as any)
				.mockResolvedValue(phase2MockResult);

			// Act: Execute two-phase extraction
			const result = await extractor.extractWithTwoPhase(
				"Test content",
				"Test prompt",
				mockProvider,
				{
					confidenceThreshold: 0.85, // Only 2/5 nuggets meet this threshold
					phase1Temperature: 0.7,
					phase2Temperature: 0.0,
				},
			);

			// Assert: Should get the 2 high-confidence nuggets, NOT abort entirely
			expect(result.golden_nuggets).toHaveLength(2);
			expect(result.golden_nuggets[0].confidence).toBe(0.9);
			expect(result.golden_nuggets[1].confidence).toBe(0.92);
			expect(result.golden_nuggets[0].extractionMethod).toBe("fuzzy");
			expect(result.golden_nuggets[1].extractionMethod).toBe("llm");

			// Verify that Phase 2 was called with the filtered high-confidence nuggets
			expect(executePhase2Spy).toHaveBeenCalledWith(
				"Test content",
				expect.arrayContaining([
					expect.objectContaining({ confidence: 0.9 }),
					expect.objectContaining({ confidence: 0.92 }),
				]),
				mockProvider,
				expect.any(Object),
			);

			// Verify metadata shows it was not aborted
			expect(result.metadata.abortedDueToLowConfidence).toBe(false);
			expect(result.metadata.phase1Count).toBe(5);
			expect(result.metadata.phase1FilteredCount).toBe(2);
		});

		it("should return empty results only when NO nuggets meet confidence threshold", async () => {
			// Arrange: All nuggets have low confidence
			const phase1Response = {
				golden_nuggets: [
					{
						type: "tool" as const,
						fullContent: "Low confidence nugget 1",
						confidence: 0.6, // Below threshold
					},
					{
						type: "media" as const,
						fullContent: "Low confidence nugget 2",
						confidence: 0.7, // Below threshold
					},
				],
			};

			mockProvider.extractPhase1HighRecall.mockResolvedValue(phase1Response);

			// Act
			const result = await extractor.extractWithTwoPhase(
				"Test content",
				"Test prompt",
				mockProvider,
				{
					confidenceThreshold: 0.85, // No nuggets meet this threshold
				},
			);

			// Assert: Should return empty results when NO nuggets pass
			expect(result.golden_nuggets).toHaveLength(0);
			expect(result.metadata.noNuggetsPassed).toBe(true);
			expect(result.metadata.abortedDueToLowConfidence).toBe(false);
		});

		it("should preserve all metadata in the enhanced response format", async () => {
			// Arrange
			const phase1Response = {
				golden_nuggets: [
					{
						type: "tool" as const,
						fullContent: "Test nugget",
						confidence: 0.9,
					},
				],
			};

			const phase2MockResult = {
				fuzzyMatched: [
					{
						type: "tool" as const,
						startContent: "Test",
						endContent: "nugget",
						confidence: 0.9,
						matchMethod: "fuzzy" as const,
					},
				],
				llmMatched: [],
			};

			mockProvider.extractPhase1HighRecall.mockResolvedValue(phase1Response);
			vi.spyOn(extractor, "executePhase2" as any).mockResolvedValue(
				phase2MockResult,
			);

			// Act
			const result = await extractor.extractWithTwoPhase(
				"Test content",
				"Test prompt",
				mockProvider,
			);

			// Assert: Enhanced response format with metadata
			expect(result).toHaveProperty("golden_nuggets");
			expect(result).toHaveProperty("metadata");

			// Nugget metadata
			expect(result.golden_nuggets[0]).toHaveProperty("confidence", 0.9);
			expect(result.golden_nuggets[0]).toHaveProperty(
				"extractionMethod",
				"fuzzy",
			);

			// Extraction metadata
			expect(result.metadata).toHaveProperty("phase1Count", 1);
			expect(result.metadata).toHaveProperty("phase1FilteredCount", 1);
			expect(result.metadata).toHaveProperty("phase2FuzzyCount", 1);
			expect(result.metadata).toHaveProperty("phase2LlmCount", 0);
			expect(result.metadata).toHaveProperty("totalProcessingTime");
			expect(result.metadata).toHaveProperty("confidenceThreshold");
		});
	});
});
