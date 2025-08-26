"""
Integration tests for Chrome extension prompt optimization.

Tests that the sophisticated Chrome extension DEFAULT_PROMPTS are properly
optimized while preserving their sophisticated engineering features like:
- Diamond Miner Principle
- Anti-patterns and heuristics
- Quality control mechanisms
- Precision over recall philosophy
"""

import json
import logging
from unittest.mock import AsyncMock, patch

import pytest

from app.services.optimization_service import OptimizationService


class TestChromeExtensionPromptOptimization:
    """Test Chrome extension prompt optimization end-to-end"""

    @pytest.fixture
    async def optimization_service(self):
        """Create optimization service for testing"""
        return OptimizationService()

    @pytest.fixture
    async def mock_db_with_feedback(self, tmp_path):
        """Create mock database with Chrome extension feedback data"""
        tmp_path / "test.db"

        # Create mock database connection
        mock_db = AsyncMock()

        # Mock cursor results for feedback data
        mock_cursor = AsyncMock()
        mock_cursor.fetchall.return_value = [
            # Mock feedback data that would come from Chrome extension
            (
                "feedback_1",
                json.dumps(
                    {
                        "content": "This article discusses various productivity tools and techniques for developers.",
                        "analysis": {
                            "golden_nuggets": [
                                {
                                    "type": "tool",
                                    "content": "I use Obsidian's daily notes feature to track my learning progress and connect new concepts to previous knowledge, which helps with retention in a way traditional todo apps don't.",
                                    "startContent": "I use Obsidian's daily notes feature",
                                    "endContent": "traditional todo apps don't",
                                }
                            ]
                        },
                    }
                ),
                5,  # rating
                "2024-01-01T00:00:00Z",
            ),
            (
                "feedback_2",
                json.dumps(
                    {
                        "content": "Generic article about using calendars and basic productivity tips.",
                        "analysis": {"golden_nuggets": []},
                    }
                ),
                1,  # rating (low - no quality nuggets found)
                "2024-01-02T00:00:00Z",
            ),
            (
                "feedback_3",
                json.dumps(
                    {
                        "content": "Deep technical explanation of async programming concepts.",
                        "analysis": {
                            "golden_nuggets": [
                                {
                                    "type": "aha! moments",
                                    "content": "The reason async/await in JavaScript is so powerful is that it's syntactic sugar over Promises, allowing you to write asynchronous code that reads like synchronous code, avoiding 'callback hell'.",
                                    "startContent": "The reason async/await in JavaScript",
                                    "endContent": "avoiding 'callback hell'",
                                }
                            ]
                        },
                    }
                ),
                5,  # rating
                "2024-01-03T00:00:00Z",
            ),
        ]

        mock_db.execute.return_value = mock_cursor
        mock_db.commit = AsyncMock()

        return mock_db

    @pytest.fixture
    def chrome_extension_default_prompt(self):
        """The actual sophisticated prompt from Chrome extension DEFAULT_PROMPTS"""
        return """## ROLE & GOAL:
You are an extremely discerning AI information filter. Your goal is to analyze the provided {{ source }} and extract only the most insightful, non-obvious, and high-signal content for someone with this persona: {{ persona }}. Your primary directive is **precision over recall**. It is vastly preferable to return zero nuggets than to include a single mediocre one.

**Crucially, do not force or invent extractions. If no content meets the strict criteria below, the `golden_nuggets` array MUST be empty ([]).**


## EXTRACTION FOCUS:
Extract only the raw, high-quality content without explanations. Focus purely on identifying and preserving the most valuable insights in their original form. The content itself should be so obviously valuable that no additional context is needed.

## CRITICAL HEURISTICS & ANTI-PATTERNS (APPLY BEFORE ALL OTHER RULES):

1.  **The Diamond Miner Principle (Your Core Heuristic):** Think of yourself as a diamond miner sifting through tons of rock. Your job is to find the rare, flawless diamonds, not just interesting-looking rocks. **Most of the time, you will find nothing. This is the correct outcome.** Do not lower your standards to find something.

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
    *   **Good:** "I apply the 'Inversion' mental model by asking 'What would guarantee failure?' before starting a new project. This helps me identify and mitigate risks proactively instead of just planning for success." """

    def test_chrome_extension_prompt_characteristics(
        self, optimization_service, chrome_extension_default_prompt
    ):
        """Test that the Chrome extension prompt has sophisticated engineering characteristics"""
        prompt = optimization_service.chrome_extension_default_prompt

        # Verify sophisticated engineering features
        assert "Diamond Miner Principle" in prompt
        assert "Anti-Pattern" in prompt
        assert "QUALITY CONTROL" in prompt
        assert "precision over recall" in prompt
        assert "ROLE & GOAL" in prompt
        assert "EXTRACTION TARGETS" in prompt

        # Verify examples structure
        assert "**Bad:**" in prompt and "**Good:**" in prompt

        # Verify it's not the simple baseline
        assert "Diamond Miner Principle" not in optimization_service.baseline_prompt
        assert len(prompt) > len(optimization_service.baseline_prompt) * 3

    @pytest.mark.asyncio
    async def test_optimization_uses_chrome_extension_prompt(
        self, optimization_service, mock_db_with_feedback, caplog
    ):
        """Test that optimization actually uses the sophisticated Chrome extension prompt, not baseline"""

        with patch.object(optimization_service, "_run_dspy_optimization") as mock_dspy:
            # Mock successful DSPy optimization
            mock_dspy.return_value = {
                "optimized_prompt": "OPTIMIZED: "
                + optimization_service.chrome_extension_default_prompt,
                "performance_score": 0.85,
                "baseline_score": 0.70,
                "improvement": 0.15,
                "execution_time": 120.0,
                "training_examples_count": 3,
                "validation_examples_count": 1,
                "mode": "cheap",
            }

            with caplog.at_level(logging.INFO):
                result = await optimization_service.run_optimization(
                    mock_db_with_feedback, mode="cheap", auto_trigger=False
                )

            # Verify optimization completed successfully
            assert result["success"] is True
            assert "optimized_prompt_id" in result

            # Verify logs show Chrome extension prompt is being used
            log_messages = caplog.text
            assert (
                "Chrome extension prompt" in log_messages
                or "sophisticated" in log_messages
            )
            assert (
                "optimizing_chrome_prompt" in log_messages
                or "chrome_extension_sophisticated" in log_messages
            )

    @pytest.mark.asyncio
    async def test_prompt_quality_validation(
        self, optimization_service, mock_db_with_feedback
    ):
        """Test that optimized prompts are validated for quality preservation"""

        # Mock DSPy optimization that removes sophisticated features
        with patch.object(optimization_service, "_run_dspy_optimization") as mock_dspy:
            # Simulate DSPy returning a simplified prompt (quality loss)
            mock_dspy.return_value = {
                "optimized_prompt": "You are helpful. Extract insights from content. Return JSON.",
                "performance_score": 0.85,
                "baseline_score": 0.70,
                "improvement": 0.15,
                "execution_time": 120.0,
                "training_examples_count": 3,
                "validation_examples_count": 1,
                "mode": "cheap",
            }

            # Test the quality validation method directly
            original = optimization_service.chrome_extension_default_prompt
            simplified = "You are helpful. Extract insights from content. Return JSON."

            validation = optimization_service._validate_optimized_prompt_quality(
                original, simplified, "test_run"
            )

            # Should detect quality loss
            assert validation["quality_preserved"] is False
            assert not validation["details"]["preserved_diamond_miner_principle"]
            assert not validation["details"]["preserved_anti_patterns"]
            assert not validation["details"]["preserved_quality_control"]

    @pytest.mark.asyncio
    async def test_fallback_preserves_sophistication(
        self, optimization_service, mock_db_with_feedback
    ):
        """Test that when DSPy fails, fallback still preserves sophisticated engineering"""

        # Mock DSPy optimization failure
        with patch.object(optimization_service, "_run_dspy_optimization") as mock_dspy:
            mock_dspy.side_effect = Exception("DSPy optimization failed")

            result = await optimization_service.run_optimization(
                mock_db_with_feedback, mode="cheap", auto_trigger=False
            )

            # Should fail but gracefully
            assert "Optimization failed" in str(result).lower()

        # Test the fallback prompt generation directly
        with patch.object(optimization_service, "_run_dspy_optimization") as mock_dspy:
            mock_dspy.side_effect = Exception("DSPy failed")

            # This should return enhanced Chrome extension prompt, not baseline
            result = optimization_service._run_dspy_optimization(
                [], "cheap", "test_run"
            )

            enhanced_prompt = result["optimized_prompt"]

            # Verify it's based on Chrome extension prompt, not baseline
            assert "Diamond Miner Principle" in enhanced_prompt
            assert "Anti-Pattern" in enhanced_prompt
            assert "QUALITY CONTROL" in enhanced_prompt
            assert "Enhanced with feedback analysis" in enhanced_prompt

    @pytest.mark.asyncio
    async def test_provider_specific_optimization_chrome_prompts(
        self, optimization_service, mock_db_with_feedback
    ):
        """Test that provider-specific optimization works with Chrome extension prompts"""

        providers = ["gemini", "openai", "anthropic", "openrouter"]

        for provider_id in providers:
            with patch.object(
                optimization_service.multi_model_manager, "optimize_for_provider"
            ) as mock_optimize:
                mock_optimize.return_value = {
                    "success": True,
                    "run_id": f"test_run_{provider_id}",
                    "optimized_prompt_id": f"prompt_{provider_id}",
                    "performance_improvement": 0.15,
                    "training_examples": 3,
                    "mode": "cheap",
                    "provider_id": provider_id,
                }

                result = await optimization_service.run_provider_optimization(
                    mock_db_with_feedback, provider_id=provider_id, mode="cheap"
                )

                # Verify provider-specific optimization was called
                assert result["success"] is True
                assert result["provider_id"] == provider_id
                mock_optimize.assert_called_once_with(
                    mock_db_with_feedback, provider_id, "cheap", False
                )

    def test_prompt_analysis_logging(self, optimization_service):
        """Test that prompt analysis correctly identifies sophisticated engineering features"""

        prompt = optimization_service.chrome_extension_default_prompt
        analysis = optimization_service._log_prompt_analysis(prompt, "test_run")

        # Verify all sophisticated features are detected
        assert analysis["has_diamond_miner_principle"] is True
        assert analysis["has_anti_patterns"] is True
        assert analysis["has_quality_control"] is True
        assert analysis["has_extraction_targets"] is True
        assert analysis["has_role_and_goal"] is True
        assert analysis["mentions_precision_over_recall"] is True
        assert analysis["uses_examples"] is True
        assert analysis["sophisticated_engineering"] is True
        assert analysis["length_chars"] > 1000  # Substantial prompt

    @pytest.mark.asyncio
    async def test_multiple_chrome_prompts_optimization(
        self, optimization_service, mock_db_with_feedback
    ):
        """Test that multiple Chrome extension prompts can be optimized independently"""

        # Mock multiple optimization runs
        run_ids = []

        for i in range(3):
            with patch.object(
                optimization_service, "_run_dspy_optimization"
            ) as mock_dspy:
                mock_dspy.return_value = {
                    "optimized_prompt": f"OPTIMIZED_{i}: "
                    + optimization_service.chrome_extension_default_prompt,
                    "performance_score": 0.85 + i * 0.02,
                    "baseline_score": 0.70,
                    "improvement": 0.15 + i * 0.02,
                    "execution_time": 120.0,
                    "training_examples_count": 3,
                    "validation_examples_count": 1,
                    "mode": "cheap",
                }

                result = await optimization_service.run_optimization(
                    mock_db_with_feedback, mode="cheap", auto_trigger=False
                )

                assert result["success"] is True
                run_ids.append(result["run_id"])

        # Verify all runs have unique IDs
        assert len(set(run_ids)) == 3

    @pytest.mark.asyncio
    async def test_backward_compatibility_with_existing_feedback(
        self, optimization_service
    ):
        """Test that optimization works with existing stored feedback data"""

        # Mock database with existing feedback in different formats
        mock_db = AsyncMock()
        mock_cursor = AsyncMock()

        # Mix of old and new feedback formats
        mock_cursor.fetchall.return_value = [
            # Old format feedback
            (
                "old_feedback_1",
                json.dumps({"content": "Basic content", "rating": 3}),
                3,
                "2023-12-01T00:00:00Z",
            ),
            # New format feedback with Chrome extension structure
            (
                "new_feedback_1",
                json.dumps(
                    {
                        "content": "Rich content with insights",
                        "analysis": {
                            "golden_nuggets": [
                                {
                                    "type": "tool",
                                    "content": "Specific valuable technique",
                                    "startContent": "Specific",
                                    "endContent": "technique",
                                }
                            ]
                        },
                    }
                ),
                5,
                "2024-01-01T00:00:00Z",
            ),
        ]

        mock_db.execute.return_value = mock_cursor
        mock_db.commit = AsyncMock()

        # Should handle mixed feedback gracefully
        with patch.object(optimization_service, "_run_dspy_optimization") as mock_dspy:
            mock_dspy.return_value = {
                "optimized_prompt": optimization_service.chrome_extension_default_prompt
                + " # Optimized",
                "performance_score": 0.85,
                "baseline_score": 0.70,
                "improvement": 0.15,
                "execution_time": 120.0,
                "training_examples_count": 2,
                "validation_examples_count": 1,
                "mode": "cheap",
            }

            result = await optimization_service.run_optimization(
                mock_db, mode="cheap", auto_trigger=False
            )

            assert result["success"] is True

    def test_chrome_extension_vs_baseline_prompt_differences(
        self, optimization_service
    ):
        """Verify Chrome extension prompt is significantly different from baseline"""

        chrome_prompt = optimization_service.chrome_extension_default_prompt
        baseline_prompt = optimization_service.baseline_prompt

        # Length difference
        assert len(chrome_prompt) > len(baseline_prompt) * 2

        # Content differences
        chrome_features = [
            "Diamond Miner Principle",
            "Anti-Pattern",
            "QUALITY CONTROL",
            "precision over recall",
            "ROLE & GOAL",
            "The Final Sanity Check",
        ]

        for feature in chrome_features:
            assert feature in chrome_prompt
            assert feature not in baseline_prompt

        # Verify baseline is truly basic
        assert "Diamond Miner Principle" not in baseline_prompt
        assert len(baseline_prompt.split("\n")) < len(chrome_prompt.split("\n")) / 2

    @pytest.mark.asyncio
    async def test_optimization_preserves_diamond_miner_principle(
        self, optimization_service, mock_db_with_feedback
    ):
        """Specifically test that the Diamond Miner Principle is preserved through optimization"""

        with patch.object(optimization_service, "_run_dspy_optimization") as mock_dspy:
            # Mock an optimization that should preserve the principle
            optimized_with_principle = (
                optimization_service.chrome_extension_default_prompt
                + """

# DSPy Optimized Version
Enhanced to focus on the Diamond Miner Principle: finding rare, flawless insights while most of the time finding nothing.
"""
            )

            mock_dspy.return_value = {
                "optimized_prompt": optimized_with_principle,
                "performance_score": 0.90,
                "baseline_score": 0.75,
                "improvement": 0.20,
                "execution_time": 150.0,
                "training_examples_count": 5,
                "validation_examples_count": 2,
                "mode": "cheap",
            }

            result = await optimization_service.run_optimization(
                mock_db_with_feedback, mode="cheap", auto_trigger=False
            )

            assert result["success"] is True

            # Verify Diamond Miner Principle preservation via quality validation
            validation = optimization_service._validate_optimized_prompt_quality(
                optimization_service.chrome_extension_default_prompt,
                optimized_with_principle,
                "test_run",
            )

            assert validation["quality_preserved"] is True
            assert validation["details"]["preserved_diamond_miner_principle"] is True
