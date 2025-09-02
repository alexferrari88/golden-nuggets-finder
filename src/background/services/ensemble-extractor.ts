import type { EnhancedGoldenNugget } from "../../shared/types";
import type {
	NuggetWithEmbedding,
	SimilarityOptions,
} from "../../shared/types/embedding-types";
import type {
	EnsembleExtractionResult,
	GoldenNuggetsResponse,
	LLMProvider,
	ProviderId,
} from "../../shared/types/providers";
import { HybridSimilarityMatcher } from "./hybrid-similarity";
import { normalize } from "./response-normalizer";

interface EnsembleExtractionOptions {
	runs: number;
	temperature: number;
	parallelExecution: boolean;
	similarityOptions?: Partial<SimilarityOptions>;
	selectedTypes?: any[];
}

// Remove unused interface - keeping separate methods instead

export class EnsembleExtractor {
	private hybridSimilarityMatcher: HybridSimilarityMatcher;

	constructor() {
		this.hybridSimilarityMatcher = new HybridSimilarityMatcher();
	}
	// Original method signature preserved for backward compatibility
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
		return this.extractWithSingleProvider(content, prompt, provider, options);
	}

	// New method for multi-provider ensemble extraction
	async extractWithMultiProviderEnsemble(
		content: string,
		prompt: string,
		providerConfigurations: Array<{
			providerId: ProviderId;
			modelId: string;
			provider: LLMProvider;
		}>,
		similarityOptions: Partial<SimilarityOptions> = {},
	): Promise<EnsembleExtractionResult> {
		return this.extractWithMultiProvider(
			content,
			prompt,
			providerConfigurations,
			similarityOptions,
		);
	}

	// New multi-provider extraction method
	async extractWithMultiProvider(
		content: string,
		prompt: string,
		providerConfigurations: Array<{
			providerId: ProviderId;
			modelId: string;
			provider: LLMProvider;
		}>,
		similarityOptions: Partial<SimilarityOptions> = {},
	): Promise<EnsembleExtractionResult> {
		console.log(
			`Starting multi-provider ensemble extraction with ${providerConfigurations.length} providers`,
		);

		const startTime = performance.now();

		// Execute one call per provider configuration
		const extractionPromises = providerConfigurations.map(async (config) => {
			try {
				console.log(
					`Executing extraction with ${config.providerId} (${config.modelId})`,
				);

				const providerStartTime = performance.now();
				const rawResponse = await config.provider.extractGoldenNuggets(
					content,
					prompt,
					0.7, // Standard temperature
					[], // selectedTypes - not used in multi-provider mode
				);
				const responseTime = performance.now() - providerStartTime;

				const normalizedResponse = normalize(rawResponse, config.providerId);

				// Apply individual confidence filtering (≥0.85) before consensus
				const filteredNuggets = normalizedResponse.golden_nuggets.filter(
					(nugget) =>
						nugget.confidence !== undefined && nugget.confidence >= 0.85,
				);

				console.log(
					`Provider ${config.providerId}: ${normalizedResponse.golden_nuggets.length} → ${filteredNuggets.length} nuggets after confidence filtering`,
				);

				// Tag nuggets with source provider information
				const taggedNuggets = filteredNuggets.map((nugget) => ({
					...nugget,
					sourceProvider: config.providerId,
					sourceModel: config.modelId,
				}));

				return {
					response: { ...normalizedResponse, golden_nuggets: taggedNuggets },
					providerMetadata: {
						providerId: config.providerId,
						modelId: config.modelId,
						responseTime,
						successful: true,
					},
				};
			} catch (error) {
				console.error(`Provider ${config.providerId} failed:`, error);
				return {
					response: { golden_nuggets: [] },
					providerMetadata: {
						providerId: config.providerId,
						modelId: config.modelId,
						responseTime: 0,
						successful: false,
					},
				};
			}
		});

		const results = await Promise.allSettled(extractionPromises);
		const successfulResults = results
			.filter(
				(result): result is PromiseFulfilledResult<any> =>
					result.status === "fulfilled",
			)
			.map((result) => result.value);

		const successfulExtractions = successfulResults
			.filter((result) => result.providerMetadata.successful)
			.map((result) => result.response);

		const allProviderMetadata = successfulResults.map(
			(result) => result.providerMetadata,
		);
		const responseTime = performance.now() - startTime;

		console.log(
			`Completed ${successfulExtractions.length}/${providerConfigurations.length} successful multi-provider extractions in ${responseTime}ms`,
		);

		// Build consensus using existing consensus logic
		const consensusResult = await this.buildConsensus(
			successfulExtractions,
			{
				totalRuns: providerConfigurations.length,
				successfulRuns: successfulExtractions.length,
				averageResponseTime: responseTime / providerConfigurations.length,
			},
			similarityOptions,
		);

		// Enhanced metadata with provider information
		return {
			...consensusResult,
			metadata: {
				...consensusResult.metadata,
				providersUsed: allProviderMetadata,
			},
		};
	}

	// Rename existing method for clarity
	private async extractWithSingleProvider(
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
				this.executeRunWithErrorHandling(
					content,
					prompt,
					provider,
					runIndex,
					options.temperature,
					options.selectedTypes,
				),
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
		return this.buildConsensus(
			successfulExtractions,
			{
				totalRuns: options.runs,
				successfulRuns: successfulExtractions.length,
				averageResponseTime: responseTime / options.runs,
			},
			options.similarityOptions,
		);
	}

	private async executeRunWithErrorHandling(
		content: string,
		prompt: string,
		provider: LLMProvider,
		runIndex: number,
		temperature?: number,
		selectedTypes?: any[],
	): Promise<GoldenNuggetsResponse> {
		try {
			console.log(`Executing run ${runIndex + 1} for ${provider.providerId}`);

			// Use standard extraction method
			const rawResponse = await provider.extractGoldenNuggets(
				content,
				prompt,
				temperature || 0.7,
				selectedTypes,
			);

			const normalizedResponse = normalize(rawResponse, provider.providerId);

			// Apply individual confidence filtering (≥0.85) before consensus
			const filteredNuggets = normalizedResponse.golden_nuggets.filter(
				(nugget) =>
					nugget.confidence !== undefined && nugget.confidence >= 0.85,
			);

			console.log(
				`Run ${runIndex + 1} for ${provider.providerId}: ${normalizedResponse.golden_nuggets.length} → ${filteredNuggets.length} nuggets after confidence filtering`,
			);

			// Add provider information intelligently:
			// - If nugget already has sourceProvider/sourceModel (including null/undefined), preserve it
			// - If nugget doesn't have these properties at all, add them from provider instance
			const taggedNuggets = filteredNuggets.map((nugget) => {
				const nuggetAny = nugget as any;
				const result = { ...nugget } as EnhancedGoldenNugget;

				// Only add provider info if the property doesn't exist in the nugget object at all
				if (!("sourceProvider" in nuggetAny)) {
					result.sourceProvider = provider.providerId;
				}
				if (!("sourceModel" in nuggetAny)) {
					result.sourceModel = provider.modelName;
				}

				return result;
			});

			return { ...normalizedResponse, golden_nuggets: taggedNuggets };
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
		similarityOptions?: Partial<SimilarityOptions>,
	): Promise<EnsembleExtractionResult> {
		if (extractions.length === 0) {
			return {
				golden_nuggets: [],
				metadata: {
					totalRuns: metadata.totalRuns,
					successfulRuns: 0,
					consensusReached: 0,
					duplicatesRemoved: 0,
					averageResponseTime: metadata.averageResponseTime,
				},
			};
		}

		// Step 1: Flatten all nuggets from all runs with enhanced type and proper run tracking
		const allNuggets: NuggetWithEmbedding[] = extractions.flatMap(
			(extraction, runIndex) =>
				extraction.golden_nuggets.map((nugget) => ({
					...nugget,
					runId: runIndex.toString(), // Track source run index
					// Preserve provider information for tooltip attribution
					sourceProvider: (nugget as any).sourceProvider,
					sourceModel: (nugget as any).sourceModel,
				})),
		);

		console.log(
			`Starting consensus building for ${allNuggets.length} nuggets from ${extractions.length} runs`,
		);

		// Step 2: Group by semantic similarity using hybrid approach
		const nuggetGroups = await this.groupBySimilarityWithEmbeddings(
			allNuggets,
			similarityOptions,
		);

		// Step 3: Apply majority voting and confidence scoring based on unique runs
		const consensusNuggets = nuggetGroups.map((group) => {
			// Count unique runs that contributed to this group
			const uniqueRunIds = new Set(group.map((nugget) => nugget.runId));
			const uniqueRunCount = uniqueRunIds.size;

			// Collect all unique provider/model combinations from nuggets in this group
			const contributingProviders = Array.from(
				new Set(
					group
						.filter((nugget) => nugget.sourceProvider && nugget.sourceModel)
						.map((nugget) => `${nugget.sourceProvider}:${nugget.sourceModel}`),
				),
			).map((providerModelKey) => {
				const [provider, model] = providerModelKey.split(":");
				return { provider: provider as ProviderId, model };
			});

			return {
				type: group[0].type as
					| "tool"
					| "media"
					| "aha! moments"
					| "analogy"
					| "model",
				fullContent: group[0].fullContent,
				confidence: uniqueRunCount / metadata.successfulRuns,
				runsSupportingThis: uniqueRunCount,
				totalRuns: metadata.totalRuns,
				similarityMethod: "embedding" as const,
				contributingProviders:
					contributingProviders.length > 0 ? contributingProviders : undefined,
			};
		});

		// Step 4: Sort by confidence (highest first)
		const sortedNuggets = consensusNuggets.sort(
			(a, b) => b.confidence - a.confidence,
		);

		return {
			golden_nuggets: sortedNuggets,
			metadata: {
				totalRuns: metadata.totalRuns,
				successfulRuns: extractions.length,
				consensusReached: sortedNuggets.length,
				duplicatesRemoved: allNuggets.length - sortedNuggets.length,
				averageResponseTime: metadata.averageResponseTime,
			},
		};
	}

	private groupBySimilarity(nuggets: any[]): any[][] {
		// Simplified similarity grouping for fallback
		// Groups nuggets by exact type and similar fullContent
		const groups: any[][] = [];

		for (const nugget of nuggets) {
			const existingGroup = groups.find(
				(group) =>
					group[0].type === nugget.type &&
					this.calculateSimpleSimilarity(
						group[0].fullContent,
						nugget.fullContent,
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

	/**
	 * New method: Group nuggets by similarity using embeddings with word overlap fallback
	 */
	private async groupBySimilarityWithEmbeddings(
		nuggets: NuggetWithEmbedding[],
		similarityOptions?: Partial<SimilarityOptions>,
	): Promise<NuggetWithEmbedding[][]> {
		try {
			console.log(
				`[EnsembleExtractor] Using embedding-based similarity grouping for ${nuggets.length} nuggets`,
			);

			// Update hybrid similarity matcher configuration if provided
			if (similarityOptions) {
				this.hybridSimilarityMatcher.updateConfiguration(similarityOptions);
			}

			// Use hybrid similarity matcher to group nuggets
			const groups = await this.hybridSimilarityMatcher.groupSimilarNuggets(
				nuggets,
				similarityOptions,
			);

			console.log(
				`[EnsembleExtractor] Grouped nuggets into ${groups.length} similarity groups`,
			);

			return groups;
		} catch (error) {
			console.warn(
				`[EnsembleExtractor] Embedding-based grouping failed, falling back to word overlap:`,
				error,
			);

			// Fallback to original grouping algorithm
			return this.groupBySimilarity(nuggets);
		}
	}

	private calculateSimpleSimilarity(text1: string, text2: string): number {
		// Handle null/undefined inputs
		if (!text1 || !text2) return 0;

		// Simplified similarity for fallback - just check overlap
		const words1 = text1.toLowerCase().split(/\s+/);
		const words2 = text2.toLowerCase().split(/\s+/);

		const intersection = words1.filter((word) => words2.includes(word));
		const union = new Set([...words1, ...words2]);

		return intersection.length / union.size;
	}
}
