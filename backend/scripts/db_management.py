#!/usr/bin/env python3
"""
Database management utility for Golden Nuggets Finder.

Provides command-line interface for common database operations.
"""

import asyncio
from datetime import datetime
import os
import sys

# Add the app directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.database import DATABASE_PATH, get_db
from app.database_migrations import (
    MigrationRunner,
    backup_database,
    reset_database,
    restore_database,
)


async def show_stats():
    """Show database statistics"""
    async with get_db() as db:
        print(f"Database: {DATABASE_PATH}")
        print("=" * 50)

        # Feedback statistics
        cursor = await db.execute("""
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN rating = 'positive' THEN 1 ELSE 0 END) as positive,
                SUM(CASE WHEN rating = 'negative' THEN 1 ELSE 0 END) as negative
            FROM nugget_feedback
        """)
        stats = await cursor.fetchone()
        total_feedback = stats[0] or 0
        positive_feedback = stats[1] or 0
        negative_feedback = stats[2] or 0

        print(f"Nugget Feedback: {total_feedback} total")
        print(f"  - Positive: {positive_feedback}")
        print(f"  - Negative: {negative_feedback}")
        if total_feedback > 0:
            print(f"  - Positive Rate: {positive_feedback / total_feedback:.1%}")

        # Missing content feedback
        cursor = await db.execute("SELECT COUNT(*) FROM missing_content_feedback")
        missing_count = (await cursor.fetchone())[0]
        print(f"Missing Content Feedback: {missing_count}")

        # Optimization runs
        cursor = await db.execute("""
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running
            FROM optimization_runs
        """)
        opt_stats = await cursor.fetchone()
        print(f"Optimization Runs: {opt_stats[0]} total")
        print(f"  - Completed: {opt_stats[1]}")
        print(f"  - Failed: {opt_stats[2]}")
        print(f"  - Running: {opt_stats[3]}")

        # Current prompt
        cursor = await db.execute("""
            SELECT version, optimization_date, positive_rate
            FROM optimized_prompts
            WHERE is_current = TRUE
        """)
        current_prompt = await cursor.fetchone()
        if current_prompt:
            print(f"Current Prompt: Version {current_prompt[0]}")
            print(f"  - Created: {current_prompt[1]}")
            print(f"  - Performance: {current_prompt[2]:.3f}")
        else:
            print("Current Prompt: Baseline (no optimization)")


async def list_feedback(limit=10):
    """List recent feedback"""
    async with get_db() as db:
        print(f"Recent Feedback (last {limit} items)")
        print("=" * 50)

        cursor = await db.execute(
            """
            SELECT url, rating, original_type, corrected_type, created_at
            FROM nugget_feedback
            ORDER BY created_at DESC
            LIMIT ?
        """,
            (limit,),
        )

        results = await cursor.fetchall()

        if not results:
            print("No feedback found.")
            return

        for result in results:
            url = result[0][:50] + "..." if len(result[0]) > 50 else result[0]
            rating = result[1]
            orig_type = result[2]
            corr_type = result[3]
            created = result[4]

            type_str = f"{orig_type} → {corr_type}" if corr_type else orig_type
            print(f"{created} | {rating:>8} | {type_str:>15} | {url}")


async def list_optimizations():
    """List optimization history"""
    async with get_db() as db:
        print("Optimization History")
        print("=" * 70)

        cursor = await db.execute("""
            SELECT mode, trigger_type, started_at, status, performance_improvement, feedback_count
            FROM optimization_runs
            ORDER BY started_at DESC
        """)

        results = await cursor.fetchall()

        if not results:
            print("No optimization runs found.")
            return

        for result in results:
            mode = result[0]
            trigger = result[1]
            started = result[2]
            status = result[3]
            improvement = result[4] or 0.0
            feedback_count = result[5]

            print(
                f"{started} | {mode:>9} | {trigger:>6} | {status:>9} | {improvement:>6.1%} | {feedback_count:>3} examples"
            )


async def export_feedback(output_file: str):
    """Export feedback data to CSV"""
    import csv

    async with get_db() as db:
        # Export nugget feedback
        cursor = await db.execute("""
            SELECT id, nugget_content, original_type, corrected_type, rating,
                   timestamp, url, context, created_at
            FROM nugget_feedback
            ORDER BY created_at DESC
        """)

        nugget_results = await cursor.fetchall()

        # Export missing content feedback
        cursor = await db.execute("""
            SELECT id, content, suggested_type, timestamp, url, context, created_at
            FROM missing_content_feedback
            ORDER BY created_at DESC
        """)

        missing_results = await cursor.fetchall()

    # Write to CSV files
    nugget_file = f"nugget_feedback_{output_file}"
    missing_file = f"missing_content_{output_file}"

    with open(nugget_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(
            [
                "id",
                "nugget_content",
                "original_type",
                "corrected_type",
                "rating",
                "timestamp",
                "url",
                "context",
                "created_at",
            ]
        )
        writer.writerows(nugget_results)

    with open(missing_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(
            [
                "id",
                "content",
                "suggested_type",
                "timestamp",
                "url",
                "context",
                "created_at",
            ]
        )
        writer.writerows(missing_results)

    print(f"Exported {len(nugget_results)} nugget feedback records to {nugget_file}")
    print(f"Exported {len(missing_results)} missing content records to {missing_file}")


async def cleanup_old_data(days=90):
    """Clean up old data (keep last N days)"""
    from datetime import timedelta

    cutoff_date = datetime.now() - timedelta(days=days)

    async with get_db() as db:
        # Count records to be deleted
        cursor = await db.execute(
            """
            SELECT COUNT(*) FROM nugget_feedback WHERE created_at < ?
        """,
            (cutoff_date,),
        )
        old_nugget_count = (await cursor.fetchone())[0]

        cursor = await db.execute(
            """
            SELECT COUNT(*) FROM missing_content_feedback WHERE created_at < ?
        """,
            (cutoff_date,),
        )
        old_missing_count = (await cursor.fetchone())[0]

        cursor = await db.execute(
            """
            SELECT COUNT(*) FROM training_examples WHERE timestamp < ?
        """,
            (cutoff_date,),
        )
        old_training_count = (await cursor.fetchone())[0]

        total_to_delete = old_nugget_count + old_missing_count + old_training_count

        if total_to_delete == 0:
            print(f"No records older than {days} days found.")
            return

        print(f"Found {total_to_delete} records older than {days} days:")
        print(f"  - Nugget feedback: {old_nugget_count}")
        print(f"  - Missing content: {old_missing_count}")
        print(f"  - Training examples: {old_training_count}")

        confirm = input("Delete these records? (yes/no): ")
        if confirm.lower() != "yes":
            print("Cleanup cancelled.")
            return

        # Delete old records
        await db.execute(
            "DELETE FROM nugget_feedback WHERE created_at < ?", (cutoff_date,)
        )
        await db.execute(
            "DELETE FROM missing_content_feedback WHERE created_at < ?", (cutoff_date,)
        )
        await db.execute(
            "DELETE FROM training_examples WHERE timestamp < ?", (cutoff_date,)
        )

        await db.commit()
        print(f"Deleted {total_to_delete} old records.")


def main():
    """Command line interface"""
    if len(sys.argv) < 2:
        print("Database Management Utility for Golden Nuggets Finder")
        print("\nUsage: python db_management.py <command> [args]")
        print("\nCommands:")
        print("  stats                    - Show database statistics")
        print("  feedback [limit]         - List recent feedback (default: 10)")
        print("  optimizations           - List optimization history")
        print("  export <filename>        - Export feedback data to CSV")
        print("  cleanup [days]          - Clean up old data (default: 90 days)")
        print("  backup <filename>       - Create database backup")
        print("  restore <filename>      - Restore from backup")
        print("  migrate                 - Run pending migrations")
        print("  migration-status        - Show migration status")
        print("  reset                   - Reset database (destructive!)")
        return

    command = sys.argv[1].lower()

    if command == "stats":
        asyncio.run(show_stats())

    elif command == "feedback":
        limit = int(sys.argv[2]) if len(sys.argv) > 2 else 10
        asyncio.run(list_feedback(limit))

    elif command == "optimizations":
        asyncio.run(list_optimizations())

    elif command == "export":
        if len(sys.argv) < 3:
            print("Usage: export <filename>")
            return
        filename = sys.argv[2]
        asyncio.run(export_feedback(filename))

    elif command == "cleanup":
        days = int(sys.argv[2]) if len(sys.argv) > 2 else 90
        asyncio.run(cleanup_old_data(days))

    elif command == "backup":
        if len(sys.argv) < 3:
            filename = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
        else:
            filename = sys.argv[2]
        asyncio.run(backup_database(filename))

    elif command == "restore":
        if len(sys.argv) < 3:
            print("Usage: restore <filename>")
            return
        filename = sys.argv[2]
        asyncio.run(restore_database(filename))

    elif command == "migrate":
        runner = MigrationRunner()
        asyncio.run(runner.run_pending_migrations())

    elif command == "migration-status":
        runner = MigrationRunner()
        status = asyncio.run(runner.get_migration_status())
        print(f"Database: {status['database_path']}")
        print(f"Total migrations: {status['total_migrations']}")
        print(f"Applied: {status['applied_migrations']}")
        print(f"Pending: {status['pending_migrations']}")
        if status["applied_versions"]:
            print("Applied versions:", ", ".join(status["applied_versions"]))

    elif command == "reset":
        confirm = input("This will delete all data. Are you sure? (yes/no): ")
        if confirm.lower() == "yes":
            asyncio.run(reset_database())
            runner = MigrationRunner()
            asyncio.run(runner.run_pending_migrations())
        else:
            print("Reset cancelled.")

    else:
        print(f"Unknown command: {command}")


if __name__ == "__main__":
    main()
