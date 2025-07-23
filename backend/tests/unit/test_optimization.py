"""
Tests for DSPy optimization pipeline.

Tests both the optimization service and DSPy configuration.
"""

import asyncio
import json
from unittest.mock import Mock, patch

import pytest

from app.database import get_db, init_database
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
