"""
Pydantic models for FastAPI request/response validation.

These models match the TypeScript interfaces from the Chrome extension
to ensure type safety across the entire feedback system.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Literal

from pydantic import BaseModel, Field

if TYPE_CHECKING:
    from datetime import datetime

# Feedback data models (matching Chrome extension types)


class FeedbackSubmissionRequest(BaseModel):
    nuggetFeedback: list[NuggetFeedback] | None = None
    missingContentFeedback: list[MissingContentFeedback] | None = None


class UpdateFeedbackRequest(BaseModel):
    """Request model for updating feedback items"""

    content: str | None = None
    rating: Literal["positive", "negative"] | None = None
    corrected_type: Literal["tool", "media", "aha! moments", "analogy", "model"] | None = None
    suggested_type: Literal["tool", "media", "aha! moments", "analogy", "model"] | None = None


# Stats and optimization models


class FeedbackStatsResponse(BaseModel):
    totalFeedback: int
    positiveCount: int
    negativeCount: int
    lastOptimizationDate: str | None = None
    daysSinceLastOptimization: int
    recentNegativeRate: float = Field(..., description="Negative rate in last 20 items")
    shouldOptimize: bool
    nextOptimizationTrigger: str


class OptimizationRequest(BaseModel):
    mode: Literal["expensive", "cheap"] = Field(
        ...,
        description="MIPROv2 (expensive) vs BootstrapFewShotWithRandomSearch (cheap)",
    )
    manualTrigger: bool | None = False


class OptimizedPromptResponse(BaseModel):
    id: str
    version: int
    prompt: str
    optimizationDate: str
    performance: dict = Field(
        ..., description="Contains feedbackCount and positiveRate"
    )
    # NEW: Chrome extension prompt context
    chromePromptId: str | None = None
    chromePromptVersion: int | None = None
    modelProvider: str | None = None
    modelName: str | None = None


# Enhanced deduplication models

FeedbackStatus = Literal["new", "updated", "duplicate"]


class DeduplicationInfo(BaseModel):
    """Enhanced deduplication information for feedback responses"""

    nugget_duplicates: int = 0
    missing_content_duplicates: int = 0
    nugget_updates: int = 0
    missing_content_updates: int = 0
    total_submitted: int = 0
    user_message: str | None = None
    duplicate_details: list[dict] = Field(default_factory=list)


class FeedbackWithStatus(BaseModel):
    """Feedback item with processing status information"""

    type: Literal["nugget", "missing_content"]
    id: str
    content: str
    status: FeedbackStatus
    rating: str | None = None
    original_type: str | None = None
    corrected_type: str | None = None
    suggested_type: str | None = None
    url: str
    processed: bool = False
    last_used_at: str | None = None
    usage_count: int = 0
    created_at: str
    client_timestamp: int
    # NEW: Model tracking fields for multi-provider support
    model_provider: str | None = None
    model_name: str | None = None


class EnhancedFeedbackResponse(BaseModel):
    """Enhanced response for feedback submissions with detailed status"""

    success: bool = True
    message: str = "Feedback processed successfully"
    deduplication: DeduplicationInfo
    stats: dict | None = None
    optimization_triggered: bool = False


# Database models for internal use


# DSPy optimization models


class TrainingExample(BaseModel):
    """Model for DSPy training examples"""

    input_content: str
    expected_output: dict  # The golden nuggets structure
    feedback_score: float  # Derived from user feedback
    url: str
    timestamp: datetime
    # NEW: Link to specific Chrome extension prompt
    chrome_prompt_id: str | None = None
    chrome_prompt_version: int | None = None
    model_provider: str
    model_name: str


class PromptOptimizationResult(BaseModel):
    """Result of DSPy optimization"""

    optimized_prompt: str
    performance_score: float
    training_examples_count: int
    optimization_mode: str
    execution_time: float
    improvement_over_baseline: float | None = None
    # NEW: Chrome extension prompt context
    chrome_prompt_id: str | None = None
    chrome_prompt_version: int | None = None
    model_provider: str
    model_name: str


# Monitoring and observability models


class OptimizationProgress(BaseModel):
    """Current progress of an optimization run"""

    step: str
    progress: int = Field(..., description="Progress percentage (0-100, -1 for failed)")
    message: str
    timestamp: str
    last_updated: str


class SystemHealthResponse(BaseModel):
    """System health check response"""

    status: Literal["healthy", "degraded", "unhealthy"]
    uptime_seconds: float
    active_optimizations: int
    dspy_available: bool
    gemini_configured: bool
    database_accessible: bool
    details: dict = Field(default_factory=dict)


class MonitoringResponse(BaseModel):
    """Monitoring dashboard response"""

    active_runs: dict[str, OptimizationProgress]
    recent_completions: list[dict]
    system_health: SystemHealthResponse


# Chrome Extension Prompt Integration Models


class PromptOptimizationRequest(BaseModel):
    """Request to optimize a specific Chrome extension prompt"""

    prompt_id: str
    prompt_content: str
    mode: Literal["expensive", "cheap"] = Field(
        default="cheap",
        description="MIPROv2 (expensive) vs BootstrapFewShotWithRandomSearch (cheap)",
    )
    manualTrigger: bool | None = False


class OptimizedChromePromptResponse(BaseModel):
    """Response containing an optimized Chrome extension prompt"""

    id: str
    original_prompt_id: str
    version: int
    optimized_prompt: str
    original_prompt: str
    optimizationDate: str
    performance: dict = Field(
        ..., description="Contains feedbackCount and positiveRate"
    )
    providerSpecific: bool = False
    modelProvider: str | None = None
    modelName: str | None = None


class ChromeExtensionPrompt(BaseModel):
    """Model representing Chrome extension prompt structure"""

    id: str
    name: str
    prompt: str
    is_default: bool = Field(alias="isDefault")
    is_optimized: bool | None = Field(default=None, alias="isOptimized")
    optimization_date: str | None = Field(default=None, alias="optimizationDate")
    performance: dict | None = None  # {feedbackCount: int, positiveRate: float}

    class Config:
        allow_population_by_field_name = True


class StoredChromePrompt(BaseModel):
    """Internal model for Chrome extension prompt storage"""

    id: str
    name: str
    prompt: str
    is_default: bool
    version: int = 1
    created_at: datetime
    updated_at: datetime
    is_active: bool = True  # For soft deletion
    original_prompt_hash: str  # To detect changes
    last_sync_at: datetime


class PromptOptimizationMapping(BaseModel):
    """Maps Chrome extension prompts to their optimization runs"""

    id: str
    chrome_prompt_id: str
    chrome_prompt_version: int
    optimization_run_id: str
    model_provider: str
    model_name: str
    created_at: datetime
    is_current: bool = False  # Is this the current optimization for this prompt+model


# Updated feedback models to link to Chrome extension prompts


class NuggetFeedback(BaseModel):
    id: str
    nuggetContent: str = Field(..., description="Full golden nugget content")
    originalType: Literal["tool", "media", "aha! moments", "analogy", "model"]
    correctedType: Literal["tool", "media", "aha! moments", "analogy", "model"] | None = None
    rating: Literal["positive", "negative"]
    timestamp: int
    url: str
    context: str = Field(..., description="Full surrounding context from page")
    # Model tracking fields for multi-provider support
    modelProvider: str = Field(
        ..., description="LLM provider used (gemini, openai, anthropic, openrouter)"
    )
    modelName: str = Field(
        ..., description="Specific model used (e.g., gemini-2.5-flash, gpt-4o-mini)"
    )
    # NEW: Chrome extension prompt context
    promptId: str | None = Field(
        default=None, description="Chrome extension prompt ID used for this analysis"
    )
    promptVersion: int | None = Field(
        default=None, description="Version of the prompt used"
    )
    fullPromptContent: str | None = Field(
        default=None, description="Full prompt content used (for optimization context)"
    )


class MissingContentFeedback(BaseModel):
    id: str
    content: str
    suggestedType: Literal["tool", "media", "aha! moments", "analogy", "model"]
    timestamp: int
    url: str
    context: str = Field(..., description="Page context")
    # Model tracking fields for multi-provider support
    modelProvider: str = Field(
        ..., description="LLM provider used (gemini, openai, anthropic, openrouter)"
    )
    modelName: str = Field(
        ..., description="Specific model used (e.g., gemini-2.5-flash, gpt-4o-mini)"
    )
    # NEW: Chrome extension prompt context
    promptId: str | None = Field(
        default=None, description="Chrome extension prompt ID used for this analysis"
    )
    promptVersion: int | None = Field(
        default=None, description="Version of the prompt used"
    )
    fullPromptContent: str | None = Field(
        default=None, description="Full prompt content used (for optimization context)"
    )


# Updated stored models to include prompt context


class StoredNuggetFeedback(BaseModel):
    """Internal model for database storage"""

    id: str
    nugget_content: str
    original_type: str
    corrected_type: str | None = None
    rating: str
    timestamp: datetime
    url: str
    context: str
    created_at: datetime
    report_count: int = 1
    first_reported_at: datetime
    last_reported_at: datetime
    # Model tracking fields for multi-provider support
    model_provider: str
    model_name: str
    # NEW: Chrome extension prompt context
    prompt_id: str | None = None
    prompt_version: int | None = None
    full_prompt_content: str | None = None


class StoredMissingContentFeedback(BaseModel):
    """Internal model for database storage"""

    id: str
    content: str
    suggested_type: str
    timestamp: datetime
    url: str
    context: str
    created_at: datetime
    report_count: int = 1
    first_reported_at: datetime
    last_reported_at: datetime
    # Model tracking fields for multi-provider support
    model_provider: str
    model_name: str
    # NEW: Chrome extension prompt context
    prompt_id: str | None = None
    prompt_version: int | None = None
    full_prompt_content: str | None = None


# Updated optimization models for prompt-specific optimization


class OptimizationRun(BaseModel):
    """Model for optimization run records"""

    id: str
    mode: str
    trigger_type: str  # 'auto' or 'manual'
    started_at: datetime
    completed_at: datetime | None = None
    status: str  # 'running', 'completed', 'failed'
    result_prompt: str | None = None
    performance_improvement: float | None = None
    feedback_count: int
    error_message: str | None = None
    # NEW: Chrome extension prompt context
    chrome_prompt_id: str | None = None  # Which Chrome prompt was optimized
    chrome_prompt_version: int | None = None
    model_provider: str | None = None  # Which provider this optimization is for
    model_name: str | None = None


# Deduplication models


class FeedbackWithDeduplication(BaseModel):
    """Feedback response model that includes deduplication information"""

    id: str
    content: str
    feedback_type: Literal["nugget", "missing_content"]
    url: str
    rating: Literal["positive", "negative"] | None = None
    suggested_type: Literal["tool", "media", "aha! moments", "analogy", "model"] | None = None
    original_type: Literal["tool", "media", "aha! moments", "analogy", "model"] | None = None
    corrected_type: Literal["tool", "media", "aha! moments", "analogy", "model"] | None = None
    created_at: str
    deduplication: DeduplicationInfo
