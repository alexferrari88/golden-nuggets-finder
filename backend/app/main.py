"""
FastAPI backend for Golden Nuggets Finder feedback system with DSPy optimization.

This backend handles:
- Feedback collection from Chrome extension
- SQLite database storage
- DSPy prompt optimization with threshold triggers
- Both expensive (MIPROv2) and cheap (BootstrapFewShotWithRandomSearch)
  optimization modes
"""

from datetime import datetime
import os
import time
from typing import Optional

from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from .database import get_db, init_database
from .models import (
    ChromeExtensionPrompt,
    DeduplicationInfo,
    FeedbackStatsResponse,
    FeedbackSubmissionRequest,
    MonitoringResponse,
    OptimizationProgress,
    OptimizationRequest,
    OptimizedChromePromptResponse,
    OptimizedPromptResponse,
    PromptOptimizationRequest,
    SystemHealthResponse,
    UpdateFeedbackRequest,
)
from .services.cost_tracking_service import CostTrackingService
from .services.feedback_service import FeedbackService
from .services.optimization_service import OptimizationService
from .services.progress_tracking_service import ProgressTrackingService

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="Golden Nuggets Feedback API",
    description="Backend for collecting feedback and optimizing prompts using DSPy",
    version="1.1.0",
)

# Configure CORS for Chrome extension and dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "chrome-extension://fbghnlgbchagmidhnlnccplaaaeogkmf",
        # Specific Chrome extension ID
        "chrome-extension://*",  # Allow Chrome extensions (fallback)
        "*",  # Allow all origins (development only)
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # Alternative React dev server
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
feedback_service = FeedbackService()
optimization_service = OptimizationService()
progress_service = ProgressTrackingService()
cost_service = CostTrackingService()

# Track startup time for uptime monitoring
STARTUP_TIME = time.time()


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    await init_database()


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "Golden Nuggets Feedback API is running", "status": "healthy"}


@app.post("/feedback")
async def submit_feedback(feedback_data: FeedbackSubmissionRequest):
    """
    Submit feedback from Chrome extension.

    Accepts both nugget feedback (ratings/type corrections) and
    missing content feedback (user-identified golden nuggets).
    """
    try:
        # Initialize enhanced deduplication results
        deduplication_results = DeduplicationInfo(total_submitted=0)

        async with get_db() as db:
            # Track ID mappings for synchronization
            stored_nugget_ids = {}  # {original_id: stored_id}
            stored_missing_content_ids = {}  # {original_id: stored_id}

            # Store nugget feedback with enhanced status tracking
            if feedback_data.nuggetFeedback:
                for feedback in feedback_data.nuggetFeedback:
                    original_id = feedback.id
                    status = await feedback_service.store_nugget_feedback(db, feedback)
                    stored_nugget_ids[original_id] = feedback.id

                    # Count by status type
                    if status == "duplicate":
                        deduplication_results.nugget_duplicates += 1

                        # Get deduplication info for user message
                        dedup_info = await feedback_service.get_deduplication_info(
                            db, feedback.id, "nugget"
                        )

                        deduplication_results.duplicate_details.append(
                            {
                                "type": "nugget",
                                "content": feedback.nuggetContent[:100] + "..."
                                if len(feedback.nuggetContent) > 100
                                else feedback.nuggetContent,
                                "report_count": dedup_info["report_count"],
                                "first_reported_at": dedup_info["first_reported_at"],
                            }
                        )
                    elif status == "updated":
                        deduplication_results.nugget_updates += 1

                    deduplication_results.total_submitted += 1

            # Store missing content feedback with enhanced status tracking
            if feedback_data.missingContentFeedback:
                for missing_feedback in feedback_data.missingContentFeedback:
                    original_id = missing_feedback.id
                    status = await feedback_service.store_missing_content_feedback(
                        db, missing_feedback
                    )
                    stored_missing_content_ids[original_id] = missing_feedback.id

                    # Count by status type
                    if status == "duplicate":
                        deduplication_results.missing_content_duplicates += 1

                        # Get deduplication info for user message
                        dedup_info = await feedback_service.get_deduplication_info(
                            db, missing_feedback.id, "missing_content"
                        )

                        deduplication_results.duplicate_details.append(
                            {
                                "type": "missing_content",
                                "content": missing_feedback.content[:100] + "..."
                                if len(missing_feedback.content) > 100
                                else missing_feedback.content,
                                "report_count": dedup_info["report_count"],
                                "first_reported_at": dedup_info["first_reported_at"],
                            }
                        )
                    elif status == "updated":
                        deduplication_results.missing_content_updates += 1

                    deduplication_results.total_submitted += 1

            # Generate smart user message based on what happened
            total_duplicates = (
                deduplication_results.nugget_duplicates
                + deduplication_results.missing_content_duplicates
            )
            total_updates = (
                deduplication_results.nugget_updates
                + deduplication_results.missing_content_updates
            )
            total_new = (
                deduplication_results.total_submitted - total_duplicates - total_updates
            )

            # Generate appropriate user message
            if total_updates > 0 and total_duplicates == 0:
                # Pure update scenario - user provided corrections/changes
                if total_updates == 1:
                    deduplication_results.user_message = (
                        "Your feedback has been updated with the new information. "
                        "Thank you for the correction!"
                    )
                else:
                    deduplication_results.user_message = (
                        f"{total_updates} of your feedback items have been updated "
                        f"with new information. Thank you for the corrections!"
                    )
            elif total_duplicates > 0 and total_updates == 0:
                # Pure duplicate scenario - user resubmitted identical information
                if total_duplicates == 1:
                    # Extract report count for readability
                    details = deduplication_results.duplicate_details[0]
                    report_count = details["report_count"]
                    deduplication_results.user_message = (
                        f"This feedback was already submitted previously. "
                        f"Your report has been counted (total: {report_count} reports)."
                    )
                else:
                    deduplication_results.user_message = (
                        f"{total_duplicates} of your feedback items were duplicates. "
                        f"Your reports have been counted and help improve our system."
                    )
            elif total_updates > 0 and total_duplicates > 0:
                # Mixed scenario - some updates, some duplicates
                deduplication_results.user_message = (
                    f"Thank you for your feedback! {total_updates} items were "
                    f"updated with new information, "
                    f"{total_duplicates} were duplicates (counted), and "
                    f"{total_new} were new submissions."
                )
            # If only new items, no special message needed

            # Check if optimization should be triggered
            stats = await feedback_service.get_feedback_stats(db)
            if stats["shouldOptimize"]:
                # Trigger optimization in background
                background_tasks = BackgroundTasks()
                background_tasks.add_task(
                    trigger_optimization_if_needed,
                    stats["totalFeedback"],
                    stats["recentNegativeRate"],
                )

                return JSONResponse(
                    content={
                        "success": True,
                        "message": (
                            "Feedback stored successfully. Optimization triggered."
                        ),
                        "stats": stats,
                        "deduplication": deduplication_results.model_dump(),
                        "optimization_triggered": True,
                        "id_mappings": {
                            "nugget_feedback": stored_nugget_ids,
                            "missing_content_feedback": stored_missing_content_ids,
                        },
                    },
                    background=background_tasks,
                )

            return {
                "success": True,
                "message": "Feedback stored successfully",
                "stats": stats,
                "deduplication": deduplication_results.model_dump(),
                "optimization_triggered": False,
                "id_mappings": {
                    "nugget_feedback": stored_nugget_ids,
                    "missing_content_feedback": stored_missing_content_ids,
                },
            }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to store feedback: {e!s}"
        ) from e


@app.get("/feedback/stats", response_model=FeedbackStatsResponse)
async def get_feedback_stats():
    """Get current feedback statistics and optimization status"""
    try:
        async with get_db() as db:
            stats = await feedback_service.get_feedback_stats(db)
            return FeedbackStatsResponse(**stats)

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get feedback stats: {e!s}"
        ) from e


@app.post("/optimize")
async def trigger_optimization(
    optimization_request: OptimizationRequest, background_tasks: BackgroundTasks
):
    """
    Manually trigger prompt optimization.

    Supports both expensive (MIPROv2) and cheap
    (BootstrapFewShotWithRandomSearch) modes.
    """
    try:
        # Add optimization task to background
        background_tasks.add_task(
            run_optimization,
            optimization_request.mode,
            optimization_request.manualTrigger or False,
        )

        return {
            "success": True,
            "message": f"Optimization started in {optimization_request.mode} mode",
            "estimatedTime": (
                "5-15 minutes"
                if optimization_request.mode == "expensive"
                else "1-3 minutes"
            ),
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to start optimization: {e!s}"
        ) from e


@app.get("/optimization/history")
async def get_optimization_history(
    limit: int = 50, days: Optional[int] = None, mode: Optional[str] = None
):
    """Get history of prompt optimizations with performance analytics"""
    try:
        async with get_db() as db:
            history = await optimization_service.get_optimization_history(
                db, limit=limit, days=days, mode=mode
            )
            return history

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get optimization history: {e!s}"
        ) from e


@app.get("/optimize/current", response_model=OptimizedPromptResponse)
async def get_current_optimized_prompt(
    provider: Optional[str] = None, model: Optional[str] = None
):
    """
    Get the current optimized prompt if available.

    If provider and model parameters are provided, returns provider+model
    specific prompt.
    Falls back to generic optimized prompt, then to default baseline prompt.

    Args:
        provider: Optional provider ID (gemini, openai, anthropic, openrouter)
        model: Optional model name (e.g., gemini-2.5-flash, gpt-4o-mini)
    """
    try:
        async with get_db() as db:
            current_prompt = None

            # If provider and model specified, try provider-specific retrieval
            if provider and model:
                print(f"Retrieving optimized prompt for {provider}+{model}")
                current_prompt = (
                    await optimization_service.get_current_prompt_for_provider_model(
                        db, provider, model
                    )
                )
            else:
                # Backward compatibility: use existing generic retrieval
                print("Retrieving generic optimized prompt")
                current_prompt = await optimization_service.get_current_prompt(db)

            if current_prompt:
                return OptimizedPromptResponse(**current_prompt)
            else:
                # No optimized prompt available - return default response
                fallback_message = (
                    f"No optimized prompt available for {provider}+{model}"
                    if provider and model
                    else "No optimized prompt available yet"
                )

                return OptimizedPromptResponse(
                    id="default",
                    version=0,
                    prompt=fallback_message,
                    optimizationDate="",
                    performance={"feedbackCount": 0, "positiveRate": 0.0},
                    modelProvider=provider,
                    modelName=model,
                )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get current prompt: {e!s}"
        ) from e


# Chrome Extension Prompt Optimization Endpoints


@app.post("/optimize/chrome-prompt")
async def optimize_chrome_extension_prompt(
    optimization_request: PromptOptimizationRequest, background_tasks: BackgroundTasks
):
    """
    Optimize a specific Chrome extension prompt.

    This replaces the baseline_prompt approach with actual Chrome extension
    prompt optimization.
    """
    try:
        # Add optimization task to background
        background_tasks.add_task(
            run_chrome_prompt_optimization,
            optimization_request.prompt_id,
            optimization_request.prompt_content,
            optimization_request.mode,
            optimization_request.manualTrigger or False,
        )

        return {
            "success": True,
            "message": (
                f"Chrome extension prompt optimization started in "
                f"{optimization_request.mode} mode"
            ),
            "prompt_id": optimization_request.prompt_id,
            "estimatedTime": (
                "5-15 minutes"
                if optimization_request.mode == "expensive"
                else "1-3 minutes"
            ),
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to start Chrome prompt optimization: {e!s}"
        ) from e


@app.get("/optimize/chrome-prompt/{prompt_id}")
async def get_optimized_chrome_prompt(
    prompt_id: str, provider: Optional[str] = None, model: Optional[str] = None
):
    """
    Get the optimized version of a specific Chrome extension prompt.

    Args:
        prompt_id: Chrome extension prompt ID
        provider: Optional provider ID for provider-specific optimization
        model: Optional model name for model-specific optimization
    """
    try:
        async with get_db() as db:
            optimized_prompt = await optimization_service.get_optimized_chrome_prompt(
                db, prompt_id, provider, model
            )

            if optimized_prompt:
                return OptimizedChromePromptResponse(**optimized_prompt)
            else:
                raise HTTPException(
                    status_code=404,
                    detail=f"No optimized version found for Chrome prompt {prompt_id}",
                )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get optimized Chrome prompt: {e!s}"
        ) from e


@app.post("/chrome-prompts")
async def register_chrome_extension_prompts(prompts: list[ChromeExtensionPrompt]):
    """
    Register or update Chrome extension prompts in the backend.

    This allows the backend to know about current Chrome extension prompts
    for optimization.
    """
    try:
        async with get_db() as db:
            registered_count = 0

            for prompt in prompts:
                success = await optimization_service.register_chrome_prompt(db, prompt)
                if success:
                    registered_count += 1

            return {
                "success": True,
                "message": f"Registered {registered_count} Chrome extension prompts",
                "registered_count": registered_count,
                "total_submitted": len(prompts),
            }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to register Chrome prompts: {e!s}"
        ) from e


@app.get("/chrome-prompts")
async def list_chrome_extension_prompts():
    """
    List all registered Chrome extension prompts with their optimization status.
    """
    try:
        async with get_db() as db:
            prompts = await optimization_service.list_chrome_prompts(db)
            return {"success": True, "prompts": prompts, "count": len(prompts)}

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to list Chrome prompts: {e!s}"
        ) from e


# Monitoring and observability endpoints


@app.get("/monitor/health", response_model=SystemHealthResponse)
async def get_system_health():
    """Get system health status and diagnostics"""
    try:
        # Check system components
        uptime = time.time() - STARTUP_TIME
        active_optimizations = len(optimization_service.get_all_active_runs())

        # Check DSPy availability
        import importlib.util

        dspy_available = importlib.util.find_spec("dspy") is not None

        # Check Gemini configuration
        gemini_configured = bool(os.getenv("GEMINI_API_KEY"))

        # Check database accessibility
        database_accessible = True
        try:
            async with get_db() as db:
                await db.execute("SELECT 1")
        except Exception:
            database_accessible = False

        # Determine overall health status
        if not database_accessible:
            status = "unhealthy"
        elif not dspy_available or not gemini_configured:
            status = "degraded"
        else:
            status = "healthy"

        return SystemHealthResponse(
            status=status,
            uptime_seconds=uptime,
            active_optimizations=active_optimizations,
            dspy_available=dspy_available,
            gemini_configured=gemini_configured,
            database_accessible=database_accessible,
            details={
                "startup_time": datetime.fromtimestamp(STARTUP_TIME).isoformat(),
                "gemini_key_length": len(os.getenv("GEMINI_API_KEY", ""))
                if gemini_configured
                else 0,
            },
        )

    except Exception as e:
        return SystemHealthResponse(
            status="unhealthy",
            uptime_seconds=0,
            active_optimizations=0,
            dspy_available=False,
            gemini_configured=False,
            database_accessible=False,
            details={"error": str(e)},
        )


@app.get("/monitor/status/{run_id}")
async def get_optimization_status(run_id: str):
    """Get current status of a specific optimization run"""
    try:
        # Check in-memory progress first
        progress = optimization_service.get_run_progress(run_id)

        if progress:
            return {
                "success": True,
                "run_id": run_id,
                "progress": OptimizationProgress(**progress),
                "source": "active",
            }

        # Check database for completed/failed runs
        async with get_db() as db:
            cursor = await db.execute(
                """
                SELECT status, started_at, completed_at, error_message,
                       performance_improvement
                FROM optimization_runs
                WHERE id = ?
            """,
                (run_id,),
            )
            result = await cursor.fetchone()

            if result:
                status, started_at, completed_at, error_message, improvement = result
                return {
                    "success": True,
                    "run_id": run_id,
                    "status": status,
                    "started_at": started_at,
                    "completed_at": completed_at,
                    "error_message": error_message,
                    "performance_improvement": improvement,
                    "source": "database",
                }

        return {"success": False, "error": "Optimization run not found"}

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get optimization status: {e!s}"
        ) from e


@app.get("/monitor", response_model=MonitoringResponse)
async def get_monitoring_dashboard():
    """Get comprehensive monitoring dashboard data"""
    try:
        async with get_db() as db:
            # Get active runs
            active_runs_data = optimization_service.get_all_active_runs()
            active_runs = {
                run_id: OptimizationProgress(**progress)
                for run_id, progress in active_runs_data.items()
            }

            # Get recent completions (last 10)
            cursor = await db.execute("""
                SELECT id, mode, trigger_type, started_at, completed_at, status,
                       performance_improvement, error_message
                FROM optimization_runs
                WHERE status IN ('completed', 'failed')
                ORDER BY completed_at DESC
                LIMIT 10
            """)
            results = await cursor.fetchall()

            recent_completions = []
            for result in results:
                recent_completions.append(
                    {
                        "id": result[0],
                        "mode": result[1],
                        "trigger_type": result[2],
                        "started_at": result[3],
                        "completed_at": result[4],
                        "status": result[5],
                        "performance_improvement": result[6],
                        "error_message": result[7],
                    }
                )

            # Get system health
            health_response = await get_system_health()

            return MonitoringResponse(
                active_runs=active_runs,
                recent_completions=recent_completions,
                system_health=health_response,
            )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get monitoring data: {e!s}"
        ) from e


# New dashboard endpoints for feedback queue and enhanced tracking


@app.get("/feedback/pending")
async def get_pending_feedback(
    limit: int = 50, offset: int = 0, feedback_type: str = "all"
):
    """Get pending (unprocessed) feedback items for dashboard queue"""
    try:
        async with get_db() as db:
            result = await feedback_service.get_pending_feedback(
                db, limit=limit, offset=offset, feedback_type=feedback_type
            )
            return result
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get pending feedback: {e!s}"
        ) from e


@app.get("/feedback/recent")
async def get_recent_feedback(limit: int = 20, include_processed: bool = True):
    """Get recent feedback items with processing status"""
    try:
        async with get_db() as db:
            items = await feedback_service.get_recent_feedback(
                db, limit=limit, include_processed=include_processed
            )
            return {"items": items, "count": len(items)}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get recent feedback: {e!s}"
        ) from e


@app.get("/feedback/{feedback_id}")
async def get_feedback_details(feedback_id: str, feedback_type: str):
    """Get detailed information about a specific feedback item"""
    try:
        async with get_db() as db:
            details = await feedback_service.get_feedback_item_details(
                db, feedback_id, feedback_type
            )
            if not details:
                raise HTTPException(status_code=404, detail="Feedback item not found")
            return details
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get feedback details: {e!s}"
        ) from e


@app.put("/feedback/{feedback_id}")
async def update_feedback_item(
    feedback_id: str, feedback_type: str, updates: UpdateFeedbackRequest
):
    """Update a feedback item"""
    try:
        async with get_db() as db:
            # Convert Pydantic model to dict, excluding unset values
            # (but keeping explicit None values)
            update_data = updates.model_dump(exclude_unset=True)

            if not update_data:
                raise HTTPException(
                    status_code=400,
                    detail="At least one field must be provided for update",
                )

            success = await feedback_service.update_feedback_item(
                db, feedback_id, feedback_type, update_data
            )

            if not success:
                raise HTTPException(status_code=404, detail="Feedback item not found")

            return {
                "success": True,
                "message": "Feedback item updated successfully",
                "updated_fields": list(update_data.keys()),
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to update feedback item: {e!s}"
        ) from e


@app.delete("/feedback/{feedback_id}")
async def delete_feedback_item(feedback_id: str, feedback_type: Optional[str] = None):
    """Delete a feedback item and its usage records"""
    try:
        async with get_db() as db:
            # If feedback_type not provided, try to auto-detect
            if feedback_type is None:
                success = await feedback_service.delete_feedback_item_auto_detect(
                    db, feedback_id
                )
            else:
                success = await feedback_service.delete_feedback_item(
                    db, feedback_id, feedback_type
                )

            if not success:
                raise HTTPException(status_code=404, detail="Feedback item not found")

            return {"success": True, "message": "Feedback item deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to delete feedback item: {e!s}"
        ) from e


@app.get("/feedback/usage/stats")
async def get_feedback_usage_stats():
    """Get statistics about feedback usage across optimizations"""
    try:
        async with get_db() as db:
            stats = await feedback_service.get_feedback_usage_stats(db)
            return stats
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get usage stats: {e!s}"
        ) from e


@app.get("/optimization/{run_id}/progress")
async def get_optimization_progress_history(run_id: str):
    """Get detailed progress history for an optimization run"""
    try:
        async with get_db() as db:
            progress_history = await progress_service.get_progress_history(db, run_id)
            return {
                "run_id": run_id,
                "progress_history": progress_history,
                "total_entries": len(progress_history),
            }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get progress history: {e!s}"
        ) from e


@app.get("/optimization/{run_id}/costs")
async def get_optimization_costs(run_id: str):
    """Get detailed cost breakdown for an optimization run"""
    try:
        async with get_db() as db:
            costs = await cost_service.get_run_costs(db, run_id)
            return costs
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get optimization costs: {e!s}"
        ) from e


@app.get("/costs/summary")
async def get_costs_summary(days: int = 30):
    """Get cost summary over specified time period"""
    try:
        async with get_db() as db:
            summary = await cost_service.get_costs_summary(db, days)
            return summary
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get cost summary: {e!s}"
        ) from e


@app.get("/costs/trends")
async def get_cost_trends(days: int = 30):
    """Get cost trends and projections"""
    try:
        async with get_db() as db:
            trends = await cost_service.get_cost_trends(db, days)
            return trends
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get cost trends: {e!s}"
        ) from e


@app.get("/feedback/duplicates")
async def get_duplicate_analysis(limit: int = 50):
    """Get analysis of duplicate feedback submissions"""
    try:
        async with get_db() as db:
            cursor = await db.execute(
                """
                SELECT
                    feedback_type,
                    content,
                    url,
                    report_count,
                    similar_items,
                    earliest_report,
                    latest_report,
                    item_ids
                FROM duplicate_content_analysis
                ORDER BY report_count DESC, latest_report DESC
                LIMIT ?
            """,
                (limit,),
            )

            results = await cursor.fetchall()

            duplicates = []
            for row in results:
                duplicates.append(
                    {
                        "feedback_type": row[0],
                        "content": row[1][:200] + "..."
                        if len(row[1]) > 200
                        else row[1],  # Truncate for display
                        "url": row[2],
                        "report_count": row[3],
                        "similar_items": row[4],
                        "earliest_report": row[5],
                        "latest_report": row[6],
                        "item_ids": row[7].split(",") if row[7] else [],
                    }
                )

            return {
                "duplicates": duplicates,
                "total_found": len(duplicates),
                "limit": limit,
            }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get duplicate analysis: {e!s}"
        ) from e


@app.get("/dashboard/stats")
async def get_dashboard_stats():
    """Get comprehensive dashboard statistics"""
    try:
        async with get_db() as db:
            # Use the dashboard_stats view created in migration
            cursor = await db.execute("SELECT * FROM dashboard_stats")
            stats = await cursor.fetchone()

            if not stats:
                return {
                    "pending_nugget_feedback": 0,
                    "pending_missing_feedback": 0,
                    "processed_nugget_feedback": 0,
                    "processed_missing_feedback": 0,
                    "active_optimizations": 0,
                    "completed_optimizations": 0,
                    "failed_optimizations": 0,
                    "monthly_costs": 0,
                    "monthly_tokens": 0,
                }

            return {
                "pending_nugget_feedback": stats[0],
                "pending_missing_feedback": stats[1],
                "processed_nugget_feedback": stats[2],
                "processed_missing_feedback": stats[3],
                "active_optimizations": stats[4],
                "completed_optimizations": stats[5],
                "failed_optimizations": stats[6],
                "monthly_costs": stats[7],
                "monthly_tokens": stats[8],
            }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get dashboard stats: {e!s}"
        ) from e


@app.get("/activity/recent")
async def get_recent_activity(limit: int = 10):
    """Get recent activity across all optimizations"""
    try:
        async with get_db() as db:
            activity = await progress_service.get_recent_activity(db, limit)
            return {"activities": activity, "count": len(activity)}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get recent activity: {e!s}"
        ) from e


# Background task functions


async def trigger_optimization_if_needed(total_feedback: int, negative_rate: float):
    """Background task to trigger optimization based on thresholds"""
    try:
        async with get_db() as db:
            # Determine optimization mode based on feedback volume and quality issues
            # Use expensive mode for high volume or significant quality issues
            mode = (
                "expensive" if total_feedback >= 50 or negative_rate > 0.4 else "cheap"
            )

            await optimization_service.run_optimization(db, mode, auto_trigger=True)

    except Exception as e:
        print(f"Background optimization failed: {e}")


async def run_optimization(mode: str, manual_trigger: bool = False):
    """Background task to run DSPy optimization"""
    try:
        async with get_db() as db:
            result = await optimization_service.run_optimization(
                db, mode, auto_trigger=not manual_trigger
            )
            print(f"Optimization completed: {result}")

    except Exception as e:
        print(f"Optimization failed: {e}")


async def run_chrome_prompt_optimization(
    prompt_id: str, prompt_content: str, mode: str, manual_trigger: bool = False
):
    """Background task to run Chrome extension prompt optimization"""
    try:
        async with get_db() as db:
            result = await optimization_service.run_chrome_prompt_optimization(
                db, prompt_id, prompt_content, mode, auto_trigger=not manual_trigger
            )
            print(f"Chrome prompt optimization completed: {result}")

    except Exception as e:
        print(f"Chrome prompt optimization failed: {e}")


if __name__ == "__main__":
    # Run the server
    uvicorn.run("main:app", host="0.0.0.0", port=7532, reload=True, log_level="info")
