import { Check, Star } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import { getSelectedModel } from "../background/services/provider-factory";
import {
	getCurrentProvider,
	isProviderConfigured,
} from "../background/services/provider-switcher";
import {
	createCombinationTypeFilter,
	TYPE_CONFIGURATIONS,
} from "../background/type-filter-service";
import {
	generateAnalysisId,
	injectContentScript,
} from "../shared/chrome-extension-utils";
import {
	borderRadius,
	colors,
	components,
	shadows,
	spacing,
	typography,
} from "../shared/design-system";
import type { GoldenNuggetType } from "../shared/schemas";
import { storage } from "../shared/storage";
import {
	type AnalysisProgressMessage,
	type EnsembleMode,
	MESSAGE_TYPES,
	type RateLimitedMessage,
	type RetryingMessage,
	type SavedPrompt,
	type TypeFilterOptions,
} from "../shared/types";
import type { ProviderId } from "../shared/types/providers";

// Analysis ID generation moved to ChromeExtensionUtils

// Utility function to truncate long error messages for better UX
function truncateErrorMessage(
	message: string,
	maxLength: number = 200,
): string {
	if (message.length <= maxLength) return message;

	// Try to truncate at a sentence boundary first
	const truncated = message.substring(0, maxLength);
	const lastSentence = truncated.lastIndexOf(". ");
	const lastPeriod = truncated.lastIndexOf(".");

	if (lastSentence > maxLength * 0.6) {
		return `${truncated.substring(0, lastSentence + 1)} [...]`;
	} else if (lastPeriod > maxLength * 0.6) {
		return `${truncated.substring(0, lastPeriod + 1)} [...]`;
	}

	// Fallback to word boundary
	const lastSpace = truncated.lastIndexOf(" ");
	if (lastSpace > maxLength * 0.7) {
		return `${truncated.substring(0, lastSpace)}... [truncated]`;
	}

	// Hard truncation as last resort
	return `${truncated}... [truncated]`;
}

// Utility function to format model names for display
function formatModelName(provider: string, model: string): string {
	// Remove provider prefix if it's redundant
	const providerLower = provider.toLowerCase();
	const modelLower = model.toLowerCase();

	if (modelLower.startsWith(providerLower)) {
		const withoutPrefix = model.substring(provider.length).replace(/^[-_]/, "");
		return withoutPrefix || model; // Fallback to original if result is empty
	}

	return model;
}

// Custom hook for typing effect
const useTypingEffect = (text: string, speed: number = 80) => {
	const [displayText, setDisplayText] = useState("");
	const [isComplete, setIsComplete] = useState(false);
	const [showCursor, setShowCursor] = useState(false);

	useEffect(() => {
		let index = 0;
		setDisplayText("");
		setIsComplete(false);
		setShowCursor(false);

		const timer = setInterval(() => {
			if (index < text.length) {
				setDisplayText(text.substring(0, index + 1));
				index++;
			} else {
				setShowCursor(true);
				setTimeout(() => {
					setShowCursor(false);
					setIsComplete(true);
				}, 500);
				clearInterval(timer);
			}
		}, speed);

		return () => clearInterval(timer);
	}, [text, speed]);

	return { displayText, isComplete, showCursor };
};

// Custom hook for phase progression with real-time progress support
const usePhaseProgression = (
	isTypingComplete: boolean,
	analysisId?: string,
	onStateUpdate?: (
		currentPhase: number,
		completedPhases: number[],
		aiStartTime?: number,
	) => void,
) => {
	const [currentPhase, setCurrentPhase] = useState(-1);
	const [completedPhases, setCompletedPhases] = useState<number[]>([]);
	const [visiblePhases, setVisiblePhases] = useState<number[]>([]);
	const [aiStartTime, setAiStartTime] = useState<number | null>(null);
	const [useRealTiming, setUseRealTiming] = useState(true);
	const timersRef = useRef<NodeJS.Timeout[]>([]);
	const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Function to complete all remaining phases immediately
	const completeAllPhases = useCallback(() => {
		// Clear all running timers
		timersRef.current.forEach((timer) => clearTimeout(timer));
		timersRef.current = [];

		if (fallbackTimeoutRef.current) {
			clearTimeout(fallbackTimeoutRef.current);
			fallbackTimeoutRef.current = null;
		}

		// Complete all phases immediately
		setCompletedPhases([0, 1, 2]);
		setCurrentPhase(-1);
	}, []);

	// Process real-time progress messages
	const processRealTimePhase = useCallback(
		(progressMessage: AnalysisProgressMessage) => {
			// Cancel fallback timing since we're getting real messages
			if (fallbackTimeoutRef.current) {
				clearTimeout(fallbackTimeoutRef.current);
				fallbackTimeoutRef.current = null;
			}

			// Map real progress messages to phases
			let phaseIndex = -1;
			let shouldComplete = false;

			if (
				progressMessage.type === MESSAGE_TYPES.ANALYSIS_CONTENT_EXTRACTED ||
				progressMessage.type === MESSAGE_TYPES.ANALYSIS_CONTENT_OPTIMIZED
			) {
				// Steps 1-2: Setup phase (instant)
				phaseIndex = 0;
				shouldComplete = true; // These are instant, complete immediately
			} else if (
				progressMessage.type === MESSAGE_TYPES.ANALYSIS_API_REQUEST_START
			) {
				// Step 3 start: AI thinking phase begins
				phaseIndex = 1;
				setAiStartTime(Date.now()); // Track AI start time
				shouldComplete = false; // Don't complete yet, AI is thinking
			} else if (
				progressMessage.type === MESSAGE_TYPES.ANALYSIS_API_RESPONSE_RECEIVED
			) {
				// Step 3 complete: AI thinking phase completes
				phaseIndex = 1;
				shouldComplete = true;
			} else if (
				progressMessage.type === MESSAGE_TYPES.ANALYSIS_PROCESSING_RESULTS
			) {
				// Step 4: Finalize phase (instant)
				phaseIndex = 2;
				shouldComplete = true;
			} else if (
				progressMessage.type === MESSAGE_TYPES.ENSEMBLE_EXTRACTION_PROGRESS
			) {
				// Ensemble extraction progress - map to AI thinking phase
				phaseIndex = 1;
				shouldComplete = false; // Ensemble is still in progress
			} else if (
				progressMessage.type === MESSAGE_TYPES.ENSEMBLE_CONSENSUS_COMPLETE
			) {
				// Ensemble consensus complete - finalize phase
				phaseIndex = 2;
				shouldComplete = true;
			}

			if (phaseIndex >= 0) {
				// Make sure phase is visible
				setVisiblePhases((prev) => {
					const newVisible = [...prev];
					for (let i = 0; i <= phaseIndex; i++) {
						if (!newVisible.includes(i)) {
							newVisible.push(i);
						}
					}
					return newVisible;
				});

				// Set current phase if not completing
				if (!shouldComplete) {
					setCurrentPhase(phaseIndex);
					// Update persistent state
					if (onStateUpdate) {
						onStateUpdate(
							phaseIndex,
							completedPhases,
							aiStartTime || undefined,
						);
					}
				}

				// Mark as completed if this is a completion message
				if (shouldComplete) {
					setCompletedPhases((prev) => {
						const newCompleted = !prev.includes(phaseIndex)
							? [...prev, phaseIndex]
							: prev;

						// Update persistent state with new completed phases
						if (onStateUpdate && newCompleted !== prev) {
							const newCurrentPhase = phaseIndex < 2 ? -1 : phaseIndex;
							onStateUpdate(
								newCurrentPhase,
								newCompleted,
								aiStartTime || undefined,
							);
						}

						return newCompleted;
					});

					// Clear current phase if completing
					if (phaseIndex < 2) {
						setCurrentPhase(-1);
					}
				}
			}
		},
		[completedPhases, aiStartTime, onStateUpdate],
	);

	const startFallbackAnimation = useCallback(async () => {
		// Clear any existing timers
		timersRef.current.forEach((timer) => clearTimeout(timer));
		timersRef.current = [];

		// Show phases in realistic timing sequence
		// Phase 0: Setup (instant - show and complete immediately)
		setVisiblePhases([0]);
		await new Promise((resolve) => setTimeout(resolve, 200));
		setCompletedPhases([0]);

		// Phase 1: AI Thinking (show immediately, but don't complete - this is the long wait)
		setVisiblePhases([0, 1]);
		setCurrentPhase(1);
		setAiStartTime(Date.now());

		// Phase 2: Will be shown when AI completes (or timeout)
		// We don't fake complete the AI phase - that would be dishonest
		// Just let it run until real completion or user gives up

		// Optional: After a very long time (2+ minutes), suggest the user might want to try again
		const veryLongTimeoutTimer = setTimeout(() => {
			// Don't automatically complete, just keep showing "AI thinking"
			// The user can see it's been a long time and decide what to do
		}, 120000); // 2 minutes
		timersRef.current.push(veryLongTimeoutTimer);
	}, []);

	// Set up fallback timing if real messages don't arrive
	useEffect(() => {
		if (!isTypingComplete || !analysisId) return;

		// Wait for real progress messages, fall back to fake timing if none arrive
		fallbackTimeoutRef.current = setTimeout(() => {
			if (useRealTiming) {
				console.warn(
					"[Popup] Falling back to fake timing - no real progress messages received",
				);
				setUseRealTiming(false);
				startFallbackAnimation();
			}
		}, 2000);

		return () => {
			if (fallbackTimeoutRef.current) {
				clearTimeout(fallbackTimeoutRef.current);
			}
		};
	}, [isTypingComplete, analysisId, useRealTiming, startFallbackAnimation]);

	return {
		currentPhase,
		completedPhases,
		visiblePhases,
		aiStartTime,
		processRealTimePhase,
		completeAllPhases,
	};
};

function IndexPopup() {
	const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [noApiKey, setNoApiKey] = useState(false);
	const [currentProvider, setCurrentProvider] = useState<ProviderId>("gemini");
	const [currentModel, setCurrentModel] = useState<string>("");
	const [analyzing, setAnalyzing] = useState<string | null>(null);
	const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(
		null,
	);
	const [backendStatus, setBackendStatus] = useState<
		"unknown" | "available" | "unavailable"
	>("unknown");
	const [selectionMode, setSelectionMode] = useState<"quick" | "custom">(
		"quick",
	);
	const [selectedTypes, setSelectedTypes] = useState<GoldenNuggetType[]>([
		"tool",
		"media",
		"aha! moments",
		"analogy",
		"model",
	]);
	const [ensembleMode, setEnsembleMode] = useState<boolean>(false);

	// Analysis phases data - reflects real workflow timing
	const analysisPhases = [
		{
			id: "setup",
			text: "Extracted page content",
			description: "Reading and preparing your content",
			isQuick: true, // Steps 1-2 are instant
		},
		{
			id: "ai_thinking",
			text: "AI is analyzing...",
			description:
				"The AI is reading through your content and identifying golden nuggets",
			isQuick: false, // Step 3 is the long wait
			timeEstimate: "Usually takes 15-30 seconds",
			tips: [
				"💎 Looking for types: Tools, Media, Aha! Moments, Analogies, Mental Models",
				"🔍 Analyzing context and relevance to your interests",
				"⚡ Processing hundreds of words per second",
				"🎯 Filtering for the most valuable insights",
			],
			ensembleTips: [
				"🎯 Running 3 parallel analyses for higher confidence",
				"🤖 Multiple AI runs analyzing the same content independently",
				"🔄 Building consensus from multiple perspectives",
				"✨ Filtering duplicates and ranking by confidence",
			],
		},
		{
			id: "finalize",
			text: "Results ready",
			description: "Processing and displaying your golden nuggets",
			isQuick: true, // Step 4 is instant
		},
	];

	// Use custom hooks for loading animation
	const { displayText, isComplete, showCursor } = useTypingEffect(
		analyzing
			? ensembleMode
				? "Running ensemble analysis..."
				: "Analyzing your content..."
			: "",
		80,
	);

	// Callback to update persistent analysis state
	const updateAnalysisState = useCallback(
		async (
			currentPhase: number,
			completedPhases: number[],
			aiStartTime?: number,
		) => {
			if (currentAnalysisId && analyzing) {
				try {
					await storage.setAnalysisState({
						analysisId: currentAnalysisId,
						promptName: analyzing,
						startTime: Date.now(), // We don't have the original start time here, so use current
						source: "popup",
						currentPhase,
						completedPhases,
						aiStartTime,
					});
				} catch (error) {
					console.warn("Failed to update analysis state:", error);
				}
			}
		},
		[currentAnalysisId, analyzing],
	);

	const {
		currentPhase,
		completedPhases,
		visiblePhases,
		aiStartTime,
		processRealTimePhase,
		completeAllPhases,
	} = usePhaseProgression(
		isComplete,
		currentAnalysisId || undefined,
		updateAnalysisState,
	);

	// Use ref to track current analysis ID for message listener
	const currentAnalysisIdRef = useRef<string | null>(null);
	const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Force re-render for elapsed time counter
	const [, setForceUpdate] = useState(0);
	const forceUpdate = useCallback(() => setForceUpdate((prev) => prev + 1), []);

	// Cycling tips during AI thinking
	const [currentTipIndex, setCurrentTipIndex] = useState(0);

	// Update ref when analysis ID changes
	useEffect(() => {
		currentAnalysisIdRef.current = currentAnalysisId;
	}, [currentAnalysisId]);

	// Update elapsed time counter when AI is thinking
	useEffect(() => {
		if (currentPhase === 1 && aiStartTime) {
			const interval = setInterval(() => {
				forceUpdate(); // Force re-render to update elapsed time display
			}, 1000);

			return () => clearInterval(interval);
		}
	}, [currentPhase, aiStartTime, forceUpdate]);

	// Cycle through tips during AI thinking
	useEffect(() => {
		if (currentPhase === 1) {
			const aiPhase = analysisPhases[1];
			// Use ensemble tips if ensemble mode is active, otherwise use regular tips
			const tips =
				ensembleMode && aiPhase.ensembleTips
					? aiPhase.ensembleTips
					: aiPhase.tips;
			if (tips && tips.length > 1) {
				const interval = setInterval(() => {
					setCurrentTipIndex((prev) => (prev + 1) % tips.length);
				}, 3000); // Change tip every 3 seconds

				return () => clearInterval(interval);
			}
		}
	}, [currentPhase, ensembleMode]);

	// Check backend availability
	const checkBackendStatus = useCallback(async () => {
		try {
			const response = await chrome.runtime.sendMessage({
				type: MESSAGE_TYPES.GET_FEEDBACK_STATS,
			});

			if (response.success) {
				setBackendStatus(response.warning ? "unavailable" : "available");
			} else {
				setBackendStatus("unavailable");
			}
		} catch (error) {
			console.error("Failed to check backend status:", error);
			setBackendStatus("unavailable");
		}
	}, []);

	const loadPrompts = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			setNoApiKey(false);

			// Get current provider and check if it's configured
			const provider = await getCurrentProvider();
			setCurrentProvider(provider);

			// Get current model for the provider
			const model = await getSelectedModel(provider);
			setCurrentModel(model);

			const isConfigured = await isProviderConfigured(provider);
			if (!isConfigured) {
				setNoApiKey(true);
				setLoading(false);
				return;
			}

			// Load prompts
			const userPrompts = await storage.getPrompts();

			// Sort prompts to show default first
			const sortedPrompts = [...userPrompts].sort((a, b) => {
				if (a.isDefault && !b.isDefault) return -1;
				if (!a.isDefault && b.isDefault) return 1;
				return a.name.localeCompare(b.name);
			});

			setPrompts(sortedPrompts);
		} catch (err) {
			console.error("Failed to load prompts:", err);
			setError("Failed to load prompts. Please try again.");
		} finally {
			setLoading(false);
		}
	}, []);
	const restoreAnalysisState = useCallback(async () => {
		try {
			// Use the new validation method that automatically clears stale states
			const savedState = await storage.getActiveAnalysisState();
			if (!savedState) {
				// No active analysis state found
				return;
			}

			// Restore UI state for genuinely active analysis
			setAnalyzing(savedState.promptName);
			setCurrentAnalysisId(savedState.analysisId);
			currentAnalysisIdRef.current = savedState.analysisId;

			// Restore phase progression state if available
			if (
				savedState.currentPhase >= 0 ||
				savedState.completedPhases.length > 0
			) {
				// Restore completed phases first
				for (const phaseIndex of savedState.completedPhases) {
					let messageType: AnalysisProgressMessage["type"];
					if (phaseIndex === 0) {
						messageType = MESSAGE_TYPES.ANALYSIS_CONTENT_EXTRACTED;
					} else if (phaseIndex === 1) {
						messageType = MESSAGE_TYPES.ANALYSIS_API_RESPONSE_RECEIVED;
					} else {
						messageType = MESSAGE_TYPES.ANALYSIS_PROCESSING_RESULTS;
					}

					processRealTimePhase({
						type: messageType,
						step: (phaseIndex + 1) as 1 | 2 | 3 | 4,
						message: "Restoring completed phase...",
						timestamp: Date.now(),
						analysisId: savedState.analysisId,
						source: savedState.source,
					} as AnalysisProgressMessage);
				}

				// If there's a current phase (in progress), restore it
				if (
					savedState.currentPhase >= 0 &&
					!savedState.completedPhases.includes(savedState.currentPhase)
				) {
					processRealTimePhase({
						type: MESSAGE_TYPES.ANALYSIS_API_REQUEST_START,
						step: 3,
						message: "Analysis in progress...",
						timestamp: Date.now(),
						analysisId: savedState.analysisId,
						source: savedState.source,
					} as AnalysisProgressMessage);
				}
			}
		} catch (error) {
			console.warn("Failed to restore analysis state:", error);
			// Clear any potentially invalid state
			storage.clearAnalysisState().catch(() => {});
		}
	}, [processRealTimePhase]);

	useEffect(() => {
		loadPrompts();
		checkBackendStatus();
		restoreAnalysisState();

		// Defensive cleanup: Double-check for zombie analysis states after restoration
		// This provides an additional safety net against persistent loading screens
		const defensiveCleanupTimeout = setTimeout(async () => {
			try {
				const currentState = await storage.getActiveAnalysisState();
				if (currentState) {
					const ageInMinutes =
						(Date.now() - currentState.startTime) / (1000 * 60);

					// If state was restored but is clearly stale, force clear it
					// This catches edge cases where validation didn't catch zombie states
					if (
						ageInMinutes > 2 ||
						(currentState.currentPhase === 2 && ageInMinutes > 0.5) ||
						(currentState.completedPhases.includes(2) && ageInMinutes > 0.25)
					) {
						console.warn(
							"[Popup] Defensive cleanup: Clearing zombie analysis state",
							{
								analysisId: currentState.analysisId,
								ageMinutes: ageInMinutes.toFixed(2),
								currentPhase: currentState.currentPhase,
								completedPhases: currentState.completedPhases,
							},
						);

						// Clear both UI and persistent state
						setAnalyzing(null);
						setCurrentAnalysisId(null);
						currentAnalysisIdRef.current = null;
						await storage.clearAnalysisState();
					}
				}
			} catch (error) {
				console.warn("[Popup] Defensive cleanup failed:", error);
			}
		}, 500); // Run after 500ms to allow restoration to complete

		// Helper function to clear analysis state reliably
		const clearAnalysisStateImmediately = async (reason: string) => {
			console.log(`[Popup] Clearing analysis state: ${reason}`);

			// Clear any pending cleanup timeout
			if (cleanupTimeoutRef.current) {
				clearTimeout(cleanupTimeoutRef.current);
				cleanupTimeoutRef.current = null;
			}

			// Clear UI state immediately
			setAnalyzing(null);
			setCurrentAnalysisId(null);
			currentAnalysisIdRef.current = null;

			// Clear persisted analysis state with improved error handling
			try {
				await storage.clearAnalysisState();
				console.log("[Popup] Analysis state cleared successfully");
			} catch (error) {
				console.error("Failed to clear analysis state:", error);
				// Even if storage clearing fails, UI state is already cleared
			}
		};

		// Add message listener for analysis completion and progress
		const messageListener = async (
			message:
				| AnalysisProgressMessage
				| RateLimitedMessage
				| RetryingMessage
				| { type: string; error?: string },
		) => {
			// Handle completion messages
			if (message.type === MESSAGE_TYPES.ANALYSIS_COMPLETE) {
				completeAllPhases();
				// Brief delay to show completion, then clear analyzing state
				setTimeout(async () => {
					await clearAnalysisStateImmediately("analysis completed");
				}, 600);
			} else if (message.type === MESSAGE_TYPES.ANALYSIS_ERROR) {
				completeAllPhases();
				// Clear analysis state immediately on error (no delay)
				await clearAnalysisStateImmediately("analysis error occurred");
				// Display the actual error message to the user
				setError(message.error || "Analysis failed. Please try again.");
			}

			// Handle real-time progress messages (only for current analysis)
			if (
				currentAnalysisIdRef.current &&
				"analysisId" in message &&
				message.analysisId === currentAnalysisIdRef.current &&
				(message.type === MESSAGE_TYPES.ANALYSIS_CONTENT_EXTRACTED ||
					message.type === MESSAGE_TYPES.ANALYSIS_CONTENT_OPTIMIZED ||
					message.type === MESSAGE_TYPES.ANALYSIS_API_REQUEST_START ||
					message.type === MESSAGE_TYPES.ANALYSIS_API_RESPONSE_RECEIVED ||
					message.type === MESSAGE_TYPES.ANALYSIS_PROCESSING_RESULTS ||
					message.type === MESSAGE_TYPES.ENSEMBLE_EXTRACTION_PROGRESS ||
					message.type === MESSAGE_TYPES.ENSEMBLE_CONSENSUS_COMPLETE)
			) {
				processRealTimePhase(message as AnalysisProgressMessage);
			}
		};

		chrome.runtime.onMessage.addListener(messageListener);

		return () => {
			chrome.runtime.onMessage.removeListener(messageListener);

			// Clear defensive cleanup timeout
			if (defensiveCleanupTimeout) {
				clearTimeout(defensiveCleanupTimeout);
			}

			if (cleanupTimeoutRef.current) {
				clearTimeout(cleanupTimeoutRef.current);
				cleanupTimeoutRef.current = null;
			}

			// Keep analysis state persistent across popup close/open cycles
			// Analysis state should only be cleared when:
			// 1. Analysis actually completes (success/error)
			// 2. New analysis starts (explicit replacement)
			// 3. State is genuinely stale (>10 minutes old)
			console.log(
				"[Popup] Popup unmounting, preserving analysis state for persistence",
			);
		};
	}, [
		checkBackendStatus,
		completeAllPhases,
		loadPrompts,
		processRealTimePhase,
		restoreAnalysisState,
	]); // Remove dependencies to prevent infinite re-renders

	const analyzeWithPrompt = async (promptId: string) => {
		try {
			// Clear any existing analysis state before starting new analysis
			console.log(
				"[Popup] Clearing any existing analysis state before starting new analysis",
			);
			await storage.clearAnalysisState().catch(() => {
				// Ignore errors - we're about to create new state anyway
			});

			// Find the prompt name for better UX
			const prompt = prompts.find((p) => p.id === promptId);
			const promptName = prompt?.name || "Unknown";

			// Generate unique analysis ID for progress tracking
			const analysisId = generateAnalysisId();

			// Show immediate feedback and set analysis ID
			setAnalyzing(promptName);
			setCurrentAnalysisId(analysisId);
			// Update ref immediately so message listener can access it
			currentAnalysisIdRef.current = analysisId;

			// Save analysis state for popup persistence
			try {
				await storage.setAnalysisState({
					analysisId,
					promptName,
					startTime: Date.now(),
					source: "popup",
					currentPhase: -1,
					completedPhases: [],
				});
			} catch (error) {
				console.warn("Failed to save analysis state:", error);
				// Continue with analysis even if state saving fails
			}

			// Get the current active tab
			const [tab] = await chrome.tabs.query({
				active: true,
				currentWindow: true,
			});

			if (!tab.id) {
				throw new Error("No active tab found");
			}

			// Inject content script dynamically
			await injectContentScript(tab.id);

			// Create type filter options
			const typeFilter: TypeFilterOptions =
				createCombinationTypeFilter(selectedTypes);

			// Send message to content script - route based on extraction mode
			if (ensembleMode) {
				// Get ensemble settings for ensemble analysis
				let ensembleOptions: { runs: number; mode: EnsembleMode } = {
					runs: 3,
					mode: "balanced",
				};
				try {
					const ensembleSettings = await storage.getEnsembleSettings();
					if (ensembleSettings.enabled) {
						ensembleOptions = {
							runs: ensembleSettings.defaultRuns,
							mode: ensembleSettings.defaultMode,
						};
					}
				} catch (error) {
					console.warn(
						"Failed to get ensemble settings from popup, using defaults:",
						error,
					);
				}

				// Send ensemble analysis message
				await chrome.tabs.sendMessage(tab.id, {
					type: MESSAGE_TYPES.ANALYZE_CONTENT_ENSEMBLE,
					promptId: promptId,
					source: "popup",
					analysisId: analysisId,
					typeFilter: typeFilter,
					ensembleOptions,
				});
			} else {
				// Send regular analysis message
				await chrome.tabs.sendMessage(tab.id, {
					type: MESSAGE_TYPES.ANALYZE_CONTENT,
					promptId: promptId,
					source: "popup",
					analysisId: analysisId,
					typeFilter: typeFilter,
				});
			}

			// Listen for analysis completion - don't close popup immediately
			const listener = (message: { type: string; error?: string }) => {
				if (
					message.type === MESSAGE_TYPES.ANALYSIS_COMPLETE ||
					message.type === MESSAGE_TYPES.ANALYSIS_ERROR
				) {
					chrome.runtime.onMessage.removeListener(listener);
					// Don't close popup immediately - let the progress animation complete first
					setTimeout(() => {
						window.close();
					}, 1000);
				}
			};
			chrome.runtime.onMessage.addListener(listener);
		} catch (err) {
			console.error("Failed to start analysis:", err);
			// Clear all analysis state on error
			setAnalyzing(null);
			setCurrentAnalysisId(null);
			currentAnalysisIdRef.current = null;
			// Also clear persisted state
			storage.clearAnalysisState().catch(() => {
				// Ignore errors in cleanup
			});
			setError("Failed to start analysis. Please try again.");
		}
	};

	const enterSelectionMode = async (promptId: string) => {
		try {
			// Get the current active tab
			const [tab] = await chrome.tabs.query({
				active: true,
				currentWindow: true,
			});

			if (!tab.id) {
				throw new Error("No active tab found");
			}

			// Inject content script dynamically
			await injectContentScript(tab.id);

			// Create type filter options
			const typeFilter: TypeFilterOptions =
				createCombinationTypeFilter(selectedTypes);

			// Send message to content script to enter selection mode
			await chrome.tabs.sendMessage(tab.id, {
				type: MESSAGE_TYPES.ENTER_SELECTION_MODE,
				promptId: promptId,
				typeFilter: typeFilter,
			});

			// Close popup immediately since user needs to interact with page
			window.close();
		} catch (err) {
			console.error("Failed to enter selection mode:", err);
			setError("Failed to enter selection mode. Please try again.");
		}
	};

	// Content script injection moved to injectContentScript

	const openOptionsPage = () => {
		chrome.runtime.openOptionsPage();
		window.close();
	};

	if (loading) {
		return (
			<div
				style={{
					padding: spacing["2xl"],
					textAlign: "center",
					fontFamily: typography.fontFamily.sans,
					backgroundColor: colors.background.primary,
				}}
			>
				<div
					style={{
						color: colors.text.primary,
						fontSize: typography.fontSize.sm,
						fontWeight: typography.fontWeight.medium,
						marginBottom: spacing.lg,
					}}
				>
					Loading prompts...
				</div>
				<div
					style={{
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
						gap: spacing.xs,
					}}
				>
					<div
						style={{
							width: "6px",
							height: "6px",
							borderRadius: "50%",
							backgroundColor: colors.text.secondary,
							animation: "pulse 1.5s ease-in-out infinite",
						}}
					></div>
					<div
						style={{
							width: "6px",
							height: "6px",
							borderRadius: "50%",
							backgroundColor: colors.text.secondary,
							animation: "pulse 1.5s ease-in-out infinite 0.2s",
						}}
					></div>
					<div
						style={{
							width: "6px",
							height: "6px",
							borderRadius: "50%",
							backgroundColor: colors.text.secondary,
							animation: "pulse 1.5s ease-in-out infinite 0.4s",
						}}
					></div>
				</div>
				<style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.3; transform: scale(0.8); }
            50% { opacity: 1; transform: scale(1.2); }
          }
        `}</style>
			</div>
		);
	}

	if (error) {
		return (
			<div
				style={{
					padding: spacing["2xl"],
					fontFamily: typography.fontFamily.sans,
					backgroundColor: colors.background.primary,
				}}
			>
				<div
					style={{
						textAlign: "center",
						color: colors.error,
						backgroundColor: colors.background.secondary,
						border: `1px solid ${colors.error}33`,
						borderRadius: borderRadius.md,
						padding: spacing["2xl"],
						fontSize: typography.fontSize.sm,
						fontWeight: typography.fontWeight.medium,
						display: "flex",
						flexDirection: "column",
						gap: spacing.md,
						alignItems: "center",
					}}
				>
					<div
						style={{
							wordWrap: "break-word",
							overflowWrap: "break-word",
							hyphens: "auto",
							maxWidth: "100%",
							lineHeight: "1.4",
						}}
						title={error.length > 200 ? error : undefined} // Show full error on hover if truncated
					>
						{truncateErrorMessage(error)}
					</div>
					<button
						type="button"
						onClick={() => {
							setError(null);
							loadPrompts();
							checkBackendStatus();
						}}
						style={{
							...components.button.secondary,
							fontSize: typography.fontSize.sm,
							padding: `${spacing.xs} ${spacing.md}`,
						}}
					>
						Try Again
					</button>
				</div>
			</div>
		);
	}

	if (noApiKey) {
		const providerName =
			currentProvider.charAt(0).toUpperCase() + currentProvider.slice(1);
		return (
			<div
				style={{
					padding: spacing["2xl"],
					fontFamily: typography.fontFamily.sans,
					backgroundColor: colors.background.primary,
				}}
			>
				<div
					style={{
						textAlign: "center",
						color: colors.text.primary,
						backgroundColor: colors.background.secondary,
						border: `1px solid ${colors.text.secondary}33`,
						borderRadius: borderRadius.md,
						padding: spacing["2xl"],
						fontSize: typography.fontSize.sm,
						fontWeight: typography.fontWeight.medium,
						lineHeight: typography.lineHeight.normal,
					}}
				>
					Please set your {providerName} API key in the{" "}
					<button
						type="button"
						onClick={openOptionsPage}
						style={{
							...components.button.ghost,
							padding: "0",
							color: colors.text.accent,
							textDecoration: "underline",
							fontSize: "inherit",
							fontWeight: "inherit",
						}}
					>
						options page
					</button>
					.
				</div>
			</div>
		);
	}

	if (analyzing) {
		// Helper to get elapsed time since AI started
		const getElapsedTime = () => {
			if (!aiStartTime) return 0;
			return Math.floor((Date.now() - aiStartTime) / 1000);
		};

		// Find the current active phase
		const activePhaseIndex =
			currentPhase >= 0
				? currentPhase
				: completedPhases.length > 0
					? Math.max(...completedPhases)
					: -1;
		const _activePhase =
			activePhaseIndex >= 0 ? analysisPhases[activePhaseIndex] : null;

		return (
			<div
				style={{
					minHeight: "260px",
					padding: spacing["2xl"],
					display: "flex",
					flexDirection: "column",
					gap: spacing.lg,
					fontFamily: typography.fontFamily.sans,
					backgroundColor: colors.background.primary,
				}}
			>
				{/* Header with AI avatar and typing text */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: spacing.xs,
						marginBottom: spacing.md,
					}}
				>
					{/* AI Avatar */}
					<div
						style={{
							width: "16px",
							height: "16px",
							borderRadius: "50%",
							background: colors.text.accent,
							boxShadow: `0 0 8px ${colors.text.accent}40`,
							flexShrink: 0,
							animation:
								currentPhase === 1 ? "glow 2s ease-in-out infinite" : "none",
						}}
					/>

					{/* Typing text */}
					<div
						style={{
							color: colors.text.primary,
							fontSize: typography.fontSize.sm,
							fontWeight: typography.fontWeight.medium,
							flex: 1,
						}}
					>
						{displayText}
						{showCursor && (
							<span style={{ opacity: 0.7, marginLeft: "2px" }}>|</span>
						)}
					</div>
				</div>

				{/* Quick status indicators for completed phases */}
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: spacing.sm,
						marginBottom: spacing.md,
					}}
				>
					{analysisPhases.map((phase, index) => {
						const isVisible = visiblePhases.includes(index);
						const isInProgress = currentPhase === index;
						const isCompleted = completedPhases.includes(index);

						if (!isVisible) return null;

						let indicator: string | React.ReactElement = "○";
						let indicatorColor = colors.text.tertiary;
						let textColor = colors.text.tertiary;
						let indicatorAnimation = "none";

						if (isCompleted) {
							indicator = <Check size={16} />;
							indicatorColor = colors.text.accent;
							textColor = colors.text.primary;
						} else if (isInProgress) {
							if (phase.isQuick) {
								// Quick phases just show a brief spinner
								indicator = "●";
								indicatorColor = colors.text.accent;
								textColor = colors.text.secondary;
								indicatorAnimation = "spin 1s linear infinite";
							} else {
								// AI thinking phase - special treatment
								indicator = "🧠";
								indicatorColor = colors.text.accent;
								textColor = colors.text.primary;
							}
						}

						return (
							<div
								key={phase.id}
								style={{
									display: "flex",
									alignItems: "flex-start",
									gap: spacing.sm,
									opacity: isVisible ? 1 : 0,
									transform: isVisible ? "translateY(0)" : "translateY(10px)",
									transition: "all 0.3s ease",
									padding:
										isInProgress && !phase.isQuick ? spacing.md : spacing.xs,
									backgroundColor:
										isInProgress && !phase.isQuick
											? colors.background.secondary
											: "transparent",
									borderRadius:
										isInProgress && !phase.isQuick ? borderRadius.md : "0",
									border:
										isInProgress && !phase.isQuick
											? `1px solid ${colors.border.light}`
											: "none",
								}}
							>
								<div
									style={{
										fontSize: typography.fontSize.sm,
										fontWeight: typography.fontWeight.medium,
										color: indicatorColor,
										width: "20px",
										textAlign: "center",
										flexShrink: 0,
										animation: indicatorAnimation,
									}}
								>
									{indicator}
								</div>
								<div
									style={{
										flex: 1,
										display: "flex",
										flexDirection: "column",
										gap: spacing.xs,
									}}
								>
									<div
										style={{
											fontSize: typography.fontSize.sm,
											color: textColor,
											fontWeight: typography.fontWeight.medium,
										}}
									>
										{phase.text}
									</div>

									{/* Show additional info for active AI phase */}
									{isInProgress && !phase.isQuick && (
										<>
											{/* Show cycling tips if available, otherwise description */}
											<div
												style={{
													fontSize: typography.fontSize.xs,
													color: colors.text.secondary,
													fontWeight: typography.fontWeight.normal,
													lineHeight: typography.lineHeight.normal,
													minHeight: "40px", // Prevent layout shift
													display: "flex",
													alignItems: "center",
													transition: "opacity 0.3s ease",
												}}
											>
												{(() => {
													const tips =
														ensembleMode && phase.ensembleTips
															? phase.ensembleTips
															: phase.tips;
													return tips && tips.length > 0
														? tips[currentTipIndex]
														: phase.description;
												})()}
											</div>

											{/* Time estimate and elapsed time */}
											<div
												style={{
													display: "flex",
													justifyContent: "space-between",
													alignItems: "center",
													marginTop: spacing.xs,
													fontSize: typography.fontSize.xs,
													color: colors.text.tertiary,
												}}
											>
												<span>{phase.timeEstimate}</span>
												{aiStartTime && (
													<span>{getElapsedTime()}s elapsed</span>
												)}
											</div>

											{/* Indeterminate progress bar for AI thinking */}
											<div
												style={{
													width: "100%",
													height: "4px",
													backgroundColor: colors.background.primary,
													borderRadius: "2px",
													overflow: "hidden",
													marginTop: spacing.xs,
												}}
											>
												<div
													style={{
														width: "30%",
														height: "100%",
														backgroundColor: colors.text.accent,
														borderRadius: "2px",
														animation: "slide 2s ease-in-out infinite",
													}}
												/>
											</div>
										</>
									)}
								</div>
							</div>
						);
					})}
				</div>

				{/* Prompt display */}
				<div
					style={{
						textAlign: "center",
						paddingTop: spacing.md,
						borderTop: `1px solid ${colors.border.light}`,
					}}
				>
					<div
						style={{
							color: colors.text.tertiary,
							fontSize: typography.fontSize.xs,
							fontWeight: typography.fontWeight.normal,
							marginBottom: spacing.xs,
						}}
					>
						Using:
					</div>
					<div
						style={{
							color: colors.text.accent,
							fontSize: typography.fontSize.sm,
							fontWeight: typography.fontWeight.semibold,
						}}
					>
						{analyzing}
					</div>
				</div>

				<style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.3; transform: scale(0.8); }
            50% { opacity: 1; transform: scale(1.2); }
          }
          
          @keyframes glow {
            0%, 100% { 
              box-shadow: 0 0 8px ${colors.text.accent}40;
            }
            50% { 
              box-shadow: 0 0 16px ${colors.text.accent}80;
            }
          }
          
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          
          @keyframes slide {
            0% { transform: translateX(-100%); }
            50% { transform: translateX(250%); }
            100% { transform: translateX(-100%); }
          }
        `}</style>
			</div>
		);
	}

	return (
		<div
			style={{
				fontFamily: typography.fontFamily.sans,
				backgroundColor: colors.background.primary,
				borderRadius: borderRadius.lg,
				overflow: "hidden",
				boxShadow: shadows.lg,
			}}
		>
			<div
				style={{
					backgroundColor: colors.background.primary,
					color: colors.text.primary,
					padding: spacing["2xl"],
					textAlign: "center",
					borderBottom: `1px solid ${colors.border.light}`,
				}}
			>
				<h1
					style={{
						margin: 0,
						fontSize: typography.fontSize.lg,
						fontWeight: typography.fontWeight.semibold,
						color: colors.text.primary,
						marginBottom: spacing.xs,
					}}
				>
					Golden Nugget Finder
				</h1>

				{/* Backend Status */}
				{backendStatus !== "unknown" && (
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							gap: spacing.xs,
							marginBottom: spacing.xs,
							fontSize: typography.fontSize.xs,
							color: colors.text.secondary,
						}}
					>
						<div
							style={{
								width: "6px",
								height: "6px",
								borderRadius: "50%",
								backgroundColor:
									backendStatus === "available" ? colors.success : colors.error,
							}}
						/>
						<span>
							Backend: {backendStatus === "available" ? "Connected" : "Offline"}
						</span>
						{backendStatus === "unavailable" && (
							<>
								<span
									style={{
										fontSize: typography.fontSize.xs,
										color: colors.text.secondary,
									}}
								>
									{" "}
									(Using local mode)
								</span>
								<button
									type="button"
									onClick={checkBackendStatus}
									style={{
										marginLeft: spacing.xs,
										fontSize: typography.fontSize.xs,
										padding: "2px 6px",
										backgroundColor: "transparent",
										color: colors.text.accent,
										border: `1px solid ${colors.text.accent}`,
										borderRadius: "3px",
										cursor: "pointer",
									}}
									title="Retry backend connection"
								>
									Retry
								</button>
							</>
						)}
					</div>
				)}

				{/* AI Provider Status */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						gap: spacing.xs,
						marginBottom: spacing.md,
						fontSize: typography.fontSize.xs,
						color: colors.text.secondary,
					}}
				>
					<span>🤖</span>
					<span>
						{currentProvider.charAt(0).toUpperCase() + currentProvider.slice(1)}
					</span>
					{currentModel && (
						<span>{formatModelName(currentProvider, currentModel)}</span>
					)}
					<button
						type="button"
						onClick={openOptionsPage}
						style={{
							fontSize: typography.fontSize.xs,
							padding: "1px 4px",
							backgroundColor: "transparent",
							color: colors.text.accent,
							border: "none",
							cursor: "pointer",
						}}
						title="Change provider and model"
					>
						⚙️
					</button>
				</div>

				{/* Ensemble Mode Toggle */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						gap: spacing.sm,
						marginBottom: spacing.md,
						padding: spacing.sm,
						backgroundColor: ensembleMode
							? colors.background.secondary
							: "transparent",
						borderRadius: borderRadius.md,
						border: `1px solid ${
							ensembleMode ? `${colors.text.accent}33` : colors.border.light
						}`,
						transition: "all 0.2s ease",
					}}
				>
					<span
						style={{
							fontSize: typography.fontSize.sm,
							fontWeight: typography.fontWeight.medium,
							color: ensembleMode ? colors.text.accent : colors.text.secondary,
						}}
					>
						🎯 Ensemble Mode (3 runs)
					</span>
					<button
						type="button"
						onClick={() => setEnsembleMode(!ensembleMode)}
						style={{
							width: "44px",
							height: "24px",
							backgroundColor: ensembleMode
								? colors.text.accent
								: colors.background.primary,
							border: `2px solid ${
								ensembleMode ? colors.text.accent : colors.border.default
							}`,
							borderRadius: "12px",
							cursor: "pointer",
							transition: "all 0.2s ease",
							position: "relative",
						}}
						title="Toggle ensemble mode for higher confidence results (3x cost)"
					>
						<div
							style={{
								width: "16px",
								height: "16px",
								backgroundColor: ensembleMode
									? colors.background.primary
									: colors.text.tertiary,
								borderRadius: "50%",
								transition: "all 0.2s ease",
								transform: ensembleMode
									? "translateX(20px)"
									: "translateX(0px)",
								position: "absolute",
								top: "2px",
								left: "2px",
							}}
						/>
					</button>
				</div>

				{/* Mode Toggle */}
				<div
					style={{
						display: "flex",
						backgroundColor: colors.background.secondary,
						borderRadius: borderRadius.md,
						padding: spacing.xs,
						gap: spacing.xs,
					}}
				>
					<button
						type="button"
						onClick={() => setSelectionMode("quick")}
						style={{
							flex: 1,
							padding: `${spacing.sm} ${spacing.md}`,
							backgroundColor:
								selectionMode === "quick"
									? colors.background.primary
									: "transparent",
							color:
								selectionMode === "quick"
									? colors.text.primary
									: colors.text.secondary,
							border: "none",
							borderRadius: borderRadius.sm,
							fontSize: typography.fontSize.sm,
							fontWeight: typography.fontWeight.medium,
							cursor: "pointer",
							transition: "all 0.2s ease",
							boxShadow: selectionMode === "quick" ? shadows.sm : "none",
						}}
					>
						Quick Analysis
					</button>
					<button
						type="button"
						onClick={() => setSelectionMode("custom")}
						style={{
							flex: 1,
							padding: `${spacing.sm} ${spacing.md}`,
							backgroundColor:
								selectionMode === "custom"
									? colors.background.primary
									: "transparent",
							color:
								selectionMode === "custom"
									? colors.text.primary
									: colors.text.secondary,
							border: "none",
							borderRadius: borderRadius.sm,
							fontSize: typography.fontSize.sm,
							fontWeight: typography.fontWeight.medium,
							cursor: "pointer",
							transition: "all 0.2s ease",
							boxShadow: selectionMode === "custom" ? shadows.sm : "none",
						}}
					>
						Custom Selection
					</button>
				</div>
			</div>

			{/* Type Selection Section */}
			<div
				style={{
					padding: spacing["2xl"],
					backgroundColor: colors.background.secondary,
					borderBottom: `1px solid ${colors.border.light}`,
				}}
			>
				<div
					style={{
						marginBottom: spacing.md,
						fontSize: typography.fontSize.sm,
						fontWeight: typography.fontWeight.semibold,
						color: colors.text.primary,
					}}
				>
					Select Types to Find:
				</div>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: spacing.sm,
					}}
				>
					{TYPE_CONFIGURATIONS.map((typeConfig) => (
						<label
							key={typeConfig.type}
							style={{
								display: "flex",
								alignItems: "center",
								gap: spacing.sm,
								cursor: "pointer",
								padding: spacing.sm,
								borderRadius: borderRadius.sm,
								transition: "background-color 0.2s ease",
								backgroundColor: selectedTypes.includes(typeConfig.type)
									? colors.background.primary
									: "transparent",
							}}
							onMouseEnter={(e) => {
								if (!selectedTypes.includes(typeConfig.type)) {
									e.currentTarget.style.backgroundColor = `${colors.background.primary}50`;
								}
							}}
							onMouseLeave={(e) => {
								if (!selectedTypes.includes(typeConfig.type)) {
									e.currentTarget.style.backgroundColor = "transparent";
								}
							}}
						>
							<input
								type="checkbox"
								checked={selectedTypes.includes(typeConfig.type)}
								onChange={(e) => {
									if (e.target.checked) {
										setSelectedTypes([...selectedTypes, typeConfig.type]);
									} else {
										setSelectedTypes(
											selectedTypes.filter((t) => t !== typeConfig.type),
										);
									}
								}}
								style={{
									width: "16px",
									height: "16px",
									marginRight: spacing.xs,
									accentColor: colors.text.accent,
								}}
							/>
							<span
								style={{
									fontSize: typography.fontSize.sm,
									fontWeight: typography.fontWeight.medium,
								}}
							>
								{typeConfig.emoji}
							</span>
							<span
								style={{
									fontSize: typography.fontSize.sm,
									fontWeight: typography.fontWeight.medium,
									color: colors.text.primary,
								}}
							>
								{typeConfig.label}
							</span>
						</label>
					))}
				</div>
			</div>

			<div
				style={{
					padding: spacing["2xl"],
					backgroundColor: colors.background.primary,
				}}
			>
				<div
					style={{
						listStyle: "none",
						padding: 0,
						margin: 0,
						display: "flex",
						flexDirection: "column",
						gap: spacing.sm,
					}}
				>
					{prompts.map((prompt) => (
						<button
							type="button"
							key={prompt.id}
							data-testid="prompt-item"
							onClick={() =>
								selectionMode === "quick"
									? analyzeWithPrompt(prompt.id)
									: enterSelectionMode(prompt.id)
							}
							style={{
								padding: spacing.lg,
								backgroundColor: prompt.isDefault
									? colors.background.secondary
									: colors.background.secondary,
								border: `1px solid ${prompt.isDefault ? `${colors.text.accent}33` : colors.border.light}`,
								borderRadius: borderRadius.md,
								cursor: "pointer",
								transition: "all 0.2s ease",
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								fontSize: typography.fontSize.sm,
								fontWeight: typography.fontWeight.medium,
								color: colors.text.primary,
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.backgroundColor = prompt.isDefault
									? colors.background.secondary
									: colors.background.secondary;
								e.currentTarget.style.borderColor = colors.border.default;
								e.currentTarget.style.boxShadow = shadows.sm;
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.backgroundColor = prompt.isDefault
									? colors.background.secondary
									: colors.background.secondary;
								e.currentTarget.style.borderColor = prompt.isDefault
									? `${colors.text.accent}33`
									: colors.border.light;
								e.currentTarget.style.boxShadow = "none";
							}}
						>
							<div
								style={{
									display: "flex",
									flexDirection: "column",
									alignItems: "flex-start",
									gap: spacing.xs,
								}}
							>
								<span
									style={{
										fontWeight: typography.fontWeight.medium,
										color: colors.text.primary,
									}}
								>
									{prompt.name}
								</span>
								{selectionMode === "custom" && (
									<span
										style={{
											fontSize: typography.fontSize.xs,
											color: colors.text.secondary,
											fontWeight: typography.fontWeight.normal,
										}}
									>
										Select & Analyze
									</span>
								)}
							</div>
							{prompt.isDefault && (
								<span
									style={{
										backgroundColor: colors.text.accent,
										color: colors.background.primary,
										padding: `${spacing.xs} ${spacing.sm}`,
										borderRadius: borderRadius.sm,
										fontSize: typography.fontSize.xs,
										fontWeight: typography.fontWeight.medium,
									}}
								>
									<Star size={16} />
								</span>
							)}
						</button>
					))}
				</div>
			</div>

			<div
				style={{
					padding: spacing["2xl"],
					backgroundColor: colors.background.secondary,
					borderTop: `1px solid ${colors.border.light}`,
					textAlign: "center",
				}}
			>
				<button
					type="button"
					onClick={openOptionsPage}
					style={{
						...components.button.ghost,
						color: colors.text.accent,
						fontSize: typography.fontSize.sm,
						fontWeight: typography.fontWeight.medium,
					}}
				>
					Manage Prompts & Settings
				</button>
			</div>
		</div>
	);
}

export default {
	main() {
		const rootElement = document.getElementById("root");
		if (!rootElement) {
			throw new Error("Root element not found");
		}
		const root = ReactDOM.createRoot(rootElement);
		root.render(<IndexPopup />);
	},
};
