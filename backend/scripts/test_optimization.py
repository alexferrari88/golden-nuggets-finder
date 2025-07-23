#!/usr/bin/env python3
"""
Manual testing and monitoring script for DSPy optimization pipeline.

This script allows testing the optimization system with mock data
and monitoring optimization performance.
"""

import asyncio
from datetime import datetime
import os
import sys

# Add the app directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.database import get_db, init_database
from app.services.dspy_config import (
    generate_mock_feedback_data,
    validate_dspy_environment,
)
from app.services.feedback_service import FeedbackService
from app.services.optimization_service import OptimizationService


async def test_dspy_environment():
    """Test DSPy environment and configuration"""
    print("Testing DSPy Environment")
    print("=" * 50)

    status = validate_dspy_environment()

    print(f"DSPy Available: {status['dspy_available']}")
    print(f"Gemini Key Configured: {status['gemini_key_configured']}")
    print(f"Configuration Valid: {status['configuration_valid']}")
    print(f"Test Model Accessible: {status['test_model_accessible']}")
    print(f"Using Gemini: {status.get('using_gemini', True)}")

    if status["errors"]:
        print("\nErrors:")
        for error in status["errors"]:
            print(f"  - {error}")

    if status["configuration_valid"]:
        print("\n✅ DSPy environment is properly configured")
        print("✅ Using Gemini 2.5-flash (matching your Chrome extension)")
        return True
    else:
        print("\n❌ DSPy environment needs configuration")
        print(
            "💡 Make sure to set GEMINI_API_KEY with the same key as your Chrome extension"
        )
        return False


async def generate_test_data(count: int = 100):
    """Generate test feedback data in the database"""
    print(f"\nGenerating {count} mock feedback items...")

    feedback_service = FeedbackService()

    # Generate mock feedback data
    mock_data = generate_mock_feedback_data(count)

    async with get_db() as db:
        await feedback_service.store_training_examples(db, mock_data)

    print(f"✅ Generated {count} mock feedback items")

    # Show statistics
    async with get_db() as db:
        stats = await feedback_service.get_feedback_stats(db)
        print(f"Total feedback: {stats['totalFeedback']}")
        print(f"Should optimize: {stats['shouldOptimize']}")
        print(f"Trigger condition: {stats['nextOptimizationTrigger']}")


async def test_optimization(mode: str = "cheap"):
    """Test the optimization pipeline"""
    print(f"\nTesting {mode} optimization...")
    print("=" * 50)

    optimization_service = OptimizationService()
    feedback_service = FeedbackService()

    async with get_db() as db:
        # Check current state
        stats = await feedback_service.get_feedback_stats(db)
        print(f"Total feedback items: {stats['totalFeedback']}")
        print(f"Should optimize: {stats['shouldOptimize']}")

        if not stats["shouldOptimize"]:
            print(
                "⚠️  Optimization thresholds not met, but running anyway for testing..."
            )

        # Run optimization
        start_time = datetime.now()

        try:
            result = await optimization_service.run_optimization(
                db, mode, auto_trigger=False
            )

            execution_time = (datetime.now() - start_time).total_seconds()

            print(f"\nOptimization completed in {execution_time:.1f} seconds")

            if result.get("success"):
                print("✅ Optimization successful!")
                print(
                    f"Performance improvement: {result.get('performance_improvement', 0):.1%}"
                )
                print(f"Training examples used: {result.get('training_examples', 0)}")

                # Get the optimized prompt
                current_prompt = await optimization_service.get_current_prompt(db)
                if current_prompt:
                    print(f"New prompt version: {current_prompt['version']}")
                    print(f"Prompt length: {len(current_prompt['prompt'])} characters")
                    print(
                        f"Performance score: {current_prompt['performance']['positiveRate']:.3f}"
                    )
            else:
                print("❌ Optimization failed")
                if "error" in result:
                    print(f"Error: {result['error']}")

        except Exception as e:
            print(f"❌ Optimization failed with exception: {e}")


async def benchmark_optimization():
    """Benchmark optimization performance"""
    print("\nBenchmarking Optimization Performance")
    print("=" * 50)

    modes = ["cheap", "expensive"]
    data_sizes = [25, 50, 100]

    results = []

    for mode in modes:
        for data_size in data_sizes:
            print(f"\nTesting {mode} mode with {data_size} examples...")

            # Generate test data
            mock_data = generate_mock_feedback_data(data_size)

            # Run optimization
            optimization_service = OptimizationService()

            start_time = datetime.now()
            try:
                result = optimization_service._run_dspy_optimization(mock_data, mode)
                execution_time = (datetime.now() - start_time).total_seconds()

                results.append(
                    {
                        "mode": mode,
                        "data_size": data_size,
                        "execution_time": execution_time,
                        "success": "error" not in result,
                        "performance_score": result.get("performance_score", 0),
                        "improvement": result.get("improvement", 0),
                    }
                )

                print(
                    f"  Time: {execution_time:.1f}s, Score: {result.get('performance_score', 0):.3f}"
                )

            except Exception as e:
                print(f"  Failed: {e}")
                results.append(
                    {
                        "mode": mode,
                        "data_size": data_size,
                        "execution_time": 0,
                        "success": False,
                        "error": str(e),
                    }
                )

    # Display results
    print("\n" + "=" * 50)
    print("BENCHMARK RESULTS")
    print("=" * 50)

    for result in results:
        status = "✅" if result["success"] else "❌"
        print(
            f"{status} {result['mode']:>9} | {result['data_size']:>3} examples | "
            f"{result['execution_time']:>6.1f}s | Score: {result.get('performance_score', 0):>5.3f}"
        )


async def monitor_optimization_history():
    """Monitor optimization history and performance"""
    print("\nOptimization History")
    print("=" * 50)

    optimization_service = OptimizationService()

    async with get_db() as db:
        history_data = await optimization_service.get_optimization_history(db, limit=20)

        if not history_data or not history_data.get("runs"):
            print("No optimization runs found.")
            return

        history = history_data["runs"]
        print(
            f"{'Date':<19} | {'Mode':<9} | {'Status':<9} | {'Duration':<9} | {'Cost':<8} | {'Examples'}"
        )
        print("-" * 80)

        for run in history:
            date = run.get("started_at", "")[:19]  # Truncate timestamp
            mode = run.get("mode", "unknown")
            status = run.get("status", "unknown")
            duration = run.get("duration_seconds", 0) or 0
            cost = run.get("api_cost", 0.0) or 0.0
            examples = run.get("feedback_items_processed", 0)

            status_icon = {"completed": "✅", "failed": "❌", "running": "⏳"}.get(
                status, "?"
            )

            print(
                f"{date} | {mode:>9} | {status_icon} {status:<7} | {duration:>7}s | ${cost:>6.4f} | {examples:>8}"
            )

        # Show current prompt info
        current_prompt = await optimization_service.get_current_prompt(db)
        if current_prompt:
            print(f"\nCurrent prompt: Version {current_prompt['version']}")
            print(f"Created: {current_prompt['optimizationDate']}")
            print(f"Performance: {current_prompt['performance']['positiveRate']:.3f}")


async def cleanup_test_data():
    """Clean up test data"""
    print("\nCleaning up test data...")

    async with get_db() as db:
        # Delete training examples
        await db.execute(
            "DELETE FROM training_examples WHERE url LIKE 'https://example.com/test/%'"
        )

        # Delete test feedback
        await db.execute(
            "DELETE FROM nugget_feedback WHERE url LIKE 'https://example.com/test/%'"
        )
        await db.execute(
            "DELETE FROM missing_content_feedback WHERE url LIKE 'https://example.com/test/%'"
        )

        # Delete test optimization runs
        await db.execute("""
            DELETE FROM optimization_runs
            WHERE id IN (
                SELECT opt_run.id FROM optimization_runs opt_run
                LEFT JOIN optimized_prompts op ON opt_run.id = op.optimization_run_id
                WHERE op.id IS NULL OR op.prompt LIKE '%mock%'
            )
        """)

        await db.commit()

    print("✅ Test data cleaned up")


def main():
    """Main CLI interface"""
    if len(sys.argv) < 2:
        print("DSPy Optimization Testing and Monitoring Tool")
        print("\nUsage: python test_optimization.py <command>")
        print("\nCommands:")
        print("  test-env                 - Test DSPy environment configuration")
        print("  generate-data [count]    - Generate mock test data (default: 100)")
        print("  test-cheap               - Test cheap optimization (BootstrapFewShot)")
        print("  test-expensive           - Test expensive optimization (MIPROv2)")
        print("  benchmark                - Benchmark optimization performance")
        print("  history                  - Show optimization history")
        print("  cleanup                  - Clean up test data")
        print("  full-test                - Run complete test suite")
        return

    command = sys.argv[1].lower()

    # Initialize database
    asyncio.run(init_database())

    if command == "test-env":
        asyncio.run(test_dspy_environment())

    elif command == "generate-data":
        count = int(sys.argv[2]) if len(sys.argv) > 2 else 100
        asyncio.run(generate_test_data(count))

    elif command == "test-cheap":
        asyncio.run(test_optimization("cheap"))

    elif command == "test-expensive":
        asyncio.run(test_optimization("expensive"))

    elif command == "benchmark":
        asyncio.run(benchmark_optimization())

    elif command == "history":
        asyncio.run(monitor_optimization_history())

    elif command == "cleanup":
        asyncio.run(cleanup_test_data())

    elif command == "full-test":

        async def run_full_test():
            print("Running Full DSPy Optimization Test Suite")
            print("=" * 50)

            # 1. Test environment
            env_ok = await test_dspy_environment()

            if not env_ok:
                print("\n❌ Environment not configured. Please set up DSPy first.")
                return

            # 2. Generate test data
            await generate_test_data(50)

            # 3. Test both optimization modes
            await test_optimization("cheap")
            await test_optimization("expensive")

            # 4. Show history
            await monitor_optimization_history()

            # 5. Cleanup
            await cleanup_test_data()

            print("\n✅ Full test suite completed")

        asyncio.run(run_full_test())

    else:
        print(f"Unknown command: {command}")


if __name__ == "__main__":
    main()
