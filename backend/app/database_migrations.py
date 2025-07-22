"""
Database migration system for Golden Nuggets Finder.

Handles running SQL migrations in order and tracking which migrations have been applied.
"""

import asyncio
import os
from pathlib import Path
from typing import Optional

import aiosqlite

MIGRATIONS_DIR = Path(__file__).parent.parent / "migrations"
DATABASE_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "feedback.db")


class MigrationRunner:
    """Handles database migrations"""

    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or DATABASE_PATH
        self.migrations_dir = MIGRATIONS_DIR

        # Ensure database directory exists
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)

    async def init_migration_table(self):
        """Create migration tracking table if it doesn't exist"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    version TEXT PRIMARY KEY,
                    filename TEXT NOT NULL,
                    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    checksum TEXT
                )
            """)
            await db.commit()

    async def get_applied_migrations(self) -> list[str]:
        """Get list of applied migration versions"""
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                "SELECT version FROM schema_migrations ORDER BY version"
            )
            results = await cursor.fetchall()
            return [row[0] for row in results]

    def get_available_migrations(self) -> list[tuple[str, str]]:
        """Get list of available migration files"""
        migrations: list[tuple[str, str]] = []

        if not self.migrations_dir.exists():
            return migrations

        for file in sorted(self.migrations_dir.glob("*.sql")):
            version = file.stem  # filename without extension
            migrations.append((version, str(file)))

        return migrations

    async def apply_migration(self, version: str, filepath: str):
        """Apply a single migration"""
        print(f"Applying migration {version}...")

        # Read migration file
        with open(filepath, encoding="utf-8") as f:
            migration_sql = f.read()

        async with aiosqlite.connect(self.db_path) as db:
            # Enable foreign keys
            await db.execute("PRAGMA foreign_keys = ON")

            try:
                # Execute migration SQL
                await db.executescript(migration_sql)

                # Record migration as applied
                await db.execute(
                    """
                    INSERT INTO schema_migrations (version, filename, applied_at)
                    VALUES (?, ?, CURRENT_TIMESTAMP)
                """,
                    (version, os.path.basename(filepath)),
                )

                await db.commit()
                print(f"Successfully applied migration {version}")

            except Exception as e:
                await db.rollback()
                print(f"Failed to apply migration {version}: {e}")
                raise

    async def run_pending_migrations(self):
        """Run all pending migrations"""
        await self.init_migration_table()

        applied = await self.get_applied_migrations()
        available = self.get_available_migrations()

        pending = [
            (version, filepath)
            for version, filepath in available
            if version not in applied
        ]

        if not pending:
            print("No pending migrations.")
            return

        print(f"Found {len(pending)} pending migrations.")

        for version, filepath in pending:
            await self.apply_migration(version, filepath)

        print("All migrations completed successfully.")

    async def get_migration_status(self) -> dict:
        """Get current migration status"""
        await self.init_migration_table()

        applied = await self.get_applied_migrations()
        available = self.get_available_migrations()

        return {
            "database_path": self.db_path,
            "total_migrations": len(available),
            "applied_migrations": len(applied),
            "pending_migrations": len(available) - len(applied),
            "applied_versions": applied,
            "available_versions": [version for version, _ in available],
        }


# Utility functions for database management


async def reset_database():
    """Reset database by removing all tables (destructive!)"""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        # Get all table names
        cursor = await db.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = await cursor.fetchall()

        # Drop all tables
        for table in tables:
            if table[0] != "sqlite_sequence":  # Don't drop sqlite's internal table
                await db.execute(f"DROP TABLE IF EXISTS {table[0]}")

        # Drop all views
        cursor = await db.execute("SELECT name FROM sqlite_master WHERE type='view'")
        views = await cursor.fetchall()

        for view in views:
            await db.execute(f"DROP VIEW IF EXISTS {view[0]}")

        await db.commit()
        print("Database reset successfully.")


async def backup_database(backup_path: str):
    """Create a backup of the database"""
    import shutil

    if os.path.exists(DATABASE_PATH):
        shutil.copy2(DATABASE_PATH, backup_path)
        print(f"Database backed up to {backup_path}")
    else:
        print("Database does not exist, nothing to backup.")


async def restore_database(backup_path: str):
    """Restore database from backup"""
    import shutil

    if os.path.exists(backup_path):
        shutil.copy2(backup_path, DATABASE_PATH)
        print(f"Database restored from {backup_path}")
    else:
        print(f"Backup file {backup_path} does not exist.")


# CLI interface
async def main():
    """Command line interface for migration management"""
    import sys

    if len(sys.argv) < 2:
        print("Usage: python database_migrations.py <command>")
        print("Commands:")
        print("  status    - Show migration status")
        print("  migrate   - Run pending migrations")
        print("  reset     - Reset database (destructive!)")
        return

    command = sys.argv[1].lower()
    runner = MigrationRunner()

    if command == "status":
        status = await runner.get_migration_status()
        print(f"Database: {status['database_path']}")
        print(f"Total migrations: {status['total_migrations']}")
        print(f"Applied: {status['applied_migrations']}")
        print(f"Pending: {status['pending_migrations']}")
        if status["applied_versions"]:
            print("Applied versions:", ", ".join(status["applied_versions"]))

    elif command == "migrate":
        await runner.run_pending_migrations()

    elif command == "reset":
        confirm = input("This will delete all data. Are you sure? (yes/no): ")
        if confirm.lower() == "yes":
            await reset_database()
            await runner.run_pending_migrations()
        else:
            print("Reset cancelled.")

    else:
        print(f"Unknown command: {command}")


if __name__ == "__main__":
    asyncio.run(main())
