"""
Database configuration and connection management for SQLite.

Handles database initialization, connection pooling, and table creation
for the feedback system storage.
"""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
import os
import sqlite3
import tempfile

import aiosqlite

# Determine if we're in test environment
import sys
_IS_TESTING = (
    "pytest" in sys.modules or
    "PYTEST_CURRENT_TEST" in os.environ or 
    "pytest" in os.environ.get("_", "") or
    any("pytest" in arg for arg in sys.argv) or
    os.environ.get("FORCE_TEST_DB", "").lower() in ("1", "true", "yes") or
    # Additional Docker-specific detection
    (os.environ.get("ENVIRONMENT") == "test") or
    # Detect if we're running inside pytest via command line in Docker
    any("pytest" in arg for arg in os.environ.get("PYTEST_ARGS", "").split())
)

# Use different database paths for testing vs production
if _IS_TESTING:
    # Use a temporary database for tests - each test session gets its own
    # In Docker, ensure we use /tmp which is not mounted as a volume
    temp_base = "/tmp" if os.path.exists("/tmp") else tempfile.gettempdir()
    _temp_dir = tempfile.mkdtemp(prefix="golden_nuggets_test_", dir=temp_base)
    DATABASE_PATH = os.path.join(_temp_dir, "test_feedback.db")
    print(f"🧪 Test environment detected: Using isolated database at {DATABASE_PATH}")
else:
    DATABASE_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "feedback.db")
    # Ensure data directory exists for production
    os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
    print(f"📊 Production environment: Using database at {DATABASE_PATH}")


@asynccontextmanager
async def get_db() -> AsyncGenerator[aiosqlite.Connection, None]:
    """Get async database connection with proper cleanup"""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        # Enable foreign keys
        await db.execute("PRAGMA foreign_keys = ON")
        await db.commit()
        yield db


async def init_database():
    """Initialize database using migration system"""
    from .database_migrations import MigrationRunner

    print(f"Initializing database at {DATABASE_PATH}")

    # Run migrations to set up schema
    migration_runner = MigrationRunner(DATABASE_PATH)
    await migration_runner.run_pending_migrations()

    print(f"Database initialized successfully at {DATABASE_PATH}")


def get_sync_db():
    """Get synchronous database connection for non-async contexts"""
    return sqlite3.connect(DATABASE_PATH)


# Test database utilities

def get_test_database_path():
    """Get the current database path (useful for tests)"""
    return DATABASE_PATH


def is_test_environment():
    """Check if we're running in test environment"""
    return _IS_TESTING


def get_database_info():
    """Get detailed information about current database configuration"""
    return {
        "is_testing": _IS_TESTING,
        "database_path": DATABASE_PATH,
        "is_temp_db": "/tmp/" in DATABASE_PATH or "golden_nuggets_test_" in DATABASE_PATH,
        "environment_vars": {
            "PYTEST_CURRENT_TEST": os.environ.get("PYTEST_CURRENT_TEST"),
            "FORCE_TEST_DB": os.environ.get("FORCE_TEST_DB"),
            "ENVIRONMENT": os.environ.get("ENVIRONMENT"),
            "DOCKER_ENVIRONMENT": os.environ.get("DOCKER_ENVIRONMENT"),
        },
        "detection_methods": {
            "pytest_in_modules": "pytest" in sys.modules,
            "pytest_current_test": "PYTEST_CURRENT_TEST" in os.environ,
            "pytest_in_args": any("pytest" in arg for arg in sys.argv),
            "force_test_db": os.environ.get("FORCE_TEST_DB", "").lower() in ("1", "true", "yes"),
            "env_is_test": os.environ.get("ENVIRONMENT") == "test",
        }
    }


async def cleanup_test_database():
    """Clean up test database (removes all data, recreates schema)"""
    if not _IS_TESTING:
        raise RuntimeError("cleanup_test_database() can only be called in test environment")
    
    # Remove the database file if it exists
    if os.path.exists(DATABASE_PATH):
        os.remove(DATABASE_PATH)
    
    # Reinitialize with fresh schema
    await init_database()


def reset_database_for_test():
    """Create a new temporary database path for a test"""
    global DATABASE_PATH, _temp_dir
    if not _IS_TESTING:
        raise RuntimeError("reset_database_for_test() can only be called in test environment")
    
    # Create a new temporary directory and database path
    _temp_dir = tempfile.mkdtemp(prefix="golden_nuggets_test_")
    DATABASE_PATH = os.path.join(_temp_dir, "test_feedback.db")


# Database utility functions


async def execute_query(query: str, params: tuple = ()):
    """Execute a query and return results"""
    async with get_db() as db:
        cursor = await db.execute(query, params)
        await db.commit()
        return await cursor.fetchall()


async def execute_insert(table: str, data: dict):
    """Insert data into table - table name must be from allowed list"""
    # Validate table name against allowed tables for security
    allowed_tables = {
        "nugget_feedback",
        "missing_content_feedback",
        "optimization_runs",
        "optimized_prompts",
        "feedback_usage",
        "cost_tracking",
        "optimization_progress",
    }
    if table not in allowed_tables:
        raise ValueError(f"Table '{table}' not allowed")

    columns = ", ".join(data.keys())
    placeholders = ", ".join(["?" for _ in data])
    query = f"INSERT INTO {table} ({columns}) VALUES ({placeholders})"  # noqa: S608

    async with get_db() as db:
        await db.execute(query, tuple(data.values()))
        await db.commit()


async def get_feedback_statistics():
    """Get comprehensive feedback statistics"""
    async with get_db() as db:
        # Total feedback counts
        cursor = await db.execute("""
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN rating = 'positive' THEN 1 ELSE 0 END) as positive,
                SUM(CASE WHEN rating = 'negative' THEN 1 ELSE 0 END) as negative
            FROM nugget_feedback
        """)
        stats = await cursor.fetchone()

        # Recent negative rate (last 20 items)
        cursor = await db.execute("""
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN rating = 'negative' THEN 1 ELSE 0 END) as negative
            FROM (
                SELECT rating
                FROM nugget_feedback
                ORDER BY created_at DESC
                LIMIT 20
            )
        """)
        recent_stats = await cursor.fetchone()

        # Last optimization date
        cursor = await db.execute("""
            SELECT MAX(completed_at) as last_optimization
            FROM optimization_runs
            WHERE status = 'completed'
        """)
        last_opt = await cursor.fetchone()

        return {
            "total": stats[0] or 0,
            "positive": stats[1] or 0,
            "negative": stats[2] or 0,
            "recent_total": recent_stats[0] or 0,
            "recent_negative": recent_stats[1] or 0,
            "last_optimization": last_opt[0] if last_opt else None,
        }
