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
from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from .database import get_db, init_database
from .models import (
    FeedbackStatsResponse,
    FeedbackSubmissionRequest,
    MonitoringResponse,
    OptimizationProgress,
    OptimizationRequest,
    OptimizedPromptResponse,
    SystemHealthResponse,
)
from .services.feedback_service import FeedbackService
from .services.optimization_service import OptimizationService
from .services.progress_tracking_service import ProgressTrackingService
from .services.cost_tracking_service import CostTrackingService

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="Golden Nuggets Feedback API",
    description="Backend for collecting feedback and optimizing prompts using DSPy",
    version="1.0.0",
)

# Configure CORS for Chrome extension and dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "chrome-extension://*",  # Allow Chrome extensions
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
        async with get_db() as db:
            # Store nugget feedback
            if feedback_data.nuggetFeedback:
                for feedback in feedback_data.nuggetFeedback:
                    await feedback_service.store_nugget_feedback(db, feedback)

            # Store missing content feedback
            if feedback_data.missingContentFeedback:
                for missing_feedback in feedback_data.missingContentFeedback:
                    await feedback_service.store_missing_content_feedback(
                        db, missing_feedback
                    )

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
                    },
                    background=background_tasks,
                )

            return {
                "success": True,
                "message": "Feedback stored successfully",
                "stats": stats,
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


@app.get("/optimize/history")
async def get_optimization_history():
    """Get history of prompt optimizations"""
    try:
        async with get_db() as db:
            history = await optimization_service.get_optimization_history(db)
            return {"success": True, "data": history}

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get optimization history: {e!s}"
        ) from e


@app.get("/optimize/current", response_model=OptimizedPromptResponse)
async def get_current_optimized_prompt():
    """Get the current optimized prompt if available"""
    try:
        async with get_db() as db:
            current_prompt = await optimization_service.get_current_prompt(db)
            if current_prompt:
                return OptimizedPromptResponse(**current_prompt)
            else:
                return OptimizedPromptResponse(
                    id="default",
                    version=0,
                    prompt="No optimized prompt available yet",
                    optimizationDate="",
                    performance={"feedbackCount": 0, "positiveRate": 0.0},
                )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get current prompt: {e!s}"
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
        dspy_available = True
        try:
            import dspy
        except ImportError:
            dspy_available = False
        
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
                "gemini_key_length": len(os.getenv("GEMINI_API_KEY", "")) if gemini_configured else 0
            }
        )
        
    except Exception as e:
        return SystemHealthResponse(
            status="unhealthy",
            uptime_seconds=0,
            active_optimizations=0,
            dspy_available=False,
            gemini_configured=False,
            database_accessible=False,
            details={"error": str(e)}
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
                "source": "active"
            }
        
        # Check database for completed/failed runs
        async with get_db() as db:
            cursor = await db.execute("""
                SELECT status, started_at, completed_at, error_message, performance_improvement
                FROM optimization_runs
                WHERE id = ?
            """, (run_id,))
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
                    "source": "database"
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
                recent_completions.append({
                    "id": result[0],
                    "mode": result[1],
                    "trigger_type": result[2],
                    "started_at": result[3],
                    "completed_at": result[4],
                    "status": result[5],
                    "performance_improvement": result[6],
                    "error_message": result[7]
                })
            
            # Get system health
            health_response = await get_system_health()
            
            return MonitoringResponse(
                active_runs=active_runs,
                recent_completions=recent_completions,
                system_health=health_response
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get monitoring data: {e!s}"
        ) from e


# New dashboard endpoints for feedback queue and enhanced tracking

@app.get("/feedback/pending")
async def get_pending_feedback(
    limit: int = 50,
    offset: int = 0,
    feedback_type: str = "all"
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
async def get_recent_feedback(
    limit: int = 20,
    include_processed: bool = True
):
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
                "total_entries": len(progress_history)
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
                    "monthly_tokens": 0
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
                "monthly_tokens": stats[8]
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


if __name__ == "__main__":
    # Run the server
    uvicorn.run("main:app", host="0.0.0.0", port=7532, reload=True, log_level="info")
