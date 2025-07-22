"""
Basic tests for the FastAPI backend.
"""

import asyncio

from fastapi.testclient import TestClient
import pytest

from app.database import init_database
from app.main import app

client = TestClient(app)


@pytest.fixture
def setup_database():
    """Initialize test database"""
    asyncio.run(init_database())


def test_health_check():
    """Test the health check endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    assert "Golden Nuggets Feedback API" in response.json()["message"]


def test_feedback_stats_endpoint():
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


def test_feedback_submission_empty():
    """Test submitting empty feedback"""
    response = client.post("/feedback", json={})
    assert response.status_code == 200


def test_feedback_submission_valid(setup_database):
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
            }
        ],
    }

    response = client.post("/feedback", json=feedback_data)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True


def test_optimization_trigger():
    """Test manual optimization trigger"""
    optimization_request = {"mode": "cheap", "manualTrigger": True}

    response = client.post("/optimize", json=optimization_request)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "Optimization started" in data["message"]


def test_optimization_history():
    """Test getting optimization history"""
    response = client.get("/optimize/history")
    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert isinstance(data["data"], list)


def test_current_prompt():
    """Test getting current optimized prompt"""
    response = client.get("/optimize/current")
    assert response.status_code == 200
    data = response.json()

    # Should have required fields even if no optimization has run
    assert "id" in data
    assert "version" in data
    assert "prompt" in data
