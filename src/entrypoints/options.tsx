import {
	CircleAlert,
	CircleCheck,
	ExternalLink,
	FileText,
	Heart,
	Key,
	Lock,
	Pencil,
	Plus,
	Sparkles,
	Star,
	StickyNote,
	Trash,
	X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import {
	type ModelInfo,
	ModelService,
} from "../background/services/model-service";
import {
	createProvider,
	getDefaultModel,
	getSelectedModel,
} from "../background/services/provider-factory";
import { debugLogger } from "../shared/debug";
import {
	borderRadius,
	colors,
	components,
	shadows,
	spacing,
	typography,
} from "../shared/design-system";
import { storage } from "../shared/storage";
import * as ApiKeyStorage from "../shared/storage/api-key-storage";
import * as ModelStorage from "../shared/storage/model-storage";
import type { SavedPrompt } from "../shared/types";
import type { ProviderId } from "../shared/types/providers";

type AlertType = "success" | "error" | "warning" | "info";

interface AlertProps {
	type: AlertType;
	title: string;
	message: string;
	onClose: () => void;
}

const Alert: React.FC<AlertProps> = ({ type, title, message, onClose }) => {
	const getAlertStyles = () => {
		const baseStyles = {
			padding: spacing.lg,
			borderRadius: borderRadius.md,
			border: "1px solid",
			marginBottom: spacing.lg,
			display: "flex",
			alignItems: "flex-start",
			gap: spacing.md,
			fontSize: typography.fontSize.sm,
			fontWeight: typography.fontWeight.medium,
		};

		switch (type) {
			case "success":
				return {
					...baseStyles,
					backgroundColor: colors.background.secondary,
					borderColor: `${colors.success}33`,
					color: colors.success,
				};
			case "error":
				return {
					...baseStyles,
					backgroundColor: colors.background.secondary,
					borderColor: `${colors.error}33`,
					color: colors.error,
				};
			case "warning":
				return {
					...baseStyles,
					backgroundColor: colors.background.secondary,
					borderColor: `${colors.text.secondary}33`,
					color: colors.text.secondary,
				};
			case "info":
				return {
					...baseStyles,
					backgroundColor: colors.background.secondary,
					borderColor: `${colors.text.accent}33`,
					color: colors.text.accent,
				};
			default:
				return baseStyles;
		}
	};

	const getIcon = () => {
		switch (type) {
			case "success":
				return <CircleCheck size={20} />;
			case "error":
			case "warning":
				return <CircleAlert size={20} />;
			case "info":
				return <CircleAlert size={20} />;
			default:
				return null;
		}
	};

	return (
		<div style={getAlertStyles()}>
			<div style={{ flexShrink: 0 }}>{getIcon()}</div>
			<div style={{ flex: 1 }}>
				<div style={{ fontWeight: "600", marginBottom: "4px" }}>{title}</div>
				<div style={{ fontWeight: "400", opacity: 0.8 }}>{message}</div>
			</div>
			<button
				onClick={onClose}
				style={{
					background: "none",
					border: "none",
					cursor: "pointer",
					padding: "4px",
					borderRadius: "4px",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					opacity: 0.6,
					transition: "opacity 0.2s",
				}}
				onMouseEnter={(e) => {
					e.currentTarget.style.opacity = "1";
				}}
				onMouseLeave={(e) => {
					e.currentTarget.style.opacity = "0.6";
				}}
			>
				<X size={16} />
			</button>
		</div>
	);
};

interface ConfirmDialogProps {
	isOpen: boolean;
	title: string;
	message: string;
	confirmText: string;
	cancelText: string;
	onConfirm: () => void;
	onCancel: () => void;
	type?: "danger" | "default";
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
	isOpen,
	title,
	message,
	confirmText,
	cancelText,
	onConfirm,
	onCancel,
	type = "default",
}) => {
	if (!isOpen) return null;

	return (
		<div
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				width: "100%",
				height: "100%",
				backgroundColor: colors.background.modalOverlay,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				zIndex: 1000,
				padding: "20px",
				boxSizing: "border-box",
			}}
		>
			<div
				style={{
					backgroundColor: colors.white,
					padding: "32px",
					borderRadius: "16px",
					width: "100%",
					maxWidth: "400px",
					boxShadow: shadows.modal,
				}}
			>
				<h3
					style={{
						margin: "0 0 16px 0",
						fontSize: "20px",
						fontWeight: "600",
						color: colors.text.primary,
					}}
				>
					{title}
				</h3>
				<p
					style={{
						margin: "0 0 32px 0",
						fontSize: "16px",
						color: colors.text.secondary,
						lineHeight: "1.5",
					}}
				>
					{message}
				</p>
				<div
					style={{
						display: "flex",
						gap: "12px",
						justifyContent: "flex-end",
					}}
				>
					<button
						onClick={onCancel}
						style={{
							padding: "12px 24px",
							backgroundColor: colors.background.secondary,
							color: colors.text.primary,
							border: `1px solid ${colors.border.light}`,
							borderRadius: "8px",
							cursor: "pointer",
							fontSize: "14px",
							fontWeight: "500",
							transition: "all 0.2s",
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.backgroundColor =
								colors.background.secondary;
							e.currentTarget.style.borderColor = colors.border.default;
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.backgroundColor =
								colors.background.secondary;
							e.currentTarget.style.borderColor = colors.border.light;
						}}
					>
						{cancelText}
					</button>
					<button
						onClick={onConfirm}
						style={{
							padding: "12px 24px",
							backgroundColor:
								type === "danger" ? colors.error : colors.text.accent,
							color: colors.white,
							border: "none",
							borderRadius: "8px",
							cursor: "pointer",
							fontSize: "14px",
							fontWeight: "500",
							transition: "all 0.2s",
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.backgroundColor =
								type === "danger" ? colors.error : colors.text.accent;
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.backgroundColor =
								type === "danger" ? colors.error : colors.text.accent;
						}}
					>
						{confirmText}
					</button>
				</div>
			</div>
		</div>
	);
};

function OptionsPage() {
	const [apiKeyStatus, setApiKeyStatus] = useState<{
		type: AlertType;
		title: string;
		message: string;
	} | null>(null);
	const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isEditing, setIsEditing] = useState(false);
	const [editingPrompt, setEditingPrompt] = useState<SavedPrompt | null>(null);
	const [promptName, setPromptName] = useState("");
	const [promptText, setPromptText] = useState("");
	const [validationErrors, setValidationErrors] = useState<{
		name?: string;
		prompt?: string;
	}>({});
	const [confirmDialog, setConfirmDialog] = useState<{
		isOpen: boolean;
		title: string;
		message: string;
		onConfirm: () => void;
	}>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

	// Provider configuration state
	const [selectedProvider, setSelectedProvider] = useState<ProviderId | null>(
		null,
	);
	const [apiKeys, setApiKeys] = useState<Record<ProviderId, string>>({
		gemini: "",
		openai: "",
		anthropic: "",
		openrouter: "",
	});
	const [validationStatus, setValidationStatus] = useState<
		Record<ProviderId, boolean | null>
	>({
		gemini: null,
		openai: null,
		anthropic: null,
		openrouter: null,
	});

	// Model selection state
	const [availableModels, setAvailableModels] = useState<
		Record<ProviderId, ModelInfo[]>
	>({
		gemini: [],
		openai: [],
		anthropic: [],
		openrouter: [],
	});
	const [selectedModels, setSelectedModels] = useState<
		Record<ProviderId, string>
	>({
		gemini: "",
		openai: "",
		anthropic: "",
		openrouter: "",
	});
	const [modelLoadingStatus, setModelLoadingStatus] = useState<
		Record<ProviderId, boolean>
	>({
		gemini: false,
		openai: false,
		anthropic: false,
		openrouter: false,
	});
	const [modelSaveStatus, setModelSaveStatus] = useState<
		Record<ProviderId, { success: boolean; timestamp: number } | null>
	>({
		gemini: null,
		openai: null,
		anthropic: null,
		openrouter: null,
	});

	// Model filtering state
	const [modelFilter, setModelFilter] = useState<Record<ProviderId, string>>({
		gemini: "",
		openai: "",
		anthropic: "",
		openrouter: "",
	});
	const [showModelDropdown, setShowModelDropdown] = useState<
		Record<ProviderId, boolean>
	>({
		gemini: false,
		openai: false,
		anthropic: false,
		openrouter: false,
	});

	// Debug logging state
	const [debugLoggingEnabled, setDebugLoggingEnabled] = useState(false);

	// Persona configuration state
	const [userPersona, setUserPersona] = useState("");
	const [personaSaveStatus, setPersonaSaveStatus] = useState<{
		type: AlertType;
		timestamp: number;
	} | null>(null);

	// Ensemble settings state
	const [ensembleSettings, setEnsembleSettings] = useState<{
		defaultRuns: number;
		defaultMode: "fast" | "balanced" | "comprehensive";
		enabled: boolean;
	}>({
		defaultRuns: 3,
		defaultMode: "balanced",
		enabled: true,
	});
	const [ensembleSaveStatus, setEnsembleSaveStatus] = useState<{
		type: AlertType;
		timestamp: number;
	} | null>(null);

	// Two-phase settings state
	const [twoPhaseSettings, setTwoPhaseSettings] = useState<{
		enabled: boolean;
		confidenceThreshold: number;
		phase1Temperature: number;
		phase2Temperature: number;
		maxNuggetsPerType: {
			"aha! moments": number;
			analogy: number;
			model: number;
			tool: number; // -1 means unlimited
			media: number; // -1 means unlimited
		};
		fuzzyMatchOptions: {
			tolerance: number;
			minConfidenceThreshold: number;
		};
	}>({
		enabled: false,
		confidenceThreshold: 0.85,
		phase1Temperature: 0.7,
		phase2Temperature: 0.0,
		maxNuggetsPerType: {
			"aha! moments": 5,
			analogy: 5,
			model: 5,
			tool: -1,
			media: -1,
		},
		fuzzyMatchOptions: {
			tolerance: 0.8,
			minConfidenceThreshold: 0.7,
		},
	});
	const [twoPhaseSaveStatus, setTwoPhaseSaveStatus] = useState<{
		type: AlertType;
		timestamp: number;
	} | null>(null);

	const loadData = useCallback(async () => {
		try {
			setLoading(true);
			const [
				savedPrompts,
				storageData,
				savedPersona,
				savedEnsembleSettings,
				savedTwoPhaseSettings,
			] = await Promise.all([
				storage.getPrompts(),
				chrome.storage.local.get(["selectedProvider", "extensionConfig"]),
				storage.getPersona(),
				storage.getEnsembleSettings(),
				storage.getTwoPhaseSettings(),
			]);
			setPrompts(savedPrompts);
			setSelectedProvider(storageData.selectedProvider || null);
			setUserPersona(savedPersona);
			setEnsembleSettings(savedEnsembleSettings);
			setTwoPhaseSettings(savedTwoPhaseSettings);

			// Load debug logging setting
			setDebugLoggingEnabled(
				storageData.extensionConfig?.enableDebugLogging || false,
			);

			// Load API keys for all providers
			const providers: ProviderId[] = [
				"gemini",
				"openai",
				"anthropic",
				"openrouter",
			];
			const keyPromises = providers.map(async (providerId) => {
				if (providerId === "gemini") {
					const key = await storage.getApiKey({
						source: "options",
						action: "read",
						timestamp: Date.now(),
					});
					return { providerId, key };
				} else {
					const key = await ApiKeyStorage.getApiKey(providerId);
					return { providerId, key: key || "" };
				}
			});

			const keyResults = await Promise.all(keyPromises);
			const keyMap = {} as Record<ProviderId, string>;
			keyResults.forEach(({ providerId, key }) => {
				keyMap[providerId] = key;
			});
			setApiKeys(keyMap);

			// Load selected models for all providers
			const selectedModelsMap = await ModelStorage.getAllModels();

			// Only set models for providers that have been configured
			const modelsWithFallbacks: Record<ProviderId, string> = {} as Record<
				ProviderId,
				string
			>;
			for (const [providerId, model] of Object.entries(selectedModelsMap)) {
				if (model) {
					modelsWithFallbacks[providerId as ProviderId] = model;
				}
			}

			setSelectedModels(modelsWithFallbacks);
		} catch (_err) {
			setError("Failed to load data");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadData();
	}, [loadData]);

	const validatePromptForm = () => {
		const errors: { name?: string; prompt?: string } = {};

		if (!promptName.trim()) {
			errors.name = "Prompt name is required";
		} else if (promptName.trim().length < 3) {
			errors.name = "Prompt name must be at least 3 characters";
		}

		if (!promptText.trim()) {
			errors.prompt = "Prompt text is required";
		} else if (promptText.trim().length < 10) {
			errors.prompt = "Prompt text must be at least 10 characters";
		}

		setValidationErrors(errors);
		return Object.keys(errors).length === 0;
	};

	const openPromptEditor = (prompt?: SavedPrompt) => {
		setEditingPrompt(prompt || null);
		setPromptName(prompt?.name || "");
		setPromptText(prompt?.prompt || "");
		setValidationErrors({});
		setIsEditing(true);
	};

	const savePrompt = async () => {
		if (!validatePromptForm()) {
			return;
		}

		try {
			const prompt: SavedPrompt = {
				id: editingPrompt?.id || Date.now().toString(),
				name: promptName.trim(),
				prompt: promptText.trim(),
				isDefault: editingPrompt?.isDefault || false,
			};

			await storage.savePrompt(prompt);
			await loadData();
			setIsEditing(false);
			setEditingPrompt(null);
			setPromptName("");
			setPromptText("");
			setValidationErrors({});
		} catch (_err) {
			setApiKeyStatus({
				type: "error",
				title: "Save Failed",
				message: "Failed to save the prompt. Please try again.",
			});
		}
	};

	const deletePrompt = async (promptId: string) => {
		const prompt = prompts.find((p) => p.id === promptId);
		if (!prompt) return;

		setConfirmDialog({
			isOpen: true,
			title: "Delete Prompt",
			message: `Are you sure you want to delete "${prompt.name}"? This action cannot be undone.`,
			onConfirm: async () => {
				try {
					await storage.deletePrompt(promptId);
					await loadData();
					setConfirmDialog({
						isOpen: false,
						title: "",
						message: "",
						onConfirm: () => {},
					});
				} catch (_err) {
					setApiKeyStatus({
						type: "error",
						title: "Delete Failed",
						message: "Failed to delete the prompt. Please try again.",
					});
				}
			},
		});
	};

	const setDefaultPrompt = async (promptId: string) => {
		try {
			await storage.setDefaultPrompt(promptId);
			await loadData();
		} catch (_err) {
			setApiKeyStatus({
				type: "error",
				title: "Failed to Set Default",
				message: "Failed to set the default prompt. Please try again.",
			});
		}
	};

	// Provider helper functions

	const getProviderDisplayName = (providerId: ProviderId) => {
		const names = {
			gemini: "Google Gemini",
			openai: "OpenAI",
			anthropic: "Anthropic",
			openrouter: "OpenRouter",
		};
		return names[providerId];
	};

	const handleProviderChange = async (providerId: ProviderId) => {
		setSelectedProvider(providerId);
		await chrome.storage.local.set({ selectedProvider: providerId });
	};

	const handleApiKeyUpdate = async (providerId: ProviderId, apiKey: string) => {
		setApiKeys((prev) => ({ ...prev, [providerId]: apiKey }));

		// Clear validation status when key changes
		setValidationStatus((prev) => ({ ...prev, [providerId]: null }));

		if (apiKey) {
			if (providerId === "gemini") {
				await storage.saveApiKey(apiKey, {
					source: "options",
					action: "write",
					timestamp: Date.now(),
				});
			} else {
				await ApiKeyStorage.storeApiKey(providerId, apiKey);
			}
		}
	};

	const testApiKey = async (providerId: ProviderId) => {
		const apiKey = apiKeys[providerId];
		if (!apiKey) return;

		try {
			// Set validating state
			setApiKeyStatus({
				type: "info",
				title: "Validating...",
				message: `Testing your ${getProviderDisplayName(providerId)} API key`,
			});

			console.log(`[DEBUG] Testing API key for ${providerId}`);
			console.log(`[DEBUG] API key length: ${apiKey.length}`);

			const selectedModel = await getSelectedModel(providerId);
			console.log(`[DEBUG] Selected model for ${providerId}: ${selectedModel}`);

			const provider = await createProvider({
				providerId,
				apiKey,
				modelName: selectedModel,
			});

			console.log(`[DEBUG] Provider created successfully for ${providerId}`);

			const isValid = await provider.validateApiKey();
			console.log(`[DEBUG] Validation result for ${providerId}: ${isValid}`);

			setValidationStatus((prev) => ({ ...prev, [providerId]: isValid }));

			if (isValid) {
				setApiKeyStatus({
					type: "success",
					title: "API Key Valid",
					message: `Your ${getProviderDisplayName(providerId)} API key has been validated successfully`,
				});

				// Fetch available models after successful validation
				await fetchModelsForProvider(providerId, apiKey);
			} else {
				setApiKeyStatus({
					type: "error",
					title: "Invalid API Key",
					message: `The ${getProviderDisplayName(providerId)} API key is invalid or doesn't have the required permissions. Please check your key and try again.`,
				});
			}

			setTimeout(() => setApiKeyStatus(null), 5000);
		} catch (error) {
			console.error(
				`[DEBUG] Error validating API key for ${providerId}:`,
				error,
			);
			setValidationStatus((prev) => ({ ...prev, [providerId]: false }));
			setApiKeyStatus({
				type: "error",
				title: "Validation Failed",
				message: `Failed to validate ${getProviderDisplayName(providerId)} API key: ${error instanceof Error ? error.message : String(error)}`,
			});
		}
	};

	// Model management functions
	const fetchModelsForProvider = async (
		providerId: ProviderId,
		apiKey: string,
	) => {
		try {
			setModelLoadingStatus((prev) => ({ ...prev, [providerId]: true }));

			const result = await ModelService.fetchModels(providerId, apiKey);

			if (result.error) {
				console.warn(
					`Failed to fetch models for ${providerId}: ${result.error}`,
				);
				// Use fallback models
				const fallbackModels = ModelService.getFallbackModels(providerId);
				setAvailableModels((prev) => ({
					...prev,
					[providerId]: fallbackModels,
				}));
			} else {
				setAvailableModels((prev) => ({
					...prev,
					[providerId]: result.models,
				}));
			}
		} catch (error) {
			console.error(`Error fetching models for ${providerId}:`, error);
			// Use fallback models on error
			const fallbackModels = ModelService.getFallbackModels(providerId);
			setAvailableModels((prev) => ({ ...prev, [providerId]: fallbackModels }));
		} finally {
			setModelLoadingStatus((prev) => ({ ...prev, [providerId]: false }));
		}
	};

	const handleModelSelection = async (
		providerId: ProviderId,
		modelId: string,
	) => {
		try {
			// Update local state immediately
			setSelectedModels((prev) => ({ ...prev, [providerId]: modelId }));

			// Hide dropdown and clear filter
			setShowModelDropdown((prev) => ({ ...prev, [providerId]: false }));
			setModelFilter((prev) => ({ ...prev, [providerId]: "" }));

			// Save to storage
			await ModelStorage.storeModel(providerId, modelId);

			// Set success feedback
			setModelSaveStatus((prev) => ({
				...prev,
				[providerId]: { success: true, timestamp: Date.now() },
			}));

			// Clear success feedback after 3 seconds
			setTimeout(() => {
				setModelSaveStatus((prev) => ({ ...prev, [providerId]: null }));
			}, 3000);
		} catch (error) {
			console.error(`Failed to save selected model for ${providerId}:`, error);

			// Set error feedback
			setModelSaveStatus((prev) => ({
				...prev,
				[providerId]: { success: false, timestamp: Date.now() },
			}));

			// Revert local state on error
			const currentModel = await ModelStorage.getModel(providerId);
			setSelectedModels((prev) => ({ ...prev, [providerId]: currentModel }));

			// Clear error feedback after 5 seconds
			setTimeout(() => {
				setModelSaveStatus((prev) => ({ ...prev, [providerId]: null }));
			}, 5000);
		}
	};

	// Model filtering helper functions
	const getFilteredModels = (providerId: ProviderId): ModelInfo[] => {
		const models = availableModels[providerId] || [];
		const filterText = modelFilter[providerId] || "";

		if (!filterText.trim()) {
			return models;
		}

		const lowercaseFilter = filterText.toLowerCase();
		return models.filter(
			(model) =>
				model.name.toLowerCase().includes(lowercaseFilter) ||
				model.id.toLowerCase().includes(lowercaseFilter),
		);
	};

	const handleModelFilterChange = (
		providerId: ProviderId,
		filterText: string,
	) => {
		setModelFilter((prev) => ({ ...prev, [providerId]: filterText }));
		setShowModelDropdown((prev) => ({ ...prev, [providerId]: true }));
	};

	const handleModelFilterFocus = (providerId: ProviderId) => {
		setShowModelDropdown((prev) => ({ ...prev, [providerId]: true }));
	};

	const handleModelFilterBlur = (providerId: ProviderId) => {
		// Delay hiding dropdown to allow clicking on options
		setTimeout(() => {
			setShowModelDropdown((prev) => ({ ...prev, [providerId]: false }));
		}, 200);
	};

	const resetModelFilter = (providerId: ProviderId) => {
		setModelFilter((prev) => ({ ...prev, [providerId]: "" }));
		setShowModelDropdown((prev) => ({ ...prev, [providerId]: false }));
	};

	const getSelectedModelName = (providerId: ProviderId | null): string => {
		if (!providerId) return "No model selected";

		const selectedModelId =
			selectedModels[providerId] || getDefaultModel(providerId);
		const model = availableModels[providerId]?.find(
			(m) => m.id === selectedModelId,
		);
		return model?.name || selectedModelId;
	};

	// Debug logging handler
	const handleDebugLoggingToggle = async (enabled: boolean) => {
		try {
			setDebugLoggingEnabled(enabled);

			// Update the extension config in storage
			const existingConfig = await chrome.storage.local.get([
				"extensionConfig",
			]);
			const updatedConfig = {
				...existingConfig.extensionConfig,
				enableDebugLogging: enabled,
			};

			await chrome.storage.local.set({ extensionConfig: updatedConfig });

			// Refresh the debug logger state
			await debugLogger.refreshLoggingState();

			// Test logging immediately when enabled
			if (enabled) {
				console.log("🔍 [DEBUG TEST] Options page console logging test");
				debugLogger.log("🔍 [DEBUG TEST] DebugLogger test from options page");
				debugLogger.logLLMRequest("https://test-endpoint.com/test", {
					test: "This is a test request",
				});
				debugLogger.logLLMResponse({ test: "This is a test response" });

				// Also test background logging by sending a message
				try {
					await chrome.runtime.sendMessage({ type: "DEBUG_TEST" });
				} catch (e) {
					console.log(
						"🔍 [DEBUG TEST] Background script may not be ready:",
						e instanceof Error ? e.message : String(e),
					);
				}
			}

			setApiKeyStatus({
				type: "success",
				title: "Debug Logging Updated",
				message: `Debug logging has been ${enabled ? "enabled" : "disabled"}. ${enabled ? "Check the browser console for test logs above! Also check the service worker console in chrome://extensions/" : "API logging is now disabled."}`,
			});

			setTimeout(() => setApiKeyStatus(null), 8000);
		} catch (error) {
			console.error("Failed to update debug logging setting:", error);
			setApiKeyStatus({
				type: "error",
				title: "Update Failed",
				message: "Failed to update debug logging setting. Please try again.",
			});
		}
	};

	// Persona management functions
	const handlePersonaUpdate = async (persona: string) => {
		try {
			setUserPersona(persona);
			await storage.savePersona(persona);

			// Set success feedback
			setPersonaSaveStatus({
				type: "success",
				timestamp: Date.now(),
			});

			// Clear success feedback after 3 seconds
			setTimeout(() => {
				setPersonaSaveStatus(null);
			}, 3000);
		} catch (error) {
			console.error("Failed to save persona:", error);

			// Set error feedback
			setPersonaSaveStatus({
				type: "error",
				timestamp: Date.now(),
			});

			// Clear error feedback after 5 seconds
			setTimeout(() => {
				setPersonaSaveStatus(null);
			}, 5000);
		}
	};

	// Ensemble settings management functions
	const handleEnsembleSettingsUpdate = async (
		newSettings: Partial<{
			defaultRuns: number;
			defaultMode: "fast" | "balanced" | "comprehensive";
			enabled: boolean;
		}>,
	) => {
		try {
			const updatedSettings = { ...ensembleSettings, ...newSettings };
			setEnsembleSettings(updatedSettings);
			await storage.saveEnsembleSettings(updatedSettings);

			// Set success feedback
			setEnsembleSaveStatus({
				type: "success",
				timestamp: Date.now(),
			});

			// Clear success feedback after 3 seconds
			setTimeout(() => {
				setEnsembleSaveStatus(null);
			}, 3000);
		} catch (error) {
			console.error("Failed to save ensemble settings:", error);

			// Set error feedback
			setEnsembleSaveStatus({
				type: "error",
				timestamp: Date.now(),
			});

			// Clear error feedback after 5 seconds
			setTimeout(() => {
				setEnsembleSaveStatus(null);
			}, 5000);
		}
	};

	// Two-phase settings management functions
	const handleTwoPhaseSettingsUpdate = async (
		newSettings: Partial<{
			enabled: boolean;
			confidenceThreshold: number;
			phase1Temperature: number;
			phase2Temperature: number;
			maxNuggetsPerType: {
				"aha! moments": number;
				analogy: number;
				model: number;
				tool: number;
				media: number;
			};
			fuzzyMatchOptions: {
				tolerance: number;
				minConfidenceThreshold: number;
			};
		}>,
	) => {
		try {
			const updatedSettings = { ...twoPhaseSettings, ...newSettings };
			setTwoPhaseSettings(updatedSettings);
			await storage.saveTwoPhaseSettings(updatedSettings);

			// Set success feedback
			setTwoPhaseSaveStatus({
				type: "success",
				timestamp: Date.now(),
			});

			// Clear success feedback after 3 seconds
			setTimeout(() => {
				setTwoPhaseSaveStatus(null);
			}, 3000);
		} catch (error) {
			console.error("Failed to save two-phase settings:", error);

			// Set error feedback
			setTwoPhaseSaveStatus({
				type: "error",
				timestamp: Date.now(),
			});

			// Clear error feedback after 5 seconds
			setTimeout(() => {
				setTwoPhaseSaveStatus(null);
			}, 5000);
		}
	};

	if (loading) {
		return (
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					minHeight: "100vh",
					backgroundColor: colors.background.secondary,
					fontFamily: typography.fontFamily.sans,
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: spacing.md,
						padding: spacing["2xl"],
						backgroundColor: colors.background.primary,
						borderRadius: borderRadius.lg,
						boxShadow: shadows.md,
					}}
				>
					<div
						style={{
							width: "24px",
							height: "24px",
							border: `2px solid ${colors.border.default}`,
							borderTop: `2px solid ${colors.text.accent}`,
							borderRadius: "50%",
							animation: "spin 1s linear infinite",
						}}
					/>
					<span
						style={{
							color: colors.text.secondary,
							fontSize: typography.fontSize.base,
						}}
					>
						Loading your settings...
					</span>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					minHeight: "100vh",
					backgroundColor: colors.background.secondary,
					fontFamily: typography.fontFamily.sans,
				}}
			>
				<div
					style={{
						maxWidth: "400px",
						padding: spacing["3xl"],
						backgroundColor: colors.background.primary,
						borderRadius: borderRadius.xl,
						boxShadow: shadows.lg,
						textAlign: "center",
					}}
				>
					<div
						style={{
							color: colors.error,
							marginBottom: spacing.lg,
							display: "flex",
							justifyContent: "center",
						}}
					>
						<CircleAlert size={20} />
					</div>
					<h2
						style={{
							margin: `0 0 ${spacing.sm} 0`,
							fontSize: typography.fontSize.xl,
							fontWeight: typography.fontWeight.semibold,
							color: colors.text.primary,
						}}
					>
						Failed to Load Settings
					</h2>
					<p
						style={{
							margin: `0 0 ${spacing["2xl"]} 0`,
							color: colors.text.secondary,
							fontSize: typography.fontSize.base,
							lineHeight: typography.lineHeight.normal,
						}}
					>
						{error}
					</p>
					<button
						onClick={loadData}
						style={{
							...components.button.primary,
							fontSize: typography.fontSize.sm,
							fontWeight: typography.fontWeight.medium,
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.backgroundColor = colors.text.accent;
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.backgroundColor = colors.text.accent;
						}}
					>
						Try Again
					</button>
				</div>
			</div>
		);
	}

	return (
		<div
			style={{
				minHeight: "100vh",
				backgroundColor: colors.background.secondary,
				fontFamily: typography.fontFamily.sans,
			}}
		>
			<style>
				{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
			</style>

			<div
				style={{
					maxWidth: "1000px",
					margin: "0 auto",
					padding: `${spacing["4xl"]} ${spacing["2xl"]}`,
				}}
			>
				{/* Header */}
				<div
					style={{
						marginBottom: spacing["4xl"],
						textAlign: "center",
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							gap: spacing.md,
							marginBottom: spacing.lg,
						}}
					>
						<div style={{ color: colors.text.secondary }}>
							<Sparkles size={24} />
						</div>
						<h1
							style={{
								margin: 0,
								fontSize: typography.fontSize["3xl"],
								fontWeight: typography.fontWeight.bold,
								color: colors.text.primary,
								letterSpacing: "-0.025em",
							}}
						>
							Golden Nugget Finder
						</h1>
					</div>
					<p
						style={{
							margin: 0,
							fontSize: typography.fontSize.lg,
							color: colors.text.secondary,
							fontWeight: typography.fontWeight.normal,
						}}
					>
						Configure your AI-powered content analysis tool
					</p>
				</div>

				{/* Global Alert */}
				{apiKeyStatus && (
					<Alert
						type={apiKeyStatus.type}
						title={apiKeyStatus.title}
						message={apiKeyStatus.message}
						onClose={() => setApiKeyStatus(null)}
					/>
				)}

				{/* Current Configuration Status */}
				<div
					style={{
						marginBottom: spacing["3xl"],
						backgroundColor: colors.background.primary,
						padding: spacing["3xl"],
						borderRadius: borderRadius.xl,
						boxShadow: shadows.md,
						border: `1px solid ${colors.border.light}`,
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: spacing.md,
							marginBottom: spacing.lg,
						}}
					>
						<div style={{ color: colors.success }}>
							<CircleCheck size={20} />
						</div>
						<h2
							style={{
								margin: 0,
								fontSize: typography.fontSize.xl,
								fontWeight: typography.fontWeight.semibold,
								color: colors.text.primary,
							}}
						>
							Current Configuration
						</h2>
					</div>

					<div
						style={{
							display: "grid",
							gap: spacing.lg,
							gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
						}}
					>
						<div
							style={{
								padding: spacing.lg,
								backgroundColor: colors.background.secondary,
								borderRadius: borderRadius.lg,
								border: `1px solid ${colors.border.light}`,
							}}
						>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: spacing.sm,
									marginBottom: spacing.sm,
								}}
							>
								<div style={{ color: colors.text.accent }}>
									<Sparkles size={16} />
								</div>
								<span
									style={{
										fontSize: typography.fontSize.sm,
										fontWeight: typography.fontWeight.medium,
										color: colors.text.secondary,
										textTransform: "uppercase",
										letterSpacing: "0.05em",
									}}
								>
									Active Provider
								</span>
							</div>
							<div
								style={{
									fontSize: typography.fontSize.lg,
									fontWeight: typography.fontWeight.semibold,
									color: selectedProvider
										? colors.text.primary
										: colors.text.secondary,
								}}
							>
								{selectedProvider
									? getProviderDisplayName(selectedProvider)
									: "No provider selected"}
							</div>
							<div
								style={{
									fontSize: typography.fontSize.sm,
									color: colors.text.secondary,
									marginTop: spacing.xs,
								}}
							>
								{!selectedProvider
									? "Please select and configure a provider below"
									: apiKeys[selectedProvider] &&
											validationStatus[selectedProvider] === true
										? "API key validated"
										: apiKeys[selectedProvider]
											? "API key not validated"
											: "No API key configured"}
							</div>
						</div>

						<div
							style={{
								padding: spacing.lg,
								backgroundColor: colors.background.secondary,
								borderRadius: borderRadius.lg,
								border: `1px solid ${colors.border.light}`,
							}}
						>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: spacing.sm,
									marginBottom: spacing.sm,
								}}
							>
								<div style={{ color: colors.text.accent }}>
									<Key size={16} />
								</div>
								<span
									style={{
										fontSize: typography.fontSize.sm,
										fontWeight: typography.fontWeight.medium,
										color: colors.text.secondary,
										textTransform: "uppercase",
										letterSpacing: "0.05em",
									}}
								>
									Active Model
								</span>
							</div>
							<div
								style={{
									fontSize: typography.fontSize.lg,
									fontWeight: typography.fontWeight.semibold,
									color: selectedProvider
										? colors.text.primary
										: colors.text.secondary,
								}}
							>
								{!selectedProvider
									? "No model selected"
									: selectedModels[selectedProvider] || "Default Model"}
							</div>
							<div
								style={{
									fontSize: typography.fontSize.sm,
									color: colors.text.secondary,
									marginTop: spacing.xs,
								}}
							>
								{!selectedProvider
									? "Configure API key to select model"
									: selectedModels[selectedProvider]
										? `Using ${selectedModels[selectedProvider]}`
										: `Using default: ${getDefaultModel(selectedProvider)}`}
							</div>
						</div>
					</div>
				</div>

				{/* Getting Started Section - Only show when no provider configured */}
				{!selectedProvider && (
					<div
						style={{
							marginBottom: spacing["3xl"],
							backgroundColor: colors.background.secondary,
							padding: spacing["3xl"],
							borderRadius: borderRadius.xl,
							border: `2px solid ${colors.text.accent}`,
							textAlign: "center",
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								gap: spacing.md,
								marginBottom: spacing.lg,
							}}
						>
							<div style={{ color: colors.text.accent }}>
								<Sparkles size={24} />
							</div>
							<h2
								style={{
									margin: 0,
									fontSize: typography.fontSize.xl,
									fontWeight: typography.fontWeight.semibold,
									color: colors.text.primary,
								}}
							>
								Get Started
							</h2>
						</div>
						<p
							style={{
								margin: `0 0 ${spacing.lg} 0`,
								fontSize: typography.fontSize.base,
								color: colors.text.secondary,
								lineHeight: typography.lineHeight.normal,
								maxWidth: "600px",
								marginLeft: "auto",
								marginRight: "auto",
							}}
						>
							Welcome! To start analyzing web content, please choose an AI
							provider below and configure your API key. This enables the
							extension to extract golden nuggets from any webpage.
						</p>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								gap: spacing.sm,
								fontSize: typography.fontSize.sm,
								color: colors.text.accent,
								fontWeight: typography.fontWeight.medium,
							}}
						>
							<span>👇</span>
							<span>Select a provider below to get started</span>
							<span>👇</span>
						</div>
					</div>
				)}

				{/* Provider Selection Section */}
				<div
					style={{
						marginBottom: spacing["3xl"],
						backgroundColor: colors.background.primary,
						padding: spacing["3xl"],
						borderRadius: borderRadius.xl,
						boxShadow: shadows.md,
						border: `1px solid ${colors.border.light}`,
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: spacing.md,
							marginBottom: spacing["2xl"],
						}}
					>
						<div style={{ color: colors.text.accent }}>
							<Sparkles size={20} />
						</div>
						<h2
							style={{
								margin: 0,
								fontSize: typography.fontSize.xl,
								fontWeight: typography.fontWeight.semibold,
								color: colors.text.primary,
							}}
						>
							LLM Provider Selection
						</h2>
					</div>

					<div
						style={{
							marginBottom: spacing["2xl"],
							padding: spacing.lg,
							backgroundColor: colors.background.secondary,
							borderRadius: borderRadius.lg,
							border: `1px solid ${colors.border.light}`,
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "flex-start",
								gap: spacing.md,
								marginBottom: spacing.md,
							}}
						>
							<div style={{ color: colors.text.accent, marginTop: "2px" }}>
								<Lock size={16} />
							</div>
							<div>
								<h3
									style={{
										margin: "0 0 4px 0",
										fontSize: typography.fontSize.sm,
										fontWeight: typography.fontWeight.semibold,
										color: colors.text.primary,
									}}
								>
									Setup Instructions
								</h3>
								<p
									style={{
										margin: 0,
										fontSize: typography.fontSize.sm,
										color: colors.text.secondary,
										lineHeight: typography.lineHeight.normal,
									}}
								>
									Choose your AI provider, enter your API key, and validate it
									to unlock model selection. Your API key is stored locally and
									never shared.
								</p>
							</div>
						</div>

						<div
							style={{
								display: "flex",
								gap: spacing.lg,
								fontSize: typography.fontSize.xs,
								color: colors.text.secondary,
							}}
						>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: spacing.xs,
								}}
							>
								<div
									style={{
										width: "20px",
										height: "20px",
										borderRadius: "50%",
										backgroundColor: colors.text.accent,
										color: colors.white,
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										fontSize: "10px",
										fontWeight: "600",
									}}
								>
									1
								</div>
								Select Provider
							</div>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: spacing.xs,
								}}
							>
								<div
									style={{
										width: "20px",
										height: "20px",
										borderRadius: "50%",
										backgroundColor:
											selectedProvider && apiKeys[selectedProvider]
												? colors.text.accent
												: colors.border.default,
										color:
											selectedProvider && apiKeys[selectedProvider]
												? colors.white
												: colors.text.secondary,
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										fontSize: "10px",
										fontWeight: "600",
									}}
								>
									2
								</div>
								Enter API Key
							</div>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: spacing.xs,
								}}
							>
								<div
									style={{
										width: "20px",
										height: "20px",
										borderRadius: "50%",
										backgroundColor:
											selectedProvider &&
											validationStatus[selectedProvider] === true
												? colors.success
												: colors.border.default,
										color:
											selectedProvider &&
											validationStatus[selectedProvider] === true
												? colors.white
												: colors.text.secondary,
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										fontSize: "10px",
										fontWeight: "600",
									}}
								>
									3
								</div>
								Validate & Select Model
							</div>
						</div>
					</div>

					<div
						style={{
							display: "grid",
							gap: spacing.lg,
							marginBottom: spacing["2xl"],
						}}
					>
						{(
							["gemini", "openai", "anthropic", "openrouter"] as ProviderId[]
						).map((providerId) => {
							const isSelected = selectedProvider === providerId;
							const hasApiKey = Boolean(apiKeys[providerId]);
							const validationResult = validationStatus[providerId];

							return (
								<div
									key={providerId}
									style={{
										padding: spacing.lg,
										backgroundColor: isSelected
											? colors.background.secondary
											: colors.background.primary,
										borderRadius: borderRadius.lg,
										border: `2px solid ${
											isSelected ? colors.text.accent : colors.border.light
										}`,
										transition: "all 0.2s",
										cursor: "pointer",
									}}
									onClick={() => handleProviderChange(providerId)}
								>
									<div
										style={{
											display: "flex",
											alignItems: "flex-start",
											gap: spacing.md,
										}}
									>
										<input
											type="radio"
											name="provider"
											value={providerId}
											checked={isSelected}
											readOnly
											style={{
												marginTop: "2px",
												cursor: "pointer",
											}}
										/>
										<div style={{ flex: 1 }}>
											<div
												style={{
													display: "flex",
													alignItems: "center",
													gap: spacing.sm,
												}}
											>
												<h3
													style={{
														margin: 0,
														fontSize: typography.fontSize.lg,
														fontWeight: typography.fontWeight.semibold,
														color: colors.text.primary,
													}}
												>
													{getProviderDisplayName(providerId)}
												</h3>
												{hasApiKey && validationResult === true && (
													<div style={{ color: colors.success }}>
														<CircleCheck size={16} />
													</div>
												)}
												{hasApiKey && validationResult === false && (
													<div style={{ color: colors.error }}>
														<CircleAlert size={16} />
													</div>
												)}
											</div>
										</div>
									</div>
								</div>
							);
						})}
					</div>

					{/* API Key Configuration for selected provider */}
					{selectedProvider && (
						<div
							style={{
								padding: spacing.lg,
								backgroundColor: colors.background.secondary,
								borderRadius: borderRadius.lg,
								border: `1px solid ${colors.border.light}`,
							}}
						>
							<div style={{ marginBottom: spacing.sm }}>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										marginBottom: spacing.xs,
									}}
								>
									<label
										style={{
											color: colors.text.primary,
											fontSize: typography.fontSize.sm,
											fontWeight: typography.fontWeight.medium,
										}}
									>
										API Key for {getProviderDisplayName(selectedProvider)}:
									</label>
									<a
										href={(() => {
											const links = {
												gemini: "https://makersuite.google.com/app/apikey",
												openai: "https://platform.openai.com/api-keys",
												anthropic: "https://console.anthropic.com/keys",
												openrouter: "https://openrouter.ai/keys",
											};
											return links[selectedProvider];
										})()}
										target="_blank"
										rel="noopener noreferrer"
										style={{
											display: "flex",
											alignItems: "center",
											gap: spacing.xs,
											color: colors.text.accent,
											fontSize: typography.fontSize.xs,
											textDecoration: "none",
											fontWeight: typography.fontWeight.medium,
										}}
									>
										<ExternalLink size={12} />
										Get API Key
									</a>
								</div>
								{!apiKeys[selectedProvider] && (
									<p
										style={{
											margin: 0,
											fontSize: typography.fontSize.xs,
											color: colors.text.secondary,
											lineHeight: typography.lineHeight.normal,
										}}
									>
										You'll need an API key from{" "}
										{getProviderDisplayName(selectedProvider)} to use this
										provider. Click "Get API Key" above to create one.
									</p>
								)}
							</div>
							<div
								style={{
									display: "flex",
									gap: spacing.md,
									alignItems: "stretch",
								}}
							>
								<input
									type="password"
									value={apiKeys[selectedProvider] || ""}
									onChange={(e) =>
										handleApiKeyUpdate(selectedProvider, e.target.value)
									}
									placeholder="Enter your API key"
									style={{
										...components.input.default,
										flex: 1,
										fontSize: typography.fontSize.base,
										color: colors.text.primary,
										fontFamily: typography.fontFamily.sans,
									}}
								/>
								<button
									onClick={() => testApiKey(selectedProvider)}
									disabled={!apiKeys[selectedProvider]}
									style={{
										...components.button.primary,
										backgroundColor: !apiKeys[selectedProvider]
											? colors.text.secondary
											: colors.text.accent,
										cursor: !apiKeys[selectedProvider]
											? "not-allowed"
											: "pointer",
										fontSize: typography.fontSize.sm,
										fontWeight: typography.fontWeight.medium,
										minWidth: "120px",
									}}
								>
									Validate API Key
								</button>
							</div>
							{typeof validationStatus[selectedProvider] === "boolean" && (
								<div
									style={{
										marginTop: spacing.sm,
										display: "flex",
										alignItems: "center",
										gap: spacing.sm,
										fontSize: typography.fontSize.sm,
										fontWeight: typography.fontWeight.medium,
										color: validationStatus[selectedProvider]
											? colors.success
											: colors.error,
									}}
								>
									{validationStatus[selectedProvider] ? (
										<>
											<CircleCheck size={16} />✓ Valid
										</>
									) : (
										<>
											<CircleAlert size={16} />✗ Invalid
										</>
									)}
								</div>
							)}

							{/* Model Selection Dropdown - Show when API key is valid */}
							{validationStatus[selectedProvider] === true && (
								<div
									style={{
										marginTop: spacing.lg,
										padding: spacing.lg,
										backgroundColor: colors.background.secondary,
										borderRadius: borderRadius.lg,
										border: `1px solid ${colors.border.light}`,
									}}
								>
									<label
										style={{
											display: "block",
											marginBottom: spacing.sm,
											color: colors.text.primary,
											fontSize: typography.fontSize.sm,
											fontWeight: typography.fontWeight.medium,
										}}
									>
										Model Selection for{" "}
										{getProviderDisplayName(selectedProvider)}:
									</label>

									{modelLoadingStatus[selectedProvider] ? (
										<div
											style={{
												display: "flex",
												alignItems: "center",
												gap: spacing.sm,
												padding: spacing.md,
												color: colors.text.secondary,
												fontSize: typography.fontSize.sm,
											}}
										>
											<div
												style={{
													width: "16px",
													height: "16px",
													border: `2px solid ${colors.border.default}`,
													borderTop: `2px solid ${colors.text.accent}`,
													borderRadius: "50%",
													animation: "spin 1s linear infinite",
												}}
											/>
											Loading available models...
										</div>
									) : availableModels[selectedProvider]?.length > 0 ? (
										<div style={{ position: "relative" }}>
											<div
												style={{
													display: "flex",
													gap: spacing.sm,
													alignItems: "stretch",
												}}
											>
												<div style={{ flex: 1, position: "relative" }}>
													<input
														type="text"
														value={modelFilter[selectedProvider] || ""}
														onChange={(e) =>
															handleModelFilterChange(
																selectedProvider,
																e.target.value,
															)
														}
														onFocus={() =>
															handleModelFilterFocus(selectedProvider)
														}
														onBlur={() =>
															handleModelFilterBlur(selectedProvider)
														}
														placeholder={`Search models... (Current: ${getSelectedModelName(selectedProvider)})`}
														style={{
															...components.input.default,
															width: "100%",
															fontSize: typography.fontSize.base,
															color: colors.text.primary,
															fontFamily: typography.fontFamily.sans,
														}}
													/>
													{showModelDropdown[selectedProvider] && (
														<div
															style={{
																position: "absolute",
																top: "100%",
																left: 0,
																right: 0,
																backgroundColor: colors.white,
																border: `1px solid ${colors.border.default}`,
																borderRadius: borderRadius.md,
																boxShadow: shadows.lg,
																maxHeight: "200px",
																overflowY: "auto",
																zIndex: 1000,
																marginTop: "2px",
															}}
														>
															{getFilteredModels(selectedProvider).length >
															0 ? (
																getFilteredModels(selectedProvider).map(
																	(model) => (
																		<div
																			key={model.id}
																			onClick={() =>
																				handleModelSelection(
																					selectedProvider,
																					model.id,
																				)
																			}
																			style={{
																				padding: spacing.md,
																				cursor: "pointer",
																				borderBottom: `1px solid ${colors.border.light}`,
																				fontSize: typography.fontSize.sm,
																				color: colors.text.primary,
																				backgroundColor:
																					selectedModels[selectedProvider] ===
																					model.id
																						? colors.background.secondary
																						: "transparent",
																			}}
																			onMouseEnter={(e) => {
																				if (
																					selectedModels[selectedProvider] !==
																					model.id
																				) {
																					e.currentTarget.style.backgroundColor =
																						colors.background.secondary;
																				}
																			}}
																			onMouseLeave={(e) => {
																				if (
																					selectedModels[selectedProvider] !==
																					model.id
																				) {
																					e.currentTarget.style.backgroundColor =
																						"transparent";
																				}
																			}}
																		>
																			<div
																				style={{
																					fontWeight:
																						typography.fontWeight.medium,
																				}}
																			>
																				{model.name}
																			</div>
																			{model.description && (
																				<div
																					style={{
																						fontSize: typography.fontSize.xs,
																						color: colors.text.secondary,
																						marginTop: spacing.xs,
																					}}
																				>
																					{ModelService.truncateDescription(
																						model.description,
																					)}
																				</div>
																			)}
																		</div>
																	),
																)
															) : (
																<div
																	style={{
																		padding: spacing.md,
																		fontSize: typography.fontSize.sm,
																		color: colors.text.secondary,
																		fontStyle: "italic",
																		textAlign: "center",
																	}}
																>
																	No models match your search
																</div>
															)}
														</div>
													)}
												</div>
												{(modelFilter[selectedProvider] || "").trim() && (
													<button
														onClick={() => resetModelFilter(selectedProvider)}
														title="Reset filter"
														style={{
															padding: spacing.sm,
															backgroundColor: colors.background.secondary,
															color: colors.text.secondary,
															border: `1px solid ${colors.border.light}`,
															borderRadius: borderRadius.md,
															cursor: "pointer",
															fontSize: typography.fontSize.sm,
															fontWeight: typography.fontWeight.medium,
															transition: "all 0.2s",
															minWidth: "80px",
															display: "flex",
															alignItems: "center",
															justifyContent: "center",
														}}
														onMouseEnter={(e) => {
															e.currentTarget.style.backgroundColor =
																colors.background.tertiary;
															e.currentTarget.style.borderColor =
																colors.border.default;
														}}
														onMouseLeave={(e) => {
															e.currentTarget.style.backgroundColor =
																colors.background.secondary;
															e.currentTarget.style.borderColor =
																colors.border.light;
														}}
													>
														<X size={16} style={{ marginRight: spacing.xs }} />
														Reset
													</button>
												)}
											</div>
										</div>
									) : (
										<div
											style={{
												padding: spacing.md,
												color: colors.text.secondary,
												fontSize: typography.fontSize.sm,
												fontStyle: "italic",
											}}
										>
											No models available. Using default model:{" "}
											{getDefaultModel(selectedProvider)}
										</div>
									)}

									{selectedModels[selectedProvider] &&
										selectedModels[selectedProvider] !==
											getDefaultModel(selectedProvider) && (
											<div
												style={{
													marginTop: spacing.sm,
													padding: spacing.sm,
													backgroundColor: colors.background.primary,
													borderRadius: borderRadius.md,
													fontSize: typography.fontSize.xs,
													color: colors.text.tertiary,
												}}
											>
												Selected: {selectedModels[selectedProvider]}
											</div>
										)}

									{/* Model Save Status Feedback */}
									{modelSaveStatus[selectedProvider] && (
										<div
											style={{
												marginTop: spacing.sm,
												padding: spacing.sm,
												backgroundColor: modelSaveStatus[selectedProvider]
													?.success
													? colors.background.secondary
													: colors.background.secondary,
												borderRadius: borderRadius.md,
												fontSize: typography.fontSize.xs,
												fontWeight: typography.fontWeight.medium,
												color: modelSaveStatus[selectedProvider]?.success
													? colors.success
													: colors.error,
												display: "flex",
												alignItems: "center",
												gap: spacing.xs,
												border: `1px solid ${
													modelSaveStatus[selectedProvider]?.success
														? `${colors.success}33`
														: `${colors.error}33`
												}`,
											}}
										>
											{modelSaveStatus[selectedProvider]?.success ? (
												<>
													<CircleCheck size={12} />
													Model selection saved successfully
												</>
											) : (
												<>
													<CircleAlert size={12} />
													Failed to save model selection
												</>
											)}
										</div>
									)}
								</div>
							)}
						</div>
					)}
				</div>

				{/* Persona Configuration Section */}
				<div
					style={{
						marginBottom: spacing["3xl"],
						backgroundColor: colors.background.primary,
						padding: spacing["3xl"],
						borderRadius: borderRadius.xl,
						boxShadow: shadows.md,
						border: `1px solid ${colors.border.light}`,
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: spacing.md,
							marginBottom: spacing["2xl"],
						}}
					>
						<div style={{ color: colors.text.accent }}>
							<StickyNote size={20} />
						</div>
						<h2
							style={{
								margin: 0,
								fontSize: typography.fontSize.xl,
								fontWeight: typography.fontWeight.semibold,
								color: colors.text.primary,
							}}
						>
							Persona Configuration
						</h2>
					</div>

					<div
						style={{
							marginBottom: spacing["2xl"],
							padding: spacing.lg,
							backgroundColor: colors.background.secondary,
							borderRadius: borderRadius.lg,
							border: `1px solid ${colors.border.light}`,
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "flex-start",
								gap: spacing.md,
								marginBottom: spacing.md,
							}}
						>
							<div style={{ color: colors.text.accent, marginTop: "2px" }}>
								<CircleAlert size={16} />
							</div>
							<div>
								<h3
									style={{
										margin: "0 0 4px 0",
										fontSize: typography.fontSize.sm,
										fontWeight: typography.fontWeight.semibold,
										color: colors.text.primary,
									}}
								>
									Personalize Your Analysis
								</h3>
								<p
									style={{
										margin: 0,
										fontSize: typography.fontSize.sm,
										color: colors.text.secondary,
										lineHeight: typography.lineHeight.normal,
									}}
								>
									Describe yourself to help the AI find content that's most
									relevant to your interests, profession, and goals. This
									persona will be used to filter and prioritize golden nuggets.
								</p>
							</div>
						</div>
					</div>

					<div
						style={{
							padding: spacing.lg,
							backgroundColor: colors.background.secondary,
							borderRadius: borderRadius.lg,
							border: `1px solid ${colors.border.light}`,
						}}
					>
						<label
							style={{
								display: "block",
								marginBottom: spacing.sm,
								color: colors.text.primary,
								fontSize: typography.fontSize.sm,
								fontWeight: typography.fontWeight.medium,
							}}
						>
							Your Persona:
						</label>
						<textarea
							value={userPersona}
							onChange={(e) => handlePersonaUpdate(e.target.value)}
							placeholder="e.g., Pragmatic Processor with ADHD, Software Engineer, Creative Writer"
							rows={3}
							style={{
								...components.input.default,
								width: "100%",
								resize: "vertical",
								minHeight: "80px",
								boxSizing: "border-box",
								fontFamily: typography.fontFamily.sans,
							}}
							onFocus={(e) => {
								e.target.style.borderColor = colors.text.accent;
							}}
							onBlur={(e) => {
								e.target.style.borderColor = colors.border.default;
							}}
						/>

						{/* Persona Save Status Feedback */}
						{personaSaveStatus && (
							<div
								style={{
									marginTop: spacing.sm,
									padding: spacing.sm,
									backgroundColor: colors.background.primary,
									borderRadius: borderRadius.md,
									fontSize: typography.fontSize.xs,
									fontWeight: typography.fontWeight.medium,
									color:
										personaSaveStatus.type === "success"
											? colors.success
											: colors.error,
									display: "flex",
									alignItems: "center",
									gap: spacing.xs,
									border: `1px solid ${
										personaSaveStatus.type === "success"
											? `${colors.success}33`
											: `${colors.error}33`
									}`,
								}}
							>
								{personaSaveStatus.type === "success" ? (
									<>
										<CircleCheck size={12} />
										Persona saved automatically
									</>
								) : (
									<>
										<CircleAlert size={12} />
										Failed to save persona
									</>
								)}
							</div>
						)}

						<div
							style={{
								marginTop: spacing.md,
								padding: spacing.sm,
								backgroundColor: colors.background.primary,
								borderRadius: borderRadius.md,
								fontSize: typography.fontSize.xs,
								color: colors.text.tertiary,
							}}
						>
							💡 Tips: Include your profession, interests, learning style, or
							any specific context that would help the AI understand what
							content is most valuable to you. Changes are saved automatically.
						</div>
					</div>
				</div>

				{/* Ensemble Settings Section */}
				<div
					style={{
						marginBottom: spacing["3xl"],
						backgroundColor: colors.background.primary,
						padding: spacing["3xl"],
						borderRadius: borderRadius.xl,
						boxShadow: shadows.md,
						border: `1px solid ${colors.border.light}`,
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: spacing.md,
							marginBottom: spacing["2xl"],
						}}
					>
						<div style={{ color: colors.text.accent }}>
							<CircleCheck size={20} />
						</div>
						<h2
							style={{
								margin: 0,
								fontSize: typography.fontSize.xl,
								fontWeight: typography.fontWeight.semibold,
								color: colors.text.primary,
							}}
						>
							Ensemble Settings
						</h2>
					</div>

					<div
						style={{
							marginBottom: spacing["2xl"],
							padding: spacing.lg,
							backgroundColor: colors.background.secondary,
							borderRadius: borderRadius.lg,
							border: `1px solid ${colors.border.light}`,
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "flex-start",
								gap: spacing.md,
								marginBottom: spacing.md,
							}}
						>
							<div style={{ color: colors.text.accent, marginTop: "2px" }}>
								<CircleAlert size={16} />
							</div>
							<div>
								<h3
									style={{
										margin: "0 0 4px 0",
										fontSize: typography.fontSize.sm,
										fontWeight: typography.fontWeight.semibold,
										color: colors.text.primary,
									}}
								>
									Configure Ensemble Analysis
								</h3>
								<p
									style={{
										margin: 0,
										fontSize: typography.fontSize.sm,
										color: colors.text.secondary,
										lineHeight: typography.lineHeight.normal,
									}}
								>
									Ensemble mode runs multiple analyses and finds consensus for
									higher accuracy. More runs = better confidence but higher API
									cost.
								</p>
							</div>
						</div>
					</div>

					<div
						style={{
							padding: spacing.lg,
							backgroundColor: colors.background.secondary,
							borderRadius: borderRadius.lg,
							border: `1px solid ${colors.border.light}`,
						}}
					>
						{/* Enable/Disable Toggle */}
						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								marginBottom: spacing.lg,
								padding: spacing.md,
								backgroundColor: colors.background.primary,
								borderRadius: borderRadius.md,
								border: `1px solid ${colors.border.light}`,
							}}
						>
							<div>
								<label
									style={{
										display: "block",
										color: colors.text.primary,
										fontSize: typography.fontSize.sm,
										fontWeight: typography.fontWeight.medium,
										marginBottom: spacing.xs,
									}}
								>
									Enable Ensemble Mode
								</label>
								<p
									style={{
										margin: 0,
										color: colors.text.secondary,
										fontSize: typography.fontSize.xs,
									}}
								>
									Allow ensemble analysis for higher confidence results
								</p>
							</div>
							<label
								style={{
									display: "flex",
									alignItems: "center",
									cursor: "pointer",
									gap: spacing.sm,
								}}
							>
								<input
									type="checkbox"
									checked={ensembleSettings.enabled}
									onChange={(e) =>
										handleEnsembleSettingsUpdate({ enabled: e.target.checked })
									}
									style={{
										transform: "scale(1.2)",
										accentColor: colors.text.accent,
									}}
								/>
							</label>
						</div>

						{/* Default Runs Setting */}
						<div
							style={{
								marginBottom: spacing.lg,
								opacity: ensembleSettings.enabled ? 1 : 0.5,
							}}
						>
							<label
								style={{
									display: "block",
									marginBottom: spacing.sm,
									color: colors.text.primary,
									fontSize: typography.fontSize.sm,
									fontWeight: typography.fontWeight.medium,
								}}
							>
								Default Number of Runs ({ensembleSettings.defaultRuns}x cost):
							</label>
							<input
								type="range"
								min="1"
								max="10"
								value={ensembleSettings.defaultRuns}
								onChange={(e) =>
									handleEnsembleSettingsUpdate({
										defaultRuns: parseInt(e.target.value),
									})
								}
								disabled={!ensembleSettings.enabled}
								style={{
									width: "100%",
									accentColor: colors.text.accent,
									marginBottom: spacing.sm,
								}}
							/>
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									fontSize: typography.fontSize.xs,
									color: colors.text.tertiary,
								}}
							>
								<span>1 (Fast)</span>
								<span>5 (Balanced)</span>
								<span>10 (High Confidence)</span>
							</div>
						</div>

						{/* Default Mode Setting */}
						<div
							style={{
								marginBottom: spacing.lg,
								opacity: ensembleSettings.enabled ? 1 : 0.5,
							}}
						>
							<label
								style={{
									display: "block",
									marginBottom: spacing.sm,
									color: colors.text.primary,
									fontSize: typography.fontSize.sm,
									fontWeight: typography.fontWeight.medium,
								}}
							>
								Default Mode:
							</label>
							<select
								value={ensembleSettings.defaultMode}
								onChange={(e) =>
									handleEnsembleSettingsUpdate({
										defaultMode: e.target.value as
											| "fast"
											| "balanced"
											| "comprehensive",
									})
								}
								disabled={!ensembleSettings.enabled}
								style={{
									...components.input.default,
									width: "100%",
									boxSizing: "border-box",
									backgroundColor: colors.background.primary,
								}}
								onFocus={(e) => {
									e.target.style.borderColor = colors.text.accent;
								}}
								onBlur={(e) => {
									e.target.style.borderColor = colors.border.default;
								}}
							>
								<option value="fast">Fast (Lower temperature)</option>
								<option value="balanced">Balanced (Standard)</option>
								<option value="comprehensive">Comprehensive (Thorough)</option>
							</select>
						</div>

						{/* Ensemble Save Status Feedback */}
						{ensembleSaveStatus && (
							<div
								style={{
									marginTop: spacing.sm,
									padding: spacing.sm,
									backgroundColor: colors.background.primary,
									borderRadius: borderRadius.md,
									fontSize: typography.fontSize.xs,
									fontWeight: typography.fontWeight.medium,
									color:
										ensembleSaveStatus.type === "success"
											? colors.success
											: colors.error,
									display: "flex",
									alignItems: "center",
									gap: spacing.xs,
									border: `1px solid ${
										ensembleSaveStatus.type === "success"
											? `${colors.success}33`
											: `${colors.error}33`
									}`,
								}}
							>
								{ensembleSaveStatus.type === "success" ? (
									<>
										<CircleCheck size={12} />
										Settings saved automatically
									</>
								) : (
									<>
										<CircleAlert size={12} />
										Failed to save settings
									</>
								)}
							</div>
						)}

						<div
							style={{
								marginTop: spacing.md,
								padding: spacing.sm,
								backgroundColor: colors.background.primary,
								borderRadius: borderRadius.md,
								fontSize: typography.fontSize.xs,
								color: colors.text.tertiary,
							}}
						>
							💡 Tips: Higher runs provide more confident results but cost more
							API tokens. Use 3-5 runs for most analyses. Comprehensive mode is
							best for important content. Changes are saved automatically.
						</div>
					</div>
				</div>

				{/* Two-Phase Extraction Settings Section */}
				<div
					style={{
						marginBottom: spacing["3xl"],
						backgroundColor: colors.background.primary,
						padding: spacing["3xl"],
						borderRadius: borderRadius.xl,
						boxShadow: shadows.md,
						border: `1px solid ${colors.border.light}`,
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: spacing.md,
							marginBottom: spacing["2xl"],
						}}
					>
						<Sparkles
							size={24}
							style={{
								color: colors.text.accent,
							}}
						/>
						<h2
							style={{
								fontSize: typography.fontSize["2xl"],
								fontWeight: typography.fontWeight.semibold,
								color: colors.text.primary,
							}}
						>
							Two-Phase Extraction Settings
						</h2>
					</div>

					<div
						style={{
							marginBottom: spacing["2xl"],
							padding: spacing.lg,
							backgroundColor: colors.background.secondary,
							borderRadius: borderRadius.lg,
							border: `1px solid ${colors.border.light}`,
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "flex-start",
								gap: spacing.md,
								marginBottom: spacing.md,
							}}
						>
							<div style={{ color: colors.text.accent, marginTop: "2px" }}>
								<CircleAlert size={16} />
							</div>
							<div>
								<h3
									style={{
										fontSize: typography.fontSize.lg,
										fontWeight: typography.fontWeight.medium,
										color: colors.text.primary,
										marginBottom: spacing.xs,
									}}
								>
									Advanced Two-Phase Analysis
								</h3>
								<p
									style={{
										fontSize: typography.fontSize.sm,
										color: colors.text.secondary,
										lineHeight: 1.5,
									}}
								>
									Enable two-phase extraction for improved accuracy. Phase 1
									uses high recall to find many potential nuggets, then Phase 2
									uses high precision to locate exact boundaries. This increases
									API costs but improves quality.
								</p>
							</div>
						</div>

						{/* Enable Two-Phase Toggle */}
						<div
							style={{
								display: "flex",
								alignItems: "flex-start",
								gap: spacing.md,
								marginBottom: spacing.lg,
							}}
						>
							<input
								type="checkbox"
								id="twoPhaseEnabled"
								checked={twoPhaseSettings.enabled}
								onChange={(e) =>
									handleTwoPhaseSettingsUpdate({ enabled: e.target.checked })
								}
								style={{
									width: "18px",
									height: "18px",
									marginTop: "2px",
									accentColor: colors.text.accent,
								}}
							/>
							<label
								htmlFor="twoPhaseEnabled"
								style={{
									fontSize: typography.fontSize.sm,
									color: colors.text.primary,
									cursor: "pointer",
									lineHeight: 1.5,
								}}
							>
								Enable two-phase extraction for higher precision results
							</label>
						</div>

						{/* Confidence Threshold Setting */}
						<div
							style={{
								marginBottom: spacing.lg,
								opacity: twoPhaseSettings.enabled ? 1 : 0.5,
							}}
						>
							<label
								style={{
									display: "block",
									marginBottom: spacing.sm,
									fontSize: typography.fontSize.sm,
									fontWeight: typography.fontWeight.medium,
									color: colors.text.primary,
								}}
							>
								Confidence Threshold ({twoPhaseSettings.confidenceThreshold}):
							</label>
							<input
								type="range"
								min="0.5"
								max="0.95"
								step="0.05"
								value={twoPhaseSettings.confidenceThreshold}
								onChange={(e) =>
									handleTwoPhaseSettingsUpdate({
										confidenceThreshold: parseFloat(e.target.value),
									})
								}
								disabled={!twoPhaseSettings.enabled}
								style={{
									width: "100%",
									accentColor: colors.text.accent,
									marginBottom: spacing.sm,
								}}
							/>
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									fontSize: typography.fontSize.xs,
									color: colors.text.tertiary,
								}}
							>
								<span>0.5 (Permissive)</span>
								<span>0.85 (Balanced)</span>
								<span>0.95 (Strict)</span>
							</div>
						</div>

						{/* Phase 1 Temperature Setting */}
						<div
							style={{
								marginBottom: spacing.lg,
								opacity: twoPhaseSettings.enabled ? 1 : 0.5,
							}}
						>
							<label
								style={{
									display: "block",
									marginBottom: spacing.sm,
									fontSize: typography.fontSize.sm,
									fontWeight: typography.fontWeight.medium,
									color: colors.text.primary,
								}}
							>
								Phase 1 Temperature ({twoPhaseSettings.phase1Temperature}):
							</label>
							<input
								type="range"
								min="0.0"
								max="1.0"
								step="0.1"
								value={twoPhaseSettings.phase1Temperature}
								onChange={(e) =>
									handleTwoPhaseSettingsUpdate({
										phase1Temperature: parseFloat(e.target.value),
									})
								}
								disabled={!twoPhaseSettings.enabled}
								style={{
									width: "100%",
									accentColor: colors.text.accent,
									marginBottom: spacing.sm,
								}}
							/>
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									fontSize: typography.fontSize.xs,
									color: colors.text.tertiary,
								}}
							>
								<span>0.0 (Focused)</span>
								<span>0.7 (Creative)</span>
								<span>1.0 (Varied)</span>
							</div>
						</div>

						{/* Save Status */}
						{twoPhaseSaveStatus && (
							<div
								style={{
									fontSize: typography.fontSize.xs,
									color:
										twoPhaseSaveStatus.type === "success"
											? colors.success
											: colors.error,
									display: "flex",
									alignItems: "center",
									gap: spacing.xs,
									border: `1px solid ${
										twoPhaseSaveStatus.type === "success"
											? `${colors.success}33`
											: `${colors.error}33`
									}`,
								}}
							>
								{twoPhaseSaveStatus.type === "success" ? (
									<>
										<CircleCheck size={12} />
										Settings saved automatically
									</>
								) : (
									<>
										<CircleAlert size={12} />
										Failed to save settings
									</>
								)}
							</div>
						)}

						<div
							style={{
								marginTop: spacing.md,
								padding: spacing.sm,
								backgroundColor: colors.background.primary,
								borderRadius: borderRadius.md,
								fontSize: typography.fontSize.xs,
								color: colors.text.tertiary,
								lineHeight: 1.4,
							}}
						>
							<strong>Note:</strong> Two-phase extraction significantly
							increases API costs as it performs multiple processing steps. Use
							for important content where accuracy is more important than speed
							or cost.
						</div>
					</div>
				</div>

				{/* Debug Settings Section */}
				<div
					style={{
						marginBottom: spacing["3xl"],
						backgroundColor: colors.background.primary,
						padding: spacing["3xl"],
						borderRadius: borderRadius.xl,
						boxShadow: shadows.md,
						border: `1px solid ${colors.border.light}`,
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: spacing.md,
							marginBottom: spacing["2xl"],
						}}
					>
						<div style={{ color: colors.text.accent }}>
							<CircleAlert size={20} />
						</div>
						<h2
							style={{
								margin: 0,
								fontSize: typography.fontSize.xl,
								fontWeight: typography.fontWeight.semibold,
								color: colors.text.primary,
							}}
						>
							Debug Settings
						</h2>
					</div>

					<div
						style={{
							padding: spacing.lg,
							backgroundColor: colors.background.secondary,
							borderRadius: borderRadius.lg,
							border: `1px solid ${colors.border.light}`,
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "flex-start",
								justifyContent: "space-between",
								gap: spacing.lg,
							}}
						>
							<div style={{ flex: 1 }}>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: spacing.sm,
										marginBottom: spacing.sm,
									}}
								>
									<h3
										style={{
											margin: 0,
											fontSize: typography.fontSize.lg,
											fontWeight: typography.fontWeight.semibold,
											color: colors.text.primary,
										}}
									>
										API Request/Response Logging
									</h3>
									{debugLoggingEnabled && (
										<div style={{ color: colors.success }}>
											<CircleCheck size={16} />
										</div>
									)}
								</div>
								<p
									style={{
										margin: 0,
										fontSize: typography.fontSize.sm,
										color: colors.text.secondary,
										lineHeight: typography.lineHeight.normal,
									}}
								>
									Enable detailed logging of API requests and responses in the
									browser console. Useful for debugging API issues and
									understanding how the extension communicates with AI
									providers.
									{debugLoggingEnabled && (
										<>
											<br />
											<strong style={{ color: colors.text.accent }}>
												Logging is enabled - check the browser console for API
												logs.
											</strong>
										</>
									)}
								</p>
							</div>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: spacing.sm,
								}}
							>
								<label
									style={{
										display: "flex",
										alignItems: "center",
										cursor: "pointer",
										fontSize: typography.fontSize.sm,
										fontWeight: typography.fontWeight.medium,
										color: colors.text.primary,
									}}
								>
									<input
										type="checkbox"
										checked={debugLoggingEnabled}
										onChange={(e) => handleDebugLoggingToggle(e.target.checked)}
										style={{
											marginRight: spacing.sm,
											cursor: "pointer",
											transform: "scale(1.2)",
										}}
									/>
									Enable Debug Logging
								</label>
							</div>
						</div>
					</div>
				</div>

				{/* Prompts Section */}
				<div
					style={{
						backgroundColor: colors.white,
						padding: "32px",
						borderRadius: "16px",
						boxShadow: shadows.md,
						border: `1px solid ${colors.border.light}`,
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							marginBottom: "24px",
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "12px",
							}}
						>
							<div style={{ color: colors.text.accent }}>
								<FileText size={20} />
							</div>
							<h2
								style={{
									margin: 0,
									fontSize: "20px",
									fontWeight: "600",
									color: colors.text.primary,
								}}
							>
								Analysis Prompts
							</h2>
						</div>
						<button
							onClick={() => openPromptEditor()}
							style={{
								padding: "12px 20px",
								backgroundColor: colors.text.accent,
								color: colors.white,
								border: "none",
								borderRadius: "8px",
								cursor: "pointer",
								fontSize: "14px",
								fontWeight: "600",
								transition: "background-color 0.2s",
								display: "flex",
								alignItems: "center",
								gap: "8px",
							}}
							onMouseEnter={(e) =>
								(e.currentTarget.style.backgroundColor = colors.text.accent)
							}
							onMouseLeave={(e) =>
								(e.currentTarget.style.backgroundColor = colors.text.accent)
							}
						>
							<Plus size={16} />
							Add New Prompt
						</button>
					</div>

					<div
						style={{
							marginBottom: "24px",
							padding: "16px",
							backgroundColor: colors.background.secondary,
							borderRadius: "12px",
							border: `1px solid ${colors.border.light}`,
						}}
					>
						<p
							style={{
								margin: 0,
								fontSize: "14px",
								color: colors.text.secondary,
								lineHeight: "1.5",
							}}
						>
							Prompts define what the AI looks for when analyzing web content.
							Create custom prompts for different use cases, or use the default
							prompt to get started.
						</p>
					</div>

					{prompts.length === 0 ? (
						<div
							style={{
								textAlign: "center",
								padding: "48px 24px",
								backgroundColor: colors.background.secondary,
								borderRadius: "12px",
								border: `2px dashed ${colors.border.default}`,
							}}
						>
							<div
								style={{
									color: colors.text.secondary,
									marginBottom: "16px",
									fontSize: "48px",
								}}
							>
								<StickyNote size={16} />
							</div>
							<h3
								style={{
									margin: "0 0 8px 0",
									fontSize: "18px",
									fontWeight: "600",
									color: colors.text.primary,
								}}
							>
								No prompts yet
							</h3>
							<p
								style={{
									margin: "0 0 24px 0",
									color: colors.text.secondary,
									fontSize: "16px",
								}}
							>
								Create your first prompt to start analyzing web content
							</p>
							<button
								onClick={() => openPromptEditor()}
								style={{
									padding: "12px 24px",
									backgroundColor: colors.text.accent,
									color: colors.white,
									border: "none",
									borderRadius: "8px",
									cursor: "pointer",
									fontSize: "14px",
									fontWeight: "600",
									transition: "background-color 0.2s",
									display: "inline-flex",
									alignItems: "center",
									gap: "8px",
								}}
								onMouseEnter={(e) =>
									(e.currentTarget.style.backgroundColor = colors.text.accent)
								}
								onMouseLeave={(e) =>
									(e.currentTarget.style.backgroundColor = colors.text.accent)
								}
							>
								<Plus size={16} />
								Create First Prompt
							</button>
						</div>
					) : (
						<div
							style={{
								display: "grid",
								gap: "16px",
							}}
						>
							{prompts.map((prompt, _index) => (
								<div
									key={prompt.id}
									style={{
										padding: "24px",
										backgroundColor: colors.background.secondary,
										borderRadius: "12px",
										border: `1px solid ${colors.border.light}`,
										transition: "all 0.2s",
									}}
									onMouseEnter={(e) => {
										e.currentTarget.style.backgroundColor =
											colors.background.secondary;
										e.currentTarget.style.borderColor = colors.border.default;
									}}
									onMouseLeave={(e) => {
										e.currentTarget.style.backgroundColor =
											colors.background.secondary;
										e.currentTarget.style.borderColor = colors.border.light;
									}}
								>
									<div
										style={{
											display: "flex",
											alignItems: "flex-start",
											justifyContent: "space-between",
											gap: "16px",
										}}
									>
										<div style={{ flex: 1 }}>
											<div
												style={{
													display: "flex",
													alignItems: "center",
													gap: "12px",
													marginBottom: "8px",
												}}
											>
												<h3
													style={{
														margin: 0,
														fontSize: "18px",
														fontWeight: "600",
														color: colors.text.primary,
													}}
												>
													{prompt.name}
												</h3>
												{prompt.isDefault && (
													<div
														style={{
															display: "flex",
															alignItems: "center",
															gap: "4px",
															padding: "4px 8px",
															backgroundColor: colors.background.secondary,
															color: colors.text.secondary,
															borderRadius: "6px",
															fontSize: "12px",
															fontWeight: "500",
														}}
													>
														<Star size={16} />
														Default
													</div>
												)}
											</div>
											<p
												style={
													{
														margin: 0,
														color: colors.text.secondary,
														fontSize: "14px",
														lineHeight: "1.5",
														display: "-webkit-box",
														WebkitLineClamp: 3,
														WebkitBoxOrient: "vertical" as const,
														overflow: "hidden",
													} as React.CSSProperties
												}
											>
												{prompt.prompt}
											</p>
										</div>

										<div
											style={{
												display: "flex",
												alignItems: "center",
												gap: "8px",
											}}
										>
											<button
												onClick={() => setDefaultPrompt(prompt.id)}
												disabled={prompt.isDefault}
												title={
													prompt.isDefault
														? "This is the default prompt"
														: "Set as default prompt"
												}
												style={{
													padding: "8px",
													backgroundColor: "transparent",
													color: prompt.isDefault
														? colors.text.secondary
														: colors.text.secondary,
													border: "none",
													borderRadius: "6px",
													cursor: prompt.isDefault ? "default" : "pointer",
													transition: "all 0.2s",
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
												}}
												onMouseEnter={(e) => {
													if (!prompt.isDefault) {
														e.currentTarget.style.backgroundColor =
															colors.background.secondary;
														e.currentTarget.style.color = colors.text.secondary;
													}
												}}
												onMouseLeave={(e) => {
													if (!prompt.isDefault) {
														e.currentTarget.style.backgroundColor =
															"transparent";
														e.currentTarget.style.color = colors.text.secondary;
													}
												}}
											>
												<Star size={16} />
											</button>
											<button
												onClick={() => openPromptEditor(prompt)}
												title="Edit prompt"
												style={{
													padding: "8px",
													backgroundColor: "transparent",
													color: colors.text.secondary,
													border: "none",
													borderRadius: "6px",
													cursor: "pointer",
													transition: "all 0.2s",
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
												}}
												onMouseEnter={(e) => {
													e.currentTarget.style.backgroundColor =
														colors.background.secondary;
													e.currentTarget.style.color = colors.text.primary;
												}}
												onMouseLeave={(e) => {
													e.currentTarget.style.backgroundColor = "transparent";
													e.currentTarget.style.color = colors.text.secondary;
												}}
											>
												<Pencil size={16} />
											</button>
											<button
												onClick={() => deletePrompt(prompt.id)}
												title="Delete prompt"
												style={{
													padding: "8px",
													backgroundColor: "transparent",
													color: colors.text.secondary,
													border: "none",
													borderRadius: "6px",
													cursor: "pointer",
													transition: "all 0.2s",
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
												}}
												onMouseEnter={(e) => {
													e.currentTarget.style.backgroundColor =
														colors.background.secondary;
													e.currentTarget.style.color = colors.error;
												}}
												onMouseLeave={(e) => {
													e.currentTarget.style.backgroundColor = "transparent";
													e.currentTarget.style.color = colors.text.secondary;
												}}
											>
												<Trash size={16} />
											</button>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Footer */}
				<div
					style={{
						marginTop: "48px",
						padding: "24px",
						textAlign: "center",
						color: colors.text.secondary,
						fontSize: "14px",
						borderTop: `1px solid ${colors.border.light}`,
					}}
				>
					<p style={{ margin: 0 }}>
						Golden Nugget Finder • Made with{" "}
						<Heart size={16} style={{ display: "inline", margin: "0 4px" }} />{" "}
						for better web content analysis
					</p>
				</div>
			</div>

			{/* Prompt Editor Modal */}
			{isEditing && (
				<div
					style={{
						position: "fixed",
						top: 0,
						left: 0,
						width: "100%",
						height: "100%",
						backgroundColor: colors.background.modalOverlay,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						zIndex: 1000,
						padding: "20px",
						boxSizing: "border-box",
					}}
				>
					<div
						style={{
							backgroundColor: colors.white,
							padding: "32px",
							borderRadius: "16px",
							width: "100%",
							maxWidth: "700px",
							maxHeight: "90vh",
							overflowY: "auto",
							boxShadow: shadows.modal,
						}}
					>
						<h3
							style={{
								margin: "0 0 24px 0",
								fontSize: "24px",
								fontWeight: "700",
								color: colors.text.primary,
							}}
						>
							{editingPrompt ? "Edit Prompt" : "Create New Prompt"}
						</h3>

						<div style={{ marginBottom: "24px" }}>
							<label
								style={{
									display: "block",
									marginBottom: "8px",
									color: colors.text.primary,
									fontSize: "14px",
									fontWeight: "600",
								}}
							>
								Prompt Name
							</label>
							<input
								type="text"
								value={promptName}
								onChange={(e) => setPromptName(e.target.value)}
								placeholder="e.g., 'Find Learning Resources', 'Identify Tools', 'Extract Key Insights'"
								style={{
									width: "100%",
									padding: "16px",
									border: `2px solid ${validationErrors.name ? colors.error : colors.border.light}`,
									borderRadius: "8px",
									boxSizing: "border-box",
									fontSize: "16px",
									color: colors.text.primary,
									fontFamily: "inherit",
									transition: "border-color 0.2s",
									outline: "none",
								}}
								onFocus={(e) => {
									if (!validationErrors.name) {
										e.target.style.borderColor = colors.text.accent;
									}
								}}
								onBlur={(e) => {
									if (!validationErrors.name) {
										e.target.style.borderColor = colors.border.light;
									}
								}}
							/>
							{validationErrors.name && (
								<p
									style={{
										margin: "8px 0 0 0",
										color: colors.error,
										fontSize: "14px",
									}}
								>
									{validationErrors.name}
								</p>
							)}
						</div>

						<div style={{ marginBottom: "32px" }}>
							<label
								style={{
									display: "block",
									marginBottom: "8px",
									color: colors.text.primary,
									fontSize: "14px",
									fontWeight: "600",
								}}
							>
								Prompt Instructions
							</label>
							<textarea
								value={promptText}
								onChange={(e) => setPromptText(e.target.value)}
								rows={12}
								placeholder="Describe what you want the AI to look for when analyzing web content...\n\nExample:\n'I'm a software developer learning new technologies. Find practical tools, frameworks, libraries, and learning resources mentioned in this content. Focus on actionable items that can help me improve my skills.'"
								style={{
									width: "100%",
									padding: "16px",
									border: `2px solid ${validationErrors.prompt ? colors.error : colors.border.light}`,
									borderRadius: "8px",
									boxSizing: "border-box",
									resize: "vertical",
									fontSize: "16px",
									color: colors.text.primary,
									fontFamily: "inherit",
									lineHeight: "1.5",
									transition: "border-color 0.2s",
									outline: "none",
								}}
								onFocus={(e) => {
									if (!validationErrors.prompt) {
										e.target.style.borderColor = colors.text.accent;
									}
								}}
								onBlur={(e) => {
									if (!validationErrors.prompt) {
										e.target.style.borderColor = colors.border.light;
									}
								}}
							/>
							{validationErrors.prompt && (
								<p
									style={{
										margin: "8px 0 0 0",
										color: colors.error,
										fontSize: "14px",
									}}
								>
									{validationErrors.prompt}
								</p>
							)}
						</div>

						<div
							style={{
								display: "flex",
								gap: "12px",
								justifyContent: "flex-end",
							}}
						>
							<button
								onClick={() => setIsEditing(false)}
								style={{
									padding: "12px 24px",
									backgroundColor: colors.background.secondary,
									color: colors.text.primary,
									border: `1px solid ${colors.border.light}`,
									borderRadius: "8px",
									cursor: "pointer",
									fontSize: "14px",
									fontWeight: "500",
									transition: "all 0.2s",
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.backgroundColor =
										colors.background.secondary;
									e.currentTarget.style.borderColor = colors.border.default;
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.backgroundColor =
										colors.background.secondary;
									e.currentTarget.style.borderColor = colors.border.light;
								}}
							>
								Cancel
							</button>
							<button
								onClick={savePrompt}
								style={{
									padding: "12px 24px",
									backgroundColor: colors.text.accent,
									color: colors.white,
									border: "none",
									borderRadius: "8px",
									cursor: "pointer",
									fontSize: "14px",
									fontWeight: "500",
									transition: "background-color 0.2s",
								}}
								onMouseEnter={(e) =>
									(e.currentTarget.style.backgroundColor = colors.text.accent)
								}
								onMouseLeave={(e) =>
									(e.currentTarget.style.backgroundColor = colors.text.accent)
								}
							>
								{editingPrompt ? "Save Changes" : "Create Prompt"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Confirm Dialog */}
			<ConfirmDialog
				isOpen={confirmDialog.isOpen}
				title={confirmDialog.title}
				message={confirmDialog.message}
				confirmText="Delete"
				cancelText="Cancel"
				onConfirm={confirmDialog.onConfirm}
				onCancel={() =>
					setConfirmDialog({
						isOpen: false,
						title: "",
						message: "",
						onConfirm: () => {},
					})
				}
				type="danger"
			/>
		</div>
	);
}

export default {
	main() {
		const root = ReactDOM.createRoot(document.getElementById("root")!);
		root.render(<OptionsPage />);
	},
};
