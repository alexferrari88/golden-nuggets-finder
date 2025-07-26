#!/usr/bin/env python3
"""
Diagnostic script to check database configuration and test isolation.

Run this script to verify that database isolation is working correctly.
"""

import os
from pathlib import Path
import sys
import tempfile

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import (
    DATABASE_PATH,
    get_database_info,
    get_test_database_path,
    is_test_environment,
)


def print_separator(title: str):
    """Print a nice separator with title"""
    print(f"\n{'=' * 60}")
    print(f" {title}")
    print(f"{'=' * 60}")


def main():
    """Run database configuration diagnostics"""
    print_separator("Database Configuration Diagnostics")

    # Get detailed database info
    db_info = get_database_info()

    print("🔍 Current Environment Detection:")
    print(f"   Is Testing: {db_info['is_testing']}")
    print(f"   Database Path: {db_info['database_path']}")
    print(f"   Is Temp DB: {db_info['is_temp_db']}")

    print_separator("Environment Variables")
    for var, value in db_info["environment_vars"].items():
        print(f"   {var}: {value}")

    print_separator("Detection Methods")
    for method, detected in db_info["detection_methods"].items():
        status = "✅" if detected else "❌"
        print(f"   {status} {method}: {detected}")

    print_separator("File System Check")
    db_path = get_test_database_path()
    print(f"   Database Path: {db_path}")
    print(f"   File Exists: {os.path.exists(db_path) if db_path else 'N/A'}")
    print(
        f"   Directory Writable: {os.access(os.path.dirname(db_path), os.W_OK) if db_path else 'N/A'}"
    )
    print(f"   Temp Directory: {tempfile.gettempdir()}")
    print(f"   /tmp exists: {os.path.exists('/tmp')}")

    print_separator("Docker Environment Check")
    docker_indicators = {
        "DOCKER_ENVIRONMENT": os.environ.get("DOCKER_ENVIRONMENT"),
        "/.dockerenv exists": os.path.exists("/.dockerenv"),
        "Container ID file": os.path.exists("/proc/1/cgroup"),
    }

    for indicator, value in docker_indicators.items():
        print(f"   {indicator}: {value}")

    print_separator("Recommendations")

    if not db_info["is_testing"]:
        print("⚠️  Not in test environment - production database will be used")
        print("   To force test mode, set FORCE_TEST_DB=1")
    else:
        if not db_info["is_temp_db"]:
            print("⚠️  Test environment detected but using non-temporary database")
            print("   This may indicate a configuration issue")
        else:
            print("✅ Test environment properly configured with temporary database")

    if os.environ.get("DOCKER_ENVIRONMENT"):
        print("🐳 Running in Docker - ensure pytest sets FORCE_TEST_DB=1")

    print_separator("Quick Test")

    # Simulate what happens during test
    try:
        from app.database import reset_database_for_test

        if is_test_environment():
            original_path = DATABASE_PATH
            reset_database_for_test()
            new_path = get_test_database_path()
            print("✅ Test database reset successful")
            print(f"   Original: {original_path}")
            print(f"   New: {new_path}")
        else:
            print("❌ Cannot test database reset - not in test environment")
    except Exception as e:
        print(f"❌ Error testing database reset: {e}")

    print("\n" + "=" * 60)


if __name__ == "__main__":
    main()
