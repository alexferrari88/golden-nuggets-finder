"""
Test script for dashboard backend functionality.

Run this after applying the database migration to test the new endpoints.
"""

import asyncio
from datetime import datetime
import os
import sys

# Add the backend directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", ".."))

from app.database import get_db, init_database
from app.services.cost_tracking_service import CostTrackingService
from app.services.feedback_service import FeedbackService
from app.services.progress_tracking_service import ProgressTrackingService


async def test_dashboard_functionality():
    """Test all new dashboard functionality"""
    print("🧪 Testing Dashboard Backend Functionality\n")

    # Initialize database first (needed for test environment)
    await init_database()

    # Initialize services
    feedback_service = FeedbackService()
    progress_service = ProgressTrackingService()
    cost_service = CostTrackingService()

    async with get_db() as db:
        print("1. Testing Dashboard Stats View...")
        try:
            cursor = await db.execute("SELECT * FROM dashboard_stats")
            stats = await cursor.fetchone()
            print(f"   ✅ Dashboard stats: {stats}")
        except Exception as e:
            print(f"   ❌ Dashboard stats failed: {e}")

        print("\n2. Testing Recent Feedback View...")
        try:
            cursor = await db.execute(
                "SELECT * FROM recent_feedback_with_status LIMIT 5"
            )
            recent = await cursor.fetchall()
            print(f"   ✅ Found {len(recent)} recent feedback items")
            for item in recent[:2]:  # Show first 2
                print(f"      - {item[0]}: {item[2][:50]}...")
        except Exception as e:
            print(f"   ❌ Recent feedback view failed: {e}")

        print("\n3. Testing Pending Feedback...")
        try:
            result = await feedback_service.get_pending_feedback(db, limit=10)
            print(
                f"   ✅ Pending feedback: {result['total_count']} total, {len(result['items'])} returned"
            )
        except Exception as e:
            print(f"   ❌ Pending feedback failed: {e}")

        print("\n4. Testing Recent Activity...")
        try:
            activity = await progress_service.get_recent_activity(db, limit=5)
            print(f"   ✅ Recent activity: {len(activity)} entries")
            for item in activity[:2]:
                print(
                    f"      - {item['run_id']}: {item['phase']} ({item['progress']}%)"
                )
        except Exception as e:
            print(f"   ❌ Recent activity failed: {e}")

        print("\n5. Testing Cost Summary...")
        try:
            summary = await cost_service.get_costs_summary(db, days=30)
            print(
                f"   ✅ Cost summary: ${summary['total_cost']:.3f} over {summary['period_days']} days"
            )
            print(f"      - Total runs: {summary['total_runs']}")
            print(f"      - Total tokens: {summary['total_tokens']}")
        except Exception as e:
            print(f"   ❌ Cost summary failed: {e}")

        print("\n6. Testing Cost Trends...")
        try:
            trends = await cost_service.get_cost_trends(db, days=30)
            print(f"   ✅ Cost trends: {trends['cost_trend']}")
            print(f"      - Weekly avg cost: ${trends['average_weekly_cost']:.3f}")
            print(f"      - Weekly avg runs: {trends['average_weekly_runs']:.1f}")
        except Exception as e:
            print(f"   ❌ Cost trends failed: {e}")

        print("\n7. Testing Feedback Usage Stats...")
        try:
            usage_stats = await feedback_service.get_feedback_usage_stats(db)
            print(
                f"   ✅ Usage stats: {usage_stats['total_unique_used']} unique items used"
            )
            print(f"      - Total uses: {usage_stats['total_usage_records']}")
            print(
                f"      - Avg contribution: {usage_stats['average_contribution']:.2f}"
            )
        except Exception as e:
            print(f"   ❌ Usage stats failed: {e}")

    print("\n🎉 Dashboard backend testing completed!")


async def create_sample_data():
    """Create some sample data for testing (optional)"""
    print("📝 Creating sample data for testing...\n")

    # Initialize database first (needed for test environment)
    await init_database()

    FeedbackService()
    progress_service = ProgressTrackingService()
    cost_service = CostTrackingService()

    async with get_db() as db:
        # Create sample optimization run first (needed for foreign key constraints)
        run_id = "test-run-123"

        print("Creating sample optimization run...")
        await db.execute(
            """
            INSERT OR IGNORE INTO optimization_runs (
                id, mode, trigger_type, started_at, status,
                feedback_count, total_tokens, api_cost
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                run_id,
                "cheap",
                "manual",
                datetime.now().isoformat(),
                "running",
                0,
                0,
                0.0,
            ),
        )
        await db.commit()

        print("Creating sample progress entries...")
        await progress_service.save_progress(
            db, run_id, "initialization", 10, "🚀 Starting optimization", {"test": True}
        )
        await progress_service.save_progress(
            db,
            run_id,
            "data_gathering",
            30,
            "📊 Gathering training data",
            {"examples_found": 25},
        )
        await progress_service.save_progress(
            db,
            run_id,
            "optimization",
            70,
            "🧠 Running DSPy optimization",
            {"current_score": 0.75},
        )

        # Create sample cost tracking
        print("Creating sample cost entries...")
        await cost_service.track_operation_cost(
            db,
            run_id,
            "optimization",
            "gemini-2.5-flash",
            1500,
            300,
            {"operation": "test"},
        )
        await cost_service.track_operation_cost(
            db, run_id, "evaluation", "gpt-4o", 2000, 500, {"operation": "test"}
        )

        print("✅ Sample data created!")


async def cleanup_sample_data():
    """Clean up sample data"""
    print("🧹 Cleaning up sample data...")

    async with get_db() as db:
        # Delete in correct order due to foreign key constraints
        await db.execute(
            "DELETE FROM optimization_progress WHERE optimization_run_id = ?",
            ("test-run-123",),
        )
        await db.execute(
            "DELETE FROM cost_tracking WHERE optimization_run_id = ?", ("test-run-123",)
        )
        await db.execute(
            "DELETE FROM optimization_runs WHERE id = ?", ("test-run-123",)
        )
        await db.commit()

    print("✅ Sample data cleaned up!")


async def main():
    """Main test runner"""
    print("=== Golden Nuggets Dashboard Backend Test ===\n")

    if len(sys.argv) > 1 and sys.argv[1] == "--with-sample-data":
        await create_sample_data()
        print()

    await test_dashboard_functionality()

    if len(sys.argv) > 1 and sys.argv[1] == "--with-sample-data":
        print()
        await cleanup_sample_data()


if __name__ == "__main__":
    print("Usage: python test_dashboard_backend.py [--with-sample-data]")
    print("       --with-sample-data: Create and cleanup sample data for testing\n")
    asyncio.run(main())
