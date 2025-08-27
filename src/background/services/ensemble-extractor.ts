import type {
	EnsembleExtractionResult,
	GoldenNuggetsResponse,
	LLMProvider,
} from "../../shared/types/providers";
import { normalize } from "./response-normalizer";

interface EnsembleExtractionOptions {
	runs: number;
	temperature: number;
	parallelExecution: boolean;
}

export class EnsembleExtractor {
	async extractWithEnsemble(
		content: string,
		prompt: string,
		provider: LLMProvider,
		options: EnsembleExtractionOptions = {
			runs: 3,
			temperature: 0.7,
			parallelExecution: true,
		},
	): Promise<EnsembleExtractionResult> {
		console.log(
			`Starting ensemble extraction with ${options.runs} runs for provider ${provider.providerId}`,
		);

		const startTime = performance.now();

		// Execute multiple runs in parallel
		const extractionPromises = Array(options.runs)
			.fill(null)
			.map((_, runIndex) =>
				this.executeRunWithErrorHandling(content, prompt, provider, runIndex),
			);

		const extractions = await Promise.allSettled(extractionPromises);
		const successfulExtractions = extractions
			.filter(
				(result): result is PromiseFulfilledResult<GoldenNuggetsResponse> =>
					result.status === "fulfilled",
			)
			.map((result) => result.value);

		const responseTime = performance.now() - startTime;

		console.log(
			`Completed ${successfulExtractions.length}/${options.runs} successful extractions in ${responseTime}ms`,
		);

		// Build consensus from successful extractions
		return this.buildConsensus(successfulExtractions, {
			totalRuns: options.runs,
			successfulRuns: successfulExtractions.length,
			averageResponseTime: responseTime / options.runs,
		});
	}

	private async executeRunWithErrorHandling(
		content: string,
		prompt: string,
		provider: LLMProvider,
		runIndex: number,
	): Promise<GoldenNuggetsResponse> {
		try {
			console.log(`Executing run ${runIndex + 1} for ${provider.providerId}`);

			const rawResponse = await provider.extractGoldenNuggets(content, prompt);
			return normalize(rawResponse, provider.providerId);
		} catch (error) {
			console.error(
				`Run ${runIndex + 1} failed for ${provider.providerId}:`,
				error,
			);
			// Return empty response rather than failing entire ensemble
			return { golden_nuggets: [] };
		}
	}

	private async buildConsensus(
		extractions: GoldenNuggetsResponse[],
		metadata: {
			totalRuns: number;
			successfulRuns: number;
			averageResponseTime: number;
		},
	): Promise<EnsembleExtractionResult> {
		if (extractions.length === 0) {
			return {
				golden_nuggets: [],
				metadata: {
					totalRuns: metadata.totalRuns,
					consensusReached: 0,
					duplicatesRemoved: 0,
					averageResponseTime: metadata.averageResponseTime,
				},
			};
		}

		// Step 1: Flatten all nuggets from all runs
		const allNuggets = extractions.flatMap((extraction) =>
			extraction.golden_nuggets.map((nugget) => ({
				...nugget,
				runId: Math.random().toString(36).substr(2, 9), // Track source
			})),
		);

		// Step 2: Group by semantic similarity (simplified for Phase 1)
		const nuggetGroups = this.groupBySimilarity(allNuggets);

		// Step 3: Apply majority voting and confidence scoring
		const consensusNuggets = nuggetGroups.map((group) => ({
			type: group[0].type,
			startContent: group[0].startContent,
			endContent: group[0].endContent,
			confidence: group.length / metadata.successfulRuns,
			runsSupportingThis: group.length,
			totalRuns: metadata.totalRuns,
		}));

		// Step 4: Sort by confidence (highest first)
		const sortedNuggets = consensusNuggets.sort(
			(a, b) => b.confidence - a.confidence,
		);

		return {
			golden_nuggets: sortedNuggets,
			metadata: {
				totalRuns: metadata.totalRuns,
				consensusReached: sortedNuggets.length,
				duplicatesRemoved: allNuggets.length - sortedNuggets.length,
				averageResponseTime: metadata.averageResponseTime,
			},
		};
	}

	private groupBySimilarity(nuggets: any[]): any[][] {
		// Simplified similarity grouping for Phase 1
		// Groups nuggets by exact type and similar startContent
		const groups: any[][] = [];

		for (const nugget of nuggets) {
			const existingGroup = groups.find(
				(group) =>
					group[0].type === nugget.type &&
					this.calculateSimpleSimilarity(
						group[0].startContent,
						nugget.startContent,
					) > 0.8,
			);

			if (existingGroup) {
				existingGroup.push(nugget);
			} else {
				groups.push([nugget]);
			}
		}

		return groups;
	}

	private calculateSimpleSimilarity(text1: string, text2: string): number {
		// Simplified similarity for Phase 1 - just check overlap
		const words1 = text1.toLowerCase().split(/\s+/);
		const words2 = text2.toLowerCase().split(/\s+/);

		const intersection = words1.filter((word) => words2.includes(word));
		const union = new Set([...words1, ...words2]);

		return intersection.length / union.size;
	}
}
