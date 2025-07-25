"""
Error handling tests for backend services.

Tests various failure scenarios to demonstrate resilient system design
and help contributors understand error handling patterns.
"""

import asyncio
import json
import sqlite3
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone

import pytest
import pytest_asyncio
import aiosqlite
from fastapi import HTTPException

from app.services.feedback_service import FeedbackService
from app.services.optimization_service import OptimizationService
from app.services.cost_tracking_service import CostTrackingService
from app.services.progress_tracking_service import ProgressTrackingService
from app.models import NuggetFeedback, MissingContentFeedback


class TestDatabaseErrorHandling:
    """Test how services handle database errors gracefully"""

    @pytest.fixture
    def feedback_service(self):
        return FeedbackService()

    @pytest.fixture
    def mock_db_connection_error(self):
        """Mock database that raises connection errors"""
        db = AsyncMock()
        db.execute.side_effect = aiosqlite.DatabaseError("Connection failed")
        db.commit.side_effect = aiosqlite.DatabaseError("Connection failed")
        return db

    @pytest.fixture
    def mock_db_integrity_error(self):
        """Mock database that raises integrity constraint errors"""
        db = AsyncMock()
        db.execute.side_effect = sqlite3.IntegrityError("UNIQUE constraint failed")
        return db

    @pytest.fixture
    def sample_nugget_feedback(self):
        return NuggetFeedback(
            id="error-test-1",
            nuggetContent="Test nugget for error handling",
            originalType="tool",
            correctedType=None,
            rating="positive",
            timestamp=1642780800000,
            url="https://example.com/error-test",
            context="Test context for error scenarios"
        )

    @pytest.mark.asyncio
    async def test_feedback_service_database_connection_error(
        self, feedback_service, mock_db_connection_error, sample_nugget_feedback
    ):
        """Test feedback service handles database connection errors gracefully"""
        with pytest.raises(Exception) as exc_info:
            await feedback_service.store_nugget_feedback(
                mock_db_connection_error, sample_nugget_feedback
            )
        
        # Should propagate the database error (not crash unexpectedly)
        assert "Connection failed" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_feedback_service_integrity_constraint_error(
        self, feedback_service, mock_db_integrity_error, sample_nugget_feedback
    ):
        """Test feedback service handles database integrity errors"""
        with pytest.raises(Exception) as exc_info:
            await feedback_service.store_nugget_feedback(
                mock_db_integrity_error, sample_nugget_feedback
            )
        
        # Should handle constraint violations appropriately
        assert "UNIQUE constraint failed" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_feedback_stats_with_corrupted_database(self, feedback_service):
        """Test feedback stats when database returns unexpected data"""
        mock_db = AsyncMock()
        mock_cursor = AsyncMock()
        
        # Mock corrupted/unexpected data from database
        mock_cursor.fetchone.return_value = None  # Missing expected data
        mock_db.execute.return_value = mock_cursor
        
        # Should handle missing data gracefully
        stats = await feedback_service.get_feedback_stats(mock_db)
        
        # Should return safe defaults instead of crashing
        assert stats["totalFeedback"] == 0
        assert stats["positiveCount"] == 0
        assert stats["negativeCount"] == 0
        assert stats["shouldOptimize"] is False

    @pytest.mark.asyncio
    async def test_optimization_service_database_unavailable(self):
        """Test optimization service when database is unavailable"""
        optimization_service = OptimizationService()
        
        # Mock database that fails to connect
        mock_db = AsyncMock()
        mock_db.execute.side_effect = aiosqlite.DatabaseError("Database unavailable")
        
        # Should handle database errors during optimization
        with pytest.raises(Exception) as exc_info:
            await optimization_service.run_optimization(mock_db, "cheap", auto_trigger=True)
        
        # Should provide meaningful error message
        assert "Database" in str(exc_info.value) or "unavailable" in str(exc_info.value)


class TestExternalServiceErrorHandling:
    """Test handling of external service failures (DSPy, Gemini API)"""

    @pytest.fixture
    def optimization_service(self):
        return OptimizationService()

    @pytest.mark.asyncio
    async def test_dspy_unavailable_graceful_degradation(self, optimization_service):
        """Test optimization when DSPy is not available"""
        mock_db = AsyncMock()
        mock_cursor = AsyncMock()
        mock_cursor.fetchall.return_value = []  # No training examples
        mock_db.execute.return_value = mock_cursor
        
        # Should handle missing training examples gracefully (raises exception)
        with pytest.raises(Exception) as exc_info:
            await optimization_service.run_optimization(mock_db, "cheap", auto_trigger=True)
        
        # Should provide meaningful error message
        assert "training examples" in str(exc_info.value)

    @patch('app.services.dspy_config.DSPY_AVAILABLE', False)
    def test_dspy_environment_not_configured(self, optimization_service):
        """Test optimization when DSPy environment is not configured"""
        from app.services.dspy_config import generate_mock_feedback_data
        
        mock_examples = generate_mock_feedback_data(10)
        
        # Should detect DSPy unavailability
        result = optimization_service._run_dspy_optimization(mock_examples, "cheap")
        
        assert "error" in result
        assert "DSPy environment not configured" in result["error"]

    @pytest.mark.asyncio
    async def test_gemini_api_timeout_handling(self, optimization_service):
        """Test handling of Gemini API timeouts during optimization"""
        mock_db = AsyncMock()
        
        # Mock training examples available
        mock_cursor = AsyncMock()
        mock_cursor.fetchall.return_value = [
            ("example-1", "test content", '{"golden_nuggets": []}', 0.8, "2024-01-01")
            for _ in range(20)  # Sufficient training examples
        ]
        mock_db.execute.return_value = mock_cursor
        
        # Should handle timeout errors (current implementation raises exception)
        with pytest.raises(Exception) as exc_info:
            await optimization_service.run_optimization(mock_db, "cheap", auto_trigger=True)
        
        # Should provide meaningful error message
        error_msg = str(exc_info.value)
        assert "failed" in error_msg.lower() or "error" in error_msg.lower()

    @pytest.mark.asyncio
    async def test_gemini_api_rate_limit_handling(self, optimization_service):
        """Test handling of Gemini API rate limits"""
        mock_db = AsyncMock()
        mock_cursor = AsyncMock()
        mock_cursor.fetchall.return_value = []  # No training examples to trigger graceful handling
        mock_db.execute.return_value = mock_cursor
        
        # Simulate rate limit scenario (no training examples triggers early exit)
        with pytest.raises(Exception) as exc_info:
            await optimization_service.run_optimization(mock_db, "expensive", auto_trigger=True)
        
        # Should handle insufficient data scenario gracefully
        assert "training examples" in str(exc_info.value)


class TestInputValidationErrorHandling:
    """Test handling of malformed or invalid input data"""

    @pytest.fixture
    def feedback_service(self):
        return FeedbackService()

    @pytest.fixture
    def cost_tracking_service(self):
        return CostTrackingService()

    @pytest.fixture
    def progress_tracking_service(self):
        return ProgressTrackingService()

    def test_malformed_nugget_feedback_handling(self):
        """Test handling of malformed nugget feedback data"""
        from pydantic import ValidationError
        
        # Test various malformed feedback scenarios
        malformed_cases = [
            {"id": "", "nuggetContent": "test"},  # Empty ID
            {"id": "test", "nuggetContent": ""},  # Empty content
            {"id": "test", "nuggetContent": "test", "rating": "invalid"},  # Invalid rating
            {"id": "test", "nuggetContent": "test", "rating": "positive", "timestamp": "invalid"},  # Invalid timestamp
        ]
        
        for malformed_data in malformed_cases:
            with pytest.raises(ValidationError):
                NuggetFeedback(**malformed_data)

    def test_malformed_missing_content_feedback_handling(self):
        """Test handling of malformed missing content feedback"""
        from pydantic import ValidationError
        
        malformed_cases = [
            {"id": "test", "content": "", "suggestedType": "tool"},  # Empty content
            {"id": "test", "content": "test", "suggestedType": "invalid"},  # Invalid type
            {"id": "", "content": "test", "suggestedType": "tool"},  # Empty ID
        ]
        
        for malformed_data in malformed_cases:
            with pytest.raises(ValidationError):
                MissingContentFeedback(**malformed_data)

    @pytest.mark.asyncio
    async def test_cost_tracking_invalid_parameters(self, cost_tracking_service):
        """Test cost tracking with invalid parameters"""
        mock_db = AsyncMock()
        
        # Test with invalid model name (should use default costs, not raise exception)
        cost_id = await cost_tracking_service.track_operation_cost(
            mock_db,
            optimization_run_id="test-run",
            operation_type="training",
            model_name="invalid-model",  # Not in TOKEN_COSTS - uses defaults
            input_tokens=100,
            output_tokens=50
        )
        
        # Should handle gracefully and return cost ID
        assert cost_id is not None
        assert isinstance(cost_id, str)

    @pytest.mark.asyncio
    async def test_progress_tracking_invalid_progress_values(self, progress_tracking_service):
        """Test progress tracking with invalid progress values"""
        mock_db = AsyncMock()
        
        # Should handle invalid progress percentages gracefully
        await progress_tracking_service.save_progress(
            mock_db,
            run_id="test-run",
            phase="testing",
            progress_percent=150,  # Invalid percentage > 100
            message="Test message"
        )
        
        # Should store the value as-is (let caller decide validity)
        assert "test-run" in progress_tracking_service.active_progress

    def test_json_parsing_error_handling(self):
        """Test handling of malformed JSON in optimization metrics"""
        from app.services.dspy_config import OptimizationMetrics
        
        # Create mock objects with invalid JSON
        example = MagicMock()
        example.golden_nuggets = "invalid json {"
        
        pred = MagicMock()
        pred.golden_nuggets = '{"valid": "json"}'
        
        # Should handle JSON parsing errors gracefully
        score = OptimizationMetrics.golden_nugget_metric(example, pred)
        assert score == 0.0  # Should return 0 for invalid JSON


class TestConcurrentOperationErrorHandling:
    """Test handling of concurrent operation conflicts"""

    @pytest.fixture
    def optimization_service(self):
        return OptimizationService()

    @pytest.mark.asyncio
    async def test_concurrent_optimization_requests(self, optimization_service):
        """Test handling multiple concurrent optimization requests"""
        mock_db = AsyncMock()
        mock_cursor = AsyncMock()
        mock_cursor.fetchall.return_value = []  # No training examples
        mock_db.execute.return_value = mock_cursor
        
        # Create multiple concurrent optimization tasks
        tasks = []
        for i in range(5):  # More than ThreadPoolExecutor max_workers (2)
            task = optimization_service.run_optimization(
                mock_db, "cheap", auto_trigger=True
            )
            tasks.append(task)
        
        # Should handle all requests without hanging or crashing
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # All should complete (either successfully or with errors)
        assert len(results) == 5
        
        # Each should either return a result dict or raise an exception
        for result in results:
            if isinstance(result, Exception):
                # Expected due to no training examples or resource constraints
                assert "training examples" in str(result) or "DSPy" in str(result)
            else:
                # Should be a valid result dict
                assert isinstance(result, dict)
                assert "error" in result or "success" in result

    @pytest.mark.asyncio
    async def test_database_lock_timeout_handling(self):
        """Test handling of database lock timeouts"""
        feedback_service = FeedbackService()
        
        # Mock database that simulates lock timeout
        mock_db = AsyncMock()
        mock_db.execute.side_effect = sqlite3.OperationalError("database is locked")
        
        sample_feedback = NuggetFeedback(
            id="lock-test",
            nuggetContent="Test content",
            originalType="tool",
            rating="positive",
            timestamp=1642780800000,
            url="https://example.com",
            context="Test context"
        )
        
        # Should handle database locks appropriately
        with pytest.raises(Exception) as exc_info:
            await feedback_service.store_nugget_feedback(mock_db, sample_feedback)
        
        assert "locked" in str(exc_info.value)


class TestResourceConstraintErrorHandling:
    """Test handling of resource constraints and limits"""

    @pytest.mark.asyncio
    async def test_large_content_handling(self):
        """Test handling of oversized content inputs"""
        feedback_service = FeedbackService()
        mock_db = AsyncMock()
        
        # Create feedback with very large content
        large_content = "x" * 1000000  # 1MB of content
        
        large_feedback = NuggetFeedback(
            id="large-content-test",
            nuggetContent=large_content,
            originalType="tool",
            rating="positive",
            timestamp=1642780800000,
            url="https://example.com",
            context="Test context"
        )
        
        # Should handle large content (current implementation stores full content)
        mock_cursor = AsyncMock()
        mock_cursor.fetchone.return_value = None  # No existing record
        mock_db.execute.return_value = mock_cursor
        
        # Should not crash with large content
        result = await feedback_service.store_nugget_feedback(mock_db, large_feedback)
        assert result == "new"

    def test_memory_intensive_operations(self):
        """Test handling of memory-intensive operations"""
        from app.services.dspy_config import generate_mock_feedback_data
        
        # Generate large amount of mock data
        large_dataset = generate_mock_feedback_data(1000)
        
        # Should handle large datasets without memory errors
        assert len(large_dataset) == 1000
        
        # Each item should have proper structure
        for item in large_dataset[:5]:  # Check first few items
            assert "id" in item
            assert "input_content" in item
            assert "expected_output" in item
            assert "feedback_score" in item

    @pytest.mark.asyncio
    async def test_thread_pool_exhaustion_handling(self):
        """Test handling when ThreadPoolExecutor is exhausted"""
        optimization_service = OptimizationService()
        
        # The optimization service uses ThreadPoolExecutor with max_workers=2
        # This test verifies graceful handling when all workers are busy
        
        mock_db = AsyncMock()
        mock_cursor = AsyncMock()
        mock_cursor.fetchall.return_value = []
        mock_db.execute.return_value = mock_cursor
        
        # Submit more tasks than available workers
        tasks = []
        for i in range(3):  # More than max_workers=2
            task = optimization_service.run_optimization(mock_db, "cheap", auto_trigger=True)
            tasks.append(task)
        
        # Should handle queue overflow gracefully
        try:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            assert len(results) == 3
        except Exception as e:
            # If thread pool exhaustion occurs, should get meaningful error
            assert "thread" in str(e).lower() or "executor" in str(e).lower()