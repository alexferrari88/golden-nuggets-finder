"""
Unit tests for FeedbackService.

Tests the core feedback storage logic with smart duplicate detection,
distinguishing between true duplicates, updates, and new submissions.
"""

import pytest
import pytest_asyncio
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

from app.services.feedback_service import FeedbackService
from app.models import NuggetFeedback, MissingContentFeedback


class TestFeedbackService:
    """Test the FeedbackService class"""

    @pytest.fixture
    def feedback_service(self):
        """Create a FeedbackService instance for testing"""
        return FeedbackService()

    @pytest.fixture
    def mock_db(self):
        """Create a mock database connection"""
        db = AsyncMock()
        db.execute = AsyncMock()
        db.commit = AsyncMock()
        return db

    @pytest.fixture
    def sample_nugget_feedback(self):
        """Create sample nugget feedback for testing"""
        return NuggetFeedback(
            id="test-nugget-1",
            nuggetContent="Use pytest for testing Python applications",
            originalType="tool",
            correctedType=None,
            rating="positive",
            timestamp=1642780800000,
            url="https://example.com/test",
            context="Testing is important for reliable software development"
        )

    @pytest.fixture
    def sample_missing_content(self):
        """Create sample missing content feedback for testing"""
        return MissingContentFeedback(
            id="test-missing-1",
            content="Consider using Black for code formatting",
            suggestedType="tool",
            timestamp=1642780800000,
            url="https://example.com/test",
            context="Code formatting helps maintain consistency"
        )

    # =====================================
    # NEW FEEDBACK TESTS
    # =====================================

    @pytest.mark.asyncio
    async def test_store_nugget_feedback_new_record(self, feedback_service, mock_db, sample_nugget_feedback):
        """Test storing nugget feedback when no existing record exists"""
        # Setup: No existing record found
        mock_cursor = AsyncMock()
        mock_cursor.fetchone.return_value = None
        mock_db.execute.return_value = mock_cursor

        # Execute
        result = await feedback_service.store_nugget_feedback(mock_db, sample_nugget_feedback)

        # Assert
        assert result == "new"
        
        # Verify database calls
        mock_db.execute.assert_called()
        mock_db.commit.assert_called_once()
        
        # Verify INSERT was called (not UPDATE)
        call_args = mock_db.execute.call_args_list
        insert_call = next((call for call in call_args if "INSERT" in call[0][0]), None)
        assert insert_call is not None, "INSERT statement should have been called"

    @pytest.mark.asyncio
    async def test_store_missing_content_feedback_new_record(self, feedback_service, mock_db, sample_missing_content):
        """Test storing missing content feedback when no existing record exists"""
        # Setup: No existing record found
        mock_cursor = AsyncMock()
        mock_cursor.fetchone.return_value = None
        mock_db.execute.return_value = mock_cursor

        # Execute
        result = await feedback_service.store_missing_content_feedback(mock_db, sample_missing_content)

        # Assert
        assert result == "new"
        mock_db.execute.assert_called()
        mock_db.commit.assert_called_once()

    # =====================================
    # EXACT DUPLICATE TESTS
    # =====================================

    @pytest.mark.asyncio
    async def test_store_nugget_feedback_exact_duplicate(self, feedback_service, mock_db, sample_nugget_feedback):
        """Test storing exact duplicate nugget feedback returns 'duplicate'"""
        # Setup: Existing record with same values
        existing_record = ("existing-id", 1, datetime.now(timezone.utc))
        mock_cursor = AsyncMock()
        mock_cursor.fetchone.return_value = existing_record
        mock_db.execute.return_value = mock_cursor

        # Mock the comparison query to return same values
        comparison_cursor = AsyncMock()
        comparison_cursor.fetchone.return_value = (
            sample_nugget_feedback.rating,
            sample_nugget_feedback.correctedType,
            sample_nugget_feedback.context
        )
        
        # Configure mock to return different cursors for different queries
        def mock_execute_side_effect(query, params):
            if "SELECT id, report_count, first_reported_at" in query:
                return mock_cursor
            elif "SELECT rating, corrected_type, context" in query:
                return comparison_cursor
            else:
                return AsyncMock()
        
        mock_db.execute.side_effect = mock_execute_side_effect

        # Execute
        result = await feedback_service.store_nugget_feedback(mock_db, sample_nugget_feedback)

        # Assert
        assert result == "duplicate"

    @pytest.mark.asyncio
    async def test_store_missing_content_feedback_exact_duplicate(self, feedback_service, mock_db, sample_missing_content):
        """Test storing exact duplicate missing content feedback returns 'duplicate'"""
        # Setup: Existing record with same values
        existing_record = ("existing-id", 1, datetime.now(timezone.utc))
        mock_cursor = AsyncMock()
        mock_cursor.fetchone.return_value = existing_record
        mock_db.execute.return_value = mock_cursor

        # Mock the comparison query
        comparison_cursor = AsyncMock()
        comparison_cursor.fetchone.return_value = (
            sample_missing_content.suggestedType,
            sample_missing_content.context
        )
        
        def mock_execute_side_effect(query, params):
            if "SELECT id, report_count, first_reported_at" in query:
                return mock_cursor
            elif "SELECT suggested_type, context" in query:
                return comparison_cursor
            else:
                return AsyncMock()
        
        mock_db.execute.side_effect = mock_execute_side_effect

        # Execute
        result = await feedback_service.store_missing_content_feedback(mock_db, sample_missing_content)

        # Assert
        assert result == "duplicate"

    # =====================================
    # UPDATE/CORRECTION TESTS
    # =====================================

    @pytest.mark.asyncio
    async def test_store_nugget_feedback_rating_change(self, feedback_service, mock_db, sample_nugget_feedback):
        """Test nugget feedback with different rating returns 'updated'"""
        # Setup: Existing record with different rating
        existing_record = ("existing-id", 1, datetime.now(timezone.utc))
        mock_cursor = AsyncMock()
        mock_cursor.fetchone.return_value = existing_record
        mock_db.execute.return_value = mock_cursor

        # Mock comparison query with different rating
        comparison_cursor = AsyncMock()
        comparison_cursor.fetchone.return_value = (
            "negative",  # Different rating
            sample_nugget_feedback.correctedType,
            sample_nugget_feedback.context
        )
        
        def mock_execute_side_effect(query, params):
            if "SELECT id, report_count, first_reported_at" in query:
                return mock_cursor
            elif "SELECT rating, corrected_type, context" in query:
                return comparison_cursor
            else:
                return AsyncMock()
        
        mock_db.execute.side_effect = mock_execute_side_effect

        # Execute
        result = await feedback_service.store_nugget_feedback(mock_db, sample_nugget_feedback)

        # Assert
        assert result == "updated"

    @pytest.mark.asyncio
    async def test_store_nugget_feedback_type_correction(self, feedback_service, mock_db, sample_nugget_feedback):
        """Test nugget feedback with different corrected_type returns 'updated'"""
        # Setup: Existing record with different corrected_type
        existing_record = ("existing-id", 1, datetime.now(timezone.utc))
        mock_cursor = AsyncMock()
        mock_cursor.fetchone.return_value = existing_record
        mock_db.execute.return_value = mock_cursor

        # Mock comparison query with different corrected_type
        comparison_cursor = AsyncMock()
        comparison_cursor.fetchone.return_value = (
            sample_nugget_feedback.rating,
            "explanation",  # Different corrected type
            sample_nugget_feedback.context
        )
        
        def mock_execute_side_effect(query, params):
            if "SELECT id, report_count, first_reported_at" in query:
                return mock_cursor
            elif "SELECT rating, corrected_type, context" in query:
                return comparison_cursor
            else:
                return AsyncMock()
        
        mock_db.execute.side_effect = mock_execute_side_effect

        # Execute
        result = await feedback_service.store_nugget_feedback(mock_db, sample_nugget_feedback)

        # Assert
        assert result == "updated"

    @pytest.mark.asyncio
    async def test_store_nugget_feedback_context_change(self, feedback_service, mock_db, sample_nugget_feedback):
        """Test nugget feedback with different context returns 'updated'"""
        # Setup: Existing record with different context
        existing_record = ("existing-id", 1, datetime.now(timezone.utc))
        mock_cursor = AsyncMock()
        mock_cursor.fetchone.return_value = existing_record
        mock_db.execute.return_value = mock_cursor

        # Mock comparison query with different context
        comparison_cursor = AsyncMock()
        comparison_cursor.fetchone.return_value = (
            sample_nugget_feedback.rating,
            sample_nugget_feedback.correctedType,
            "Different context entirely"  # Different context
        )
        
        def mock_execute_side_effect(query, params):
            if "SELECT id, report_count, first_reported_at" in query:
                return mock_cursor
            elif "SELECT rating, corrected_type, context" in query:
                return comparison_cursor
            else:
                return AsyncMock()
        
        mock_db.execute.side_effect = mock_execute_side_effect

        # Execute
        result = await feedback_service.store_nugget_feedback(mock_db, sample_nugget_feedback)

        # Assert
        result == "updated"

    @pytest.mark.asyncio
    async def test_store_nugget_feedback_multiple_changes(self, feedback_service, mock_db, sample_nugget_feedback):
        """Test nugget feedback with multiple field changes returns 'updated'"""
        # Setup: Existing record with multiple different values
        existing_record = ("existing-id", 1, datetime.now(timezone.utc))
        mock_cursor = AsyncMock()
        mock_cursor.fetchone.return_value = existing_record
        mock_db.execute.return_value = mock_cursor

        # Mock comparison query with multiple differences
        comparison_cursor = AsyncMock()
        comparison_cursor.fetchone.return_value = (
            "negative",  # Different rating
            "explanation",  # Different corrected type
            "Different context"  # Different context
        )
        
        def mock_execute_side_effect(query, params):
            if "SELECT id, report_count, first_reported_at" in query:
                return mock_cursor
            elif "SELECT rating, corrected_type, context" in query:
                return comparison_cursor
            else:
                return AsyncMock()
        
        mock_db.execute.side_effect = mock_execute_side_effect

        # Execute
        result = await feedback_service.store_nugget_feedback(mock_db, sample_nugget_feedback)

        # Assert
        assert result == "updated"

    # =====================================
    # EDGE CASE TESTS
    # =====================================

    @pytest.mark.asyncio
    async def test_store_nugget_feedback_same_content_different_url(self, feedback_service, mock_db, sample_nugget_feedback):
        """Test same content with different URL creates new record"""
        # Setup: No existing record found (different URL)
        mock_cursor = AsyncMock()
        mock_cursor.fetchone.return_value = None
        mock_db.execute.return_value = mock_cursor

        # Modify URL
        different_url_feedback = sample_nugget_feedback.model_copy()
        different_url_feedback.url = "https://different.com/page"

        # Execute
        result = await feedback_service.store_nugget_feedback(mock_db, different_url_feedback)

        # Assert
        assert result == "new"

    @pytest.mark.asyncio
    async def test_store_nugget_feedback_same_content_different_original_type(self, feedback_service, mock_db, sample_nugget_feedback):
        """Test same content with different originalType creates new record"""
        # Setup: No existing record found (different original type)
        mock_cursor = AsyncMock()
        mock_cursor.fetchone.return_value = None
        mock_db.execute.return_value = mock_cursor

        # Modify original type
        different_type_feedback = sample_nugget_feedback.model_copy()
        different_type_feedback.originalType = "explanation"

        # Execute
        result = await feedback_service.store_nugget_feedback(mock_db, different_type_feedback)

        # Assert
        assert result == "new"

    @pytest.mark.asyncio
    async def test_store_nugget_feedback_null_vs_value_corrected_type(self, feedback_service, mock_db, sample_nugget_feedback):
        """Test null vs value in corrected_type counts as update"""
        # Setup: Existing record with null corrected_type
        existing_record = ("existing-id", 1, datetime.now(timezone.utc))
        mock_cursor = AsyncMock()
        mock_cursor.fetchone.return_value = existing_record
        mock_db.execute.return_value = mock_cursor

        # Mock comparison query with null corrected_type
        comparison_cursor = AsyncMock()
        comparison_cursor.fetchone.return_value = (
            sample_nugget_feedback.rating,
            None,  # Existing has null
            sample_nugget_feedback.context
        )
        
        def mock_execute_side_effect(query, params):
            if "SELECT id, report_count, first_reported_at" in query:
                return mock_cursor
            elif "SELECT rating, corrected_type, context" in query:
                return comparison_cursor
            else:
                return AsyncMock()
        
        mock_db.execute.side_effect = mock_execute_side_effect

        # Modify to have a corrected type
        corrected_feedback = sample_nugget_feedback.model_copy()
        corrected_feedback.correctedType = "explanation"

        # Execute
        result = await feedback_service.store_nugget_feedback(mock_db, corrected_feedback)

        # Assert
        assert result == "updated"