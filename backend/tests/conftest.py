"""
Shared pytest fixtures for the backend test suite.
"""

import asyncio
import pytest
import pytest_asyncio

from app.database import init_database


@pytest_asyncio.fixture
async def setup_database():
    """Initialize test database"""
    await init_database()


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()