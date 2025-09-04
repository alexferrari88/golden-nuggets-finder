import type { EmbeddingServiceInterface } from "./interfaces/services";
import type { LoggerInterface, StorageInterface } from "./interfaces/storage";
import type { GoldenNuggetType } from "./schemas";
import { EnsembleExtractor } from "./services/ensemble-extractor";
import { ProviderFactory } from "./services/provider-factory";
import { normalize } from "./services/response-normalizer";
import { TypeFilterService } from "./services/type-filter-service";
import type {
	EnsembleExtractionResult,
	GoldenNuggetsResponse,
	LLMProvider,
	ProviderCreateConfig,
	ProviderId,
} from "./types/core";

export interface AnalysisOptions {
	providerId: ProviderId;
	temperature?: number;
	typeFilter?: GoldenNuggetType[];
}

export interface EnsembleOptions {
	mode: "single-model" | "multi-provider";
	providerId?: ProviderId; // For single-model mode
	providers?: ProviderCreateConfig[]; // For multi-provider mode
	runs?: number; // For single-model mode
	typeFilter?: GoldenNuggetType[];
}

export class GoldenNuggetsCore {
	private providerFactory: ProviderFactory;
	private ensembleExtractor: EnsembleExtractor;

	constructor(
		storage: StorageInterface,
		logger?: LoggerInterface,
		embeddingService?: EmbeddingServiceInterface,
	) {
		this.providerFactory = new ProviderFactory(storage, logger);
		this.ensembleExtractor = new EnsembleExtractor(logger, embeddingService);
	}

	// Provider management
	async createProvider(config: ProviderCreateConfig): Promise<LLMProvider> {
		return this.providerFactory.createProvider(config);
	}

	async createMultipleProviders(
		configs: ProviderCreateConfig[],
	): Promise<Array<{ providerId: ProviderId; provider: LLMProvider }>> {
		return this.providerFactory.createMultipleProviders(configs);
	}

	// Content analysis
	async analyzeContent(
		content: string,
		prompt: string,
		options: AnalysisOptions,
	): Promise<GoldenNuggetsResponse> {
		const provider = await this.createProvider({
			providerId: options.providerId,
		});
		const filteredPrompt = options.typeFilter
			? TypeFilterService.generateFilteredPrompt(prompt, options.typeFilter)
			: prompt;

		return provider.extractGoldenNuggets(
			content,
			filteredPrompt,
			options.temperature,
		);
	}

	// Ensemble analysis
	async analyzeWithEnsemble(
		content: string,
		prompt: string,
		options: EnsembleOptions,
	): Promise<EnsembleExtractionResult> {
		const filteredPrompt = options.typeFilter
			? TypeFilterService.generateFilteredPrompt(prompt, options.typeFilter)
			: prompt;

		if (options.mode === "multi-provider") {
			if (!options.providers || options.providers.length === 0) {
				throw new Error("Multi-provider mode requires provider configurations");
			}

			const providerConfigs = await this.createMultipleProviders(
				options.providers,
			);
			return this.ensembleExtractor.extractWithMultiProviderEnsemble(
				content,
				filteredPrompt,
				providerConfigs.map((p) => ({
					providerId: p.providerId,
					modelId: p.provider.modelName || "",
					provider: p.provider,
				})),
			);
		} else {
			if (!options.providerId) {
				throw new Error("Single-model mode requires providerId");
			}

			const provider = await this.createProvider({
				providerId: options.providerId,
			});
			return this.ensembleExtractor.extractWithEnsemble(
				content,
				filteredPrompt,
				provider,
				{ runs: options.runs || 3, temperature: 0.7, parallelExecution: true },
			);
		}
	}

	// Utility methods
	filterContentByTypes(prompt: string, types: GoldenNuggetType[]): string {
		return TypeFilterService.generateFilteredPrompt(prompt, types);
	}

	normalizeResponse(
		response: any,
		providerId: ProviderId,
	): GoldenNuggetsResponse {
		return normalize(response, providerId);
	}

	validateTypes(types: GoldenNuggetType[]): boolean {
		return TypeFilterService.validateSelectedTypes(types);
	}

	getTypeConfiguration(type: GoldenNuggetType) {
		return TypeFilterService.getTypeConfiguration(type);
	}

	getContextMenuOptions() {
		return TypeFilterService.CONTEXT_MENU_OPTIONS;
	}
}
