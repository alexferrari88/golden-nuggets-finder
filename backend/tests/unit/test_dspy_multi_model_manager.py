"""
Unit tests for DSPy Multi-Model Manager.

Tests provider-specific optimization functionality including model switching,
progress tracking, and fallback mechanisms.
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, Mock, patch

import pytest

# Import the classes under test
from app.services.dspy_multi_model_manager import (
    DSPyMultiModelManager,
    dspy_multi_model_manager,
)


class TestDSPyMultiModelManager:
    """Test suite for DSPy Multi-Model Manager"""

    @pytest.fixture
    def manager(self):
        """Create a fresh DSPy Multi-Model Manager instance for testing"""
        return DSPyMultiModelManager()

    @pytest.fixture
    def mock_db(self):
        """Create a mock database connection"""
        mock_db = AsyncMock()
        mock_db.execute = AsyncMock()
        mock_db.commit = AsyncMock()
        mock_db.fetchone = AsyncMock()
        mock_db.fetchall = AsyncMock()
        return mock_db

    def test_manager_initialization(self, manager):
        """Test that manager initializes with correct configuration"""
        assert manager.min_feedback_threshold == 50
        assert manager.min_training_examples == 10
        assert "gemini" in manager.baseline_prompts
        assert "openai" in manager.baseline_prompts
        assert "anthropic" in manager.baseline_prompts
        assert "openrouter" in manager.baseline_prompts

        # Check that baseline prompts contain expected content
        for provider_id, prompt in manager.baseline_prompts.items():
            assert "golden nuggets" in prompt.lower()
            assert "json" in prompt.lower()
            # Check that provider is mentioned in some form in the prompt
            provider_mentioned = (
                provider_id.lower() in prompt.lower()
                or provider_id.replace("_", " ").title() in prompt
                or provider_id.replace("_", "").upper()
                in prompt  # For OpenAI -> OPENAI
            )
            assert provider_mentioned, (
                f"Provider {provider_id} not mentioned in prompt: {prompt[:100]}..."
            )

    def test_baseline_prompt_generation(self, manager):
        """Test that baseline prompts are generated correctly for each provider"""
        gemini_prompt = manager._get_baseline_prompt("Google Gemini")
        assert "Google Gemini" in gemini_prompt
        assert "Tools and Resources" in gemini_prompt
        assert "JSON" in gemini_prompt

        openai_prompt = manager._get_baseline_prompt("OpenAI GPT")
        assert "OpenAI GPT" in openai_prompt
        assert "golden_nuggets" in openai_prompt

    @patch("app.services.dspy_multi_model_manager.DSPY_AVAILABLE", new=False)
    async def test_optimize_for_provider_dspy_unavailable(self, manager, mock_db):
        """Test that optimization fails gracefully when DSPy is not available"""
        with pytest.raises(Exception, match="DSPy not available"):
            await manager.optimize_for_provider(
                mock_db, "openai", "cheap", auto_trigger=False
            )

    async def test_optimize_for_provider_invalid_provider(self, manager, mock_db):
        """Test that optimization fails for invalid provider"""
        with pytest.raises(ValueError, match="Unsupported provider"):
            await manager.optimize_for_provider(
                mock_db, "invalid_provider", "cheap", auto_trigger=False
            )

    async def test_get_provider_feedback(self, manager, mock_db):
        """Test fetching provider-specific feedback data"""
        # Mock database responses
        nugget_feedback_data = [
            (
                "content1",
                "tool",
                "aha! moments",
                "positive",
                "context1",
                "url1",
                "openai",
                "gpt-4o-mini",
                "2025-01-31T12:00:00Z",
            ),
            (
                "content2",
                "media",
                None,
                "negative",
                "context2",
                "url2",
                "openai",
                "gpt-4o-mini",
                "2025-01-31T13:00:00Z",
            ),
        ]

        missing_feedback_data = [
            (
                "missing1",
                "analogy",
                "context3",
                "url3",
                "openai",
                "gpt-4o-mini",
                "2025-01-31T14:00:00Z",
            )
        ]

        # Configure mock to return data for sequential calls
        mock_db.execute.side_effect = [
            # First call for nugget_feedback
            AsyncMock(fetchall=AsyncMock(return_value=nugget_feedback_data)),
            # Second call for missing_content_feedback
            AsyncMock(fetchall=AsyncMock(return_value=missing_feedback_data)),
        ]

        # Mock cursor objects
        mock_cursor1 = AsyncMock()
        mock_cursor1.fetchall.return_value = nugget_feedback_data
        mock_cursor2 = AsyncMock()
        mock_cursor2.fetchall.return_value = missing_feedback_data

        mock_db.execute.side_effect = [mock_cursor1, mock_cursor2]

        # Test the method
        feedback_data = await manager._get_provider_feedback(mock_db, "openai")

        # Verify results
        assert len(feedback_data) == 3  # 2 nugget + 1 missing
        assert feedback_data[0]["content"] == "content1"
        assert feedback_data[0]["model_provider"] == "openai"
        assert feedback_data[0]["feedback_type"] == "nugget"
        assert feedback_data[2]["feedback_type"] == "missing_content"

        # Verify database calls
        assert mock_db.execute.call_count == 2

    async def test_should_optimize_provider(self, manager, mock_db):
        """Test provider optimization threshold checking"""
        # Mock database responses for feedback stats
        mock_cursor1 = AsyncMock()
        mock_cursor1.fetchone.return_value = (
            75,
            20,
            "2025-01-31T12:00:00Z",
        )  # total, negative, last_feedback

        mock_cursor2 = AsyncMock()
        mock_cursor2.fetchone.return_value = (
            "2025-01-24T12:00:00Z",
        )  # last_optimization (7 days ago)

        mock_db.execute.side_effect = [mock_cursor1, mock_cursor2]

        result = await manager.should_optimize_provider(mock_db, "openai")

        # Verify results
        assert result["provider_id"] == "openai"
        assert result["should_optimize"]  # 75 feedback >= 50 threshold
        assert result["total_feedback"] == 75
        assert result["negative_rate"] == 20 / 75  # 20 negative out of 75 total
        assert result["threshold_met"]

    async def test_should_optimize_provider_insufficient_feedback(
        self, manager, mock_db
    ):
        """Test provider optimization with insufficient feedback"""
        # Mock database responses - insufficient feedback
        mock_cursor1 = AsyncMock()
        mock_cursor1.fetchone.return_value = (
            25,
            5,
            "2025-01-31T12:00:00Z",
        )  # Only 25 feedback items

        mock_cursor2 = AsyncMock()
        mock_cursor2.fetchone.return_value = (None,)  # No previous optimization

        mock_db.execute.side_effect = [mock_cursor1, mock_cursor2]

        result = await manager.should_optimize_provider(mock_db, "anthropic")

        # Verify results
        assert not result["should_optimize"]
        assert result["total_feedback"] == 25
        assert not result["threshold_met"]  # 25 < 50 threshold

    def test_get_fallback_result(self, manager):
        """Test fallback result generation when optimization fails"""
        feedback_data = [
            {"content": "test1", "rating": "positive"},
            {"content": "test2", "rating": "negative"},
        ]

        result = manager._get_fallback_result(
            "openai", feedback_data, "cheap", "Test error"
        )

        # Verify fallback result structure
        assert result["provider_id"] == "openai"
        assert result["mode"] == "cheap"
        assert result["error"] == "Test error"
        assert result["performance_score"] == 0.0
        assert result["improvement"] == 0.0
        assert result["training_examples_count"] == 2
        assert "OpenAI GPT" in result["optimized_prompt"]
        assert "user feedback examples" in result["optimized_prompt"]

    def test_extract_provider_prompt_fallback(self, manager):
        """Test prompt extraction fallback mechanism"""
        # Create a mock module without the expected attributes
        mock_module = Mock()
        mock_module.extract = None

        result = manager._extract_provider_prompt(mock_module, "gemini")

        # Should fallback to enhanced baseline
        assert "Google Gemini" in result
        assert "optimized using DSPy for gemini" in result

    def test_extract_provider_prompt_with_demos(self, manager):
        """Test prompt extraction with DSPy demonstrations"""
        # Create a mock module with the expected structure
        mock_module = Mock()
        mock_module.extract = Mock()
        mock_module.extract.signature = Mock()
        mock_module.extract.signature.__doc__ = "Test signature doc"

        # Mock demonstrations
        demo1 = Mock()
        demo1.content = (
            "Test input content for demo 1" * 10
        )  # Make it long to test truncation
        demo1.golden_nuggets = (
            '{"golden_nuggets": [{"type": "tool", "content": "demo output"}]}'
        )

        mock_module.extract.demos = [demo1]

        result = manager._extract_provider_prompt(mock_module, "anthropic")

        # Verify the extracted prompt contains expected elements
        assert "Optimized prompt for anthropic" in result
        assert "Test signature doc" in result
        assert "Examples from anthropic optimization:" in result
        assert "Test input content" in result
        assert "JSON" in result

    def test_log_progress(self, manager):
        """Test progress logging functionality"""
        run_id = "test-run-123"
        provider_id = "openai"

        # Test successful progress logging
        manager._log_progress(
            provider_id, run_id, "optimization", 50, "Test progress message"
        )

        # Verify progress was stored
        assert provider_id in manager.active_runs_by_provider
        assert run_id in manager.active_runs_by_provider[provider_id]

        progress_data = manager.active_runs_by_provider[provider_id][run_id]
        assert progress_data["step"] == "optimization"
        assert progress_data["progress"] == 50
        assert progress_data["message"] == "Test progress message"
        assert progress_data["provider_id"] == provider_id

    def test_get_provider_run_progress(self, manager):
        """Test getting progress for specific provider run"""
        provider_id = "gemini"
        run_id = "test-run-456"

        # Setup some progress data
        manager.active_runs_by_provider[provider_id] = {
            run_id: {
                "step": "evaluation",
                "progress": 75,
                "message": "Evaluating performance",
                "provider_id": provider_id,
            }
        }

        # Test getting existing progress
        progress = manager.get_provider_run_progress(provider_id, run_id)
        assert progress is not None
        assert progress["step"] == "evaluation"
        assert progress["progress"] == 75

        # Test getting non-existent progress
        no_progress = manager.get_provider_run_progress("nonexistent", "nonexistent")
        assert no_progress is None

    def test_get_all_provider_active_runs(self, manager):
        """Test getting all active runs across providers"""
        # Setup test data
        manager.active_runs_by_provider = {
            "openai": {
                "run1": {
                    "step": "optimization",
                    "progress": 30,
                    "last_updated": datetime.now(timezone.utc),
                },
                "run2": {
                    "step": "evaluation",
                    "progress": 80,
                    "last_updated": datetime.now(timezone.utc),
                },
            },
            "gemini": {
                "run3": {
                    "step": "storing",
                    "progress": 95,
                    "last_updated": datetime.now(timezone.utc),
                }
            },
        }

        all_runs = manager.get_all_provider_active_runs()

        assert "openai" in all_runs
        assert "gemini" in all_runs
        assert len(all_runs["openai"]) == 2
        assert len(all_runs["gemini"]) == 1

    def test_model_config_initialization_without_dspy(self, manager):
        """Test model configuration initialization when DSPy is not available"""
        # This should not crash even without DSPy
        # Check that manager initializes properly even without DSPy
        assert len(manager.baseline_prompts) > 0

        # Should result in empty configs if DSPy not available
        # The actual behavior depends on DSPY_AVAILABLE constant

    async def test_store_provider_optimized_prompt(self, manager, mock_db):
        """Test storing optimized prompts for specific providers"""
        optimization_result = {
            "optimized_prompt": "Test optimized prompt for provider",
            "training_examples_count": 100,
            "performance_score": 0.85,
            "model_name": "gpt-4o-mini",
        }

        # Mock database responses
        mock_cursor1 = AsyncMock()
        mock_cursor1.fetchone.return_value = (5,)  # Next version number

        mock_db.execute.side_effect = [mock_cursor1, AsyncMock(), AsyncMock()]

        result = await manager._store_provider_optimized_prompt(
            mock_db, optimization_result, "test-run-789", "openai"
        )

        # Verify a prompt ID was generated
        assert isinstance(result, str)
        assert len(result) > 0

        # Verify database calls were made
        assert (
            mock_db.execute.call_count == 3
        )  # version query, update current, insert new
        assert mock_db.commit.call_count == 1


class TestGlobalInstance:
    """Test the global dspy_multi_model_manager instance"""

    def test_global_instance_exists(self):
        """Test that global instance is properly created"""
        assert dspy_multi_model_manager is not None
        assert isinstance(dspy_multi_model_manager, DSPyMultiModelManager)

    def test_global_instance_configuration(self):
        """Test that global instance has correct configuration"""
        assert hasattr(dspy_multi_model_manager, "baseline_prompts")
        assert hasattr(dspy_multi_model_manager, "min_feedback_threshold")
        assert hasattr(dspy_multi_model_manager, "active_runs_by_provider")


@pytest.mark.asyncio
class TestAsyncFunctionality:
    """Test async functionality that requires pytest-asyncio"""

    async def test_async_provider_feedback_empty_result(self):
        """Test getting provider feedback with empty database"""
        manager = DSPyMultiModelManager()
        mock_db = AsyncMock()

        # Mock empty results
        mock_cursor1 = AsyncMock()
        mock_cursor1.fetchall.return_value = []
        mock_cursor2 = AsyncMock()
        mock_cursor2.fetchall.return_value = []

        mock_db.execute.side_effect = [mock_cursor1, mock_cursor2]

        result = await manager._get_provider_feedback(mock_db, "gemini")

        assert result == []
        assert mock_db.execute.call_count == 2

    async def test_async_get_provider_current_prompt_not_found(self):
        """Test getting current prompt when none exists"""
        manager = DSPyMultiModelManager()
        mock_db = AsyncMock()

        mock_cursor = AsyncMock()
        mock_cursor.fetchone.return_value = None
        mock_db.execute.return_value = mock_cursor

        result = await manager.get_provider_current_prompt(mock_db, "anthropic")

        assert result is None

    async def test_async_get_provider_current_prompt_found(self):
        """Test getting current prompt when it exists"""
        manager = DSPyMultiModelManager()
        mock_db = AsyncMock()

        mock_data = (
            "prompt-id-123",
            5,
            "Optimized prompt text",
            "2025-01-31T12:00:00Z",
            100,
            0.85,
            "claude-3-5-sonnet",
        )
        mock_cursor = AsyncMock()
        mock_cursor.fetchone.return_value = mock_data
        mock_db.execute.return_value = mock_cursor

        result = await manager.get_provider_current_prompt(mock_db, "anthropic")

        assert result is not None
        assert result["id"] == "prompt-id-123"
        assert result["version"] == 5
        assert result["prompt"] == "Optimized prompt text"
        assert result["provider_id"] == "anthropic"
        assert result["model_name"] == "claude-3-5-sonnet"
        assert result["performance"]["feedbackCount"] == 100
        assert result["performance"]["positiveRate"] == 0.85
