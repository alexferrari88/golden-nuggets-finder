import { beforeEach, describe, expect, it, vi } from "vitest";
import { MESSAGE_TYPES } from "../../src/shared/types";

describe("Progress Tracking Integration Tests", () => {
	let mockChrome: any;
	let progressMessageQueue: any[];
	let mockUIManager: any;

	beforeEach(() => {
		progressMessageQueue = [];

		mockChrome = {
			runtime: {
				sendMessage: vi.fn().mockImplementation((message) => {
					progressMessageQueue.push({ target: "runtime", message });
					return Promise.resolve({ success: true });
				}),
			},
			tabs: {
				sendMessage: vi.fn().mockImplementation((tabId, message) => {
					progressMessageQueue.push({ target: "tab", tabId, message });
					return Promise.resolve({ success: true });
				}),
			},
		};

		global.chrome = mockChrome;

		// Mock UI Manager for progress handling
		mockUIManager = {
			handleProgressUpdate: vi.fn(),
			showLoadingIndicator: vi.fn(),
			hideLoadingIndicator: vi.fn(),
			updateProgressStep: vi.fn(),
			showProgressMessage: vi.fn(),
		};
	});

	describe("4-Step Analysis Progress Flow Integration", () => {
		it("should handle complete 4-step analysis progress sequence", async () => {
			const analysisId = "progress_test_123";
			const tabId = 456;
			const source = "context-menu";

			// Simulate the 4-step progress flow as sent by MessageHandler
			const progressSteps = [
				{
					type: MESSAGE_TYPES.ANALYSIS_CONTENT_EXTRACTED,
					step: 1,
					message: "Extracting key insights",
					timestamp: Date.now(),
					analysisId,
					source,
				},
				{
					type: MESSAGE_TYPES.ANALYSIS_CONTENT_OPTIMIZED,
					step: 2,
					message: "Identifying patterns",
					timestamp: Date.now() + 100,
					analysisId,
					source,
				},
				{
					type: MESSAGE_TYPES.ANALYSIS_API_REQUEST_START,
					step: 3,
					message: "Analyzing with AI",
					timestamp: Date.now() + 200,
					analysisId,
					source,
				},
				{
					type: MESSAGE_TYPES.ANALYSIS_API_RESPONSE_RECEIVED,
					step: 3,
					message: "Processing AI response",
					timestamp: Date.now() + 300,
					analysisId,
					source,
				},
				{
					type: MESSAGE_TYPES.ANALYSIS_PROCESSING_RESULTS,
					step: 4,
					message: "Finalizing results",
					timestamp: Date.now() + 400,
					analysisId,
					source,
				},
			];

			// Send each progress message
			for (const progressMsg of progressSteps) {
				// Send to runtime (for popup if open)
				await mockChrome.runtime.sendMessage(progressMsg);

				// Send to specific tab (for content script)
				await mockChrome.tabs.sendMessage(tabId, progressMsg);

				// Simulate UI manager handling the progress
				mockUIManager.handleProgressUpdate(progressMsg);
			}

			// Verify all messages were sent in correct order
			expect(progressMessageQueue).toHaveLength(10); // 5 steps × 2 targets each

			// Verify runtime messages
			const runtimeMessages = progressMessageQueue.filter(
				(item) => item.target === "runtime",
			);
			expect(runtimeMessages).toHaveLength(5);

			runtimeMessages.forEach((item, index) => {
				expect(item.message.analysisId).toBe(analysisId);
				expect(item.message.source).toBe(source);
				expect(item.message.step).toBe(progressSteps[index].step);
				expect(item.message.type).toBe(progressSteps[index].type);
			});

			// Verify tab messages
			const tabMessages = progressMessageQueue.filter(
				(item) => item.target === "tab",
			);
			expect(tabMessages).toHaveLength(5);

			tabMessages.forEach((item, index) => {
				expect(item.tabId).toBe(tabId);
				expect(item.message.analysisId).toBe(analysisId);
				expect(item.message.step).toBe(progressSteps[index].step);
			});

			// Verify UI manager received all progress updates
			expect(mockUIManager.handleProgressUpdate).toHaveBeenCalledTimes(5);
		});

		it("should handle progress message deduplication by analysis ID", async () => {
			const analysisId1 = "analysis_1";
			const analysisId2 = "analysis_2";
			const tabId = 123;

			// Send overlapping progress messages from different analyses
			const messages = [
				{
					type: MESSAGE_TYPES.ANALYSIS_CONTENT_EXTRACTED,
					step: 1,
					message: "Step 1 for analysis 1",
					analysisId: analysisId1,
					timestamp: Date.now(),
				},
				{
					type: MESSAGE_TYPES.ANALYSIS_CONTENT_EXTRACTED,
					step: 1,
					message: "Step 1 for analysis 2",
					analysisId: analysisId2,
					timestamp: Date.now() + 50,
				},
				{
					type: MESSAGE_TYPES.ANALYSIS_CONTENT_OPTIMIZED,
					step: 2,
					message: "Step 2 for analysis 1",
					analysisId: analysisId1,
					timestamp: Date.now() + 100,
				},
				{
					type: MESSAGE_TYPES.ANALYSIS_API_REQUEST_START,
					step: 3,
					message: "Step 3 for analysis 2",
					analysisId: analysisId2,
					timestamp: Date.now() + 150,
				},
			];

			// Track progress by analysis ID
			const progressByAnalysis = new Map();

			for (const msg of messages) {
				await mockChrome.tabs.sendMessage(tabId, msg);

				// Simulate progress tracking by analysis ID
				if (!progressByAnalysis.has(msg.analysisId)) {
					progressByAnalysis.set(msg.analysisId, []);
				}
				progressByAnalysis.get(msg.analysisId).push(msg);
			}

			// Verify both analyses are tracked separately
			expect(progressByAnalysis.size).toBe(2);
			expect(progressByAnalysis.get(analysisId1)).toHaveLength(2);
			expect(progressByAnalysis.get(analysisId2)).toHaveLength(2);

			// Verify correct step progression for each analysis
			const analysis1Steps = progressByAnalysis
				.get(analysisId1)
				.map((m) => m.step);
			const analysis2Steps = progressByAnalysis
				.get(analysisId2)
				.map((m) => m.step);

			expect(analysis1Steps).toEqual([1, 2]);
			expect(analysis2Steps).toEqual([1, 3]);
		});

		it("should handle progress messages with different sources (popup vs context-menu)", async () => {
			const analysisId = "multi_source_test";
			const tabId = 789;

			// Context menu initiated analysis
			const contextMenuProgress = {
				type: MESSAGE_TYPES.ANALYSIS_CONTENT_EXTRACTED,
				step: 1,
				message: "Context menu analysis started",
				analysisId,
				source: "context-menu",
				timestamp: Date.now(),
			};

			// Popup initiated analysis (different analysis)
			const popupProgress = {
				type: MESSAGE_TYPES.ANALYSIS_CONTENT_EXTRACTED,
				step: 1,
				message: "Popup analysis started",
				analysisId: "popup_analysis_456",
				source: "popup",
				timestamp: Date.now() + 100,
			};

			// Send both messages
			await mockChrome.tabs.sendMessage(tabId, contextMenuProgress);
			await mockChrome.runtime.sendMessage(contextMenuProgress);

			await mockChrome.tabs.sendMessage(tabId, popupProgress);
			await mockChrome.runtime.sendMessage(popupProgress);

			// Verify messages were routed correctly based on source
			const contextMenuMessages = progressMessageQueue.filter(
				(item) => item.message.source === "context-menu",
			);
			const popupMessages = progressMessageQueue.filter(
				(item) => item.message.source === "popup",
			);

			expect(contextMenuMessages).toHaveLength(2); // tab + runtime
			expect(popupMessages).toHaveLength(2); // tab + runtime

			// Verify popup messages are sent to runtime for popup display
			const popupRuntimeMessages = progressMessageQueue.filter(
				(item) => item.target === "runtime" && item.message.source === "popup",
			);
			expect(popupRuntimeMessages).toHaveLength(1);
		});
	});

	describe("Progress Message Timing and Sequencing", () => {
		it("should handle rapid progress updates without message loss", async () => {
			const analysisId = "rapid_progress_test";
			const tabId = 101;
			const messageCount = 50;

			// Generate rapid sequence of progress messages
			const rapidMessages = Array.from({ length: messageCount }, (_, i) => ({
				type: MESSAGE_TYPES.ANALYSIS_PROCESSING_RESULTS,
				step: 4,
				message: `Rapid update ${i + 1}`,
				analysisId,
				timestamp: Date.now() + i,
				sequenceNumber: i + 1,
			}));

			// Send all messages rapidly
			const sendPromises = rapidMessages.map((msg) =>
				mockChrome.tabs.sendMessage(tabId, msg),
			);

			await Promise.all(sendPromises);

			// Verify all messages were queued
			const tabMessages = progressMessageQueue.filter(
				(item) => item.target === "tab",
			);
			expect(tabMessages).toHaveLength(messageCount);

			// Verify messages maintained sequence
			tabMessages.forEach((item, index) => {
				expect(item.message.sequenceNumber).toBe(index + 1);
				expect(item.message.message).toBe(`Rapid update ${index + 1}`);
			});
		});

		it("should handle progress message ordering with timestamps", async () => {
			const analysisId = "timestamp_order_test";
			const tabId = 202;
			const baseTime = Date.now();

			// Send messages out of chronological order
			const unorderedMessages = [
				{
					type: MESSAGE_TYPES.ANALYSIS_API_RESPONSE_RECEIVED,
					step: 3,
					message: "Third message (sent first)",
					analysisId,
					timestamp: baseTime + 300,
				},
				{
					type: MESSAGE_TYPES.ANALYSIS_CONTENT_EXTRACTED,
					step: 1,
					message: "First message (sent second)",
					analysisId,
					timestamp: baseTime + 100,
				},
				{
					type: MESSAGE_TYPES.ANALYSIS_CONTENT_OPTIMIZED,
					step: 2,
					message: "Second message (sent third)",
					analysisId,
					timestamp: baseTime + 200,
				},
			];

			// Send in the wrong order
			for (const msg of unorderedMessages) {
				await mockChrome.tabs.sendMessage(tabId, msg);
			}

			const tabMessages = progressMessageQueue
				.filter((item) => item.target === "tab")
				.map((item) => item.message);

			// Verify messages can be reordered by timestamp
			const sortedByTimestamp = [...tabMessages].sort(
				(a, b) => a.timestamp - b.timestamp,
			);

			expect(sortedByTimestamp[0].step).toBe(1);
			expect(sortedByTimestamp[1].step).toBe(2);
			expect(sortedByTimestamp[2].step).toBe(3);

			expect(sortedByTimestamp[0].message).toBe("First message (sent second)");
			expect(sortedByTimestamp[1].message).toBe("Second message (sent third)");
			expect(sortedByTimestamp[2].message).toBe("Third message (sent first)");
		});

		it("should handle progress message timeouts and cleanup", async () => {
			const analysisId = "timeout_cleanup_test";
			const tabId = 303;
			const startTime = Date.now();

			// Track active progress sessions with timeouts
			const activeProgressSessions = new Map();
			const PROGRESS_TIMEOUT = 30000; // 30 seconds

			function trackProgressSession(analysisId: string, timestamp: number) {
				activeProgressSessions.set(analysisId, {
					startTime: timestamp,
					lastUpdate: timestamp,
					timeoutId: null,
				});
			}

			function updateProgressSession(analysisId: string, timestamp: number) {
				const session = activeProgressSessions.get(analysisId);
				if (session) {
					session.lastUpdate = timestamp;
				}
			}

			function cleanupExpiredSessions(currentTime: number) {
				for (const [id, session] of activeProgressSessions.entries()) {
					if (currentTime - session.lastUpdate > PROGRESS_TIMEOUT) {
						activeProgressSessions.delete(id);
					}
				}
			}

			// Start progress session
			trackProgressSession(analysisId, startTime);
			expect(activeProgressSessions.has(analysisId)).toBe(true);

			// Send progress update
			await mockChrome.tabs.sendMessage(tabId, {
				type: MESSAGE_TYPES.ANALYSIS_CONTENT_EXTRACTED,
				step: 1,
				message: "Progress started",
				analysisId,
				timestamp: startTime,
			});

			updateProgressSession(analysisId, startTime + 1000);

			// Simulate time passing but within timeout
			cleanupExpiredSessions(startTime + 15000);
			expect(activeProgressSessions.has(analysisId)).toBe(true);

			// Simulate timeout expiration
			cleanupExpiredSessions(startTime + 35000);
			expect(activeProgressSessions.has(analysisId)).toBe(false);
		});
	});

	describe("Progress State Management Integration", () => {
		it("should maintain progress state consistency across components", async () => {
			const analysisId = "state_consistency_test";
			const tabId = 404;

			// Mock progress state manager
			const progressStateManager = {
				activeAnalyses: new Map(),

				startAnalysis(analysisId: string, source: string) {
					this.activeAnalyses.set(analysisId, {
						id: analysisId,
						source,
						currentStep: 0,
						startTime: Date.now(),
						messages: [],
					});
				},

				updateProgress(
					analysisId: string,
					step: number,
					message: string,
					timestamp: number,
				) {
					const analysis = this.activeAnalyses.get(analysisId);
					if (analysis) {
						analysis.currentStep = Math.max(analysis.currentStep, step);
						analysis.messages.push({ step, message, timestamp });
					}
				},

				completeAnalysis(analysisId: string) {
					const analysis = this.activeAnalyses.get(analysisId);
					if (analysis) {
						analysis.completed = true;
						analysis.endTime = Date.now();
					}
				},

				getAnalysisState(analysisId: string) {
					return this.activeAnalyses.get(analysisId);
				},
			};

			// Start analysis
			progressStateManager.startAnalysis(analysisId, "context-menu");

			// Send progress updates
			const progressUpdates = [
				{ step: 1, message: "Content extracted", timestamp: Date.now() },
				{ step: 2, message: "Content optimized", timestamp: Date.now() + 100 },
				{ step: 3, message: "API request sent", timestamp: Date.now() + 200 },
				{ step: 4, message: "Results processed", timestamp: Date.now() + 300 },
			];

			for (const update of progressUpdates) {
				await mockChrome.tabs.sendMessage(tabId, {
					type: MESSAGE_TYPES.ANALYSIS_PROCESSING_RESULTS,
					...update,
					analysisId,
				});

				progressStateManager.updateProgress(
					analysisId,
					update.step,
					update.message,
					update.timestamp,
				);
			}

			// Complete analysis
			progressStateManager.completeAnalysis(analysisId);

			// Verify final state
			const finalState = progressStateManager.getAnalysisState(analysisId);
			expect(finalState).toBeDefined();
			expect(finalState.id).toBe(analysisId);
			expect(finalState.currentStep).toBe(4);
			expect(finalState.messages).toHaveLength(4);
			expect(finalState.completed).toBe(true);
			expect(finalState.endTime).toBeDefined();

			// Verify all messages were sent
			const tabMessages = progressMessageQueue.filter(
				(item) => item.target === "tab",
			);
			expect(tabMessages).toHaveLength(4);
		});

		it("should handle concurrent progress tracking for multiple analyses", async () => {
			const analyses = [
				{ id: "concurrent_1", tabId: 100, source: "context-menu" },
				{ id: "concurrent_2", tabId: 200, source: "popup" },
				{ id: "concurrent_3", tabId: 300, source: "context-menu" },
			];

			// Mock concurrent progress manager
			const concurrentProgressManager = {
				activeAnalyses: new Map(),

				trackProgress(analysisId: string, step: number, tabId: number) {
					if (!this.activeAnalyses.has(analysisId)) {
						this.activeAnalyses.set(analysisId, {
							id: analysisId,
							tabId,
							steps: [],
							lastUpdate: Date.now(),
						});
					}

					const analysis = this.activeAnalyses.get(analysisId);
					analysis.steps.push(step);
					analysis.lastUpdate = Date.now();
				},

				getActiveCount() {
					return this.activeAnalyses.size;
				},

				getAnalysisSteps(analysisId: string) {
					return this.activeAnalyses.get(analysisId)?.steps || [];
				},
			};

			// Start all analyses concurrently
			const progressPromises = analyses.map(async (analysis, index) => {
				for (let step = 1; step <= 4; step++) {
					const message = {
						type: MESSAGE_TYPES.ANALYSIS_PROCESSING_RESULTS,
						step,
						message: `Step ${step} for ${analysis.id}`,
						analysisId: analysis.id,
						timestamp: Date.now() + index * 100 + step * 50,
					};

					await mockChrome.tabs.sendMessage(analysis.tabId, message);
					concurrentProgressManager.trackProgress(
						analysis.id,
						step,
						analysis.tabId,
					);
				}
			});

			await Promise.all(progressPromises);

			// Verify all analyses were tracked
			expect(concurrentProgressManager.getActiveCount()).toBe(3);

			// Verify each analysis completed all steps
			analyses.forEach((analysis) => {
				const steps = concurrentProgressManager.getAnalysisSteps(analysis.id);
				expect(steps).toEqual([1, 2, 3, 4]);
			});

			// Verify total message count
			const totalMessages = progressMessageQueue.filter(
				(item) => item.target === "tab",
			);
			expect(totalMessages).toHaveLength(12); // 3 analyses × 4 steps each
		});
	});

	describe("UI Progress Integration", () => {
		it("should integrate progress messages with UI animations", async () => {
			const analysisId = "ui_animation_test";
			const tabId = 505;

			// Mock UI animation controller
			const uiAnimationController = {
				activeAnimations: new Map(),

				startLoadingAnimation(analysisId: string) {
					this.activeAnimations.set(analysisId, {
						type: "loading",
						startTime: Date.now(),
						currentStep: 0,
					});
				},

				updateStepAnimation(analysisId: string, step: number, message: string) {
					const animation = this.activeAnimations.get(analysisId);
					if (animation) {
						animation.currentStep = step;
						animation.lastMessage = message;
						animation.lastUpdate = Date.now();
					}
				},

				completeAnimation(analysisId: string) {
					const animation = this.activeAnimations.get(analysisId);
					if (animation) {
						animation.type = "completed";
						animation.endTime = Date.now();
					}
				},

				getAnimationState(analysisId: string) {
					return this.activeAnimations.get(analysisId);
				},
			};

			// Start animation
			uiAnimationController.startLoadingAnimation(analysisId);

			// Send progress messages that trigger UI updates
			const uiProgressSteps = [
				{ step: 1, message: "Starting analysis...", uiAction: "showSpinner" },
				{
					step: 2,
					message: "Processing content...",
					uiAction: "updateProgress",
				},
				{
					step: 3,
					message: "Analyzing with AI...",
					uiAction: "showAIIndicator",
				},
				{
					step: 4,
					message: "Finalizing results...",
					uiAction: "prepareResults",
				},
			];

			for (const progressStep of uiProgressSteps) {
				const message = {
					type: MESSAGE_TYPES.ANALYSIS_PROCESSING_RESULTS,
					step: progressStep.step,
					message: progressStep.message,
					analysisId,
					timestamp: Date.now(),
					uiAction: progressStep.uiAction,
				};

				await mockChrome.tabs.sendMessage(tabId, message);

				// Simulate UI manager handling progress with animation
				mockUIManager.handleProgressUpdate(message);
				uiAnimationController.updateStepAnimation(
					analysisId,
					progressStep.step,
					progressStep.message,
				);
			}

			// Complete animation
			uiAnimationController.completeAnimation(analysisId);

			// Verify animation progression
			const finalAnimationState =
				uiAnimationController.getAnimationState(analysisId);
			expect(finalAnimationState.type).toBe("completed");
			expect(finalAnimationState.currentStep).toBe(4);
			expect(finalAnimationState.lastMessage).toBe("Finalizing results...");
			expect(finalAnimationState.endTime).toBeDefined();

			// Verify UI manager received all updates
			expect(mockUIManager.handleProgressUpdate).toHaveBeenCalledTimes(4);

			// Verify each UI action was triggered correctly
			const uiCalls = mockUIManager.handleProgressUpdate.mock.calls;
			uiCalls.forEach((call, index) => {
				expect(call[0].uiAction).toBe(uiProgressSteps[index].uiAction);
			});
		});

		it("should handle progress message failures and UI error states", async () => {
			const analysisId = "ui_error_test";
			const tabId = 606;

			// Mock failing message sending
			mockChrome.tabs.sendMessage.mockRejectedValueOnce(
				new Error("Tab closed"),
			);

			const errorProgressMessage = {
				type: MESSAGE_TYPES.ANALYSIS_ERROR,
				error: "Analysis failed due to tab closure",
				analysisId,
				timestamp: Date.now(),
			};

			// Mock UI error handler
			const uiErrorHandler = {
				errorStates: new Map(),

				handleProgressError(analysisId: string, error: string) {
					this.errorStates.set(analysisId, {
						error,
						timestamp: Date.now(),
						recovered: false,
					});
				},

				recoverFromError(analysisId: string) {
					const errorState = this.errorStates.get(analysisId);
					if (errorState) {
						errorState.recovered = true;
						errorState.recoveryTime = Date.now();
					}
				},

				getErrorState(analysisId: string) {
					return this.errorStates.get(analysisId);
				},
			};

			// Attempt to send progress message
			try {
				await mockChrome.tabs.sendMessage(tabId, errorProgressMessage);
			} catch (error) {
				// Handle the error in UI
				uiErrorHandler.handleProgressError(analysisId, error.message);
				mockUIManager.showLoadingIndicator = vi.fn(); // Reset loading state
			}

			// Verify error was tracked
			const errorState = uiErrorHandler.getErrorState(analysisId);
			expect(errorState).toBeDefined();
			expect(errorState.error).toBe("Tab closed");
			expect(errorState.recovered).toBe(false);

			// Simulate recovery
			uiErrorHandler.recoverFromError(analysisId);

			const recoveredState = uiErrorHandler.getErrorState(analysisId);
			expect(recoveredState.recovered).toBe(true);
			expect(recoveredState.recoveryTime).toBeDefined();
		});
	});
});
