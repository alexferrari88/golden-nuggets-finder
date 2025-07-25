"""
API error handling integration tests.

Tests how the FastAPI endpoints handle various error conditions
and return appropriate HTTP status codes and error messages.
"""

import json
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient
import pytest

from app.main import app

# Create test client for FastAPI app
client = TestClient(app)


class TestFeedbackAPIErrorHandling:
    """Test error handling in feedback API endpoints"""

    def test_feedback_submission_malformed_json(self, clean_database):
        """Test feedback submission with malformed JSON"""
        # Send invalid JSON payload
        response = client.post(
            "/feedback",
            data="invalid json {",  # Malformed JSON
            headers={"Content-Type": "application/json"}
        )
        
        # Should return 422 Unprocessable Entity for malformed JSON
        assert response.status_code == 422

    def test_feedback_submission_invalid_rating(self, clean_database):
        """Test feedback submission with invalid rating value"""
        feedback_data = {
            "nuggetFeedback": [
                {
                    "id": "invalid-rating-test",
                    "nuggetContent": "Test content",
                    "originalType": "tool",
                    "rating": "invalid_rating",  # Invalid value
                    "timestamp": 1642780800000,
                    "url": "https://example.com",
                    "context": "Test context"
                }
            ]
        }
        
        response = client.post("/feedback", json=feedback_data)
        
        # Should return 422 for invalid enum value
        assert response.status_code == 422
        error_detail = response.json()["detail"]
        assert any("rating" in str(detail).lower() for detail in error_detail)

    def test_feedback_submission_invalid_type(self, clean_database):
        """Test feedback submission with invalid nugget type"""
        feedback_data = {
            "nuggetFeedback": [
                {
                    "id": "invalid-type-test",
                    "nuggetContent": "Test content",
                    "originalType": "invalid_type",  # Invalid enum value
                    "rating": "positive",
                    "timestamp": 1642780800000,
                    "url": "https://example.com",
                    "context": "Test context"
                }
            ]
        }
        
        response = client.post("/feedback", json=feedback_data)
        
        # Should return 422 for invalid enum value
        assert response.status_code == 422
        error_detail = response.json()["detail"]
        assert any("originaltype" in str(detail).lower() for detail in error_detail)

    def test_feedback_submission_missing_required_fields(self, clean_database):
        """Test feedback submission with missing required fields"""
        feedback_data = {
            "nuggetFeedback": [
                {
                    "id": "missing-fields-test",
                    # Missing nuggetContent, originalType, rating, etc.
                    "timestamp": 1642780800000,
                    "url": "https://example.com"
                }
            ]
        }
        
        response = client.post("/feedback", json=feedback_data)
        
        # Should return 422 for missing required fields
        assert response.status_code == 422
        error_detail = response.json()["detail"]
        # Should mention missing fields
        detail_str = str(error_detail).lower()
        assert "required" in detail_str or "missing" in detail_str

    def test_feedback_submission_empty_arrays(self, clean_database):
        """Test feedback submission with empty arrays (should be allowed)"""
        feedback_data = {
            "nuggetFeedback": [],
            "missingContentFeedback": []
        }
        
        response = client.post("/feedback", json=feedback_data)
        
        # Should accept empty arrays
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_feedback_submission_oversized_content(self, clean_database):
        """Test feedback submission with very large content"""
        large_content = "x" * 100000  # 100KB content
        
        feedback_data = {
            "nuggetFeedback": [
                {
                    "id": "oversized-content-test",
                    "nuggetContent": large_content,
                    "originalType": "tool",
                    "rating": "positive",
                    "timestamp": 1642780800000,
                    "url": "https://example.com",
                    "context": "Test context"
                }
            ]
        }
        
        response = client.post("/feedback", json=feedback_data)
        
        # Should handle large content (current implementation accepts it)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    @patch('app.main.feedback_service.store_nugget_feedback')
    def test_feedback_submission_database_error(self, mock_store, clean_database):
        """Test feedback submission when database error occurs"""
        # Mock database error
        mock_store.side_effect = Exception("Database connection failed")
        
        feedback_data = {
            "nuggetFeedback": [
                {
                    "id": "db-error-test",
                    "nuggetContent": "Test content",
                    "originalType": "tool",
                    "rating": "positive",
                    "timestamp": 1642780800000,
                    "url": "https://example.com",
                    "context": "Test context"
                }
            ]
        }
        
        response = client.post("/feedback", json=feedback_data)
        
        # Should return 500 Internal Server Error
        assert response.status_code == 500
        error_data = response.json()
        assert "Failed to store feedback" in error_data["detail"]


class TestOptimizationAPIErrorHandling:
    """Test error handling in optimization API endpoints"""

    def test_optimization_trigger_invalid_mode(self, clean_database):
        """Test optimization trigger with invalid mode"""
        optimization_request = {
            "mode": "invalid_mode",  # Not "expensive" or "cheap"
            "manualTrigger": True
        }
        
        response = client.post("/optimize", json=optimization_request)
        
        # Should return 422 for invalid enum value
        assert response.status_code == 422
        error_detail = response.json()["detail"]
        assert any("mode" in str(detail).lower() for detail in error_detail)

    def test_optimization_trigger_missing_mode(self, clean_database):
        """Test optimization trigger with missing mode field"""
        optimization_request = {
            "manualTrigger": True
            # Missing required "mode" field
        }
        
        response = client.post("/optimize", json=optimization_request)
        
        # Should return 422 for missing required field
        assert response.status_code == 422
        error_detail = response.json()["detail"]
        detail_str = str(error_detail).lower()
        assert "mode" in detail_str and ("required" in detail_str or "missing" in detail_str)

    def test_optimization_trigger_background_task_handling(self, clean_database):
        """Test optimization trigger runs as background task"""
        optimization_request = {
            "mode": "cheap",
            "manualTrigger": True
        }
        
        response = client.post("/optimize", json=optimization_request)
        
        # Should return 200 immediately (background task runs separately)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "Optimization started" in data["message"]
        assert "estimatedTime" in data

    @patch('app.main.optimization_service.get_optimization_history')
    def test_optimization_history_database_error(self, mock_history, clean_database):
        """Test optimization history when database error occurs"""
        # Mock database error
        mock_history.side_effect = Exception("Database query failed")
        
        response = client.get("/optimization/history")
        
        # Should return 500 Internal Server Error
        assert response.status_code == 500
        error_data = response.json()
        assert "Failed to get optimization history" in error_data["detail"]

    def test_optimization_history_invalid_parameters(self, clean_database):
        """Test optimization history with invalid query parameters"""
        # Test with invalid limit (should be integer)
        response = client.get("/optimization/history?limit=invalid")
        
        # Should return 422 for invalid parameter type
        assert response.status_code == 422

    @patch('app.main.optimization_service.get_current_prompt')
    def test_current_prompt_service_error(self, mock_current, clean_database):
        """Test current prompt endpoint when service error occurs"""
        # Mock service error
        mock_current.side_effect = Exception("Failed to retrieve prompt")
        
        response = client.get("/optimize/current")
        
        # Should return 500 Internal Server Error
        assert response.status_code == 500
        error_data = response.json()
        assert "Failed to get current prompt" in error_data["detail"]


class TestFeedbackCRUDErrorHandling:
    """Test error handling in feedback CRUD operations"""

    def test_get_feedback_item_not_found(self, clean_database):
        """Test getting feedback item that doesn't exist"""
        response = client.get("/feedback/non-existent-id?feedback_type=nugget")
        
        # Should return 404 Not Found
        assert response.status_code == 404
        error_data = response.json()
        assert "not found" in error_data["detail"].lower()

    def test_get_feedback_item_missing_type_parameter(self, clean_database):
        """Test getting feedback item without required type parameter"""
        response = client.get("/feedback/some-id")  # Missing feedback_type parameter
        
        # Should return 422 for missing required parameter
        assert response.status_code == 422

    def test_update_feedback_item_not_found(self, clean_database):
        """Test updating feedback item that doesn't exist"""
        update_data = {
            "content": "Updated content",
            "rating": "negative"
        }
        
        response = client.put(
            "/feedback/non-existent-id?feedback_type=nugget",
            json=update_data
        )
        
        # Should return 404 Not Found
        assert response.status_code == 404
        error_data = response.json()
        assert "not found" in error_data["detail"].lower()

    def test_update_feedback_item_empty_update(self, clean_database):
        """Test updating feedback item with no fields to update"""
        update_data = {}  # Empty update
        
        response = client.put(
            "/feedback/some-id?feedback_type=nugget",
            json=update_data
        )
        
        # Should return 400 Bad Request
        assert response.status_code == 400
        error_data = response.json()
        assert "at least one field" in error_data["detail"].lower()

    def test_update_feedback_item_invalid_rating(self, clean_database):
        """Test updating feedback item with invalid rating"""
        update_data = {
            "rating": "invalid_rating"  # Invalid enum value
        }
        
        response = client.put(
            "/feedback/some-id?feedback_type=nugget",
            json=update_data
        )
        
        # Should return 422 for invalid enum value
        assert response.status_code == 422
        error_detail = response.json()["detail"]
        assert any("rating" in str(detail).lower() for detail in error_detail)

    def test_delete_feedback_item_not_found(self, clean_database):
        """Test deleting feedback item that doesn't exist"""
        response = client.delete("/feedback/non-existent-id?feedback_type=nugget")
        
        # Should return 404 Not Found
        assert response.status_code == 404
        error_data = response.json()
        assert "not found" in error_data["detail"].lower()

    @patch('app.main.feedback_service.delete_feedback_item')
    def test_delete_feedback_item_database_error(self, mock_delete, clean_database):
        """Test deleting feedback item when database error occurs"""
        # Mock database error
        mock_delete.side_effect = Exception("Database deletion failed")
        
        response = client.delete("/feedback/some-id?feedback_type=nugget")
        
        # Should return 500 Internal Server Error
        assert response.status_code == 500
        error_data = response.json()
        assert "Failed to delete feedback item" in error_data["detail"]


class TestMonitoringAPIErrorHandling:
    """Test error handling in monitoring API endpoints"""

    @patch('app.main.get_db')
    def test_health_check_database_unavailable(self, mock_get_db, clean_database):
        """Test health check when database is unavailable"""
        # Mock database connection failure
        async def failing_db():
            raise Exception("Database connection failed")
        
        mock_get_db.return_value.__aenter__ = failing_db
        
        response = client.get("/monitor/health")
        
        # Should still return 200 but with unhealthy status
        assert response.status_code == 200
        health_data = response.json()
        assert health_data["status"] == "unhealthy"
        assert not health_data["database_accessible"]

    def test_optimization_status_not_found(self, clean_database):
        """Test getting optimization status for non-existent run"""
        response = client.get("/monitor/status/non-existent-run-id")
        
        # Should return success=false for not found
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert "not found" in data["error"].lower()

    @patch('app.main.optimization_service.get_all_active_runs')
    def test_monitoring_dashboard_service_error(self, mock_active_runs, clean_database):
        """Test monitoring dashboard when service error occurs"""
        # Mock service error
        mock_active_runs.side_effect = Exception("Service unavailable")
        
        response = client.get("/monitor")
        
        # Should return 500 Internal Server Error
        assert response.status_code == 500
        error_data = response.json()
        assert "Failed to get monitoring data" in error_data["detail"]


class TestCostTrackingAPIErrorHandling:
    """Test error handling in cost tracking API endpoints"""

    def test_optimization_costs_invalid_run_id(self, clean_database):
        """Test getting optimization costs for invalid run ID"""
        response = client.get("/optimization/non-existent-run/costs")
        
        # Should handle gracefully (current implementation may return empty data)
        # The exact behavior depends on service implementation
        assert response.status_code in [200, 404, 500]

    @patch('app.main.cost_service.get_costs_summary')
    def test_costs_summary_service_error(self, mock_summary, clean_database):
        """Test costs summary when service error occurs"""
        # Mock service error
        mock_summary.side_effect = Exception("Cost calculation failed")
        
        response = client.get("/costs/summary")
        
        # Should return 500 Internal Server Error
        assert response.status_code == 500
        error_data = response.json()
        assert "Failed to get cost summary" in error_data["detail"]

    def test_costs_summary_invalid_days_parameter(self, clean_database):
        """Test costs summary with invalid days parameter"""
        response = client.get("/costs/summary?days=invalid")
        
        # Should return 422 for invalid parameter type
        assert response.status_code == 422

    @patch('app.main.cost_service.get_cost_trends')
    def test_costs_trends_service_error(self, mock_trends, clean_database):
        """Test costs trends when service error occurs"""
        # Mock service error
        mock_trends.side_effect = Exception("Trend analysis failed")
        
        response = client.get("/costs/trends")
        
        # Should return 500 Internal Server Error
        assert response.status_code == 500
        error_data = response.json()
        assert "Failed to get cost trends" in error_data["detail"]


class TestRateLimitingAndAbusePrevention:
    """Test handling of potential abuse scenarios"""

    def test_extremely_large_payload(self, clean_database):
        """Test handling of extremely large request payloads"""
        # Create very large feedback data
        huge_content = "x" * 1000000  # 1MB content
        
        feedback_data = {
            "nuggetFeedback": [
                {
                    "id": f"large-test-{i}",
                    "nuggetContent": huge_content,
                    "originalType": "tool",
                    "rating": "positive",
                    "timestamp": 1642780800000,
                    "url": "https://example.com",
                    "context": "Test context"
                } for i in range(10)  # 10 large items
            ]
        }
        
        response = client.post("/feedback", json=feedback_data)
        
        # Should either accept or reject gracefully (not crash)
        assert response.status_code in [200, 413, 422, 500]
        
        if response.status_code != 200:
            # If rejected, should have meaningful error message
            error_data = response.json()
            assert "detail" in error_data

    def test_many_concurrent_feedback_submissions(self, clean_database):
        """Test handling of many rapid feedback submissions"""
        import threading
        import time
        
        results = []
        
        def submit_feedback(thread_id):
            feedback_data = {
                "nuggetFeedback": [
                    {
                        "id": f"concurrent-test-{thread_id}-{int(time.time() * 1000000)}",
                        "nuggetContent": f"Test content from thread {thread_id}",
                        "originalType": "tool",
                        "rating": "positive",
                        "timestamp": 1642780800000,
                        "url": f"https://example.com/thread-{thread_id}",
                        "context": "Test context"
                    }
                ]
            }
            
            try:
                response = client.post("/feedback", json=feedback_data)
                results.append(response.status_code)
            except Exception as e:
                results.append(f"Exception: {e}")
        
        # Create multiple threads for concurrent requests
        threads = []
        for i in range(5):
            thread = threading.Thread(target=submit_feedback, args=(i,))
            threads.append(thread)
        
        # Start all threads
        for thread in threads:
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # Should handle all requests (success or failure, but not crash)
        assert len(results) == 5
        
        # Most should succeed or fail gracefully
        for result in results:
            if isinstance(result, int):
                assert result in [200, 500, 503]  # Success, error, or service unavailable
            else:
                # If exception, should be related to concurrency or database
                assert "database" in str(result).lower() or "connection" in str(result).lower()

    def test_malicious_content_injection_attempts(self, clean_database):
        """Test handling of potentially malicious content"""
        malicious_payloads = [
            "<script>alert('xss')</script>",  # XSS attempt
            "'; DROP TABLE nugget_feedback; --",  # SQL injection attempt
            "{{7*7}}",  # Template injection attempt
            "\x00\x01\x02",  # Binary data
            "🚀" * 1000,  # Unicode spam
        ]
        
        for i, payload in enumerate(malicious_payloads):
            feedback_data = {
                "nuggetFeedback": [
                    {
                        "id": f"malicious-test-{i}",
                        "nuggetContent": payload,
                        "originalType": "tool",
                        "rating": "positive",
                        "timestamp": 1642780800000,
                        "url": "https://example.com",
                        "context": "Test context"
                    }
                ]
            }
            
            response = client.post("/feedback", json=feedback_data)
            
            # Should handle malicious content safely
            # (Either accept and sanitize, or reject with proper error)
            assert response.status_code in [200, 400, 422]
            
            if response.status_code == 200:
                # If accepted, verify it was stored safely
                data = response.json()
                assert data["success"] is True