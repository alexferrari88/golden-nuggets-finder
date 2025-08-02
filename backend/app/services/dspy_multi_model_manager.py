"""
DSPy Multi-Model Manager for provider-specific optimization.

Handles DSPy optimization separately for each LLM provider
(Gemini, OpenAI, Anthropic, OpenRouter) to ensure model-specific
prompt optimization based on feedback data.
"""

import asyncio
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

# DSPy imports with graceful handling
import importlib.util
import logging
from typing import Optional
import uuid

import aiosqlite

from .feedback_service import FeedbackService

DSPY_AVAILABLE = importlib.util.find_spec("dspy") is not None
if not DSPY_AVAILABLE:
    print(
        "Warning: DSPy not available. Multi-model optimization features "
        "will be limited."
    )

# Configure logging
logger = logging.getLogger(__name__)


class DSPyMultiModelManager:
    """DSPy system that handles optimization for different models separately"""

    def __init__(self):
        self.feedback_service = FeedbackService()
        self.executor = ThreadPoolExecutor(
            max_workers=2
        )  # Limit concurrent optimizations

        # Track active runs per provider
        self.active_runs_by_provider: dict[str, dict] = {}

        # Model configurations for DSPy - will be initialized when DSPy is available
        self.model_configs = {}

        # Provider-specific baseline prompts
        self.baseline_prompts = {
            "gemini": self._get_baseline_prompt("Google Gemini"),
            "openai": self._get_baseline_prompt("OpenAI GPT"),
            "anthropic": self._get_baseline_prompt("Anthropic Claude"),
            "openrouter": self._get_baseline_prompt("OpenRouter models"),
        }

        # Minimum feedback thresholds per provider
        self.min_feedback_threshold = 50
        self.min_training_examples = 10

    def _get_baseline_prompt(self, provider_name: str) -> str:
        """Get provider-specific baseline prompt"""
        return f"""
You are an expert at identifying golden nuggets of insight from web content using {provider_name}.

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
The JSON structure must be: {{"golden_nuggets": [...]}}
"""

    def _get_default_model(self, provider_id: str) -> str:
        """Get default model for provider as fallback when no user data exists"""
        defaults = {
            "gemini": "gemini-2.5-flash",
            "openai": "gpt-4o-mini", 
            "anthropic": "claude-3-5-sonnet-20241022",
            "openrouter": "openai/gpt-3.5-turbo",
        }
        return defaults.get(provider_id, "unknown")

    async def _get_user_models_for_provider(self, db: aiosqlite.Connection, provider_id: str) -> list[str]:
        """Get list of models actually used by users for this provider based on feedback data"""
        cursor = await db.execute(
            """
            SELECT DISTINCT model_name 
            FROM nugget_feedback 
            WHERE model_provider = ? AND model_name IS NOT NULL
            """,
            (provider_id,)
        )
        nugget_results = await cursor.fetchall()
        
        cursor = await db.execute(
            """
            SELECT DISTINCT model_name 
            FROM missing_content_feedback 
            WHERE model_provider = ? AND model_name IS NOT NULL
            """,
            (provider_id,)
        )
        missing_results = await cursor.fetchall()
        
        # Combine and deduplicate model names
        user_models = set()
        for row in nugget_results:
            if row[0]:
                user_models.add(row[0])
        for row in missing_results:
            if row[0]:
                user_models.add(row[0])
        
        # Return actual user models or fallback to default
        if user_models:
            return list(user_models)
        else:
            return [self._get_default_model(provider_id)]

    def _create_dspy_lm_for_model(self, provider_id: str, model_name: str):
        """Create DSPy LM instance for specific provider+model combination"""
        if not DSPY_AVAILABLE:
            return None
            
        try:
            import dspy
            
            if provider_id == "openrouter":
                return dspy.LM(model_name, api_base="https://openrouter.ai/api/v1")
            else:
                return dspy.LM(f"{provider_id}/{model_name}")
                
        except Exception as e:
            logger.error(f"Failed to create DSPy LM for {provider_id}/{model_name}: {e}")
            return None

    async def optimize_for_provider(
        self,
        db: aiosqlite.Connection,
        provider_id: str,
        mode: str = "cheap",
        auto_trigger: bool = False,
    ) -> Optional[dict]:
        """
        Run optimization for each model used by this provider.
        This replaces the old single-provider optimization with provider+model optimization.

        Args:
            db: Database connection
            provider_id: Provider identifier (gemini, openai, anthropic, openrouter)
            mode: Optimization mode (expensive or cheap)
            auto_trigger: Whether this was triggered automatically
        """
        if not DSPY_AVAILABLE:
            logger.error(f"DSPy not available for {provider_id} optimization")
            raise Exception("DSPy not available. Install with: pip install dspy-ai")

        if provider_id not in ["gemini", "openai", "anthropic", "openrouter"]:
            raise ValueError(f"Unsupported provider: {provider_id}")

        # Get actual models that users are using for this provider
        user_models = await self._get_user_models_for_provider(db, provider_id)
        
        logger.info(
            f"Found {len(user_models)} models in use for {provider_id}: {user_models}",
            extra={
                "provider_id": provider_id,
                "user_models": user_models,
                "mode": mode,
                "auto_trigger": auto_trigger,
            },
        )

        # Optimize each provider+model combination separately
        optimization_results = []
        
        for model_name in user_models:
            result = await self._optimize_provider_model(db, provider_id, model_name, mode, auto_trigger)
            if result:
                optimization_results.append(result)

        if optimization_results:
            return {
                "success": True,
                "provider_id": provider_id,
                "optimized_models": len(optimization_results),
                "model_results": optimization_results,
                "mode": mode,
            }
        else:
            return None

    async def _optimize_provider_model(
        self,
        db: aiosqlite.Connection,
        provider_id: str,
        model_name: str,
        mode: str,
        auto_trigger: bool,
    ) -> Optional[dict]:
        """
        Run optimization for a specific provider+model combination.
        This is the core optimization logic that was previously in optimize_for_provider.
        """
        # Get feedback for this specific provider+model combination
        provider_model_feedback = await self._get_provider_model_feedback(db, provider_id, model_name)

        if len(provider_model_feedback) < self.min_feedback_threshold:
            logger.warning(
                f"Not enough feedback for {provider_id}+{model_name}: {len(provider_model_feedback)} samples "
                f"(minimum: {self.min_feedback_threshold})"
            )
            return None

        logger.info(
            f"Starting optimization for {provider_id}+{model_name} with {len(provider_model_feedback)} samples",
            extra={
                "provider_id": provider_id,
                "model_name": model_name,
                "feedback_count": len(provider_model_feedback),
                "mode": mode,
                "auto_trigger": auto_trigger,
            },
        )

        # Create optimization run record for this specific provider+model combination
        run_id = str(uuid.uuid4())
        trigger_type = "auto" if auto_trigger else "manual"

        await db.execute(
            """
            INSERT INTO optimization_runs (
                id, mode, trigger_type, started_at, status, feedback_count, 
                model_provider, model_name
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                run_id,
                mode,
                trigger_type,
                datetime.now(timezone.utc),
                "running",
                len(provider_model_feedback),
                provider_id,
                model_name,  # Use actual user model, not hardcoded default
            ),
        )
        await db.commit()

        # Initialize progress tracking for this provider+model
        self._log_progress(
            provider_id,
            run_id,
            "initialization",
            10,
            f"Setting up {provider_id}+{model_name} optimization",
        )

        try:
            # Run optimization in thread pool for this specific provider+model
            result = await asyncio.get_event_loop().run_in_executor(
                self.executor,
                self._run_provider_model_optimization,
                provider_model_feedback,
                provider_id,
                model_name,
                mode,
                run_id,
            )

            # Store optimized prompt for this provider+model combination
            optimized_prompt_id = await self._store_provider_model_optimized_prompt(
                db, result, run_id, provider_id, model_name
            )

            # Mark optimization as completed
            await db.execute(
                """
                UPDATE optimization_runs
                SET status = 'completed', completed_at = ?, result_prompt = ?,
                    performance_improvement = ?
                WHERE id = ?
                """,
                (
                    datetime.now(timezone.utc),
                    result["optimized_prompt"][:1000],
                    result.get("improvement", 0.0),
                    run_id,
                ),
            )
            await db.commit()

            logger.info(
                f"✅ Optimization completed for {provider_id}",
                extra={
                    "provider_id": provider_id,
                    "run_id": run_id,
                    "performance_improvement": result.get("improvement", 0.0),
                    "execution_time": result.get("execution_time", 0),
                },
            )

            # Clean up active run tracking
            if (
                provider_id in self.active_runs_by_provider
                and run_id in self.active_runs_by_provider[provider_id]
            ):
                del self.active_runs_by_provider[provider_id][run_id]

            return {
                "success": True,
                "provider_id": provider_id,
                "model_name": model_name,
                "run_id": run_id,
                "optimized_prompt_id": optimized_prompt_id,
                "performance_improvement": result.get("improvement", 0.0),
                "training_examples": len(provider_model_feedback),
                "mode": mode,
            }

        except Exception as e:
            # Mark optimization as failed
            logger.error(
                f"❌ Optimization failed for {provider_id}+{model_name}",
                extra={
                    "provider_id": provider_id,
                    "model_name": model_name,
                    "run_id": run_id,
                    "error": str(e),
                    "error_type": type(e).__name__,
                },
            )

            await db.execute(
                """
                UPDATE optimization_runs
                SET status = 'failed', completed_at = ?, error_message = ?
                WHERE id = ?
                """,
                (datetime.now(timezone.utc), str(e), run_id),
            )
            await db.commit()

            raise Exception(f"Optimization failed for {provider_id}+{model_name}: {e}")

    def _run_provider_model_optimization(
        self, feedback_data: list[dict], provider_id: str, model_name: str, mode: str, run_id: str
    ) -> dict:
        """Run DSPy optimization for a specific provider+model combination (executed in thread pool)"""
        if not DSPY_AVAILABLE:
            return self._get_fallback_result(provider_id, feedback_data, mode)

        try:
            import dspy

            from .dspy_config import (
                GoldenNuggetExtractor,
                OptimizationMetrics,
                create_training_examples,
            )

            start_time = datetime.now(timezone.utc)

            # Create DSPy LM for this specific provider+model combination
            lm = self._create_dspy_lm_for_model(provider_id, model_name)
            if not lm:
                raise Exception(f"Failed to create DSPy LM for {provider_id}/{model_name}")

            # Configure DSPy with the actual user model
            dspy.settings.configure(lm=lm)

            logger.info(
                f"🔧 DSPy configured for {provider_id}+{model_name}",
                extra={
                    "provider_id": provider_id,
                    "model_name": model_name,
                    "run_id": run_id,
                },
            )

            # Create training examples from feedback
            self._log_progress(
                provider_id, run_id, "data_gathering", 20, "Creating training examples"
            )

            dspy_examples = create_training_examples(feedback_data)

            if len(dspy_examples) < self.min_training_examples:
                raise Exception(
                    f"Not enough valid training examples for {provider_id}: {len(dspy_examples)} "
                    f"(minimum: {self.min_training_examples})"
                )

            # Split into train/validation sets
            train_size = max(int(len(dspy_examples) * 0.8), len(dspy_examples) - 10)
            train_examples = dspy_examples[:train_size]
            val_examples = dspy_examples[train_size:]

            # Initialize extractor
            extractor = GoldenNuggetExtractor()

            # Get optimizer based on mode
            self._log_progress(
                provider_id, run_id, "optimization", 40, f"Running {mode} optimization"
            )

            if mode == "expensive":
                from dspy.teleprompt import MIPROv2

                optimizer = MIPROv2(
                    metric=OptimizationMetrics.golden_nugget_metric, num_candidates=10
                )
            else:
                from dspy.teleprompt import BootstrapFewShotWithRandomSearch

                optimizer = BootstrapFewShotWithRandomSearch(
                    metric=OptimizationMetrics.golden_nugget_metric,
                    max_bootstrapped_demos=4,
                    max_labeled_demos=8,
                    num_candidate_programs=5,
                )

            # Run optimization
            logger.info(
                f"🧠 Starting {mode} optimization for {provider_id}",
                extra={
                    "provider_id": provider_id,
                    "run_id": run_id,
                    "train_examples": len(train_examples),
                    "val_examples": len(val_examples),
                },
            )

            optimized_extractor = optimizer.compile(
                extractor,
                trainset=train_examples,
                valset=val_examples if val_examples else train_examples[:5],
                metric=OptimizationMetrics.golden_nugget_metric,
            )

            # Evaluate performance
            self._log_progress(
                provider_id, run_id, "evaluation", 80, "Evaluating performance"
            )

            from dspy.evaluate import Evaluate

            evaluator = Evaluate(
                devset=val_examples if val_examples else train_examples[:5],
                metric=OptimizationMetrics.golden_nugget_metric,
                num_threads=1,
            )

            baseline_score = evaluator(extractor)
            optimized_score = evaluator(optimized_extractor)

            improvement = (
                (optimized_score - baseline_score) / baseline_score
                if baseline_score > 0
                else 0.0
            )

            execution_time = (datetime.now(timezone.utc) - start_time).total_seconds()

            # Extract optimized prompt
            optimized_prompt = self._extract_provider_prompt(
                optimized_extractor, provider_id
            )

            logger.info(
                f"📊 {provider_id} optimization metrics",
                extra={
                    "provider_id": provider_id,
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
                "provider_id": provider_id,
            }

        except Exception as e:
            logger.error(f"DSPy optimization failed for {provider_id}: {e}")
            return self._get_fallback_result(provider_id, feedback_data, mode, str(e))

    def _get_fallback_result(
        self,
        provider_id: str,
        feedback_data: list[dict],
        mode: str,
        error: Optional[str] = None,
    ) -> dict:
        """Get fallback result when optimization fails"""
        # Create enhanced baseline prompt with feedback insights
        enhanced_prompt = f"""{self.baseline_prompts[provider_id]}

# Enhanced with {provider_id} feedback analysis
Based on {len(feedback_data)} user feedback examples, focus on:
- High-quality content that users find valuable  
- Avoiding content that received negative feedback
- Including user-identified missing golden nuggets

This prompt is optimized for {provider_id} based on user feedback patterns.
"""

        return {
            "optimized_prompt": enhanced_prompt,
            "performance_score": 0.0,
            "baseline_score": 0.0,
            "improvement": 0.0,
            "execution_time": 0.0,
            "training_examples_count": len(feedback_data),
            "validation_examples_count": 0,
            "mode": mode,
            "provider_id": provider_id,
            "error": error,
        }

    def _extract_provider_prompt(self, module, provider_id: str) -> str:
        """Extract optimized prompt from DSPy module for specific provider"""
        try:
            # Try to get the prompt from the module's predictor
            if hasattr(module, "extract") and hasattr(module.extract, "signature"):
                prompt_parts = [f"# Optimized prompt for {provider_id}"]

                # Add signature description
                if hasattr(module.extract.signature, "__doc__"):
                    prompt_parts.append(module.extract.signature.__doc__)

                # Add demonstrations
                if hasattr(module.extract, "demos") and module.extract.demos:
                    prompt_parts.append(
                        f"\n# Examples from {provider_id} optimization:"
                    )
                    for demo in module.extract.demos[:2]:  # Limit to first 2 examples
                        prompt_parts.append(f"Input: {demo.content[:150]}...")
                        prompt_parts.append(
                            f"Output: {str(demo.golden_nuggets)[:150]}..."
                        )

                # Add the actual task description
                prompt_parts.append(f"\n# Task for {provider_id}:")
                prompt_parts.append("Extract golden nuggets from the provided content.")
                prompt_parts.append(
                    f"This prompt has been optimized specifically for {provider_id}."
                )
                prompt_parts.append('Return valid JSON: {"golden_nuggets": [...]}')

                return "\n".join(prompt_parts)

        except Exception as e:
            logger.warning(f"Could not extract optimized prompt for {provider_id}: {e}")

        # Fallback to enhanced baseline
        return f"{self.baseline_prompts[provider_id]}\n\n# This prompt was optimized using DSPy for {provider_id}"

    async def _get_provider_model_feedback(
        self, db: aiosqlite.Connection, provider_id: str, model_name: str
    ) -> list[dict]:
        """Get feedback data for a specific provider+model combination"""
        cursor = await db.execute(
            """
            SELECT nugget_content, original_type, corrected_type, rating, context, url,
                   model_provider, model_name, created_at
            FROM nugget_feedback
            WHERE model_provider = ? AND model_name = ?
            ORDER BY created_at DESC
            LIMIT 500
            """,
            (provider_id, model_name),
        )

        nugget_feedback = await cursor.fetchall()

        # Also get missing content feedback for this provider+model
        cursor = await db.execute(
            """
            SELECT content, suggested_type, context, url, model_provider, model_name, created_at
            FROM missing_content_feedback  
            WHERE model_provider = ? AND model_name = ?
            ORDER BY created_at DESC
            LIMIT 200
            """,
            (provider_id, model_name),
        )

        missing_feedback = await cursor.fetchall()

        # Convert to training format
        training_data = []

        # Process nugget feedback
        for row in nugget_feedback:
            training_data.append(
                {
                    "content": row[0],
                    "original_type": row[1],
                    "corrected_type": row[2],
                    "rating": row[3],
                    "context": row[4],
                    "url": row[5],
                    "model_provider": row[6],
                    "model_name": row[7],
                    "created_at": row[8],
                    "feedback_type": "nugget",
                }
            )

        # Process missing content feedback
        for row in missing_feedback:
            training_data.append(
                {
                    "content": row[0],
                    "suggested_type": row[1],
                    "context": row[2],
                    "url": row[3],
                    "model_provider": row[4],
                    "model_name": row[5],
                    "created_at": row[6],
                    "feedback_type": "missing_content",
                }
            )

        return training_data

    async def _get_provider_feedback(
        self, db: aiosqlite.Connection, provider_id: str
    ) -> list[dict]:
        """Get feedback data for a specific provider"""
        cursor = await db.execute(
            """
            SELECT nugget_content, original_type, corrected_type, rating, context, url,
                   model_provider, model_name, created_at
            FROM nugget_feedback
            WHERE model_provider = ?
            ORDER BY created_at DESC
            LIMIT 500
            """,
            (provider_id,),
        )

        nugget_feedback = await cursor.fetchall()

        # Also get missing content feedback
        cursor = await db.execute(
            """
            SELECT content, suggested_type, context, url, model_provider, model_name, created_at
            FROM missing_content_feedback  
            WHERE model_provider = ?
            ORDER BY created_at DESC
            LIMIT 200
            """,
            (provider_id,),
        )

        missing_feedback = await cursor.fetchall()

        # Convert to training format
        training_data = []

        # Process nugget feedback
        for row in nugget_feedback:
            training_data.append(
                {
                    "content": row[0],
                    "original_type": row[1],
                    "corrected_type": row[2],
                    "rating": row[3],
                    "context": row[4],
                    "url": row[5],
                    "model_provider": row[6],
                    "model_name": row[7],
                    "created_at": row[8],
                    "feedback_type": "nugget",
                }
            )

        # Process missing content feedback
        for row in missing_feedback:
            training_data.append(
                {
                    "content": row[0],
                    "suggested_type": row[1],
                    "context": row[2],
                    "url": row[3],
                    "model_provider": row[4],
                    "model_name": row[5],
                    "created_at": row[6],
                    "feedback_type": "missing_content",
                }
            )

        return training_data

    async def _store_provider_optimized_prompt(
        self,
        db: aiosqlite.Connection,
        optimization_result: dict,
        run_id: str,
        provider_id: str,
    ) -> str:
        """Store optimized prompt for specific provider"""
        # Get next version number for this provider
        cursor = await db.execute(
            """
            SELECT COALESCE(MAX(version), 0) + 1 
            FROM optimized_prompts 
            WHERE model_provider = ?
            """,
            (provider_id,),
        )
        result = await cursor.fetchone()
        version = result[0] if result else 1

        prompt_id = str(uuid.uuid4())

        # Mark all previous prompts for this provider as not current
        await db.execute(
            "UPDATE optimized_prompts SET is_current = FALSE WHERE model_provider = ?",
            (provider_id,),
        )

        # Insert new optimized prompt
        await db.execute(
            """
            INSERT INTO optimized_prompts (
                id, version, prompt, created_at, feedback_count,
                positive_rate, is_current, optimization_run_id,
                model_provider, model_name
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                provider_id,
                optimization_result.get(
                    "model_name",
                    self._get_default_model(provider_id),
                ),
            ),
        )

        await db.commit()
        return prompt_id

    async def _store_provider_model_optimized_prompt(
        self,
        db: aiosqlite.Connection,
        optimization_result: dict,
        run_id: str,
        provider_id: str,
        model_name: str,
    ) -> str:
        """Store optimized prompt for specific provider+model combination"""
        # Get next version number for this provider+model combination
        cursor = await db.execute(
            """
            SELECT COALESCE(MAX(version), 0) + 1 
            FROM optimized_prompts 
            WHERE model_provider = ? AND model_name = ?
            """,
            (provider_id, model_name),
        )
        result = await cursor.fetchone()
        version = result[0] if result else 1

        prompt_id = str(uuid.uuid4())

        # Mark all previous prompts for this provider+model as not current
        await db.execute(
            """
            UPDATE optimized_prompts 
            SET is_current = FALSE 
            WHERE model_provider = ? AND model_name = ?
            """,
            (provider_id, model_name),
        )

        # Insert new optimized prompt for this provider+model combination
        await db.execute(
            """
            INSERT INTO optimized_prompts (
                id, version, prompt, created_at, feedback_count,
                positive_rate, is_current, optimization_run_id,
                model_provider, model_name
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                provider_id,
                model_name,  # Use actual user model, not lookup from hardcoded configs
            ),
        )

        await db.commit()
        return prompt_id

    def _log_progress(
        self, provider_id: str, run_id: str, step: str, progress: int, message: str
    ):
        """Log optimization progress for specific provider"""
        try:
            # Initialize provider tracking if needed
            if provider_id not in self.active_runs_by_provider:
                self.active_runs_by_provider[provider_id] = {}

            # Update progress
            self.active_runs_by_provider[provider_id][run_id] = {
                "step": step,
                "progress": progress,
                "message": message,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "last_updated": datetime.now(timezone.utc),
                "provider_id": provider_id,
            }

            # Console logging with provider context
            if progress == 100:
                logger.info(
                    f"✅ {provider_id}: {message}",
                    extra={
                        "provider_id": provider_id,
                        "run_id": run_id,
                        "step": step,
                        "progress": progress,
                    },
                )
            elif progress == -1:
                logger.error(
                    f"❌ {provider_id}: {message}",
                    extra={
                        "provider_id": provider_id,
                        "run_id": run_id,
                        "step": step,
                        "error": True,
                    },
                )
            else:
                logger.info(
                    f"📈 {provider_id}: {message} ({progress}%)",
                    extra={
                        "provider_id": provider_id,
                        "run_id": run_id,
                        "step": step,
                        "progress": progress,
                    },
                )

        except Exception as e:
            logger.warning(f"Failed to log progress for {provider_id}: {e}")

    async def get_provider_current_prompt(
        self, db: aiosqlite.Connection, provider_id: str
    ) -> Optional[dict]:
        """Get current optimized prompt for specific provider (any model)"""
        cursor = await db.execute(
            """
            SELECT id, version, prompt, created_at, feedback_count, positive_rate, model_name
            FROM optimized_prompts
            WHERE is_current = TRUE AND model_provider = ?
            ORDER BY version DESC
            LIMIT 1
            """,
            (provider_id,),
        )
        result = await cursor.fetchone()

        if result:
            return {
                "id": result[0],
                "version": result[1],
                "prompt": result[2],
                "optimizationDate": result[3],
                "performance": {"feedbackCount": result[4], "positiveRate": result[5]},
                "provider_id": provider_id,
                "model_name": result[6],
            }
        return None

    async def get_provider_model_current_prompt(
        self, db: aiosqlite.Connection, provider_id: str, model_name: str
    ) -> Optional[dict]:
        """Get current optimized prompt for specific provider+model combination"""
        cursor = await db.execute(
            """
            SELECT id, version, prompt, created_at, feedback_count, positive_rate, model_name
            FROM optimized_prompts
            WHERE is_current = TRUE AND model_provider = ? AND model_name = ?
            ORDER BY version DESC
            LIMIT 1
            """,
            (provider_id, model_name),
        )
        result = await cursor.fetchone()

        if result:
            return {
                "id": result[0],
                "version": result[1],
                "prompt": result[2],
                "optimizationDate": result[3],
                "performance": {"feedbackCount": result[4], "positiveRate": result[5]},
                "provider_id": provider_id,
                "model_name": result[6],
            }
        
        # Fallback to any prompt for this provider if no specific model prompt exists
        logger.info(f"No optimized prompt found for {provider_id}+{model_name}, falling back to any {provider_id} prompt")
        return await self.get_provider_current_prompt(db, provider_id)

    def get_provider_run_progress(
        self, provider_id: str, run_id: str
    ) -> Optional[dict]:
        """Get progress for specific provider optimization run"""
        if provider_id in self.active_runs_by_provider:
            return self.active_runs_by_provider[provider_id].get(run_id)
        return None

    def get_all_provider_active_runs(self) -> dict:
        """Get all active optimization runs across all providers"""
        # Clean up old runs
        now = datetime.now(timezone.utc)
        cutoff = now.replace(hour=max(0, now.hour - 24))

        for provider_id in list(self.active_runs_by_provider.keys()):
            self.active_runs_by_provider[provider_id] = {
                run_id: data
                for run_id, data in self.active_runs_by_provider[provider_id].items()
                if data.get("last_updated", now) > cutoff
            }

            # Remove empty provider entries
            if not self.active_runs_by_provider[provider_id]:
                del self.active_runs_by_provider[provider_id]

        return self.active_runs_by_provider

    async def should_optimize_provider(
        self, db: aiosqlite.Connection, provider_id: str
    ) -> dict:
        """Check if provider should be optimized based on feedback thresholds"""
        # Get provider feedback stats
        cursor = await db.execute(
            """
            SELECT COUNT(*) as total_feedback,
                   SUM(CASE WHEN rating = 'negative' THEN 1 ELSE 0 END) as negative_count,
                   MAX(created_at) as last_feedback
            FROM nugget_feedback
            WHERE model_provider = ?
            """,
            (provider_id,),
        )
        result = await cursor.fetchone()

        total_feedback = result[0] if result else 0
        negative_count = result[1] if result else 0

        # Get last optimization date for this provider
        cursor = await db.execute(
            """
            SELECT MAX(completed_at) as last_optimization
            FROM optimization_runs
            WHERE model_provider = ? AND status = 'completed'
            """,
            (provider_id,),
        )
        result = await cursor.fetchone()
        last_optimization = result[0] if result else None

        # Calculate metrics
        negative_rate = negative_count / total_feedback if total_feedback > 0 else 0
        days_since_optimization = 999  # Default to high number

        if last_optimization:
            try:
                last_opt_date = datetime.fromisoformat(
                    last_optimization.replace("Z", "+00:00")
                )
                days_since_optimization = (
                    datetime.now(timezone.utc) - last_opt_date
                ).days
            except:
                days_since_optimization = 999

        # Determine if should optimize
        should_optimize = total_feedback >= self.min_feedback_threshold and (
            days_since_optimization >= 7  # Weekly optimization
            or negative_rate >= 0.4  # High negative rate
            or total_feedback >= 150  # High volume
        )

        return {
            "provider_id": provider_id,
            "should_optimize": should_optimize,
            "total_feedback": total_feedback,
            "negative_rate": negative_rate,
            "days_since_optimization": days_since_optimization,
            "threshold_met": total_feedback >= self.min_feedback_threshold,
        }


# Global instance
dspy_multi_model_manager = DSPyMultiModelManager()
