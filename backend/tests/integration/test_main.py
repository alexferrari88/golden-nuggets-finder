"""
Integration tests for the FastAPI backend API endpoints.

Tests the complete request/response cycle including database operations.
"""

import uuid

from fastapi.testclient import TestClient

from app.main import app

# Create test client for FastAPI app
client = TestClient(app)


def test_health_check():
    """Test the health check endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    assert "Golden Nuggets Feedback API" in response.json()["message"]


def test_feedback_stats_endpoint(clean_database):
    """Test getting feedback stats"""
    response = client.get("/feedback/stats")
    assert response.status_code == 200
    data = response.json()

    # Check required fields are present
    assert "totalFeedback" in data
    assert "positiveCount" in data
    assert "negativeCount" in data
    assert "shouldOptimize" in data
    assert "nextOptimizationTrigger" in data


def test_feedback_submission_empty(clean_database):
    """Test submitting empty feedback"""
    response = client.post("/feedback", json={})
    assert response.status_code == 200


def test_feedback_submission_valid(clean_database):
    """Test submitting valid feedback"""
    feedback_data = {
        "nuggetFeedback": [
            {
                "id": "test-1",
                "nuggetContent": "This is a test nugget content for validation testing purposes.",
                "originalType": "tool",
                "correctedType": None,
                "rating": "positive",
                "timestamp": 1642780800000,
                "url": "https://example.com/test",
                "context": "Test context for the nugget feedback validation system.",
                "modelProvider": "gemini",
                "modelName": "gemini-2.5-flash",
            }
        ],
        "missingContentFeedback": [
            {
                "id": "missing-1",
                "content": "This content should have been identified as a golden nugget",
                "suggestedType": "explanation",
                "timestamp": 1642780800000,
                "url": "https://example.com/test",
                "context": "Test page context for missing content identification",
                "modelProvider": "gemini",
                "modelName": "gemini-2.5-flash",
            }
        ],
    }

    response = client.post("/feedback", json=feedback_data)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True


def test_optimization_trigger(clean_database):
    """Test manual optimization trigger"""
    optimization_request = {"mode": "cheap", "manualTrigger": True}

    response = client.post("/optimize", json=optimization_request)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "Optimization started" in data["message"]


def test_optimization_history(clean_database):
    """Test getting optimization history"""
    response = client.get("/optimization/history")
    assert response.status_code == 200
    data = response.json()
    assert "runs" in data
    assert isinstance(data["runs"], list)
    assert "performance_trends" in data
    assert "total_count" in data
    assert "has_more" in data


def test_current_prompt(clean_database):
    """Test getting current optimized prompt"""
    response = client.get("/optimize/current")
    assert response.status_code == 200
    data = response.json()

    # Should have required fields even if no optimization has run
    assert "id" in data
    assert "version" in data
    assert "prompt" in data


def test_update_feedback_item(clean_database):
    """Test updating a feedback item"""
    # Use unique ID for each test run
    test_id = f"update-test-{uuid.uuid4()}"

    # First, submit feedback to have something to update
    feedback_data = {
        "nuggetFeedback": [
            {
                "id": test_id,
                "nuggetContent": "Original content for update testing",
                "originalType": "tool",
                "correctedType": None,
                "rating": "positive",
                "timestamp": 1642780800000,
                "url": "https://example.com/update-test",
                "context": "Original context for update testing",
                "modelProvider": "gemini",
                "modelName": "gemini-2.5-flash",
            }
        ]
    }

    # Submit the feedback
    response = client.post("/feedback", json=feedback_data)
    assert response.status_code == 200

    # Now update the feedback item
    update_data = {
        "content": "Updated content for update testing",
        "rating": "negative",
    }

    response = client.put(f"/feedback/{test_id}?feedback_type=nugget", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["message"] == "Feedback item updated successfully"
    assert "content" in data["updated_fields"]
    assert "rating" in data["updated_fields"]


def test_update_feedback_item_not_found(clean_database):
    """Test updating a non-existent feedback item"""
    update_data = {"content": "This should fail", "rating": "positive"}

    response = client.put(
        "/feedback/non-existent-id?feedback_type=nugget", json=update_data
    )
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_update_feedback_item_empty_update(clean_database):
    """Test updating feedback item with no fields"""
    update_data = {}

    response = client.put("/feedback/some-id?feedback_type=nugget", json=update_data)
    assert response.status_code == 400
    assert "At least one field must be provided" in response.json()["detail"]


def test_delete_feedback_item(clean_database):
    """Test deleting a feedback item"""
    # Use unique ID for each test run
    test_id = f"delete-test-{uuid.uuid4()}"

    # First, submit feedback to have something to delete
    feedback_data = {
        "missingContentFeedback": [
            {
                "id": test_id,
                "content": "Content to be deleted",
                "suggestedType": "explanation",
                "timestamp": 1642780800000,
                "url": "https://example.com/delete-test",
                "context": "Context for deletion testing",
                "modelProvider": "gemini",
                "modelName": "gemini-2.5-flash",
            }
        ]
    }

    # Submit the feedback
    response = client.post("/feedback", json=feedback_data)
    assert response.status_code == 200

    # Now delete the feedback item
    response = client.delete(f"/feedback/{test_id}?feedback_type=missing_content")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["message"] == "Feedback item deleted successfully"

    # Verify it's actually deleted by trying to get details
    response = client.get(f"/feedback/{test_id}?feedback_type=missing_content")
    assert response.status_code == 404


def test_delete_feedback_item_not_found(clean_database):
    """Test deleting a non-existent feedback item"""
    response = client.delete("/feedback/non-existent-id?feedback_type=nugget")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_feedback_update_scenario(clean_database):
    """Test the main user scenario: thumbs up → type correction"""
    # Use unique ID for this test
    test_id = f"update-scenario-{uuid.uuid4()}"

    # Step 1: User gives thumbs up to a nugget
    initial_feedback = {
        "nuggetFeedback": [
            {
                "id": test_id,
                "nuggetContent": "Use pytest for comprehensive testing in Python projects",
                "originalType": "tool",
                "correctedType": None,  # No correction initially
                "rating": "positive",  # User likes it
                "timestamp": 1642780800000,
                "url": "https://example.com/testing-guide",
                "context": "Testing is essential for reliable software development.",
                "modelProvider": "gemini",
                "modelName": "gemini-2.5-flash",
            }
        ]
    }

    # Submit initial feedback (should be "new")
    response = client.post("/feedback", json=initial_feedback)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True

    # Should have no deduplication message (new feedback)
    dedup = data["deduplication"]
    assert dedup["nugget_duplicates"] == 0
    assert dedup["nugget_updates"] == 0
    assert dedup["total_submitted"] == 1
    assert dedup["user_message"] is None  # No special message for new feedback

    # Step 2: User realizes the type is wrong and submits a correction
    correction_feedback = {
        "nuggetFeedback": [
            {
                "id": f"correction-{uuid.uuid4()}",  # Different ID (represents new submission)
                "nuggetContent": "Use pytest for comprehensive testing in Python projects",  # Same content
                "originalType": "tool",  # Same original type
                "correctedType": "explanation",  # User corrects the type
                "rating": "positive",  # Still positive
                "timestamp": 1642780800000,
                "url": "https://example.com/testing-guide",  # Same URL
                "context": "Testing is essential for reliable software development.",  # Same context
                "modelProvider": "gemini",
                "modelName": "gemini-2.5-flash",
            }
        ]
    }

    # Submit correction (should be "updated")
    response = client.post("/feedback", json=correction_feedback)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True

    # Should show update message, not duplicate
    dedup = data["deduplication"]
    assert dedup["nugget_duplicates"] == 0  # Not a duplicate
    assert dedup["nugget_updates"] == 1  # This is an update
    assert dedup["total_submitted"] == 1
    assert "updated with the new information" in dedup["user_message"]
    assert "Thank you for the correction" in dedup["user_message"]


def test_feedback_rating_change_scenario(clean_database):
    """Test user changing rating from positive to negative"""
    test_id = f"rating-change-{uuid.uuid4()}"

    # Step 1: User gives positive rating
    positive_feedback = {
        "nuggetFeedback": [
            {
                "id": test_id,
                "nuggetContent": "Always use global variables for data sharing",
                "originalType": "tool",
                "correctedType": None,
                "rating": "positive",
                "timestamp": 1642780800000,
                "url": "https://example.com/bad-advice",
                "context": "Some programming advice that might not be great.",
                "modelProvider": "gemini",
                "modelName": "gemini-2.5-flash",
            }
        ]
    }

    response = client.post("/feedback", json=positive_feedback)
    assert response.status_code == 200

    # Step 2: User realizes this is bad advice and changes to negative
    negative_feedback = {
        "nuggetFeedback": [
            {
                "id": f"negative-{uuid.uuid4()}",
                "nuggetContent": "Always use global variables for data sharing",  # Same content
                "originalType": "tool",
                "correctedType": None,
                "rating": "negative",  # Changed rating
                "timestamp": 1642780800000,
                "url": "https://example.com/bad-advice",
                "context": "Some programming advice that might not be great.",
                "modelProvider": "gemini",
                "modelName": "gemini-2.5-flash",
            }
        ]
    }

    response = client.post("/feedback", json=negative_feedback)
    assert response.status_code == 200
    data = response.json()

    # Should be treated as update, not duplicate
    dedup = data["deduplication"]
    assert dedup["nugget_duplicates"] == 0
    assert dedup["nugget_updates"] == 1
    assert "updated with the new information" in dedup["user_message"]


def test_mixed_update_duplicate_scenario(clean_database):
    """Test batch submission with mix of updates, duplicates, and new items"""
    # Step 1: Submit ONE nugget
    original_data = {
        "nuggetContent": "Use version control for all projects",
        "originalType": "tool",
        "correctedType": None,
        "rating": "positive",
        "timestamp": 1642780800000,
        "url": "https://example.com/git-guide",
        "context": "Version control is essential for development.",
        "modelProvider": "gemini",
        "modelName": "gemini-2.5-flash",
    }

    initial_feedback = {"nuggetFeedback": [{"id": "original-id", **original_data}]}

    response = client.post("/feedback", json=initial_feedback)
    assert response.status_code == 200

    # Step 2: Submit ONE duplicate (same as original)
    duplicate_feedback = {
        "nuggetFeedback": [
            {
                "id": "duplicate-id",
                **original_data,  # Exactly the same as original
            }
        ]
    }

    response = client.post("/feedback", json=duplicate_feedback)
    assert response.status_code == 200
    assert response.json()["deduplication"]["nugget_duplicates"] == 1

    # Step 3: Submit ONE update (after duplicate)
    update_feedback = {
        "nuggetFeedback": [
            {
                "id": "update-id",
                **original_data,
                "correctedType": "explanation",  # Only difference
            }
        ]
    }

    response = client.post("/feedback", json=update_feedback)
    assert response.status_code == 200
    assert response.json()["deduplication"]["nugget_updates"] == 1


def test_api_response_messages(clean_database):
    """Test that API returns correct user messages for different scenarios"""
    base_id = f"messages-{uuid.uuid4()}"

    # Test 1: Pure duplicate message
    duplicate_feedback = {
        "nuggetFeedback": [
            {
                "id": f"{base_id}-orig",
                "nuggetContent": "Test duplicate message",
                "originalType": "tool",
                "correctedType": None,
                "rating": "positive",
                "timestamp": 1642780800000,
                "url": "https://example.com/test",
                "context": "Test context for duplicate detection.",
                "modelProvider": "gemini",
                "modelName": "gemini-2.5-flash",
            }
        ]
    }

    # Submit twice with identical data
    client.post("/feedback", json=duplicate_feedback)

    # Change ID but keep everything else the same (simulate exact duplicate)
    duplicate_feedback["nuggetFeedback"][0]["id"] = f"{base_id}-dup"
    response = client.post("/feedback", json=duplicate_feedback)
    data = response.json()

    # Should get duplicate message
    assert "already submitted previously" in data["deduplication"]["user_message"]

    # Test 2: Pure update message
    update_feedback = {
        "nuggetFeedback": [
            {
                "id": f"{base_id}-update",
                "nuggetContent": "Test duplicate message",  # Same content
                "originalType": "tool",
                "correctedType": "explanation",  # Different type (update)
                "rating": "positive",
                "timestamp": 1642780800000,
                "url": "https://example.com/test",
                "context": "Test context for duplicate detection.",
                "modelProvider": "gemini",
                "modelName": "gemini-2.5-flash",
            }
        ]
    }

    response = client.post("/feedback", json=update_feedback)
    data = response.json()

    # Should get update message
    message = data["deduplication"]["user_message"]
    assert "updated with the new information" in message
    assert "Thank you for the correction" in message
