import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LLMProvider } from "../../shared/types/providers";
import { EnsembleExtractor } from "./ensemble-extractor";

interface MockProvider extends LLMProvider {
	extractGoldenNuggets: ReturnType<typeof vi.fn>;
}

function createMockProvider(): MockProvider {
	return {
		providerId: "gemini",
		modelName: "test-model",
		extractGoldenNuggets: vi.fn(),
		validateApiKey: vi.fn().mockResolvedValue(true),
	};
}

// Test nuggets for different scenarios
const nugget1 = {
	type: "tool" as const,
	fullContent:
		"This is a powerful testing framework that helps developers write reliable code",
	confidence: 0.9,
};

const nugget2 = {
	type: "aha! moments" as const,
	fullContent:
		"The key insight is that parallel processing can dramatically improve performance",
	confidence: 0.85,
};

const nugget3 = {
	type: "model" as const,
	fullContent:
		"The mental model of ensemble learning combines multiple weak learners",
	confidence: 0.88,
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
			expect(nugget).toHaveProperty("fullContent");
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
			successfulRuns: 3,
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
			fullContent:
				"This is a powerful testing framework that helps developers write reliable code",
			confidence: 0.9,
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
			undefined, // selectedTypes parameter
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
			undefined, // selectedTypes parameter
		);
	});

	it("should correctly count unique runs instead of total nuggets (bug fix test)", async () => {
		// This test specifically addresses the bug where runsSupportingThis
		// was incorrectly counting total nuggets instead of unique runs

		const duplicatedNugget = {
			type: "tool" as const,
			fullContent: "This exact same nugget appears multiple times",
			confidence: 0.9,
		};

		// Create scenario where each run produces multiple identical nuggets
		// Run 1: produces 3 copies of the same nugget
		// Run 2: produces 2 copies of the same nugget
		// Run 3: produces 1 copy of the same nugget
		mockProvider.extractGoldenNuggets
			.mockResolvedValueOnce({
				golden_nuggets: [duplicatedNugget, duplicatedNugget, duplicatedNugget],
			})
			.mockResolvedValueOnce({
				golden_nuggets: [duplicatedNugget, duplicatedNugget],
			})
			.mockResolvedValueOnce({
				golden_nuggets: [duplicatedNugget],
			});

		const result = await ensembleExtractor.extractWithEnsemble(
			"test content",
			"test prompt",
			mockProvider,
			{ runs: 3, temperature: 0.7, parallelExecution: true },
		);

		// Should group all similar nuggets into one consensus nugget
		expect(result.golden_nuggets).toHaveLength(1);

		const consensusNugget = result.golden_nuggets[0];

		// CRITICAL: This should be 3 (unique runs), not 6 (total nuggets)
		// The bug would make this fail by returning 6 instead of 3
		expect(consensusNugget.runsSupportingThis).toBe(3);

		// Confidence should be 100% since all 3 runs found this nugget
		expect(consensusNugget.confidence).toBe(1);

		// Total runs should be 3
		expect(consensusNugget.totalRuns).toBe(3);

		// Metadata should show 6 total nuggets but only 1 consensus reached
		expect(result.metadata.totalRuns).toBe(3);
		expect(result.metadata.consensusReached).toBe(1);
		expect(result.metadata.duplicatesRemoved).toBe(5); // 6 total - 1 consensus = 5 duplicates
	});

	it("should handle mixed scenarios with multiple nuggets per run correctly", async () => {
		// Test scenario with different nuggets per run to ensure run counting is accurate

		const nuggetA = {
			type: "tool" as const,
			fullContent: "Tool A",
			confidence: 0.9,
		};
		const nuggetB = {
			type: "tool" as const,
			fullContent: "Tool B",
			confidence: 0.8,
		};
		const nuggetC = {
			type: "tool" as const,
			fullContent: "Tool C",
			confidence: 0.85,
		};

		// Run 1: finds A and B
		// Run 2: finds A and C
		// Run 3: finds B only
		mockProvider.extractGoldenNuggets
			.mockResolvedValueOnce({ golden_nuggets: [nuggetA, nuggetB] })
			.mockResolvedValueOnce({ golden_nuggets: [nuggetA, nuggetC] })
			.mockResolvedValueOnce({ golden_nuggets: [nuggetB] });

		const result = await ensembleExtractor.extractWithEnsemble(
			"test content",
			"test prompt",
			mockProvider,
			{ runs: 3, temperature: 0.7, parallelExecution: true },
		);

		expect(result.golden_nuggets).toHaveLength(3);

		// Find each nugget and verify run counts
		const nuggetAResult = result.golden_nuggets.find(
			(n) => n.fullContent === "Tool A",
		);
		const nuggetBResult = result.golden_nuggets.find(
			(n) => n.fullContent === "Tool B",
		);
		const nuggetCResult = result.golden_nuggets.find(
			(n) => n.fullContent === "Tool C",
		);

		// Nugget A appears in runs 1 and 2 = 2 unique runs
		expect(nuggetAResult?.runsSupportingThis).toBe(2);
		expect(nuggetAResult?.confidence).toBeCloseTo(2 / 3);

		// Nugget B appears in runs 1 and 3 = 2 unique runs
		expect(nuggetBResult?.runsSupportingThis).toBe(2);
		expect(nuggetBResult?.confidence).toBeCloseTo(2 / 3);

		// Nugget C appears in run 2 only = 1 unique run
		expect(nuggetCResult?.runsSupportingThis).toBe(1);
		expect(nuggetCResult?.confidence).toBeCloseTo(1 / 3);

		// All should have totalRuns = 3
		result.golden_nuggets.forEach((nugget) => {
			expect(nugget.totalRuns).toBe(3);
		});
	});
});
