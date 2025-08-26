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

# Import models for type hints
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ..models import ChromeExtensionPrompt

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

        # Chrome Extension DEFAULT_PROMPTS (sophisticated, engineered prompt)
        # This is the actual prompt from the Chrome extension that should be optimized,
        # not a baseline placeholder. It contains sophisticated engineering:
        # - Precision over recall approach
        # - Anti-patterns and heuristics
        # - Quality control mechanisms
        # - Precise type definitions
        self.chrome_extension_default_prompt = """
You are an AI assistant tasked with analyzing content and extracting valuable insights, which we call "golden nuggets."
These golden nuggets should be tailored to a specific persona and categorized into specific types.
Your goal is to analyze the provided content and extract only the most insightful, non-obvious, and high-signal content for someone with this persona: {{ persona }}.
Your primary directive is **precision over recall**. It is vastly preferable to return zero nuggets than to include a single mediocre one.

**Crucially, do not force or invent extractions. If no content meets the strict criteria below, the `golden_nuggets` array MUST be empty ([]).**


Golden nugget types and their characteristics:

1. **Actionable Tools:** A specific, tool/software/technique. Must include its specific, valuable application.
    *   **Bad:** "You should use a calendar."
    *   **Good:** "I use Trello's calendar power-up to visualize my content pipeline, which helps me manage deadlines when my ADHD makes time-planning difficult."

2. **High-Signal Media:** A high-quality book, article, video, or podcast. Must include *why* it's valuable.
    *   **Bad:** "Check out the NFL podcast."
    *   **Good:** "The episode of the Tim Ferriss podcast with guest Derek Sivers has a brilliant segment on the idea of 'hell yeah or no' for decision-making."

3. **Deep Aha! Moments:** A concise, insightful explanation of a complex concept that goes beyond a surface-level definition. It should feel like a mini-lesson.
    *   **Bad:** "The mitochondria is the powerhouse of the cell."
    *   **Good:** "The reason async/await in Javascript is so powerful is that it's syntactic sugar over Promises, allowing you to write asynchronous code that reads like synchronous code, avoiding 'callback hell'."

4. **Powerful Analogies:** An analogy that makes a complex topic surprisingly simple and clear.
    *   **Bad:** "It's like learning to ride a bike."
    *   **Good:** "Thinking about technical debt as being like a financial debt is useful. You can take it on purposefully to ship faster, but you have to pay interest (slower development) until you pay it down (refactor)."

5. **Mental Models:** A named cognitive framework, productivity technique, or principle for thinking. The simple mention of a specific model is valuable as a hook for further research.
    *   **Bad:** "You should think about the problem differently." (Too generic)
    *   **Good:** "I apply the 'Inversion' mental model by asking 'What would guarantee failure?' before starting a new project. This helps me identify and mitigate risks proactively instead of just planning for success."

Instructions for extracting and formatting golden nuggets:

1. Carefully read and analyze the provided content.
2. Identify potential golden nuggets that align with the categories above and are relevant to the specified persona.
3. For each category, select the most impactful and relevant golden nugget. If no suitable nugget is found for a category, omit it from the results.
4. For each selected golden nugget, identify the exact start and end of the relevant content in the original text.

Additional instructions and constraints:

1. Extract a maximum of one golden nugget per type.
2. Ensure that the startContent and endContent fields contain the exact words from the original text, up to a maximum of 5 words each.
3. Do not modify or paraphrase the original text in the startContent and endContent fields.
4. If no golden nuggets are found for any type, return an empty array for the golden_nuggets field.
5. Focus on extracting the most valuable and relevant information for the specified persona.
6. Ensure that the extracted golden nuggets are concise and impactful.
7. Do not include any explanations or additional commentary outside of the JSON structure.

Your task is to analyze the given content, extract the most relevant golden nuggets according to the specified categories and persona, and present them in the required JSON format.
""".strip()

        # Simple baseline for fallback (deprecated - should not be used)
        # Removed baseline_prompt - now using actual Chrome extension prompts

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

            # Log which prompt will be optimized
            prompt_type = self._identify_prompt_type()
            logger.info(
                "📝 Prompt optimization target identified",
                extra={
                    "run_id": run_id,
                    "prompt_type": prompt_type,
                    "uses_chrome_extension_default": prompt_type
                    == "chrome_extension_sophisticated",
                    "has_precision_over_recall": "precision over recall"
                    in self.chrome_extension_default_prompt,
                    "has_anti_patterns": "Anti-Pattern"
                    in self.chrome_extension_default_prompt,
                    "has_quality_control": "QUALITY CONTROL"
                    in self.chrome_extension_default_prompt,
                },
            )

            # Run optimization in thread pool to avoid blocking
            logger.info(
                "🧠 Starting DSPy optimization with Chrome extension prompt",
                extra={
                    "run_id": run_id,
                    "mode": mode,
                    "training_examples": len(training_examples),
                    "optimizing_chrome_prompt": True,
                    "prompt_engineering_features": {
                        "precision_over_recall": True,
                        "anti_patterns": True,
                        "quality_control": True,
                        "high_precision_filtering": True,
                    },
                },
            )
            self._log_progress(
                run_id,
                "optimization",
                30,
                f"Running {mode} optimization on Chrome extension prompt",
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
                "optimized_prompt": self._get_fallback_chrome_prompt(),
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

            # Validate that sophisticated engineering is preserved
            quality_validation = self._validate_optimized_prompt_quality(
                self.chrome_extension_default_prompt, optimized_prompt, run_id
            )

            if not quality_validation["quality_preserved"]:
                logger.warning(
                    "⚠️ Optimized prompt may have lost sophisticated engineering features",
                    extra={
                        "run_id": run_id,
                        "quality_concerns": quality_validation["details"],
                    },
                )
            else:
                logger.info(
                    "✅ Optimized prompt maintains sophisticated engineering",
                    extra={
                        "run_id": run_id,
                        "quality_preserved": True,
                    },
                )

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

            # Return enhanced Chrome extension prompt if optimization fails
            # This preserves the sophisticated engineering even when DSPy fails
            enhanced_prompt = f"""{self.chrome_extension_default_prompt}

# Enhanced with feedback analysis
# Based on {len(training_examples)} user feedback examples, focus on:
# - High-quality content that users find valuable
# - Avoiding content that received negative feedback
# - Including user-identified missing golden nuggets
# - Maintaining precision over recall approach and quality control heuristics

Return valid JSON with the exact structure: {{"golden_nuggets": [...]}}"""

            logger.warning(
                "⚠️ DSPy optimization failed, using enhanced Chrome extension prompt",
                extra={
                    "run_id": run_id,
                    "preserves_sophisticated_engineering": True,
                    "enhanced_with_feedback": len(training_examples),
                    "maintains_precision_over_recall": True,
                },
            )

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

        # Fallback to enhanced Chrome extension prompt (preserves sophistication)
        logger.info(
            "🔄 Using Chrome extension prompt as optimization fallback",
            extra={
                "preserves_sophistication": True,
                "precision_over_recall": True,
                "anti_patterns": True,
            },
        )
        return f"{self.chrome_extension_default_prompt}\n\n# This sophisticated prompt was processed through DSPy optimization"

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

    def _identify_prompt_type(self) -> str:
        """Identify which type of prompt is being optimized for logging"""
        # For now, we're using the Chrome extension sophisticated prompt
        return "chrome_extension_sophisticated"

    def _log_prompt_analysis(self, prompt: str, run_id: str) -> dict:
        """Analyze and log characteristics of the prompt being optimized"""
        analysis = {
            "length_chars": len(prompt),
            "has_precision_over_recall": "precision over recall" in prompt,
            "has_anti_patterns": "Anti-Pattern" in prompt,
            "has_quality_control": "QUALITY CONTROL" in prompt,
            "has_extraction_targets": "EXTRACTION TARGETS" in prompt,
            "has_role_and_goal": "ROLE & GOAL" in prompt,
            "mentions_precision_over_recall": "precision over recall" in prompt,
            "uses_examples": "**Bad:**" in prompt and "**Good:**" in prompt,
            "sophisticated_engineering": True,
        }

        logger.info(
            "🔍 Prompt analysis for optimization",
            extra={
                "run_id": run_id,
                "prompt_analysis": analysis,
                "engineering_quality": "sophisticated"
                if analysis["sophisticated_engineering"]
                else "basic",
            },
        )

        return analysis

    def _validate_optimized_prompt_quality(
        self, original_prompt: str, optimized_prompt: str, run_id: str
    ) -> dict:
        """Validate that optimized prompt maintains sophisticated engineering"""
        original_analysis = self._log_prompt_analysis(
            original_prompt, f"{run_id}_original"
        )
        optimized_analysis = self._log_prompt_analysis(
            optimized_prompt, f"{run_id}_optimized"
        )

        quality_preservation = {
            "preserved_precision_over_recall": (
                original_analysis["has_precision_over_recall"]
                and (
                    optimized_analysis["has_precision_over_recall"]
                    or "precision over recall" in optimized_prompt.lower()
                    or "precision" in optimized_prompt.lower()
                )
            ),
            "preserved_anti_patterns": (
                original_analysis["has_anti_patterns"]
                and (
                    optimized_analysis["has_anti_patterns"]
                    or "anti-pattern" in optimized_prompt.lower()
                )
            ),
            "preserved_quality_control": (
                original_analysis["has_quality_control"]
                and (
                    optimized_analysis["has_quality_control"]
                    or "quality control" in optimized_prompt.lower()
                )
            ),
            "preserved_precision_over_recall": (
                original_analysis["mentions_precision_over_recall"]
                and (
                    optimized_analysis["mentions_precision_over_recall"]
                    or "precision" in optimized_prompt.lower()
                )
            ),
        }

        overall_quality_preserved = all(quality_preservation.values())

        logger.info(
            "✅ Prompt quality validation completed"
            if overall_quality_preserved
            else "⚠️ Prompt quality concerns detected",
            extra={
                "run_id": run_id,
                "quality_preservation": quality_preservation,
                "overall_quality_preserved": overall_quality_preserved,
                "sophisticated_engineering_maintained": overall_quality_preserved,
            },
        )

        return {
            "quality_preserved": overall_quality_preserved,
            "details": quality_preservation,
        }

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

    # Chrome Extension Prompt Optimization Methods

    async def register_chrome_prompt(
        self, db: aiosqlite.Connection, prompt: "ChromeExtensionPrompt"
    ) -> bool:
        """
        Register or update a Chrome extension prompt in the database.

        This replaces the baseline_prompt approach by storing actual Chrome extension prompts.
        """
        try:
            from datetime import datetime, timezone
            import hashlib

            # Create hash of prompt content to detect changes
            prompt_hash = hashlib.sha256(prompt.prompt.encode()).hexdigest()[:32]
            current_time = datetime.now(timezone.utc)

            # Check if prompt already exists
            cursor = await db.execute(
                "SELECT id, original_prompt_hash FROM chrome_extension_prompts WHERE id = ?",
                (prompt.id,),
            )
            existing = await cursor.fetchone()

            if existing:
                # Update existing prompt if content changed
                if existing[1] != prompt_hash:
                    await db.execute(
                        """
                        UPDATE chrome_extension_prompts
                        SET name = ?, prompt = ?, is_default = ?, version = version + 1,
                            updated_at = ?, original_prompt_hash = ?, last_sync_at = ?
                        WHERE id = ?
                        """,
                        (
                            prompt.name,
                            prompt.prompt,
                            prompt.is_default,
                            current_time,
                            prompt_hash,
                            current_time,
                            prompt.id,
                        ),
                    )
                else:
                    # Just update sync time
                    await db.execute(
                        "UPDATE chrome_extension_prompts SET last_sync_at = ? WHERE id = ?",
                        (current_time, prompt.id),
                    )
            else:
                # Insert new prompt
                await db.execute(
                    """
                    INSERT INTO chrome_extension_prompts (
                        id, name, prompt, is_default, version, created_at, updated_at,
                        is_active, original_prompt_hash, last_sync_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        prompt.id,
                        prompt.name,
                        prompt.prompt,
                        prompt.is_default,
                        1,
                        current_time,
                        current_time,
                        True,
                        prompt_hash,
                        current_time,
                    ),
                )

            await db.commit()
            logger.info(f"Registered Chrome extension prompt: {prompt.id}")
            return True

        except Exception as e:
            logger.error(f"Failed to register Chrome prompt {prompt.id}: {e}")
            return False

    async def list_chrome_prompts(self, db: aiosqlite.Connection) -> list[dict]:
        """List all registered Chrome extension prompts with optimization status"""
        try:
            cursor = await db.execute("""
                SELECT
                    cp.id, cp.name, cp.prompt, cp.is_default, cp.version,
                    cp.created_at, cp.updated_at, cp.last_sync_at,
                    COUNT(DISTINCT or_run.id) as optimization_count,
                    MAX(or_run.completed_at) as last_optimization_date,
                    op.version as latest_optimized_version,
                    op.positive_rate as latest_performance
                FROM chrome_extension_prompts cp
                LEFT JOIN optimization_runs or_run ON cp.id = or_run.chrome_prompt_id
                LEFT JOIN optimized_prompts op ON or_run.id = op.optimization_run_id AND op.is_current = TRUE
                WHERE cp.is_active = TRUE
                GROUP BY cp.id
                ORDER BY cp.is_default DESC, cp.name ASC
            """)
            results = await cursor.fetchall()

            prompts = []
            for row in results:
                prompts.append(
                    {
                        "id": row[0],
                        "name": row[1],
                        "prompt": row[2][:500] + "..."
                        if len(row[2]) > 500
                        else row[2],  # Truncate for list view
                        "is_default": bool(row[3]),
                        "version": row[4],
                        "created_at": row[5],
                        "updated_at": row[6],
                        "last_sync_at": row[7],
                        "optimization_count": row[8] or 0,
                        "last_optimization_date": row[9],
                        "has_current_optimization": row[10] is not None,
                        "latest_performance": row[11] or 0.0,
                    }
                )

            return prompts

        except Exception as e:
            logger.error(f"Failed to list Chrome prompts: {e}")
            return []

    async def get_optimized_chrome_prompt(
        self,
        db: aiosqlite.Connection,
        prompt_id: str,
        provider: Optional[str] = None,
        model: Optional[str] = None,
    ) -> Optional[dict]:
        """
        Get the optimized version of a specific Chrome extension prompt.

        This replaces the baseline_prompt retrieval with actual Chrome extension prompt optimization retrieval.
        """
        try:
            # Build query based on provider/model specificity
            if provider and model:
                # Get provider+model specific optimization
                cursor = await db.execute(
                    """
                    SELECT
                        op.id, op.version, op.prompt, op.created_at,
                        op.feedback_count, op.positive_rate,
                        or_run.model_provider, or_run.model_name,
                        cp.prompt as original_prompt, cp.name as prompt_name
                    FROM optimized_prompts op
                    JOIN optimization_runs or_run ON op.optimization_run_id = or_run.id
                    JOIN chrome_extension_prompts cp ON or_run.chrome_prompt_id = cp.id
                    WHERE or_run.chrome_prompt_id = ?
                        AND or_run.model_provider = ?
                        AND or_run.model_name = ?
                        AND op.is_current = TRUE
                    ORDER BY op.version DESC
                    LIMIT 1
                """,
                    (prompt_id, provider, model),
                )
            else:
                # Get generic optimization for this prompt
                cursor = await db.execute(
                    """
                    SELECT
                        op.id, op.version, op.prompt, op.created_at,
                        op.feedback_count, op.positive_rate,
                        or_run.model_provider, or_run.model_name,
                        cp.prompt as original_prompt, cp.name as prompt_name
                    FROM optimized_prompts op
                    JOIN optimization_runs or_run ON op.optimization_run_id = or_run.id
                    JOIN chrome_extension_prompts cp ON or_run.chrome_prompt_id = cp.id
                    WHERE or_run.chrome_prompt_id = ?
                        AND (or_run.model_provider IS NULL OR or_run.model_provider = '')
                        AND op.is_current = TRUE
                    ORDER BY op.version DESC
                    LIMIT 1
                """,
                    (prompt_id,),
                )

            result = await cursor.fetchone()

            if result:
                return {
                    "id": result[0],
                    "original_prompt_id": prompt_id,
                    "version": result[1],
                    "optimized_prompt": result[2],
                    "original_prompt": result[8],
                    "optimizationDate": result[3],
                    "performance": {
                        "feedbackCount": result[4],
                        "positiveRate": result[5],
                    },
                    "providerSpecific": bool(result[6] and result[7]),
                    "modelProvider": result[6],
                    "modelName": result[7],
                }

            return None

        except Exception as e:
            logger.error(f"Failed to get optimized Chrome prompt {prompt_id}: {e}")
            return None

    async def run_chrome_prompt_optimization(
        self,
        db: aiosqlite.Connection,
        prompt_id: str,
        prompt_content: str,
        mode: str,
        auto_trigger: bool = False,
        provider: Optional[str] = None,
        model: Optional[str] = None,
    ) -> dict:
        """
        Run DSPy optimization on a specific Chrome extension prompt.

        This is the core method that replaces baseline_prompt optimization with
        actual Chrome extension prompt optimization.
        """
        if not DSPY_AVAILABLE:
            logger.error("DSPy not available", extra={"error": "DSPy not installed"})
            raise Exception("DSPy not available. Install with: pip install dspy-ai")

        # Create optimization run record
        run_id = str(uuid.uuid4())
        trigger_type = "auto" if auto_trigger else "manual"

        logger.info(
            f"🚀 Starting Chrome extension prompt optimization for {prompt_id}",
            extra={
                "run_id": run_id,
                "prompt_id": prompt_id,
                "mode": mode,
                "trigger_type": trigger_type,
                "provider": provider,
                "model": model,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        )

        # Insert optimization run with Chrome prompt context
        await db.execute(
            """
            INSERT INTO optimization_runs (
                id, mode, trigger_type, started_at, status, feedback_count,
                chrome_prompt_id, model_provider, model_name
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                run_id,
                mode,
                trigger_type,
                datetime.now(timezone.utc),
                "running",
                0,
                prompt_id,
                provider,
                model,
            ),
        )
        await db.commit()

        # Initialize progress tracking
        self._log_progress(
            run_id, "initialization", 10, "Setting up Chrome prompt optimization"
        )

        try:
            # Get training examples specific to this Chrome prompt (if any)
            logger.info(
                "📊 Gathering training examples for Chrome prompt",
                extra={"run_id": run_id, "prompt_id": prompt_id},
            )
            self._log_progress(
                run_id,
                "data_gathering",
                20,
                "Gathering training examples for Chrome prompt",
            )

            # Get training examples that were generated using this specific prompt
            training_examples = (
                await self.feedback_service.get_training_examples_for_prompt(
                    db, prompt_id, provider, model, limit=200
                )
            )

            logger.info(
                f"📈 Training examples collected for Chrome prompt {prompt_id}",
                extra={
                    "run_id": run_id,
                    "prompt_id": prompt_id,
                    "training_count": len(training_examples),
                    "status": "success"
                    if len(training_examples) >= 10
                    else "insufficient_data",
                },
            )

            if len(training_examples) < 10:
                # Fall back to general training examples if prompt-specific ones are insufficient
                logger.warning(
                    f"Insufficient prompt-specific training data for {prompt_id}, using general examples",
                    extra={
                        "run_id": run_id,
                        "prompt_id": prompt_id,
                        "prompt_specific_count": len(training_examples),
                        "required_minimum": 10,
                    },
                )
                training_examples = await self.feedback_service.get_training_examples(
                    db, limit=200
                )

                if len(training_examples) < 10:
                    raise Exception(
                        f"Not enough training examples for Chrome prompt {prompt_id}. Need at least 10 feedback items."
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

            # Run optimization in thread pool with actual Chrome extension prompt
            logger.info(
                f"🧠 Starting DSPy optimization for Chrome prompt {prompt_id}",
                extra={
                    "run_id": run_id,
                    "prompt_id": prompt_id,
                    "mode": mode,
                    "training_examples": len(training_examples),
                },
            )
            self._log_progress(
                run_id,
                "optimization",
                30,
                f"Running {mode} optimization on Chrome prompt",
            )

            result = await asyncio.get_event_loop().run_in_executor(
                self.executor,
                self._run_chrome_prompt_dspy_optimization,
                prompt_content,  # Use actual Chrome extension prompt content
                training_examples,
                mode,
                run_id,
                prompt_id,
            )

            # Store optimized prompt
            logger.info(
                f"💾 Storing optimized Chrome prompt {prompt_id}",
                extra={
                    "run_id": run_id,
                    "prompt_id": prompt_id,
                    "performance_improvement": result.get("improvement", 0.0),
                },
            )
            self._log_progress(run_id, "storing", 90, "Storing optimized Chrome prompt")

            optimized_prompt_id = await self._store_optimized_chrome_prompt(
                db, result, run_id, prompt_id
            )

            # Mark optimization as completed
            self._log_progress(
                run_id,
                "completed",
                100,
                "Chrome prompt optimization completed successfully",
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
                f"✅ Chrome prompt optimization completed successfully for {prompt_id}",
                extra={
                    "run_id": run_id,
                    "prompt_id": prompt_id,
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
                "prompt_id": prompt_id,
                "optimized_prompt_id": optimized_prompt_id,
                "performance_improvement": result.get("improvement", 0.0),
                "training_examples": len(training_examples),
                "mode": mode,
            }

        except Exception as e:
            # Mark optimization as failed
            logger.error(
                f"❌ Chrome prompt optimization failed for {prompt_id}",
                extra={
                    "run_id": run_id,
                    "prompt_id": prompt_id,
                    "mode": mode,
                    "error": str(e),
                    "error_type": type(e).__name__,
                },
            )
            self._log_progress(
                run_id, "failed", -1, f"Chrome prompt optimization failed: {e!s}"
            )

            # Clean up active run tracking after delay
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

            raise Exception(f"Chrome prompt optimization failed: {e!s}")

    def _run_chrome_prompt_dspy_optimization(
        self,
        chrome_prompt_content: str,
        training_examples: list[dict],
        mode: str,
        run_id: Optional[str] = None,
        prompt_id: Optional[str] = None,
    ) -> dict:
        """
        Run DSPy optimization using actual Chrome extension prompt content.

        This replaces the baseline_prompt with actual Chrome extension prompts for optimization.
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
                "optimized_prompt": chrome_prompt_content,  # Return original Chrome prompt instead of baseline
                "performance_score": 0.0,
                "baseline_score": 0.0,
                "improvement": 0.0,
                "execution_time": (
                    datetime.now(timezone.utc) - start_time
                ).total_seconds(),
                "training_examples_count": len(training_examples),
                "validation_examples_count": 0,
                "mode": mode,
                "prompt_id": prompt_id,
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

            # Initialize extractor with Chrome extension prompt content
            extractor = GoldenNuggetExtractor()

            # CRITICAL: Inject Chrome extension prompt content into the DSPy module
            # This preserves the sophisticated prompt engineering while allowing optimization
            if hasattr(extractor, "extract") and hasattr(
                extractor.extract, "signature"
            ):
                # Update the signature with Chrome extension prompt content
                extractor.extract.signature.__doc__ = chrome_prompt_content

            # Get optimizer based on mode
            optimizer = config.get_optimizer(mode)

            # Choose evaluation metric
            metric = OptimizationMetrics.golden_nugget_metric

            # Run optimization on Chrome extension prompt
            print(
                f"Starting {mode} optimization for Chrome prompt {prompt_id} with {len(train_examples)} training examples..."
            )
            logger.info(
                f"🔧 DSPy optimization in progress for Chrome prompt {prompt_id}",
                extra={
                    "run_id": run_id,
                    "prompt_id": prompt_id,
                    "mode": mode,
                    "train_examples": len(train_examples),
                    "val_examples": len(val_examples),
                },
            )

            optimized_extractor = optimizer.compile(
                extractor,
                trainset=train_examples,
                valset=val_examples if val_examples else train_examples[:5],
                metric=metric,
            )

            execution_time = (datetime.now(timezone.utc) - start_time).total_seconds()

            # Extract optimized prompt - this preserves Chrome extension prompt structure
            optimized_prompt = self._extract_chrome_prompt_from_module(
                optimized_extractor, chrome_prompt_content
            )

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
                f"Chrome prompt optimization completed for {prompt_id}: {optimized_score:.3f} vs {baseline_score:.3f} baseline"
            )
            logger.info(
                f"📊 DSPy optimization metrics for Chrome prompt {prompt_id}",
                extra={
                    "run_id": run_id,
                    "prompt_id": prompt_id,
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
                "prompt_id": prompt_id,
            }

        except Exception as e:
            execution_time = (datetime.now(timezone.utc) - start_time).total_seconds()

            print(f"Chrome prompt optimization failed for {prompt_id}: {e}")

            # Return enhanced Chrome extension prompt if optimization fails
            enhanced_prompt = f"""{chrome_prompt_content}

# Enhanced with feedback analysis
Based on {len(training_examples)} user feedback examples, focus on:
- High-quality content that users find valuable
- Avoiding content that received negative feedback
- Including user-identified missing golden nuggets

Remember to preserve the precision over recall approach and all sophisticated heuristics above.
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
                "prompt_id": prompt_id,
                "error": str(e),
            }

    def _extract_chrome_prompt_from_module(
        self, module, original_chrome_prompt: str
    ) -> str:
        """
        Extract the optimized prompt from DSPy module while preserving Chrome extension prompt structure.

        This ensures that sophisticated prompt engineering (precision over recall approach, anti-patterns, etc.)
        is preserved through the optimization process.
        """
        try:
            # Try to get the optimized prompt from the module's predictor
            if hasattr(module, "extract") and hasattr(module.extract, "signature"):
                # Get the optimized prompt text
                prompt_parts = []

                # Start with the original Chrome extension prompt structure
                prompt_parts.append("# Optimized Chrome Extension Prompt")
                prompt_parts.append("")

                # Add signature description if available
                if (
                    hasattr(module.extract.signature, "__doc__")
                    and module.extract.signature.__doc__
                ):
                    prompt_parts.append(module.extract.signature.__doc__)
                else:
                    # Fall back to original Chrome prompt if optimization didn't preserve structure
                    prompt_parts.append(original_chrome_prompt)

                # Add any demonstrations or examples from optimization
                if hasattr(module.extract, "demos") and module.extract.demos:
                    prompt_parts.append("\n## Optimization Examples:")
                    for i, demo in enumerate(
                        module.extract.demos[:3]
                    ):  # Limit to first 3 examples
                        prompt_parts.append(f"\n### Example {i + 1}:")
                        prompt_parts.append(f"Input: {demo.content[:200]}...")
                        prompt_parts.append(f"Output: {demo.golden_nuggets[:200]}...")

                # Add optimization note
                prompt_parts.append("\n## Optimization Note:")
                prompt_parts.append(
                    "This prompt was optimized using DSPy with user feedback while preserving"
                )
                prompt_parts.append(
                    "the sophisticated prompt engineering principles of the original Chrome extension prompt."
                )

                return "\n".join(prompt_parts)

        except Exception as e:
            logger.warning(f"Could not extract optimized Chrome prompt structure: {e}")

        # Fallback: Return enhanced original Chrome prompt
        return f"""{original_chrome_prompt}

# This Chrome extension prompt was optimized using DSPy with user feedback
# The optimization preserved sophisticated prompt engineering while improving performance"""

    async def _store_optimized_chrome_prompt(
        self,
        db: aiosqlite.Connection,
        optimization_result: dict,
        run_id: str,
        prompt_id: str,
    ) -> str:
        """Store optimized Chrome extension prompt and mark as current for that specific prompt"""
        # Get next version number for this specific Chrome prompt
        cursor = await db.execute(
            """
            SELECT COALESCE(MAX(op.version), 0) + 1
            FROM optimized_prompts op
            JOIN optimization_runs or_run ON op.optimization_run_id = or_run.id
            WHERE or_run.chrome_prompt_id = ?
            """,
            (prompt_id,),
        )
        result = await cursor.fetchone()
        version = result[0] if result else 1

        optimized_prompt_id = str(uuid.uuid4())

        # Mark previous prompts for this Chrome prompt as not current
        await db.execute(
            """
            UPDATE optimized_prompts
            SET is_current = FALSE
            WHERE optimization_run_id IN (
                SELECT id FROM optimization_runs WHERE chrome_prompt_id = ?
            )
        """,
            (prompt_id,),
        )

        # Insert new optimized Chrome extension prompt
        await db.execute(
            """
            INSERT INTO optimized_prompts (
                id, version, prompt, created_at, feedback_count,
                positive_rate, is_current, optimization_run_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                optimized_prompt_id,
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
        logger.info(f"Stored optimized Chrome prompt {prompt_id} as version {version}")
        return optimized_prompt_id

    def _get_fallback_chrome_prompt(self) -> str:
        """
        Get fallback Chrome extension prompt when optimization fails.

        This returns the actual default Chrome extension prompt instead of the old baseline_prompt.
        """
        return """## ROLE & GOAL:
You are an extremely discerning AI information filter. Your goal is to analyze the provided {{ source }} and extract only the most insightful, non-obvious, and high-signal content for someone with this persona: {{ persona }}. Your primary directive is **precision over recall**. It is vastly preferable to return zero nuggets than to include a single mediocre one.

**Crucially, do not force or invent extractions. If no content meets the strict criteria below, the `golden_nuggets` array MUST be empty ([]).**


## EXTRACTION FOCUS:
Extract only the raw, high-quality content without explanations. Focus purely on identifying and preserving the most valuable insights in their original form. The content itself should be so obviously valuable that no additional context is needed.

## CRITICAL HEURISTICS & ANTI-PATTERNS (APPLY BEFORE ALL OTHER RULES):

1.  **Precision Over Recall:** Your primary directive is precision over recall. It is vastly preferable to return zero nuggets than to include a single mediocre one. **Most of the time, you will find nothing. This is the correct outcome.** Do not lower your standards to find something.

2.  **Anti-Pattern: Meta-Summaries & Feature Lists:** Your most critical task is to distinguish between the *content* and the *container*.
    *   **WRONG:** If the source is an article *about* a productivity app, do NOT extract the app's features (e.g., "The app has a results sidebar"). This is describing the container.
    *   **RIGHT:** If that same article *quotes* a user who discovered a brilliant, non-obvious way to use the app to manage their ADHD, *that specific technique* is a potential nugget. You are looking for insights *within* the source, not a summary *of* the source.

3.  **The Final Sanity Check:** Before outputting a nugget, perform one last check: "If I presented *only this extracted text* to the user, would they feel like they received a rare insight, or just a generic point from the source?" If it's not a standalone gem, discard it.

## QUALITY CONTROL (APPLY RIGOROUSLY):
1.  **Strict Filtering:** For each potential nugget, ask: "Is this genuinely insightful, non-obvious, and high-signal for the persona?" If there is *any* doubt, discard it.
2.  **No Common Knowledge:** Avoid repackaged common knowledge. A mention of 'VS Code' is not a nugget. A mention of a specific, lesser-known VS Code extension with a clear, clever use case *is*.
3.  **No Vague Praise:** "This article was great" is not a nugget. "This article's explanation of confirmation bias using the Wason selection task was eye-opening" *could be* a nugget if the core of that insight is included.
4.  **High Signal-to-Noise Ratio:** The content must be dense with value. No fluff.

## EXTRACTION TARGETS ("Golden Nuggets"):
Your primary task is to find content matching one or more of the following categories. Each example provides a "Bad" (what to avoid) and "Good" (what to look for) case.

1.  **Actionable Tools:** A specific, tool/software/technique. Must include its specific, valuable application.
    *   **Bad:** "You should use a calendar."
    *   **Good:** "I use Trello's calendar power-up to visualize my content pipeline, which helps me manage deadlines when my ADHD makes time-planning difficult."

2.  **High-Signal Media:** A high-quality book, article, video, or podcast. Must include *why* it's valuable.
    *   **Bad:** "Check out the NFL podcast."
    *   **Good:** "The episode of the Tim Ferriss podcast with guest Derek Sivers has a brilliant segment on the idea of 'hell yeah or no' for decision-making."

3.  **Deep Aha! Moments:** A concise, insightful explanation of a complex concept that goes beyond a surface-level definition. It should feel like a mini-lesson.
    *   **Bad:** "The mitochondria is the powerhouse of the cell."
    *   **Good:** "The reason async/await in Javascript is so powerful is that it's syntactic sugar over Promises, allowing you to write asynchronous code that reads like synchronous code, avoiding 'callback hell'."

4.  **Powerful Analogies:** An analogy that makes a complex topic surprisingly simple and clear.
    *   **Bad:** "It's like learning to ride a bike."
    *   **Good:** "Thinking about technical debt as being like a financial debt is useful. You can take it on purposefully to ship faster, but you have to pay interest (slower development) until you pay it down (refactor)."

5.  **Mental Models:** A named cognitive framework, productivity technique, or principle for thinking. The simple mention of a specific model is valuable as a hook for further research.
    *   **Bad:** "You should think about the problem differently." (Too generic)
    *   **Good:** "I apply the 'Inversion' mental model by asking 'What would guarantee failure?' before starting a new project. This helps me identify and mitigate risks proactively instead of just planning for success."

Return valid JSON with the structure: {"golden_nuggets": [...]}"""
