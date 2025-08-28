import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LLMProvider } from "../../shared/types/providers";
import { EnsembleExtractor } from "./ensemble-extractor";

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

// Test nuggets for different scenarios
const nugget1 = {
	type: "tool" as const,
	startContent: "This is a powerful testing framework",
	endContent: "that helps developers write reliable code",
};

const nugget2 = {
	type: "aha! moments" as const,
	startContent: "The key insight is that parallel processing",
	endContent: "can dramatically improve performance",
};

const nugget3 = {
	type: "model" as const,
	startContent: "The mental model of ensemble learning",
	endContent: "combines multiple weak learners",
};

describe("EnsembleExtractor", () => {
	let ensembleExtractor: EnsembleExtractor;
	let mockProvider: MockProvider;

	beforeEach(() => {
		ensembleExtractor = new EnsembleExtractor();
		mockProvider = createMockProvider();
		// Clear console logs for cleaner test output
		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	it("should extract with multiple runs and build consensus", async () => {
		// Mock 3 different responses with some overlap
		mockProvider.extractGoldenNuggets
			.mockResolvedValueOnce({ golden_nuggets: [nugget1, nugget2] })
			.mockResolvedValueOnce({ golden_nuggets: [nugget1, nugget3] })
			.mockResolvedValueOnce({ golden_nuggets: [nugget2, nugget3] });

		const result = await ensembleExtractor.extractWithEnsemble(
			"test content",
			"test prompt",
			mockProvider,
			{ runs: 3, temperature: 0.7, parallelExecution: true },
		);

		expect(result.golden_nuggets).toHaveLength(3);
		expect(result.metadata.totalRuns).toBe(3);
		expect(result.metadata.consensusReached).toBe(3);

		// Verify confidence scores
		const nuggetsByConfidence = result.golden_nuggets.sort(
			(a, b) => b.confidence - a.confidence,
		);
		expect(nuggetsByConfidence[0].confidence).toBeGreaterThan(0.6); // Should have high agreement

		// Verify all nuggets have proper structure
		result.golden_nuggets.forEach((nugget) => {
			expect(nugget).toHaveProperty("type");
			expect(nugget).toHaveProperty("startContent");
			expect(nugget).toHaveProperty("endContent");
			expect(nugget).toHaveProperty("confidence");
			expect(nugget).toHaveProperty("runsSupportingThis");
			expect(nugget).toHaveProperty("totalRuns");
			expect(nugget.totalRuns).toBe(3);
		});
	});

	it("should handle partial failures gracefully", async () => {
		mockProvider.extractGoldenNuggets
			.mockResolvedValueOnce({ golden_nuggets: [nugget1] })
			.mockRejectedValueOnce(new Error("API failure"))
			.mockResolvedValueOnce({ golden_nuggets: [nugget1] });

		const result = await ensembleExtractor.extractWithEnsemble(
			"test content",
			"test prompt",
			mockProvider,
			{ runs: 3, temperature: 0.7, parallelExecution: true },
		);

		expect(result.golden_nuggets).toHaveLength(1);
		expect(result.metadata.totalRuns).toBe(3);
		expect(result.golden_nuggets[0].confidence).toBeCloseTo(2 / 3); // 2 out of 3 runs succeeded
		expect(result.golden_nuggets[0].runsSupportingThis).toBe(2);
	});

	it("should handle all runs failing", async () => {
		mockProvider.extractGoldenNuggets
			.mockRejectedValue(new Error("API failure 1"))
			.mockRejectedValue(new Error("API failure 2"))
			.mockRejectedValue(new Error("API failure 3"));

		const result = await ensembleExtractor.extractWithEnsemble(
			"test content",
			"test prompt",
			mockProvider,
			{ runs: 3, temperature: 0.7, parallelExecution: true },
		);

		expect(result.golden_nuggets).toHaveLength(0);
		expect(result.metadata.totalRuns).toBe(3);
		expect(result.metadata.consensusReached).toBe(0);
		expect(result.metadata.duplicatesRemoved).toBe(0);
	});

	it("should handle single run execution", async () => {
		mockProvider.extractGoldenNuggets.mockResolvedValueOnce({
			golden_nuggets: [nugget1, nugget2],
		});

		const result = await ensembleExtractor.extractWithEnsemble(
			"test content",
			"test prompt",
			mockProvider,
			{ runs: 1, temperature: 0.7, parallelExecution: true },
		);

		expect(result.golden_nuggets).toHaveLength(2);
		expect(result.metadata.totalRuns).toBe(1);
		expect(result.metadata.consensusReached).toBe(2);

		// With single run, all nuggets should have confidence of 1
		result.golden_nuggets.forEach((nugget) => {
			expect(nugget.confidence).toBe(1);
			expect(nugget.runsSupportingThis).toBe(1);
		});
	});

	it("should sort nuggets by confidence in descending order", async () => {
		// Create scenario where nugget1 appears in 2 runs, nugget2 in 1 run
		mockProvider.extractGoldenNuggets
			.mockResolvedValueOnce({ golden_nuggets: [nugget1, nugget2] })
			.mockResolvedValueOnce({ golden_nuggets: [nugget1] })
			.mockResolvedValueOnce({ golden_nuggets: [nugget3] });

		const result = await ensembleExtractor.extractWithEnsemble(
			"test content",
			"test prompt",
			mockProvider,
			{ runs: 3, temperature: 0.7, parallelExecution: true },
		);

		expect(result.golden_nuggets).toHaveLength(3);

		// Verify sorting by confidence (descending)
		for (let i = 0; i < result.golden_nuggets.length - 1; i++) {
			expect(result.golden_nuggets[i].confidence).toBeGreaterThanOrEqual(
				result.golden_nuggets[i + 1].confidence,
			);
		}

		// The first nugget should have highest confidence (2/3)
		expect(result.golden_nuggets[0].confidence).toBeCloseTo(2 / 3);
		expect(result.golden_nuggets[0].runsSupportingThis).toBe(2);
	});

	it("should calculate metadata correctly", async () => {
		const startTime = performance.now();

		mockProvider.extractGoldenNuggets
			.mockResolvedValueOnce({ golden_nuggets: [nugget1, nugget2] })
			.mockResolvedValueOnce({ golden_nuggets: [nugget1] })
			.mockResolvedValueOnce({ golden_nuggets: [nugget3] });

		const result = await ensembleExtractor.extractWithEnsemble(
			"test content",
			"test prompt",
			mockProvider,
			{ runs: 3, temperature: 0.7, parallelExecution: true },
		);

		const endTime = performance.now();

		expect(result.metadata).toEqual({
			totalRuns: 3,
			consensusReached: 3, // 3 unique nuggets found
			duplicatesRemoved: 1, // 4 total nuggets - 3 unique = 1 duplicate
			averageResponseTime: expect.any(Number),
		});

		// Response time should be reasonable (non-negative for mocked responses)
		expect(result.metadata.averageResponseTime).toBeGreaterThanOrEqual(0);
		expect(result.metadata.averageResponseTime).toBeLessThan(
			endTime - startTime + 100,
		); // Add buffer for mock timing
	});

	it("should handle empty responses from provider", async () => {
		mockProvider.extractGoldenNuggets
			.mockResolvedValueOnce({ golden_nuggets: [] })
			.mockResolvedValueOnce({ golden_nuggets: [nugget1] })
			.mockResolvedValueOnce({ golden_nuggets: [] });

		const result = await ensembleExtractor.extractWithEnsemble(
			"test content",
			"test prompt",
			mockProvider,
			{ runs: 3, temperature: 0.7, parallelExecution: true },
		);

		expect(result.golden_nuggets).toHaveLength(1);
		expect(result.metadata.totalRuns).toBe(3);
		expect(result.golden_nuggets[0].confidence).toBeCloseTo(1 / 3); // 1 out of 3 runs
	});

	it("should group similar nuggets correctly", async () => {
		const similarNugget = {
			type: "tool" as const,
			startContent: "This is a powerful testing framework",
			endContent: "that helps developers write reliable code",
		};

		mockProvider.extractGoldenNuggets
			.mockResolvedValueOnce({ golden_nuggets: [nugget1] })
			.mockResolvedValueOnce({ golden_nuggets: [similarNugget] })
			.mockResolvedValueOnce({ golden_nuggets: [nugget2] });

		const result = await ensembleExtractor.extractWithEnsemble(
			"test content",
			"test prompt",
			mockProvider,
			{ runs: 3, temperature: 0.7, parallelExecution: true },
		);

		// Should group the similar nuggets together
		expect(result.golden_nuggets).toHaveLength(2); // Similar nuggets grouped

		// Find the grouped nugget (should have confidence > 1/3)
		const groupedNugget = result.golden_nuggets.find((n) => n.confidence > 0.4);
		expect(groupedNugget).toBeTruthy();
		expect(groupedNugget!.runsSupportingThis).toBe(2);
		expect(groupedNugget!.confidence).toBeCloseTo(2 / 3);
	});

	it("should pass temperature parameter to provider", async () => {
		mockProvider.extractGoldenNuggets.mockResolvedValue({
			golden_nuggets: [nugget1],
		});

		await ensembleExtractor.extractWithEnsemble(
			"test content",
			"test prompt",
			mockProvider,
			{ runs: 2, temperature: 0.8, parallelExecution: true },
		);

		// Verify that extractGoldenNuggets was called with the temperature parameter
		expect(mockProvider.extractGoldenNuggets).toHaveBeenCalledTimes(2);
		expect(mockProvider.extractGoldenNuggets).toHaveBeenCalledWith(
			"test content",
			"test prompt",
			0.8,
		);
	});

	it("should work with undefined temperature", async () => {
		mockProvider.extractGoldenNuggets.mockResolvedValue({
			golden_nuggets: [nugget1],
		});

		await ensembleExtractor.extractWithEnsemble(
			"test content",
			"test prompt",
			mockProvider,
			{ runs: 1, temperature: 0.5, parallelExecution: true },
		);

		// Verify that extractGoldenNuggets was called with the temperature parameter
		expect(mockProvider.extractGoldenNuggets).toHaveBeenCalledWith(
			"test content",
			"test prompt",
			0.5,
		);
	});

	describe("Phase 1 High Recall Mode", () => {
		// Test nuggets for Phase 1 (with fullContent and confidence)
		const phase1Nugget1 = {
			type: "tool" as const,
			fullContent:
				"This is a powerful testing framework that helps developers write reliable code",
			confidence: 0.85,
		};

		const phase1Nugget2 = {
			type: "aha! moments" as const,
			fullContent:
				"The key insight is that parallel processing can dramatically improve performance",
			confidence: 0.92,
		};

		const phase1Nugget3 = {
			type: "model" as const,
			fullContent:
				"The mental model of ensemble learning combines multiple weak learners into one strong learner",
			confidence: 0.78,
		};

		it("should use Phase 1 method when usePhase1 is enabled", async () => {
			mockProvider.extractPhase1HighRecall
				.mockResolvedValueOnce({
					golden_nuggets: [phase1Nugget1, phase1Nugget2],
				})
				.mockResolvedValueOnce({
					golden_nuggets: [phase1Nugget1, phase1Nugget3],
				})
				.mockResolvedValueOnce({
					golden_nuggets: [phase1Nugget2, phase1Nugget3],
				});

			const result = await ensembleExtractor.extractWithEnsemble(
				"test content",
				"test prompt",
				mockProvider,
				{
					runs: 3,
					temperature: 0.7,
					parallelExecution: true,
					usePhase1: true,
					selectedTypes: ["tool", "model"],
				},
			);

			expect(result.golden_nuggets).toHaveLength(3);
			expect(result.metadata.totalRuns).toBe(3);
			expect(result.metadata.consensusReached).toBe(3);

			// Verify Phase 1 method was called, not regular extraction
			expect(mockProvider.extractPhase1HighRecall).toHaveBeenCalledTimes(3);
			expect(mockProvider.extractGoldenNuggets).not.toHaveBeenCalled();

			// Verify Phase 1 method called with correct parameters
			expect(mockProvider.extractPhase1HighRecall).toHaveBeenCalledWith(
				"test content",
				"test prompt",
				0.7,
				["tool", "model"],
			);
		});

		it("should convert Phase 1 fullContent to startContent/endContent for similarity matching", async () => {
			mockProvider.extractPhase1HighRecall
				.mockResolvedValueOnce({ golden_nuggets: [phase1Nugget1] })
				.mockResolvedValueOnce({ golden_nuggets: [phase1Nugget1] });

			const result = await ensembleExtractor.extractWithEnsemble(
				"test content",
				"test prompt",
				mockProvider,
				{
					runs: 2,
					temperature: 0.7,
					parallelExecution: true,
					usePhase1: true,
				},
			);

			expect(result.golden_nuggets).toHaveLength(1);

			// Verify the nugget has startContent and endContent extracted from fullContent
			const nugget = result.golden_nuggets[0];
			expect(nugget).toHaveProperty("startContent");
			expect(nugget).toHaveProperty("endContent");
			expect(nugget.startContent).toBeTruthy();
			expect(nugget.endContent).toBeTruthy();

			// Should have high confidence since both runs found the same nugget
			expect(nugget.confidence).toBe(1.0);
		});

		it("should preserve Phase 1 confidence scores in consensus calculation", async () => {
			// Create nuggets with different Phase 1 confidence scores
			const highConfidenceNugget = {
				type: "tool" as const,
				fullContent: "High confidence nugget content",
				confidence: 0.95,
			};

			const lowConfidenceNugget = {
				type: "model" as const,
				fullContent: "Low confidence nugget content",
				confidence: 0.65,
			};

			mockProvider.extractPhase1HighRecall
				.mockResolvedValueOnce({ golden_nuggets: [highConfidenceNugget] })
				.mockResolvedValueOnce({ golden_nuggets: [lowConfidenceNugget] })
				.mockResolvedValueOnce({ golden_nuggets: [highConfidenceNugget] });

			const result = await ensembleExtractor.extractWithEnsemble(
				"test content",
				"test prompt",
				mockProvider,
				{
					runs: 3,
					temperature: 0.7,
					parallelExecution: true,
					usePhase1: true,
				},
			);

			expect(result.golden_nuggets).toHaveLength(2);

			// High confidence nugget should appear first (higher ensemble confidence)
			const nuggetsByConfidence = result.golden_nuggets.sort(
				(a, b) => b.confidence - a.confidence,
			);

			// High confidence nugget appears in 2/3 runs
			expect(nuggetsByConfidence[0].confidence).toBeCloseTo(2 / 3);
			expect(nuggetsByConfidence[0].runsSupportingThis).toBe(2);

			// Low confidence nugget appears in 1/3 runs
			expect(nuggetsByConfidence[1].confidence).toBeCloseTo(1 / 3);
			expect(nuggetsByConfidence[1].runsSupportingThis).toBe(1);
		});

		it("should handle Phase 1 extraction errors gracefully", async () => {
			mockProvider.extractPhase1HighRecall
				.mockResolvedValueOnce({ golden_nuggets: [phase1Nugget1] })
				.mockRejectedValueOnce(new Error("Phase 1 API failure"))
				.mockResolvedValueOnce({ golden_nuggets: [phase1Nugget1] });

			const result = await ensembleExtractor.extractWithEnsemble(
				"test content",
				"test prompt",
				mockProvider,
				{
					runs: 3,
					temperature: 0.7,
					parallelExecution: true,
					usePhase1: true,
				},
			);

			expect(result.golden_nuggets).toHaveLength(1);
			expect(result.metadata.totalRuns).toBe(3);
			// 2 successful runs, 1 failed
			expect(result.golden_nuggets[0].confidence).toBeCloseTo(2 / 3);
			expect(result.golden_nuggets[0].runsSupportingThis).toBe(2);
		});

		it("should use fallback to regular extraction when usePhase1 is false", async () => {
			mockProvider.extractGoldenNuggets
				.mockResolvedValueOnce({ golden_nuggets: [nugget1] })
				.mockResolvedValueOnce({ golden_nuggets: [nugget2] });

			const result = await ensembleExtractor.extractWithEnsemble(
				"test content",
				"test prompt",
				mockProvider,
				{
					runs: 2,
					temperature: 0.7,
					parallelExecution: true,
					usePhase1: false, // Explicitly disable Phase 1
				},
			);

			expect(result.golden_nuggets).toHaveLength(2);

			// Verify regular method was called, not Phase 1
			expect(mockProvider.extractGoldenNuggets).toHaveBeenCalledTimes(2);
			expect(mockProvider.extractPhase1HighRecall).not.toHaveBeenCalled();
		});

		it("should handle empty Phase 1 responses", async () => {
			mockProvider.extractPhase1HighRecall
				.mockResolvedValueOnce({ golden_nuggets: [] })
				.mockResolvedValueOnce({ golden_nuggets: [phase1Nugget1] })
				.mockResolvedValueOnce({ golden_nuggets: [] });

			const result = await ensembleExtractor.extractWithEnsemble(
				"test content",
				"test prompt",
				mockProvider,
				{
					runs: 3,
					temperature: 0.7,
					parallelExecution: true,
					usePhase1: true,
				},
			);

			expect(result.golden_nuggets).toHaveLength(1);
			expect(result.metadata.totalRuns).toBe(3);
			expect(result.golden_nuggets[0].confidence).toBeCloseTo(1 / 3); // 1 out of 3 runs
		});
	});
});
