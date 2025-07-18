import { storage } from "../shared/storage";
import {
	type AnalysisProgressMessage,
	type AnalysisRequest,
	type AnalysisResponse,
	MESSAGE_TYPES,
} from "../shared/types";
import type { GeminiClient } from "./gemini-client";
import { TypeFilterService } from "./type-filter-service";

// Utility function to generate unique analysis IDs
function generateAnalysisId(): string {
	return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export class MessageHandler {
	constructor(private geminiClient: GeminiClient) {}

	// Helper to send progress messages to all listeners
	private sendProgressMessage(
		progressType: AnalysisProgressMessage["type"],
		step: 1 | 2 | 3 | 4,
		message: string,
		analysisId: string,
		source?: "popup" | "context-menu",
		tabId?: number,
	): void {
		const progressMessage: AnalysisProgressMessage = {
			type: progressType,
			step,
			message,
			timestamp: Date.now(),
			analysisId,
			source,
		};

		// Send to all extension contexts (popup, content script, etc.)
		chrome.runtime.sendMessage(progressMessage).catch(() => {
			// Ignore errors - popup might not be open
		});

		// Also send specifically to the tab if we have a tab ID
		if (tabId) {
			chrome.tabs.sendMessage(tabId, progressMessage).catch(() => {
				// Ignore errors - content script might not be ready
			});
		}
	}

	async handleMessage(
		request: any,
		sender: chrome.runtime.MessageSender,
		sendResponse: (response: any) => void,
	): Promise<void> {
		try {
			switch (request.type) {
				case MESSAGE_TYPES.ANALYZE_CONTENT:
					await this.handleAnalyzeContent(request, sender, sendResponse);
					break;

				case MESSAGE_TYPES.ANALYZE_SELECTED_CONTENT:
					await this.handleAnalyzeSelectedContent(
						request,
						sender,
						sendResponse,
					);
					break;

				case MESSAGE_TYPES.GET_PROMPTS:
					await this.handleGetPrompts(sendResponse);
					break;

				case MESSAGE_TYPES.SAVE_PROMPT:
					await this.handleSavePrompt(request, sendResponse);
					break;

				case MESSAGE_TYPES.DELETE_PROMPT:
					await this.handleDeletePrompt(request, sendResponse);
					break;

				case MESSAGE_TYPES.SET_DEFAULT_PROMPT:
					await this.handleSetDefaultPrompt(request, sendResponse);
					break;

				case MESSAGE_TYPES.GET_CONFIG:
					await this.handleGetConfig(sendResponse);
					break;

				case MESSAGE_TYPES.SAVE_CONFIG:
					await this.handleSaveConfig(request, sendResponse);
					break;

				case MESSAGE_TYPES.OPEN_OPTIONS_PAGE:
					await this.handleOpenOptionsPage(sendResponse);
					break;

				default:
					sendResponse({ success: false, error: "Unknown message type" });
			}
		} catch (error) {
			console.error("Error handling message:", error);
			sendResponse({ success: false, error: (error as Error).message });
		}
	}

	private async handleAnalyzeContent(
		request: AnalysisRequest,
		sender: chrome.runtime.MessageSender,
		sendResponse: (response: AnalysisResponse) => void,
	): Promise<void> {
		try {
			// Generate analysis ID if not provided
			const analysisId = request.analysisId || generateAnalysisId();
			const source = request.source || "context-menu";

			const prompts = await storage.getPrompts();
			const prompt = prompts.find((p) => p.id === request.promptId);

			if (!prompt) {
				sendResponse({ success: false, error: "Prompt not found" });
				return;
			}

			// Send step 1 progress: content extraction
			this.sendProgressMessage(
				MESSAGE_TYPES.ANALYSIS_CONTENT_EXTRACTED,
				1,
				"Extracting key insights",
				analysisId,
				source,
				sender.tab?.id,
			);

			// Replace {{ source }} placeholder with appropriate source type
			let processedPrompt = this.replaceSourcePlaceholder(
				prompt.prompt,
				request.url,
			);

			// Apply type filtering if specified
			if (request.typeFilter && request.typeFilter.selectedTypes.length > 0) {
				// Validate selected types
				if (
					!TypeFilterService.validateSelectedTypes(
						request.typeFilter.selectedTypes,
					)
				) {
					sendResponse({
						success: false,
						error: "Invalid nugget types selected",
					});
					return;
				}

				// Generate filtered prompt
				processedPrompt = TypeFilterService.generateFilteredPrompt(
					processedPrompt,
					request.typeFilter.selectedTypes,
				);
			}

			// Send step 2 progress: content optimization
			this.sendProgressMessage(
				MESSAGE_TYPES.ANALYSIS_CONTENT_OPTIMIZED,
				2,
				"Identifying patterns",
				analysisId,
				source,
				sender.tab?.id,
			);

			const result = await this.geminiClient.analyzeContent(
				request.content,
				processedPrompt,
				{
					analysisId,
					source,
					onProgress: (progressType, step, message) => {
						this.sendProgressMessage(
							progressType,
							step,
							message,
							analysisId,
							source,
							sender.tab?.id,
						);
					},
					typeFilter: request.typeFilter,
				},
			);
			sendResponse({ success: true, data: result });
		} catch (error) {
			console.error("Analysis failed:", error);
			sendResponse({ success: false, error: (error as Error).message });
		}
	}

	private async handleAnalyzeSelectedContent(
		request: any,
		sender: chrome.runtime.MessageSender,
		sendResponse: (response: any) => void,
	): Promise<void> {
		try {
			// Generate analysis ID if not provided
			const analysisId = request.analysisId || generateAnalysisId();
			const source = "context-menu"; // Selected content is always from context menu

			const prompts = await storage.getPrompts();
			const prompt = prompts.find((p) => p.id === request.promptId);

			if (!prompt) {
				sendResponse({ success: false, error: "Prompt not found" });
				return;
			}

			// Send step 1 progress: content extraction
			this.sendProgressMessage(
				MESSAGE_TYPES.ANALYSIS_CONTENT_EXTRACTED,
				1,
				"Extracting key insights",
				analysisId,
				source,
				sender.tab?.id,
			);

			// Replace {{ source }} placeholder with appropriate source type
			let processedPrompt = this.replaceSourcePlaceholder(
				prompt.prompt,
				request.url,
			);

			// Apply type filtering if specified
			if (request.typeFilter && request.typeFilter.selectedTypes.length > 0) {
				// Validate selected types
				if (
					!TypeFilterService.validateSelectedTypes(
						request.typeFilter.selectedTypes,
					)
				) {
					sendResponse({
						success: false,
						error: "Invalid nugget types selected",
					});
					return;
				}

				// Generate filtered prompt
				processedPrompt = TypeFilterService.generateFilteredPrompt(
					processedPrompt,
					request.typeFilter.selectedTypes,
				);
			}

			// Send step 2 progress: content optimization
			this.sendProgressMessage(
				MESSAGE_TYPES.ANALYSIS_CONTENT_OPTIMIZED,
				2,
				"Identifying patterns",
				analysisId,
				source,
				sender.tab?.id,
			);

			const result = await this.geminiClient.analyzeContent(
				request.content,
				processedPrompt,
				{
					analysisId,
					source,
					onProgress: (progressType, step, message) => {
						this.sendProgressMessage(
							progressType,
							step,
							message,
							analysisId,
							source,
							sender.tab?.id,
						);
					},
					typeFilter: request.typeFilter,
				},
			);

			// Send results to content script for display
			if (sender.tab?.id) {
				await chrome.tabs.sendMessage(sender.tab.id, {
					type: MESSAGE_TYPES.ANALYSIS_COMPLETE,
					data: result,
				});
			}

			sendResponse({ success: true, data: result });
		} catch (error) {
			console.error("Selected content analysis failed:", error);

			// Send error to content script
			if (sender.tab?.id) {
				await chrome.tabs.sendMessage(sender.tab.id, {
					type: MESSAGE_TYPES.ANALYSIS_ERROR,
					error: (error as Error).message,
				});
			}

			sendResponse({ success: false, error: (error as Error).message });
		}
	}

	private async handleGetPrompts(
		sendResponse: (response: any) => void,
	): Promise<void> {
		try {
			const prompts = await storage.getPrompts();
			sendResponse({ success: true, data: prompts });
		} catch (error) {
			sendResponse({ success: false, error: (error as Error).message });
		}
	}

	private async handleSavePrompt(
		request: any,
		sendResponse: (response: any) => void,
	): Promise<void> {
		try {
			await storage.savePrompt(request.prompt);
			sendResponse({ success: true });
		} catch (error) {
			sendResponse({ success: false, error: (error as Error).message });
		}
	}

	private async handleDeletePrompt(
		request: any,
		sendResponse: (response: any) => void,
	): Promise<void> {
		try {
			await storage.deletePrompt(request.promptId);
			sendResponse({ success: true });
		} catch (error) {
			sendResponse({ success: false, error: (error as Error).message });
		}
	}

	private async handleSetDefaultPrompt(
		request: any,
		sendResponse: (response: any) => void,
	): Promise<void> {
		try {
			await storage.setDefaultPrompt(request.promptId);
			sendResponse({ success: true });
		} catch (error) {
			sendResponse({ success: false, error: (error as Error).message });
		}
	}

	private async handleGetConfig(
		sendResponse: (response: any) => void,
	): Promise<void> {
		try {
			const config = await storage.getConfig({
				source: "background",
				action: "read",
				timestamp: Date.now(),
			});
			sendResponse({ success: true, data: config });
		} catch (error) {
			sendResponse({ success: false, error: (error as Error).message });
		}
	}

	private async handleSaveConfig(
		request: any,
		sendResponse: (response: any) => void,
	): Promise<void> {
		try {
			await storage.saveConfig(request.config, {
				source: "background",
				action: "write",
				timestamp: Date.now(),
			});
			sendResponse({ success: true });
		} catch (error) {
			sendResponse({ success: false, error: (error as Error).message });
		}
	}

	private async handleOpenOptionsPage(
		sendResponse: (response: any) => void,
	): Promise<void> {
		try {
			await chrome.runtime.openOptionsPage();
			sendResponse({ success: true });
		} catch (error) {
			sendResponse({ success: false, error: (error as Error).message });
		}
	}

	private replaceSourcePlaceholder(prompt: string, url: string): string {
		const sourceType = this.detectSourceType(url);
		return prompt.replace(/\{\{\s*source\s*\}\}/g, sourceType);
	}

	private detectSourceType(url: string): string {
		if (url.includes("news.ycombinator.com")) {
			return "HackerNews thread";
		} else if (url.includes("reddit.com")) {
			return "Reddit thread";
		} else if (url.includes("twitter.com") || url.includes("x.com")) {
			return "Twitter thread";
		} else {
			return "text";
		}
	}
}
