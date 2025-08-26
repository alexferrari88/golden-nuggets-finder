"""
Pydantic models for FastAPI request/response validation.

These models match the TypeScript interfaces from the Chrome extension
to ensure type safety across the entire feedback system.
"""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

# Feedback data models (matching Chrome extension types)




class FeedbackSubmissionRequest(BaseModel):
    nuggetFeedback: Optional[list[NuggetFeedback]] = None
    missingContentFeedback: Optional[list[MissingContentFeedback]] = None


class UpdateFeedbackRequest(BaseModel):
    """Request model for updating feedback items"""

    content: Optional[str] = None
    rating: Optional[Literal["positive", "negative"]] = None
    corrected_type: Optional[
        Literal["tool", "media", "aha! moments", "analogy", "model"]
    ] = None
    suggested_type: Optional[
        Literal["tool", "media", "aha! moments", "analogy", "model"]
    ] = None


# Stats and optimization models


class FeedbackStatsResponse(BaseModel):
    totalFeedback: int
    positiveCount: int
    negativeCount: int
    lastOptimizationDate: Optional[str] = None
    daysSinceLastOptimization: int
    recentNegativeRate: float = Field(..., description="Negative rate in last 20 items")
    shouldOptimize: bool
    nextOptimizationTrigger: str


class OptimizationRequest(BaseModel):
    mode: Literal["expensive", "cheap"] = Field(
        ...,
        description="MIPROv2 (expensive) vs BootstrapFewShotWithRandomSearch (cheap)",
    )
    manualTrigger: Optional[bool] = False


class OptimizedPromptResponse(BaseModel):
    id: str
    version: int
    prompt: str
    optimizationDate: str
    performance: dict = Field(
        ..., description="Contains feedbackCount and positiveRate"
    )
    # NEW: Chrome extension prompt context
    chromePromptId: Optional[str] = None
    chromePromptVersion: Optional[int] = None
    modelProvider: Optional[str] = None
    modelName: Optional[str] = None


# Enhanced deduplication models

FeedbackStatus = Literal["new", "updated", "duplicate"]


class DeduplicationInfo(BaseModel):
    """Enhanced deduplication information for feedback responses"""

    nugget_duplicates: int = 0
    missing_content_duplicates: int = 0
    nugget_updates: int = 0
    missing_content_updates: int = 0
    total_submitted: int = 0
    user_message: Optional[str] = None
    duplicate_details: list[dict] = Field(default_factory=list)


class FeedbackWithStatus(BaseModel):
    """Feedback item with processing status information"""

    type: Literal["nugget", "missing_content"]
    id: str
    content: str
    status: FeedbackStatus
    rating: Optional[str] = None
    original_type: Optional[str] = None
    corrected_type: Optional[str] = None
    suggested_type: Optional[str] = None
    url: str
    processed: bool = False
    last_used_at: Optional[str] = None
    usage_count: int = 0
    created_at: str
    client_timestamp: int
    # NEW: Model tracking fields for multi-provider support
    model_provider: Optional[str] = None
    model_name: Optional[str] = None


class EnhancedFeedbackResponse(BaseModel):
    """Enhanced response for feedback submissions with detailed status"""

    success: bool = True
    message: str = "Feedback processed successfully"
    deduplication: DeduplicationInfo
    stats: Optional[dict] = None
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
    chrome_prompt_id: Optional[str] = None
    chrome_prompt_version: Optional[int] = None
    model_provider: str
    model_name: str


class PromptOptimizationResult(BaseModel):
    """Result of DSPy optimization"""

    optimized_prompt: str
    performance_score: float
    training_examples_count: int
    optimization_mode: str
    execution_time: float
    improvement_over_baseline: Optional[float] = None
    # NEW: Chrome extension prompt context
    chrome_prompt_id: Optional[str] = None
    chrome_prompt_version: Optional[int] = None
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
        description="MIPROv2 (expensive) vs BootstrapFewShotWithRandomSearch (cheap)"
    )
    manualTrigger: Optional[bool] = False


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
    modelProvider: Optional[str] = None
    modelName: Optional[str] = None


class ChromeExtensionPrompt(BaseModel):
    """Model representing Chrome extension prompt structure"""

    id: str
    name: str
    prompt: str
    is_default: bool = Field(alias="isDefault")
    is_optimized: Optional[bool] = Field(default=None, alias="isOptimized")
    optimization_date: Optional[str] = Field(default=None, alias="optimizationDate")
    performance: Optional[dict] = None  # {feedbackCount: int, positiveRate: float}

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
    correctedType: Optional[
        Literal["tool", "media", "aha! moments", "analogy", "model"]
    ] = None
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
    promptId: Optional[str] = Field(
        default=None, description="Chrome extension prompt ID used for this analysis"
    )
    promptVersion: Optional[int] = Field(
        default=None, description="Version of the prompt used"
    )
    fullPromptContent: Optional[str] = Field(
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
    promptId: Optional[str] = Field(
        default=None, description="Chrome extension prompt ID used for this analysis"
    )
    promptVersion: Optional[int] = Field(
        default=None, description="Version of the prompt used"
    )
    fullPromptContent: Optional[str] = Field(
        default=None, description="Full prompt content used (for optimization context)"
    )


# Updated stored models to include prompt context


class StoredNuggetFeedback(BaseModel):
    """Internal model for database storage"""

    id: str
    nugget_content: str
    original_type: str
    corrected_type: Optional[str] = None
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
    prompt_id: Optional[str] = None
    prompt_version: Optional[int] = None
    full_prompt_content: Optional[str] = None


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
    prompt_id: Optional[str] = None
    prompt_version: Optional[int] = None
    full_prompt_content: Optional[str] = None


# Updated optimization models for prompt-specific optimization


class OptimizationRun(BaseModel):
    """Model for optimization run records"""

    id: str
    mode: str
    trigger_type: str  # 'auto' or 'manual'
    started_at: datetime
    completed_at: Optional[datetime] = None
    status: str  # 'running', 'completed', 'failed'
    result_prompt: Optional[str] = None
    performance_improvement: Optional[float] = None
    feedback_count: int
    error_message: Optional[str] = None
    # NEW: Chrome extension prompt context
    chrome_prompt_id: Optional[str] = None  # Which Chrome prompt was optimized
    chrome_prompt_version: Optional[int] = None
    model_provider: Optional[str] = None  # Which provider this optimization is for
    model_name: Optional[str] = None


# Deduplication models


class FeedbackWithDeduplication(BaseModel):
    """Feedback response model that includes deduplication information"""

    id: str
    content: str
    feedback_type: Literal["nugget", "missing_content"]
    url: str
    rating: Optional[Literal["positive", "negative"]] = None
    suggested_type: Optional[
        Literal["tool", "media", "aha! moments", "analogy", "model"]
    ] = None
    original_type: Optional[
        Literal["tool", "media", "aha! moments", "analogy", "model"]
    ] = None
    corrected_type: Optional[
        Literal["tool", "media", "aha! moments", "analogy", "model"]
    ] = None
    created_at: str
    deduplication: DeduplicationInfo
