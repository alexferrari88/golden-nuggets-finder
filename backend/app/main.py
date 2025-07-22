"""
FastAPI backend for Golden Nuggets Finder feedback system with DSPy optimization.

This backend handles:
- Feedback collection from Chrome extension
- SQLite database storage
- DSPy prompt optimization with threshold triggers
- Both expensive (MIPROv2) and cheap (BootstrapFewShotWithRandomSearch)
  optimization modes
"""

from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from .database import get_db, init_database
from .models import (
    FeedbackStatsResponse,
    FeedbackSubmissionRequest,
    OptimizationRequest,
    OptimizedPromptResponse,
)
from .services.feedback_service import FeedbackService
from .services.optimization_service import OptimizationService

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="Golden Nuggets Feedback API",
    description="Backend for collecting feedback and optimizing prompts using DSPy",
    version="1.0.0",
)

# Configure CORS for Chrome extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["chrome-extension://*"],  # Allow Chrome extensions
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
feedback_service = FeedbackService()
optimization_service = OptimizationService()


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
