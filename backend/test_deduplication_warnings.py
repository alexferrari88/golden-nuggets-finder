#!/usr/bin/env python3
"""
Test script for deduplication warning system.

Tests the enhanced feedback API to verify that duplicate submissions
generate appropriate user-friendly warning messages.
"""

import requests
import json
from datetime import datetime

# Backend API URL
BASE_URL = "http://localhost:7532"


def test_duplicate_feedback():
    """Test duplicate feedback submission and deduplication warnings"""

    print("=== Testing Deduplication Warning System ===\n")

    # Test data for duplicate submission
    feedback_data = {
        "nuggetFeedback": [
            {
                "id": "test-nugget-001",
                "nuggetContent": "Use pytest-mock for better test mocking in Python projects",
                "originalType": "tool",
                "correctedType": None,
                "rating": "positive",
                "timestamp": int(datetime.now().timestamp() * 1000),
                "url": "https://example.com/test-page",
                "context": "When writing unit tests in Python, pytest-mock provides a cleaner interface for mocking compared to unittest.mock. It integrates seamlessly with pytest fixtures.",
            }
        ],
        "missingContentFeedback": [
            {
                "id": "test-missing-001",
                "content": "Consider using dataclasses for structured data in Python",
                "suggestedType": "tool",
                "timestamp": int(datetime.now().timestamp() * 1000),
                "url": "https://example.com/test-page",
                "context": "Python's dataclasses module provides a decorator and functions for automatically adding generated special methods to user-defined classes.",
            }
        ],
    }

    # Submit feedback first time (should be new)
    print("1. Submitting feedback for the first time...")
    response = requests.post(f"{BASE_URL}/feedback", json=feedback_data)

    if response.status_code == 200:
        result = response.json()
        print("✅ First submission successful")
        print(f"   Response: {result['message']}")

        dedup = result.get("deduplication", {})
        print(f"   Nugget duplicates: {dedup.get('nugget_duplicates', 0)}")
        print(
            f"   Missing content duplicates: {dedup.get('missing_content_duplicates', 0)}"
        )

        if dedup.get("user_message"):
            print(f"   User message: {dedup['user_message']}")
        else:
            print("   No deduplication message (expected for first submission)")
    else:
        print(f"❌ First submission failed: {response.status_code}")
        print(f"   Error: {response.text}")
        return

    print("\n" + "=" * 60 + "\n")

    # Submit the SAME feedback again (should be detected as duplicate)
    print("2. Submitting the same feedback again (should detect duplicates)...")
    response = requests.post(f"{BASE_URL}/feedback", json=feedback_data)

    if response.status_code == 200:
        result = response.json()
        print("✅ Second submission successful")
        print(f"   Response: {result['message']}")

        dedup = result.get("deduplication", {})
        print(f"   Nugget duplicates: {dedup.get('nugget_duplicates', 0)}")
        print(
            f"   Missing content duplicates: {dedup.get('missing_content_duplicates', 0)}"
        )

        if dedup.get("user_message"):
            print(f"   🔔 User message: {dedup['user_message']}")
            print("   ✅ Deduplication warning system working!")
        else:
            print("   ❌ No deduplication message (this should have been detected)")

        # Check duplicate details
        if dedup.get("duplicate_details"):
            print(f"   Duplicate details: {len(dedup['duplicate_details'])} items")
            for i, detail in enumerate(dedup["duplicate_details"]):
                print(f"     {i + 1}. {detail['type']}: {detail['content'][:50]}...")
                print(f"        Report count: {detail['report_count']}")
    else:
        print(f"❌ Second submission failed: {response.status_code}")
        print(f"   Error: {response.text}")
        return

    print("\n" + "=" * 60 + "\n")

    # Submit one more time to test higher counts
    print("3. Submitting the same feedback a third time (testing higher counts)...")
    response = requests.post(f"{BASE_URL}/feedback", json=feedback_data)

    if response.status_code == 200:
        result = response.json()
        print("✅ Third submission successful")

        dedup = result.get("deduplication", {})
        if dedup.get("user_message"):
            print(f"   🔔 User message: {dedup['user_message']}")

        # Check that counts increased
        if dedup.get("duplicate_details"):
            for detail in dedup["duplicate_details"]:
                print(f"   Report count for {detail['type']}: {detail['report_count']}")
    else:
        print(f"❌ Third submission failed: {response.status_code}")
        print(f"   Error: {response.text}")


def test_mixed_duplicate_scenario():
    """Test scenario with mixed new and duplicate feedback"""

    print("\n" + "=" * 60 + "\n")
    print("4. Testing mixed scenario (1 new, 1 duplicate)...")

    # Submit feedback with one new item and one that already exists
    mixed_data = {
        "nuggetFeedback": [
            {
                "id": "test-nugget-001",  # This should be duplicate
                "nuggetContent": "Use pytest-mock for better test mocking in Python projects",
                "originalType": "tool",
                "correctedType": None,
                "rating": "positive",
                "timestamp": int(datetime.now().timestamp() * 1000),
                "url": "https://example.com/test-page",
                "context": "When writing unit tests in Python, pytest-mock provides a cleaner interface for mocking compared to unittest.mock.",
            },
            {
                "id": "test-nugget-002",  # This should be new
                "nuggetContent": "Use Black for consistent Python code formatting",
                "originalType": "tool",
                "correctedType": None,
                "rating": "positive",
                "timestamp": int(datetime.now().timestamp() * 1000),
                "url": "https://example.com/test-page",
                "context": "Black is an opinionated Python code formatter that handles formatting automatically.",
            },
        ]
    }

    response = requests.post(f"{BASE_URL}/feedback", json=mixed_data)

    if response.status_code == 200:
        result = response.json()
        print("✅ Mixed submission successful")

        dedup = result.get("deduplication", {})
        print(f"   Total submitted: {dedup.get('total_submitted', 0)}")
        print(f"   Nugget duplicates: {dedup.get('nugget_duplicates', 0)}")

        if dedup.get("user_message"):
            print(f"   🔔 User message: {dedup['user_message']}")
        else:
            print("   No deduplication message")
    else:
        print(f"❌ Mixed submission failed: {response.status_code}")


if __name__ == "__main__":
    try:
        test_duplicate_feedback()
        test_mixed_duplicate_scenario()
        print("\n🎉 All deduplication warning tests completed!")
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to backend. Is it running on localhost:7532?")
        print("   Try: docker-compose --profile dev up backend-dev")
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
