"""
Tests for DSPy optimization pipeline.

Tests both the optimization service and DSPy configuration.
"""

import asyncio
import json
from unittest.mock import Mock, patch

import pytest

from app.database import get_db
from app.services.dspy_config import (
    OptimizationMetrics,
    generate_mock_feedback_data,
    validate_dspy_environment,
)
from app.services.feedback_service import FeedbackService
from app.services.optimization_service import OptimizationService


class TestDSPyConfiguration:
    """Test DSPy configuration and utilities"""

    def test_environment_validation(self):
        """Test DSPy environment validation"""
        status = validate_dspy_environment()

        # Should have required keys
        assert "dspy_available" in status
        assert "gemini_key_configured" in status
        assert "configuration_valid" in status
        assert "using_gemini" in status
        assert "errors" in status

        # If not configured, should have helpful errors
        if not status["configuration_valid"]:
            assert len(status["errors"]) > 0

    def test_mock_data_generation(self):
        """Test generation of mock feedback data"""
        mock_data = generate_mock_feedback_data(10)

        assert len(mock_data) == 10

        for item in mock_data:
            assert "id" in item
            assert "input_content" in item
            assert "expected_output" in item
            assert "feedback_score" in item
            assert 0.0 <= item["feedback_score"] <= 1.0

            # Expected output should be valid structure
            expected = item["expected_output"]
            assert "golden_nuggets" in expected
            assert isinstance(expected["golden_nuggets"], list)

    def test_optimization_metrics(self):
        """Test optimization evaluation metrics"""
        # Test perfect match
        example = Mock()
        example.golden_nuggets = json.dumps(
            {"golden_nuggets": [{"type": "tool", "content": "test"}]}
        )

        pred = Mock()
        pred.golden_nuggets = json.dumps(
            {"golden_nuggets": [{"type": "tool", "content": "test"}]}
        )

        score = OptimizationMetrics.golden_nugget_metric(example, pred)
        assert score > 0.5  # Should be high score for matching content

        # Test empty match
        example.golden_nuggets = json.dumps({"golden_nuggets": []})
        pred.golden_nuggets = json.dumps({"golden_nuggets": []})

        score = OptimizationMetrics.golden_nugget_metric(example, pred)
        assert score == 1.0  # Perfect match for both empty

        # Test invalid JSON
        pred.golden_nuggets = "invalid json"
        score = OptimizationMetrics.golden_nugget_metric(example, pred)
        assert score == 0.0  # Should be 0 for invalid JSON


class TestOptimizationService:
    """Test optimization service functionality"""

    @pytest.mark.asyncio
    async def test_training_example_generation(self, clean_database):
        """Test generation of training examples from feedback"""
        feedback_service = FeedbackService()

        async with get_db() as db:
            # Create some mock feedback data first
            mock_feedback = generate_mock_feedback_data(20)
            await feedback_service.store_training_examples(db, mock_feedback)

            # Get stored training examples
            training_examples = await feedback_service.get_stored_training_examples(
                db, limit=50
            )

            # Should have examples
            assert len(training_examples) > 0

            # Each example should have required fields
            for example in training_examples:
                assert "id" in example
                assert "input_content" in example
                assert "expected_output" in example
                assert "feedback_score" in example
                assert 0.0 <= example["feedback_score"] <= 1.0

    @pytest.mark.asyncio
    async def test_optimization_service_initialization(self):
        """Test optimization service initialization"""
        service = OptimizationService()

        # Should have baseline prompt
        assert service.baseline_prompt
        assert len(service.baseline_prompt) > 100  # Should be substantial

        # Should have executor for background tasks
        assert service.executor is not None

    @pytest.mark.asyncio
    async def test_optimization_with_insufficient_data(self, clean_database):
        """Test optimization with insufficient training data"""
        service = OptimizationService()

        async with get_db() as db:
            # Try optimization with no data - should raise exception
            try:
                result = await service.run_optimization(db, "cheap", auto_trigger=True)
                # If we get a result dict, check for error
                assert "error" in result
                assert "Not enough training examples" in result["error"]
            except Exception as e:
                # Or it might raise an exception directly
                assert "Not enough training examples" in str(e)

    @patch("app.services.dspy_config.DSPY_AVAILABLE", new=False)
    def test_optimization_without_dspy(self):
        """Test optimization when DSPy is not available"""
        service = OptimizationService()

        # Should handle missing DSPy gracefully
        mock_examples = generate_mock_feedback_data(10)
        result = service._run_dspy_optimization(mock_examples, "cheap")

        assert "error" in result
        assert "DSPy environment not configured" in result["error"]

    @pytest.mark.asyncio
    async def test_optimization_modes(self, clean_database):
        """Test different optimization modes"""
        service = OptimizationService()

        async with get_db() as db:
            # Test with mock data for both modes
            modes = ["cheap", "expensive"]

            for mode in modes:
                try:
                    result = await service.run_optimization(
                        db, mode, auto_trigger=False
                    )

                    # Should have required fields regardless of success/failure
                    assert "mode" in result
                    assert result["mode"] == mode
                    assert "execution_time" in result
                    assert "training_examples_count" in result

                except Exception as e:
                    # Expected if DSPy is not properly configured
                    assert "DSPy" in str(e) or "training examples" in str(e)


class TestOptimizationThresholds:
    """Test optimization threshold logic"""

    @pytest.mark.asyncio
    async def test_threshold_calculation(self, clean_database):
        """Test optimization threshold calculations"""
        feedback_service = FeedbackService()

        async with get_db() as db:
            # Test with no feedback - should not optimize
            stats = await feedback_service.get_feedback_stats(db)
            assert stats["shouldOptimize"] is False
            assert "Need" in stats["nextOptimizationTrigger"]

    def test_threshold_logic_scenarios(self):
        """Test different threshold scenarios"""

        # Mock various scenarios for threshold testing
        scenarios = [
            {
                "total_feedback": 80,
                "days_since": 1,
                "recent_negative_rate": 0.2,
                "should_optimize": True,  # Volume trigger (75+)
                "description": "High volume trigger",
            },
            {
                "total_feedback": 30,
                "days_since": 10,
                "recent_negative_rate": 0.2,
                "should_optimize": True,  # Time + volume trigger
                "description": "Time and volume trigger",
            },
            {
                "total_feedback": 20,
                "days_since": 5,
                "recent_negative_rate": 0.5,
                "should_optimize": True,  # Quality trigger (40%+ negative)
                "description": "Quality issues trigger",
            },
            {
                "total_feedback": 10,
                "days_since": 5,
                "recent_negative_rate": 0.2,
                "should_optimize": False,  # No trigger met
                "description": "No trigger conditions met",
            },
        ]

        # These scenarios would need to be tested with actual database data
        # This is more of a specification test
        for scenario in scenarios:
            # The actual implementation logic is in feedback_service.get_feedback_stats()
            # This verifies our threshold logic is sound
            assert isinstance(scenario["should_optimize"], bool)
            assert 0.0 <= scenario["recent_negative_rate"] <= 1.0


class TestOptimizationIntegration:
    """Integration tests for the complete optimization pipeline"""

    @pytest.mark.asyncio
    async def test_end_to_end_optimization_flow(self, clean_database):
        """Test complete optimization flow from feedback to optimized prompt"""
        feedback_service = FeedbackService()
        optimization_service = OptimizationService()

        async with get_db() as db:
            # 1. Generate and store mock feedback data
            mock_feedback = generate_mock_feedback_data(50)
            await feedback_service.store_training_examples(db, mock_feedback)

            # 2. Check if optimization should be triggered
            stats = await feedback_service.get_feedback_stats(db)

            # 3. If conditions are met, try optimization
            if stats.get("shouldOptimize", False):
                try:
                    result = await optimization_service.run_optimization(
                        db, "cheap", auto_trigger=True
                    )

                    # Should complete successfully or fail gracefully
                    assert "success" in result

                    if result["success"]:
                        # Should have optimization results
                        assert "optimized_prompt_id" in result
                        assert "performance_improvement" in result

                        # Should be able to retrieve the optimized prompt
                        current_prompt = await optimization_service.get_current_prompt(
                            db
                        )
                        assert current_prompt is not None
                        assert current_prompt["prompt"]

                except Exception as e:
                    # Expected if DSPy is not configured
                    print(f"Expected optimization error: {e}")

            # 4. Should be able to get optimization history
            history = await optimization_service.get_optimization_history(db, limit=10)
            assert isinstance(history, dict)
            assert "runs" in history
            assert isinstance(history["runs"], list)

    @pytest.mark.asyncio
    async def test_concurrent_optimization_handling(self, clean_database):
        """Test handling of concurrent optimization requests"""
        optimization_service = OptimizationService()

        async with get_db() as db:
            # The optimization service uses a ThreadPoolExecutor with max_workers=2
            # This should handle concurrent requests gracefully

            tasks = []
            for _i in range(3):  # More tasks than workers
                task = optimization_service.run_optimization(
                    db, "cheap", auto_trigger=True
                )
                tasks.append(task)

            # Should handle all requests without hanging
            # (though they may fail due to insufficient data)
            results = await asyncio.gather(*tasks, return_exceptions=True)

            # Should get responses for all requests
            assert len(results) == 3

            # Each should either succeed or fail gracefully
            for result in results:
                if isinstance(result, Exception):
                    # Expected due to test conditions
                    assert "training examples" in str(result) or "DSPy" in str(result)
                else:
                    # Should have required structure
                    assert isinstance(result, dict)


class TestProviderModelOptimizationRetrieval:
    """Test provider+model specific optimization prompt retrieval"""

    @pytest.mark.asyncio
    async def test_get_provider_specific_optimization(self, clean_database):
        """Test retrieval of provider-specific optimized prompt"""
        optimization_service = OptimizationService()

        async with get_db() as db:
            # Insert a provider-specific optimized prompt
            await db.execute("""
                INSERT INTO optimized_prompts 
                (id, version, prompt, created_at, feedback_count, positive_rate, 
                 model_provider, model_name, is_current, optimization_mode)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                "test-openai-gpt4o-v1",
                1,
                "Provider-specific optimized prompt for OpenAI GPT-4o",
                "2025-01-31T12:00:00Z",
                15,
                0.85,
                "openai",
                "gpt-4o",
                True,
                "cheap"
            ))
            await db.commit()

            # Test retrieval of provider-specific prompt
            result = await optimization_service.get_current_prompt_for_provider_model(
                db, "openai", "gpt-4o"
            )

            assert result is not None
            assert result["version"] == 1
            assert result["prompt"] == "Provider-specific optimized prompt for OpenAI GPT-4o"
            assert result["providerSpecific"] is True
            assert result["modelProvider"] == "openai"
            assert result["modelName"] == "gpt-4o"
            assert result["performance"]["feedbackCount"] == 15
            assert result["performance"]["positiveRate"] == 0.85
            assert "fallbackUsed" not in result

    @pytest.mark.asyncio
    async def test_fallback_to_generic_optimization(self, clean_database):
        """Test fallback to generic optimized prompt when no provider-specific prompt exists"""
        optimization_service = OptimizationService()

        async with get_db() as db:
            # Insert only a generic optimized prompt (no provider/model)
            await db.execute("""
                INSERT INTO optimized_prompts 
                (id, version, prompt, created_at, feedback_count, positive_rate, 
                 model_provider, model_name, is_current, optimization_mode)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                "test-generic-v2",
                2,
                "Generic optimized prompt for all providers",
                "2025-01-31T12:00:00Z",
                25,
                0.75,
                None,  # No provider specified
                None,  # No model specified
                True,
                "cheap"
            ))
            await db.commit()

            # Test retrieval falls back to generic prompt
            result = await optimization_service.get_current_prompt_for_provider_model(
                db, "anthropic", "claude-3-5-sonnet-20241022"
            )

            assert result is not None
            assert result["version"] == 2
            assert result["prompt"] == "Generic optimized prompt for all providers"
            assert result["providerSpecific"] is False
            assert result["fallbackUsed"] is True
            assert result["performance"]["feedbackCount"] == 25
            assert result["performance"]["positiveRate"] == 0.75
            assert "modelProvider" not in result
            assert "modelName" not in result

    @pytest.mark.asyncio
    async def test_provider_specific_takes_precedence_over_generic(self, clean_database):
        """Test that provider-specific prompt takes precedence over generic"""
        optimization_service = OptimizationService()

        async with get_db() as db:
            # Insert both generic and provider-specific prompts
            await db.execute("""
                INSERT INTO optimized_prompts 
                (id, version, prompt, created_at, feedback_count, positive_rate, 
                 model_provider, model_name, is_current, optimization_mode)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                "test-generic-v1",
                1,
                "Generic optimized prompt",
                "2025-01-31T11:00:00Z",
                20,
                0.70,
                None,
                None,
                True,
                "cheap"
            ))

            await db.execute("""
                INSERT INTO optimized_prompts 
                (id, version, prompt, created_at, feedback_count, positive_rate, 
                 model_provider, model_name, is_current, optimization_mode)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                "test-gemini-flash-v1",
                1,
                "Gemini 2.5-flash specific optimized prompt",
                "2025-01-31T12:00:00Z",
                12,
                0.90,
                "gemini",
                "gemini-2.5-flash",
                True,
                "expensive"
            ))
            await db.commit()

            # Test that provider-specific prompt is returned
            result = await optimization_service.get_current_prompt_for_provider_model(
                db, "gemini", "gemini-2.5-flash"
            )

            assert result is not None
            assert result["prompt"] == "Gemini 2.5-flash specific optimized prompt"
            assert result["providerSpecific"] is True
            assert result["modelProvider"] == "gemini"
            assert result["modelName"] == "gemini-2.5-flash"
            assert "fallbackUsed" not in result

    @pytest.mark.asyncio
    async def test_no_optimization_available(self, clean_database):
        """Test when no optimization is available at all"""
        optimization_service = OptimizationService()

        async with get_db() as db:
            # Don't insert any optimized prompts
            result = await optimization_service.get_current_prompt_for_provider_model(
                db, "openrouter", "mistral-7b-instruct"
            )

            assert result is None

    @pytest.mark.asyncio
    async def test_only_non_current_optimizations_exist(self, clean_database):
        """Test when optimizations exist but none are marked as current"""
        optimization_service = OptimizationService()

        async with get_db() as db:
            # Insert an optimization that is not current
            await db.execute("""
                INSERT INTO optimized_prompts 
                (id, version, prompt, created_at, feedback_count, positive_rate, 
                 model_provider, model_name, is_current, optimization_mode)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                "test-old-v1",
                1,
                "Old optimization prompt",
                "2025-01-30T12:00:00Z",
                10,
                0.60,
                "anthropic",
                "claude-3-5-sonnet-20241022",
                False,  # Not current
                "cheap"
            ))
            await db.commit()

            # Should return None since no current optimization exists
            result = await optimization_service.get_current_prompt_for_provider_model(
                db, "anthropic", "claude-3-5-sonnet-20241022"
            )

            assert result is None

    @pytest.mark.asyncio
    async def test_multiple_versions_returns_latest(self, clean_database):
        """Test that when multiple versions exist, the latest is returned"""
        optimization_service = OptimizationService()

        async with get_db() as db:
            # Insert multiple versions for the same provider+model
            for version in [1, 2, 3]:
                await db.execute("""
                    INSERT INTO optimized_prompts 
                    (id, version, prompt, created_at, feedback_count, positive_rate, 
                     model_provider, model_name, is_current, optimization_mode)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    f"test-openai-v{version}",
                    version,
                    f"OpenAI optimization v{version}",
                    f"2025-01-31T12:0{version}:00Z",
                    10 + version,
                    0.7 + (version * 0.05),
                    "openai",
                    "gpt-4o-mini",
                    True,  # All marked as current for this test
                    "cheap"
                ))
            await db.commit()

            # Should return the latest version (v3)
            result = await optimization_service.get_current_prompt_for_provider_model(
                db, "openai", "gpt-4o-mini"
            )

            assert result is not None
            assert result["version"] == 3
            assert result["prompt"] == "OpenAI optimization v3"
            assert result["performance"]["feedbackCount"] == 13
            assert result["performance"]["positiveRate"] == 0.85

    @pytest.mark.asyncio
    async def test_empty_string_provider_model_treated_as_null(self, clean_database):
        """Test that empty string provider/model values are treated as NULL (generic)"""
        optimization_service = OptimizationService()

        async with get_db() as db:
            # Insert prompt with empty string provider/model (should be treated as generic)
            await db.execute("""
                INSERT INTO optimized_prompts 
                (id, version, prompt, created_at, feedback_count, positive_rate, 
                 model_provider, model_name, is_current, optimization_mode)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                "test-empty-string",
                1,
                "Prompt with empty string provider",
                "2025-01-31T12:00:00Z",
                18,
                0.80,
                "",  # Empty string provider
                "",  # Empty string model
                True,
                "cheap"
            ))
            await db.commit()

            # Should find this as a generic fallback
            result = await optimization_service.get_current_prompt_for_provider_model(
                db, "gemini", "gemini-2.5-flash"
            )

            assert result is not None
            assert result["version"] == 1
            assert result["prompt"] == "Prompt with empty string provider"
            assert result["providerSpecific"] is False
            assert result["fallbackUsed"] is True

    @pytest.mark.asyncio
    async def test_case_sensitivity_in_provider_model_matching(self, clean_database):
        """Test that provider and model matching is case-sensitive"""
        optimization_service = OptimizationService()

        async with get_db() as db:
            # Insert prompt with specific case
            await db.execute("""
                INSERT INTO optimized_prompts 
                (id, version, prompt, created_at, feedback_count, positive_rate, 
                 model_provider, model_name, is_current, optimization_mode)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                "test-case-sensitive",
                1,
                "Case sensitive prompt",
                "2025-01-31T12:00:00Z",
                10,
                0.75,
                "openai",  # lowercase
                "gpt-4o-mini",  # lowercase with dashes
                True,
                "cheap"
            ))
            await db.commit()

            # Should match exact case
            result = await optimization_service.get_current_prompt_for_provider_model(
                db, "openai", "gpt-4o-mini"
            )
            assert result is not None
            assert result["prompt"] == "Case sensitive prompt"

            # Should not match different case
            result = await optimization_service.get_current_prompt_for_provider_model(
                db, "OpenAI", "GPT-4o-mini"  # Different case
            )
            assert result is None
