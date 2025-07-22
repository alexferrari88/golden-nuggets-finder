"""
Database configuration and connection management for SQLite.

Handles database initialization, connection pooling, and table creation
for the feedback system storage.
"""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
import os
import sqlite3

import aiosqlite

DATABASE_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "feedback.db")

# Ensure data directory exists
os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)


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
        "training_examples",
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
