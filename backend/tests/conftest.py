"""
Shared pytest fixtures for the backend test suite.

Provides proper test database isolation and cleanup.

Test Structure:
- tests/unit/test_error_handling.py - Service layer error scenarios
- tests/integration/test_api_error_handling.py - API error responses
- tests/integration/test_main.py - Core API functionality
- tests/unit/test_feedback_service.py - Feedback service logic
- tests/unit/test_optimization.py - DSPy optimization testing
"""

import asyncio
import os
import shutil
import tempfile

import pytest
import pytest_asyncio

from app.database import (
    cleanup_test_database,
    get_test_database_path,
    init_database,
    is_test_environment,
    reset_database_for_test,
)


@pytest.fixture(scope="session", autouse=True)
def verify_test_environment():
    """Ensure we're running in test environment - safety check"""
    if not is_test_environment():
        pytest.fail(
            "Tests must be run with pytest. "
            "Current environment is not detected as testing environment."
        )


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def clean_database():
    """
    Provide a clean database for each test.
    
    Creates a fresh database before each test and cleans up after.
    This ensures complete test isolation.
    """
    # Create a fresh database path for this test
    reset_database_for_test()
    
    # Initialize the database with fresh schema
    await init_database()
    
    # Yield control to the test
    yield
    
    # Cleanup after test
    db_path = get_test_database_path()
    if os.path.exists(db_path):
        # Clean up the database file
        try:
            os.remove(db_path)
        except OSError:
            pass  # File might already be deleted
        
        # Clean up the temp directory
        temp_dir = os.path.dirname(db_path)
        if os.path.exists(temp_dir) and temp_dir.startswith(tempfile.gettempdir()):
            try:
                shutil.rmtree(temp_dir)
            except OSError:
                pass  # Directory might already be deleted


@pytest_asyncio.fixture
async def setup_database():
    """
    Legacy fixture name for backward compatibility.
    
    Uses clean_database under the hood for proper isolation.
    """
    # Create a fresh database path for this test  
    reset_database_for_test()
    
    # Initialize the database
    await init_database()
    
    yield
    
    # Cleanup
    db_path = get_test_database_path()
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
        except OSError:
            pass
        
        temp_dir = os.path.dirname(db_path)
        if os.path.exists(temp_dir) and temp_dir.startswith(tempfile.gettempdir()):
            try:
                shutil.rmtree(temp_dir)
            except OSError:
                pass


# Session-level cleanup
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_files():
    """Clean up any remaining test files at the end of the session"""
    yield
    
    # Clean up any remaining test directories
    temp_base = tempfile.gettempdir()
    for item in os.listdir(temp_base):
        if item.startswith("golden_nuggets_test_"):
            test_dir = os.path.join(temp_base, item)
            try:
                shutil.rmtree(test_dir)
            except OSError:
                pass  # Best effort cleanup