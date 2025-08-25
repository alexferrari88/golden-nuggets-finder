"""
Optimization service for DSPy-based prompt optimization.

Handles both expensive (MIPROv2) and cheap (BootstrapFewShotWithRandomSearch)
optimization modes with threshold-based triggering.
"""

import asyncio
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

# DSPy imports (will be imported in methods to handle missing package gracefully)
import importlib.util
import logging
import os
from typing import Optional
import uuid

import aiosqlite

DSPY_AVAILABLE = importlib.util.find_spec("dspy") is not None
if not DSPY_AVAILABLE:
    print("Warning: DSPy not available. Optimization features will be limited.")

from .dspy_multi_model_manager import dspy_multi_model_manager
from .feedback_service import FeedbackService


# Configure environment-aware structured logging
def _setup_logger():
    """Setup environment-aware logging configuration"""
    logger = logging.getLogger(__name__)

    # Only configure if not already configured
    if logger.handlers:
        return logger

    # Create formatter
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )

    # Always use console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # Only add file handler in production
    if os.getenv("ENVIRONMENT") == "production":
        from logging.handlers import RotatingFileHandler

        file_handler = RotatingFileHandler(
            "optimization.log", maxBytes=10485760, backupCount=5
        )
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)

    logger.setLevel(logging.INFO)
    return logger


logger = _setup_logger()


class OptimizationService:
    """Service for DSPy-based prompt optimization"""

    def __init__(self):
        self.feedback_service = FeedbackService()
        self.executor = ThreadPoolExecutor(
            max_workers=2
        )  # Limit concurrent optimizations

        # In-memory progress tracking for active runs
        self.active_runs = {}

        # Multi-model manager for provider-specific optimization
        self.multi_model_manager = dspy_multi_model_manager

        # Default baseline prompt (matches Chrome extension)
        self.baseline_prompt = """
You are an expert at identifying golden nuggets of insight from {{ source }}.

Your task is to find the most valuable insights that would be useful for a software developer, entrepreneur, or knowledge worker. Focus on:

1. **Tools and Resources**: Specific tools, libraries, services, or resources mentioned
2. **Media and References**: Books, articles, videos, podcasts, or other content worth consuming
3. **Explanations**: Clear explanations of complex concepts, processes, or phenomena
4. **Analogies and Models**: Mental models, analogies, or frameworks for understanding
5. **Models and Frameworks**: Structured approaches, methodologies, or systematic thinking tools

For each golden nugget, provide:
- The exact original text (verbatim quote)
- Why it's valuable for the target persona

Return your response as valid JSON only, with no additional text or explanation.
"""

    async def run_optimization(
        self, db: aiosqlite.Connection, mode: str, auto_trigger: bool = False
    ) -> dict:
        """
        Run DSPy optimization in specified mode.

        Args:
            mode: 'expensive' (MIPROv2) or 'cheap' (BootstrapFewShotWithRandomSearch)
            auto_trigger: Whether this was triggered automatically by thresholds
        """
        if not DSPY_AVAILABLE:
            logger.error("DSPy not available", extra={"error": "DSPy not installed"})
            raise Exception("DSPy not available. Install with: pip install dspy-ai")

        # Create optimization run record
        run_id = str(uuid.uuid4())
        trigger_type = "auto" if auto_trigger else "manual"

        logger.info(
            "🚀 Starting DSPy optimization",
            extra={
                "run_id": run_id,
                "mode": mode,
                "trigger_type": trigger_type,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        )

        await db.execute(
            """
            INSERT INTO optimization_runs (
                id, mode, trigger_type, started_at, status, feedback_count
            ) VALUES (?, ?, ?, ?, ?, ?)
        """,
            (run_id, mode, trigger_type, datetime.now(timezone.utc), "running", 0),
        )
        await db.commit()

        # Initialize progress tracking
        self._log_progress(run_id, "initialization", 10, "Setting up optimization")

        try:
            # Get training examples from feedback
            logger.info("📊 Gathering training examples", extra={"run_id": run_id})
            self._log_progress(
                run_id, "data_gathering", 20, "Gathering training examples"
            )

            training_examples = await self.feedback_service.get_training_examples(
                db, limit=200
            )

            logger.info(
                "📈 Training examples collected",
                extra={
                    "run_id": run_id,
                    "training_count": len(training_examples),
                    "status": "success"
                    if len(training_examples) >= 10
                    else "insufficient_data",
                },
            )

            if len(training_examples) < 10:
                logger.error(
                    "Insufficient training data",
                    extra={
                        "run_id": run_id,
                        "training_count": len(training_examples),
                        "required_minimum": 10,
                    },
                )
                raise Exception(
                    "Not enough training examples. Need at least 10 feedback items."
                )

            # Update feedback count
            await db.execute(
                """
                UPDATE optimization_runs
                SET feedback_count = ?
                WHERE id = ?
            """,
                (len(training_examples), run_id),
            )
            await db.commit()

            # Run optimization in thread pool to avoid blocking
            logger.info(
                "🧠 Starting DSPy optimization",
                extra={
                    "run_id": run_id,
                    "mode": mode,
                    "training_examples": len(training_examples),
                },
            )
            self._log_progress(
                run_id, "optimization", 30, f"Running {mode} optimization"
            )

            result = await asyncio.get_event_loop().run_in_executor(
                self.executor,
                self._run_dspy_optimization,
                training_examples,
                mode,
                run_id,
            )

            # Store optimized prompt
            logger.info(
                "💾 Storing optimized prompt",
                extra={
                    "run_id": run_id,
                    "performance_improvement": result.get("improvement", 0.0),
                },
            )
            self._log_progress(run_id, "storing", 90, "Storing optimized prompt")

            optimized_prompt_id = await self._store_optimized_prompt(db, result, run_id)

            # Mark optimization as completed
            self._log_progress(
                run_id, "completed", 100, "Optimization completed successfully"
            )

            await db.execute(
                """
                UPDATE optimization_runs
                SET status = 'completed', completed_at = ?, result_prompt = ?,
                    performance_improvement = ?
                WHERE id = ?
            """,
                (
                    datetime.now(timezone.utc),
                    result["optimized_prompt"][:1000],  # Store first 1000 chars
                    result.get("improvement", 0.0),
                    run_id,
                ),
            )
            await db.commit()

            logger.info(
                "✅ Optimization completed successfully",
                extra={
                    "run_id": run_id,
                    "mode": mode,
                    "performance_improvement": result.get("improvement", 0.0),
                    "execution_time": result.get("execution_time", 0),
                    "training_examples": len(training_examples),
                },
            )

            # Clean up active run tracking
            if run_id in self.active_runs:
                del self.active_runs[run_id]

            return {
                "success": True,
                "run_id": run_id,
                "optimized_prompt_id": optimized_prompt_id,
                "performance_improvement": result.get("improvement", 0.0),
                "training_examples": len(training_examples),
                "mode": mode,
            }

        except Exception as e:
            # Mark optimization as failed
            logger.error(
                "❌ Optimization failed",
                extra={
                    "run_id": run_id,
                    "mode": mode,
                    "error": str(e),
                    "error_type": type(e).__name__,
                },
            )
            self._log_progress(run_id, "failed", -1, f"Optimization failed: {e!s}")

            # Clean up active run tracking after delay to allow status check
            if run_id in self.active_runs:
                self.active_runs[run_id]["cleanup_after"] = datetime.now(
                    timezone.utc
                ).replace(minute=datetime.now(timezone.utc).minute + 5)

            await db.execute(
                """
                UPDATE optimization_runs
                SET status = 'failed', completed_at = ?, error_message = ?
                WHERE id = ?
            """,
                (datetime.now(timezone.utc), str(e), run_id),
            )
            await db.commit()

            raise Exception(f"Optimization failed: {e!s}")

    def _run_dspy_optimization(
        self, training_examples: list[dict], mode: str, run_id: Optional[str] = None
    ) -> dict:
        """
        Run DSPy optimization (executed in thread pool).

        This method runs the actual DSPy optimization algorithms using the
        improved configuration and utilities.
        """
        from .dspy_config import (
            DSPyConfig,
            GoldenNuggetExtractor,
            OptimizationMetrics,
            create_training_examples,
            validate_dspy_environment,
        )

        start_time = datetime.now(timezone.utc)

        # Validate DSPy environment
        env_status = validate_dspy_environment()
        if not env_status["configuration_valid"]:
            return {
                "optimized_prompt": self.baseline_prompt,
                "performance_score": 0.0,
                "baseline_score": 0.0,
                "improvement": 0.0,
                "execution_time": (
                    datetime.now(timezone.utc) - start_time
                ).total_seconds(),
                "training_examples_count": len(training_examples),
                "validation_examples_count": 0,
                "mode": mode,
                "error": f"DSPy environment not configured: {env_status['errors']}",
            }

        try:
            # Configure DSPy
            config = DSPyConfig()
            if not config.configure_dspy():
                raise Exception("Failed to configure DSPy")

            # Create training examples in DSPy format
            dspy_examples = create_training_examples(training_examples)

            if len(dspy_examples) < 5:
                raise Exception(
                    f"Not enough valid training examples: {len(dspy_examples)}"
                )

            # Split into train/validation sets
            train_size = max(int(len(dspy_examples) * 0.8), len(dspy_examples) - 10)
            train_examples = dspy_examples[:train_size]
            val_examples = dspy_examples[train_size:]

            # Initialize extractor
            extractor = GoldenNuggetExtractor()

            # Get optimizer based on mode
            optimizer = config.get_optimizer(mode)

            # Choose evaluation metric
            metric = OptimizationMetrics.golden_nugget_metric

            # Run optimization
            print(
                f"Starting {mode} optimization with {len(train_examples)} training examples..."
            )
            logger.info(
                "🔧 DSPy optimization in progress",
                extra={
                    "run_id": run_id,
                    "mode": mode,
                    "train_examples": len(train_examples),
                    "val_examples": len(val_examples),
                },
            )

            optimized_extractor = optimizer.compile(
                extractor,
                trainset=train_examples,
                valset=val_examples
                if val_examples
                else train_examples[:5],  # Use subset if no val set
                metric=metric,
            )

            execution_time = (datetime.now(timezone.utc) - start_time).total_seconds()

            # Extract optimized prompt
            optimized_prompt = self._extract_prompt_from_module(optimized_extractor)

            # Evaluate performance improvement
            from dspy.evaluate import Evaluate  # type: ignore[import-untyped]

            evaluator = Evaluate(
                devset=val_examples if val_examples else train_examples[:5],
                metric=metric,
                num_threads=1,  # Conservative threading
            )

            baseline_score = evaluator(extractor)
            optimized_score = evaluator(optimized_extractor)

            improvement = (
                (optimized_score - baseline_score) / baseline_score
                if baseline_score > 0
                else 0.0
            )

            print(
                f"Optimization completed: {optimized_score:.3f} vs {baseline_score:.3f} baseline"
            )
            logger.info(
                "📊 DSPy optimization metrics",
                extra={
                    "run_id": run_id,
                    "optimized_score": optimized_score,
                    "baseline_score": baseline_score,
                    "improvement": improvement,
                    "execution_time": execution_time,
                },
            )

            return {
                "optimized_prompt": optimized_prompt,
                "performance_score": optimized_score,
                "baseline_score": baseline_score,
                "improvement": improvement,
                "execution_time": execution_time,
                "training_examples_count": len(train_examples),
                "validation_examples_count": len(val_examples),
                "mode": mode,
            }

        except Exception as e:
            execution_time = (datetime.now(timezone.utc) - start_time).total_seconds()

            print(f"Optimization failed: {e}")

            # Return enhanced baseline prompt if optimization fails
            enhanced_prompt = f"""{self.baseline_prompt}

# Enhanced with feedback analysis
Based on {len(training_examples)} user feedback examples, focus on:
- High-quality content that users find valuable
- Avoiding content that received negative feedback
- Including user-identified missing golden nuggets

Return valid JSON with the exact structure: {{"golden_nuggets": [...]}}"""

            return {
                "optimized_prompt": enhanced_prompt,
                "performance_score": 0.0,
                "baseline_score": 0.0,
                "improvement": 0.0,
                "execution_time": execution_time,
                "training_examples_count": len(training_examples),
                "validation_examples_count": 0,
                "mode": mode,
                "error": str(e),
            }

    def _extract_prompt_from_module(self, module) -> str:
        """Extract the optimized prompt from DSPy module"""
        try:
            # Try to get the prompt from the module's predictor
            if hasattr(module, "extract") and hasattr(module.extract, "signature"):
                # Get the optimized prompt text
                prompt_parts = []

                # Add signature description
                if hasattr(module.extract.signature, "__doc__"):
                    prompt_parts.append(module.extract.signature.__doc__)

                # Add any demonstrations or examples
                if hasattr(module.extract, "demos") and module.extract.demos:
                    prompt_parts.append("\nExamples:")
                    for demo in module.extract.demos[:3]:  # Limit to first 3 examples
                        prompt_parts.append(f"Input: {demo.content[:200]}...")
                        prompt_parts.append(f"Output: {demo.golden_nuggets[:200]}...")

                # Add the actual prediction prompt
                prompt_parts.append(
                    "\nYour task is to extract golden nuggets from the provided content."
                )
                prompt_parts.append(
                    'Return valid JSON with the structure: {"golden_nuggets": [...]}'
                )

                return "\n".join(prompt_parts)

        except Exception as e:
            print(f"Warning: Could not extract optimized prompt: {e}")

        # Fallback to enhanced baseline
        return f"{self.baseline_prompt}\n\n# This prompt was optimized using DSPy with user feedback"

    async def _store_optimized_prompt(
        self, db: aiosqlite.Connection, optimization_result: dict, run_id: str
    ) -> str:
        """Store optimized prompt and mark as current"""
        # Get next version number
        cursor = await db.execute(
            "SELECT COALESCE(MAX(version), 0) + 1 FROM optimized_prompts"
        )
        result = await cursor.fetchone()
        version = result[0] if result else 1

        prompt_id = str(uuid.uuid4())

        # Mark all previous prompts as not current
        await db.execute("UPDATE optimized_prompts SET is_current = FALSE")

        # Insert new optimized prompt
        await db.execute(
            """
            INSERT INTO optimized_prompts (
                id, version, prompt, created_at, feedback_count,
                positive_rate, is_current, optimization_run_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                prompt_id,
                version,
                optimization_result["optimized_prompt"],
                datetime.now(timezone.utc),
                optimization_result["training_examples_count"],
                optimization_result["performance_score"],
                True,  # is_current
                run_id,
            ),
        )

        await db.commit()
        return prompt_id

    def _log_progress(self, run_id: str, step: str, progress: int, message: str):
        """Log optimization progress to memory and console"""
        try:
            # Update in-memory progress
            self.active_runs[run_id] = {
                "step": step,
                "progress": progress,
                "message": message,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "last_updated": datetime.now(timezone.utc),
            }

            # Console logging with emoji indicators
            if progress == 100:
                logger.info(
                    f"✅ {message}",
                    extra={"run_id": run_id, "step": step, "progress": progress},
                )
            elif progress == -1:
                logger.error(
                    f"❌ {message}",
                    extra={"run_id": run_id, "step": step, "error": True},
                )
            else:
                logger.info(
                    f"📈 {message} ({progress}%)",
                    extra={"run_id": run_id, "step": step, "progress": progress},
                )

        except Exception as e:
            logger.warning(f"Failed to log progress: {e}")

    def get_run_progress(self, run_id: str) -> Optional[dict]:
        """Get current progress for a specific optimization run"""
        return self.active_runs.get(run_id)

    def get_all_active_runs(self) -> dict:
        """Get progress for all currently active optimization runs"""
        # Clean up old runs (older than 24 hours)
        now = datetime.now(timezone.utc)
        cutoff = (
            now.replace(hour=now.hour - 24)
            if now.hour >= 24
            else now.replace(day=now.day - 1, hour=now.hour)
        )

        self.active_runs = {
            run_id: data
            for run_id, data in self.active_runs.items()
            if data.get("last_updated", now) > cutoff
        }

        return self.active_runs

    async def get_current_prompt(self, db: aiosqlite.Connection) -> Optional[dict]:
        """Get the current optimized prompt"""
        cursor = await db.execute("""
            SELECT id, version, prompt, created_at, feedback_count, positive_rate
            FROM optimized_prompts
            WHERE is_current = TRUE
            ORDER BY version DESC
            LIMIT 1
        """)
        result = await cursor.fetchone()

        if result:
            return {
                "id": result[0],
                "version": result[1],
                "prompt": result[2],
                "optimizationDate": result[3],
                "performance": {"feedbackCount": result[4], "positiveRate": result[5]},
            }
        return None

    async def get_current_prompt_for_provider_model(
        self, db: aiosqlite.Connection, provider_id: str, model_name: str
    ) -> Optional[dict]:
        """
        Get the current optimized prompt for a specific provider+model combination.

        Falls back to generic optimized prompt if no provider-specific optimization exists.
        Returns None if no optimizations are available (extension will use baseline).
        """
        logger.info(
            f"Retrieving optimized prompt for {provider_id}+{model_name}",
            extra={
                "provider_id": provider_id,
                "model_name": model_name,
                "operation": "get_provider_specific_prompt",
            },
        )

        # First try: Get provider+model specific prompt
        cursor = await db.execute(
            """
            SELECT id, version, prompt, created_at, feedback_count, positive_rate,
                   model_provider, model_name
            FROM optimized_prompts
            WHERE model_provider = ? AND model_name = ? AND is_current = TRUE
            ORDER BY version DESC
            LIMIT 1
        """,
            (provider_id, model_name),
        )
        result = await cursor.fetchone()

        if result:
            logger.info(
                f"Found provider-specific optimized prompt for {provider_id}+{model_name} (v{result[1]})",
                extra={
                    "provider_id": provider_id,
                    "model_name": model_name,
                    "prompt_version": result[1],
                    "optimization_type": "provider_specific",
                },
            )
            return {
                "id": result[0],
                "version": result[1],
                "prompt": result[2],
                "optimizationDate": result[3],
                "performance": {"feedbackCount": result[4], "positiveRate": result[5]},
                "providerSpecific": True,
                "modelProvider": result[6],
                "modelName": result[7],
            }

        # Second try: Fall back to generic optimized prompt (no provider/model specified)
        logger.info(
            f"No provider-specific prompt found for {provider_id}+{model_name}, trying generic",
            extra={
                "provider_id": provider_id,
                "model_name": model_name,
                "fallback_step": "generic_prompt",
            },
        )

        cursor = await db.execute("""
            SELECT id, version, prompt, created_at, feedback_count, positive_rate
            FROM optimized_prompts
            WHERE (model_provider IS NULL OR model_provider = '') AND is_current = TRUE
            ORDER BY version DESC
            LIMIT 1
        """)
        result = await cursor.fetchone()

        if result:
            logger.info(
                f"Using generic optimized prompt for {provider_id}+{model_name} (v{result[1]})",
                extra={
                    "provider_id": provider_id,
                    "model_name": model_name,
                    "prompt_version": result[1],
                    "optimization_type": "generic_fallback",
                },
            )
            return {
                "id": result[0],
                "version": result[1],
                "prompt": result[2],
                "optimizationDate": result[3],
                "performance": {"feedbackCount": result[4], "positiveRate": result[5]},
                "providerSpecific": False,
                "fallbackUsed": True,
            }

        # No optimized prompts available at all
        logger.info(
            f"No optimized prompts available for {provider_id}+{model_name}, will use baseline",
            extra={
                "provider_id": provider_id,
                "model_name": model_name,
                "optimization_type": "none_available",
            },
        )
        return None

    async def get_optimization_history(
        self,
        db: aiosqlite.Connection,
        limit: int = 50,
        days: Optional[int] = None,
        mode: Optional[str] = None,
    ) -> dict:
        """Get optimization history with performance analytics"""

        # Build the WHERE clause based on filters
        where_conditions = []
        params: list[int | str] = []

        if days:
            where_conditions.append(
                "DATE(opt_run.started_at) >= DATE('now', '-' || ? || ' days')"
            )
            params.append(days)

        if mode and mode != "all":
            where_conditions.append("opt_run.mode = ?")
            params.append(mode)

        where_clause = ""
        if where_conditions:
            where_clause = "WHERE " + " AND ".join(where_conditions)

        # Get the filtered optimization runs with calculated fields
        cursor = await db.execute(
            f"""
            SELECT
                opt_run.id, opt_run.mode, opt_run.trigger_type, opt_run.started_at, opt_run.completed_at,
                opt_run.status, opt_run.performance_improvement, opt_run.feedback_count, opt_run.error_message,
                opt_run.api_cost, opt_run.total_tokens, opt_run.input_tokens, opt_run.output_tokens,
                op.version, op.positive_rate,
                -- Calculate duration in seconds
                CASE
                    WHEN opt_run.completed_at IS NOT NULL THEN
                        CAST((JULIANDAY(opt_run.completed_at) - JULIANDAY(opt_run.started_at)) * 86400 AS INTEGER)
                    ELSE NULL
                END as duration_seconds
            FROM optimization_runs opt_run
            LEFT JOIN optimized_prompts op ON opt_run.id = op.optimization_run_id
            {where_clause}
            ORDER BY opt_run.started_at DESC
            LIMIT ?
            """,
            (*params, limit),
        )

        results = await cursor.fetchall()

        # Transform results into the expected format
        runs = []
        for result in results:
            # Use positive_rate as success_rate, fallback to performance_improvement
            success_rate = result[14]  # positive_rate
            if (
                success_rate is None and result[6] is not None
            ):  # performance_improvement
                # Convert performance improvement to a success rate (0-1)
                # Assuming performance_improvement is a percentage or ratio
                success_rate = min(max(result[6], 0), 1) if result[6] >= 0 else None

            run = {
                "id": result[0],
                "status": result[5],
                "mode": result[1],
                "started_at": result[3],
                "completed_at": result[4],
                "tokens_used": result[10] or 0,  # total_tokens
                "api_cost": result[9] or 0.0,
                "feedback_items_processed": result[7] or 0,  # feedback_count
                "success_rate": success_rate,
                "duration_seconds": result[15],  # duration_seconds calculated field
            }
            runs.append(run)

        # Calculate performance trends from completed runs only
        completed_runs = [r for r in runs if r["status"] == "completed"]

        if completed_runs:
            # Calculate averages
            durations = [
                r["duration_seconds"]
                for r in completed_runs
                if r["duration_seconds"] is not None
            ]
            costs = [r["api_cost"] for r in completed_runs if r["api_cost"] is not None]
            success_rates = [
                r["success_rate"]
                for r in completed_runs
                if r["success_rate"] is not None
            ]

            avg_duration = sum(durations) / len(durations) if durations else 0
            avg_cost = sum(costs) / len(costs) if costs else 0.0
            avg_success_rate = (
                sum(success_rates) / len(success_rates) if success_rates else 0.0
            )
            total_processed = sum(r["feedback_items_processed"] for r in completed_runs)
        else:
            avg_duration = 0
            avg_cost = 0.0
            avg_success_rate = 0.0
            total_processed = 0

        # Get total count for has_more calculation
        count_cursor = await db.execute(
            f"""
            SELECT COUNT(*)
            FROM optimization_runs opt_run
            {where_clause}
            """,
            params,
        )
        count_result = await count_cursor.fetchone()
        total_count = count_result[0] if count_result else 0

        return {
            "runs": runs,
            "total_count": total_count,
            "has_more": total_count > limit,
            "performance_trends": {
                "avg_duration": avg_duration,
                "avg_cost": avg_cost,
                "avg_success_rate": avg_success_rate,
                "total_processed": total_processed,
            },
        }

    # Multi-Provider Optimization Methods

    async def run_provider_optimization(
        self,
        db: aiosqlite.Connection,
        provider_id: str,
        mode: str = "cheap",
        auto_trigger: bool = False,
    ) -> dict:
        """
        Run DSPy optimization for a specific provider.

        Args:
            db: Database connection
            provider_id: Provider identifier (gemini, openai, anthropic, openrouter)
            mode: Optimization mode (expensive or cheap)
            auto_trigger: Whether this was triggered automatically
        """
        return await self.multi_model_manager.optimize_for_provider(
            db, provider_id, mode, auto_trigger
        )

    async def check_provider_optimization_thresholds(
        self, db: aiosqlite.Connection
    ) -> dict:
        """Check which providers should be optimized based on feedback thresholds"""
        providers = ["gemini", "openai", "anthropic", "openrouter"]
        results = {}

        for provider_id in providers:
            results[
                provider_id
            ] = await self.multi_model_manager.should_optimize_provider(db, provider_id)

        return results

    async def get_provider_current_prompt(
        self, db: aiosqlite.Connection, provider_id: str
    ) -> Optional[dict]:
        """Get current optimized prompt for specific provider"""
        return await self.multi_model_manager.get_provider_current_prompt(
            db, provider_id
        )

    def get_provider_run_progress(
        self, provider_id: str, run_id: str
    ) -> Optional[dict]:
        """Get progress for specific provider optimization run"""
        return self.multi_model_manager.get_provider_run_progress(provider_id, run_id)

    def get_all_provider_active_runs(self) -> dict:
        """Get all active optimization runs across all providers"""
        return self.multi_model_manager.get_all_provider_active_runs()

    async def auto_trigger_provider_optimizations(
        self, db: aiosqlite.Connection
    ) -> dict:
        """
        Check all providers and trigger optimization for those that meet thresholds.
        This method should be called periodically by the backend.
        """
        results: dict[str, list[dict]] = {"triggered": [], "skipped": [], "errors": []}

        # Check thresholds for all providers
        threshold_results = await self.check_provider_optimization_thresholds(db)

        for provider_id, threshold_data in threshold_results.items():
            if threshold_data["should_optimize"]:
                try:
                    # Trigger optimization for this provider
                    optimization_result = await self.run_provider_optimization(
                        db, provider_id, mode="cheap", auto_trigger=True
                    )

                    results["triggered"].append(
                        {
                            "provider_id": provider_id,
                            "run_id": optimization_result.get("run_id"),
                            "feedback_count": threshold_data["total_feedback"],
                            "reason": f"Met threshold with {threshold_data['total_feedback']} feedback items",
                        }
                    )

                    logger.info(
                        f"🤖 Auto-triggered optimization for {provider_id}",
                        extra={
                            "provider_id": provider_id,
                            "run_id": optimization_result.get("run_id"),
                            "feedback_count": threshold_data["total_feedback"],
                            "auto_trigger": True,
                        },
                    )

                except Exception as e:
                    results["errors"].append(
                        {
                            "provider_id": provider_id,
                            "error": str(e),
                            "feedback_count": threshold_data["total_feedback"],
                        }
                    )

                    logger.error(
                        f"❌ Auto-trigger failed for {provider_id}: {e}",
                        extra={
                            "provider_id": provider_id,
                            "error": str(e),
                            "auto_trigger": True,
                        },
                    )
            else:
                results["skipped"].append(
                    {
                        "provider_id": provider_id,
                        "reason": f"Threshold not met ({threshold_data['total_feedback']}/{self.multi_model_manager.min_feedback_threshold})",
                        "feedback_count": threshold_data["total_feedback"],
                        "threshold_met": threshold_data["threshold_met"],
                    }
                )

        logger.info(
            "🔄 Auto-trigger cycle completed",
            extra={
                "triggered_count": len(results["triggered"]),
                "skipped_count": len(results["skipped"]),
                "error_count": len(results["errors"]),
            },
        )

        return results
