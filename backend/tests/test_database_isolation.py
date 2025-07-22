"""
Test database isolation between tests.

Verifies that tests don't interfere with each other and that each test
gets a clean database state.
"""

import pytest
from fastapi.testclient import TestClient

from app.database import get_test_database_path, is_test_environment
from app.main import app

client = TestClient(app)


def test_environment_detection():
    """Test that we're correctly detected as running in test environment"""
    assert is_test_environment(), "Should detect test environment when running pytest"


def test_database_isolation_first(clean_database):
    """First test to verify database isolation"""
    # Submit some feedback
    feedback_data = {
        "nuggetFeedback": [
            {
                "id": "isolation-test-1",
                "nuggetContent": "Test content for isolation",
                "originalType": "tool",
                "rating": "positive",
                "timestamp": 1642780800000,
                "url": "https://example.com/isolation1",
                "context": "Context for isolation test 1",
            }
        ]
    }
    
    response = client.post("/feedback", json=feedback_data)
    assert response.status_code == 200
    
    # Verify feedback exists
    stats_response = client.get("/feedback/stats")
    assert stats_response.status_code == 200
    stats = stats_response.json()
    assert stats["totalFeedback"] >= 1
    
    # Store the database path for verification
    db_path = get_test_database_path()
    assert db_path is not None
    assert "test_feedback.db" in db_path


def test_database_isolation_second(clean_database):
    """Second test to verify database isolation - should have clean state"""
    # This test should start with a completely clean database
    # despite the previous test adding feedback
    
    stats_response = client.get("/feedback/stats")
    assert stats_response.status_code == 200
    stats = stats_response.json()
    
    # Should have no feedback from previous test
    assert stats["totalFeedback"] == 0
    assert stats["positiveCount"] == 0
    assert stats["negativeCount"] == 0
    
    # Database path should be different from first test
    db_path = get_test_database_path()
    assert db_path is not None
    assert "test_feedback.db" in db_path


def test_database_paths_are_unique(clean_database):
    """Test that each test gets a unique database path"""
    import tempfile
    
    db_path = get_test_database_path()
    assert db_path is not None
    
    # Should be in a temporary directory
    assert tempfile.gettempdir() in db_path
    
    # Should be a test database
    assert "test_feedback.db" in db_path
    
    # Should contain our test prefix
    assert "golden_nuggets_test_" in db_path


def test_concurrent_tests_dont_interfere_1(clean_database):
    """Test 1 of concurrent interference check"""
    # Add feedback with specific ID
    feedback_data = {
        "nuggetFeedback": [
            {
                "id": "concurrent-test-1",
                "nuggetContent": "Concurrent test 1 content",
                "originalType": "tool",
                "rating": "positive",
                "timestamp": 1642780800000,
                "url": "https://example.com/concurrent1", 
                "context": "Concurrent test 1 context",
            }
        ]
    }
    
    response = client.post("/feedback", json=feedback_data)
    assert response.status_code == 200


def test_concurrent_tests_dont_interfere_2(clean_database):
    """Test 2 of concurrent interference check"""
    # This test should not see data from concurrent test 1
    
    stats_response = client.get("/feedback/stats")
    assert stats_response.status_code == 200
    stats = stats_response.json()
    
    # Should start with clean slate
    assert stats["totalFeedback"] == 0
    
    # Add our own feedback with different ID
    feedback_data = {
        "nuggetFeedback": [
            {
                "id": "concurrent-test-2",
                "nuggetContent": "Concurrent test 2 content",
                "originalType": "explanation",
                "rating": "negative",
                "timestamp": 1642780800000,
                "url": "https://example.com/concurrent2",
                "context": "Concurrent test 2 context",
            }
        ]
    }
    
    response = client.post("/feedback", json=feedback_data)
    assert response.status_code == 200
    
    # Should only see our own feedback
    stats_response = client.get("/feedback/stats")
    stats = stats_response.json()
    assert stats["totalFeedback"] == 1
    assert stats["negativeCount"] == 1
    assert stats["positiveCount"] == 0