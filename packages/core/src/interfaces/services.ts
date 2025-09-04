// Re-export interfaces from storage to avoid conflicts
export type { LoggerInterface } from "./storage";

export interface EmbeddingServiceInterface {
	generateEmbedding(
		text: string,
		options?: EmbeddingOptions,
	): Promise<EmbeddingVector>;
	generateEmbeddings(
		texts: string[],
		options?: EmbeddingOptions,
	): Promise<EmbeddingVector[]>;
}

export interface EmbeddingOptions {
	model?: string;
	dimensions?: number;
	batchSize?: number;
}

export interface EmbeddingVector {
	values: number[];
	model: string;
	dimensions: number;
}
