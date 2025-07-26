#!/usr/bin/env python3
"""
Quick test runner for error handling tests.

Run all error handling tests to verify system resilience.
"""

import os
import subprocess
import sys


def run_tests():
    """Run all error handling tests"""
    print("🧪 Running Error Handling Tests")
    print("=" * 50)

    # Change to backend directory
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(backend_dir)

    test_files = [
        "tests/unit/test_error_handling.py",
        "tests/integration/test_api_error_handling.py",
    ]

    # Run unit tests
    print("\n🔬 Unit Tests - Service Layer Error Handling")
    print("-" * 50)
    result1 = subprocess.run(
        [
            "python",
            "-m",
            "pytest",
            "tests/unit/test_error_handling.py",
            "-v",
            "--tb=short",
        ],
        capture_output=False,
    )

    # Run integration tests
    print("\n🌐 Integration Tests - API Error Handling")
    print("-" * 50)
    result2 = subprocess.run(
        [
            "python",
            "-m",
            "pytest",
            "tests/integration/test_api_error_handling.py",
            "-v",
            "--tb=short",
        ],
        capture_output=False,
    )

    # Summary
    print("\n📊 Test Summary")
    print("=" * 50)

    total_success = result1.returncode == 0 and result2.returncode == 0

    if total_success:
        print("✅ All error handling tests passed!")
        print("\n🎯 System Resilience Demonstrated:")
        print("   • Database error scenarios")
        print("   • External service failures")
        print("   • Malformed input validation")
        print("   • Concurrent operation handling")
        print("   • Resource constraint management")
        print("   • API error responses")
        print("   • Security and abuse prevention")
    else:
        print("❌ Some tests failed - check output above")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(run_tests())
