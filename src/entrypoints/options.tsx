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
import { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { GeminiClient } from "../background/gemini-client";
import {
	borderRadius,
	colors,
	components,
	shadows,
	spacing,
	typography,
} from "../shared/design-system";
import { storage } from "../shared/storage";
import type { SavedPrompt } from "../shared/types";

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
				onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
				onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.6")}
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
	const [apiKey, setApiKey] = useState("");
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
	const [isValidating, setIsValidating] = useState(false);
	const [confirmDialog, setConfirmDialog] = useState<{
		isOpen: boolean;
		title: string;
		message: string;
		onConfirm: () => void;
	}>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

	useEffect(() => {
		loadData();
	}, [loadData]);

	const loadData = async () => {
		try {
			setLoading(true);
			const [savedApiKey, savedPrompts] = await Promise.all([
				storage.getApiKey({
					source: "options",
					action: "read",
					timestamp: Date.now(),
				}),
				storage.getPrompts(),
			]);
			setApiKey(savedApiKey);
			setPrompts(savedPrompts);
		} catch (_err) {
			setError("Failed to load data");
		} finally {
			setLoading(false);
		}
	};

	const saveApiKey = async () => {
		if (!apiKey.trim()) {
			setApiKeyStatus({
				type: "error",
				title: "API Key Required",
				message: "Please enter your Gemini API key",
			});
			return;
		}

		try {
			setIsValidating(true);
			setApiKeyStatus({
				type: "info",
				title: "Validating...",
				message: "Checking your API key with Google Gemini",
			});

			const client = new GeminiClient(apiKey);
			await client.validateApiKey();

			await storage.saveApiKey(apiKey, {
				source: "options",
				action: "write",
				timestamp: Date.now(),
			});
			setApiKeyStatus({
				type: "success",
				title: "API Key Saved",
				message: "Your API key has been validated and saved successfully",
			});

			setTimeout(() => setApiKeyStatus(null), 5000);
		} catch (_err) {
			setApiKeyStatus({
				type: "error",
				title: "Invalid API Key",
				message:
					"The API key is invalid or doesn't have the required permissions. Please check your key and try again.",
			});
		} finally {
			setIsValidating(false);
		}
	};

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
						onMouseEnter={(e) =>
							(e.currentTarget.style.backgroundColor = colors.text.accent)
						}
						onMouseLeave={(e) =>
							(e.currentTarget.style.backgroundColor = colors.text.accent)
						}
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

				{/* API Key Section */}
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
							<Key size={20} />
						</div>
						<h2
							style={{
								margin: 0,
								fontSize: typography.fontSize.xl,
								fontWeight: typography.fontWeight.semibold,
								color: colors.text.primary,
							}}
						>
							Google Gemini API Key
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
						<p
							style={{
								margin: `0 0 ${spacing.md} 0`,
								fontSize: typography.fontSize.sm,
								color: colors.text.secondary,
								fontWeight: typography.fontWeight.medium,
							}}
						>
							<Lock
								size={16}
								style={{ display: "inline", marginRight: "8px" }}
							/>
							Your API key is stored securely in your browser and never shared
						</p>
						<p
							style={{
								margin: `0 0 ${spacing.md} 0`,
								fontSize: typography.fontSize.sm,
								color: colors.text.tertiary,
								lineHeight: typography.lineHeight.normal,
							}}
						>
							You'll need a Google Gemini API key to use this extension. The key
							is used to analyze webpage content and find valuable insights.
						</p>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: spacing.sm,
								fontSize: typography.fontSize.sm,
								color: colors.text.accent,
							}}
						>
							<span>Get your free API key from Google AI Studio</span>
							<a
								href="https://aistudio.google.com/app/apikey"
								target="_blank"
								rel="noopener noreferrer"
								style={{
									color: colors.text.accent,
									textDecoration: "none",
									display: "flex",
									alignItems: "center",
								}}
							>
								<ExternalLink size={16} />
							</a>
						</div>
					</div>

					<div
						style={{
							display: "flex",
							gap: spacing.md,
							alignItems: "stretch",
							marginBottom: spacing.lg,
						}}
					>
						<input
							type="password"
							value={apiKey}
							onChange={(e) => setApiKey(e.target.value)}
							placeholder="Enter your Gemini API key (e.g., AIzaSyC...)"
							style={{
								...components.input.default,
								flex: 1,
								fontSize: typography.fontSize.base,
								color: colors.text.primary,
								fontFamily: typography.fontFamily.sans,
							}}
							onFocus={(e) => (e.target.style.borderColor = colors.text.accent)}
							onBlur={(e) =>
								(e.target.style.borderColor = colors.border.default)
							}
						/>
						<button
							onClick={saveApiKey}
							disabled={isValidating}
							style={{
								...components.button.primary,
								backgroundColor: isValidating
									? colors.text.secondary
									: colors.text.accent,
								cursor: isValidating ? "not-allowed" : "pointer",
								fontSize: typography.fontSize.base,
								fontWeight: typography.fontWeight.semibold,
								minWidth: "120px",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								gap: spacing.sm,
							}}
							onMouseEnter={(e) => {
								if (!isValidating)
									e.currentTarget.style.backgroundColor = colors.text.accent;
							}}
							onMouseLeave={(e) => {
								if (!isValidating)
									e.currentTarget.style.backgroundColor = colors.text.accent;
							}}
						>
							{isValidating ? (
								<>
									<div
										style={{
											width: "16px",
											height: "16px",
											border: `2px solid ${colors.background.primary}40`,
											borderTop: `2px solid ${colors.background.primary}`,
											borderRadius: "50%",
											animation: "spin 1s linear infinite",
										}}
									/>
									Validating...
								</>
							) : (
								"Save API Key"
							)}
						</button>
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
														WebkitBoxOrient: "vertical" as any,
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
