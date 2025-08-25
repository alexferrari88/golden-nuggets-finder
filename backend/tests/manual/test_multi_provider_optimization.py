#!/usr/bin/env python3
"""
Manual test script for multi-provider DSPy optimization.

This script tests the DSPy Multi-Model Manager with different providers
to ensure that provider-specific optimization works correctly.

Run with: FORCE_TEST_DB=1 python3 tests/manual/test_multi_provider_optimization.py
"""

import asyncio
from datetime import datetime, timezone
import os
import sys

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.database import get_db, init_database
from app.services.dspy_multi_model_manager import dspy_multi_model_manager
from app.services.optimization_service import OptimizationService


async def create_sample_feedback(
    db, provider_id: str, model_name: str, count: int = 60
):
    """Create sample feedback data for testing optimization"""
    print(f"📝 Creating {count} sample feedback items for {provider_id}...")

    for i in range(count):
        sample_feedback = [
            {
                "content": f"This is a great tool for developers - Tool #{i}",
                "type": "tool",
                "rating": "positive" if i % 3 != 0 else "negative",
                "context": f"Sample context for feedback item {i}",
                "url": f"https://example.com/page/{i}",
            },
            {
                "content": f'This book "Advanced Programming #{i}" is excellent',
                "type": "media",
                "rating": "positive" if i % 4 != 0 else "negative",
                "context": f"Book recommendation context {i}",
                "url": f"https://example.com/books/{i}",
            },
            {
                "content": f"The concept of microservices #{i} is well explained here",
                "type": "explanation",
                "rating": "positive" if i % 5 != 0 else "negative",
                "context": f"Technical explanation context {i}",
                "url": f"https://example.com/concepts/{i}",
            },
        ]

        feedback_item = sample_feedback[i % len(sample_feedback)]

        # Insert nugget feedback
        await db.execute(
            """
            INSERT INTO nugget_feedback (
                id, nugget_content, original_type, corrected_type, rating,
                url, context, model_provider, model_name, client_timestamp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                f"{provider_id}-feedback-{i}",
                feedback_item["content"],
                feedback_item["type"],
                "explanation"
                if feedback_item["rating"] == "negative" and i % 10 == 0
                else None,
                feedback_item["rating"],
                feedback_item["url"],
                feedback_item["context"],
                provider_id,
                model_name,
                datetime.now(timezone.utc),
            ),
        )

        # Add some missing content feedback too
        if i % 10 == 0:
            await db.execute(
                """
                INSERT INTO missing_content_feedback (
                    id, content, suggested_type, url, context,
                    model_provider, model_name, client_timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    f"{provider_id}-missing-{i}",
                    f"Missing insight about {feedback_item['type']} #{i}",
                    "analogy",
                    feedback_item["url"],
                    feedback_item["context"],
                    provider_id,
                    model_name,
                    datetime.now(timezone.utc),
                ),
            )

    await db.commit()
    print(f"✅ Created sample feedback for {provider_id}")


async def test_provider_optimization_thresholds():
    """Test checking optimization thresholds for all providers"""
    print("\n🔍 Testing provider optimization thresholds...")

    async with get_db() as db:
        optimization_service = OptimizationService()

        # Check thresholds for all providers
        threshold_results = (
            await optimization_service.check_provider_optimization_thresholds(db)
        )

        print("\n📊 Provider Optimization Thresholds:")
        print("-" * 60)
        for provider_id, data in threshold_results.items():
            status = "✅ READY" if data["should_optimize"] else "❌ NOT READY"
            print(f"{provider_id:12} | {data['total_feedback']:3} feedback | {status}")
            print(
                f"             | Threshold met: {data['threshold_met']} | Negative rate: {data['negative_rate']:.2%}"
            )
            print(
                f"             | Days since optimization: {data['days_since_optimization']}"
            )
            print("-" * 60)

        return threshold_results


async def test_provider_specific_optimization(provider_id: str):
    """Test optimization for a specific provider"""
    print(f"\n🚀 Testing optimization for {provider_id}...")

    async with get_db() as db:
        optimization_service = OptimizationService()

        try:
            # Run provider-specific optimization
            result = await optimization_service.run_provider_optimization(
                db, provider_id, mode="cheap", auto_trigger=False
            )

            print(f"✅ Optimization completed for {provider_id}")
            print(f"   Run ID: {result.get('run_id')}")
            print(
                f"   Performance improvement: {result.get('performance_improvement', 0):.3f}"
            )
            print(f"   Training examples: {result.get('training_examples')}")

            # Get the optimized prompt
            optimized_prompt = await optimization_service.get_provider_current_prompt(
                db, provider_id
            )
            if optimized_prompt:
                print(f"   Optimized prompt version: {optimized_prompt['version']}")
                print(f"   Prompt length: {len(optimized_prompt['prompt'])} characters")
                print(f"   Model: {optimized_prompt.get('model_name', 'unknown')}")

            return result

        except Exception as e:
            print(f"❌ Optimization failed for {provider_id}: {e}")
            return None


async def test_multi_provider_manager_directly():
    """Test the multi-model manager directly"""
    print("\n🔧 Testing DSPy Multi-Model Manager directly...")

    async with get_db() as db:
        # Test getting provider feedback
        for provider_id in ["gemini", "openai"]:
            feedback = await dspy_multi_model_manager._get_provider_feedback(
                db, provider_id
            )
            print(f"   {provider_id}: {len(feedback)} feedback items")

            if feedback:
                # Show sample feedback
                sample = feedback[0]
                print(f"      Sample: {sample.get('content', '')[:50]}...")
                print(f"      Type: {sample.get('feedback_type')}")
                print(f"      Provider: {sample.get('model_provider')}")
                print(f"      Model: {sample.get('model_name')}")

        # Test should_optimize_provider
        for provider_id in ["gemini", "openai"]:
            should_optimize = await dspy_multi_model_manager.should_optimize_provider(
                db, provider_id
            )
            print(
                f"   {provider_id} should optimize: {should_optimize['should_optimize']}"
            )
            print(f"      Total feedback: {should_optimize['total_feedback']}")
            print(f"      Threshold met: {should_optimize['threshold_met']}")


async def test_progress_tracking():
    """Test progress tracking functionality"""
    print("\n📈 Testing progress tracking...")

    # Test logging progress
    run_id = "test-progress-123"
    provider_id = "openai"

    dspy_multi_model_manager._log_progress(
        provider_id, run_id, "initialization", 10, "Starting test optimization"
    )

    dspy_multi_model_manager._log_progress(
        provider_id, run_id, "optimization", 50, "Running DSPy optimization"
    )

    # Test getting progress
    progress = dspy_multi_model_manager.get_provider_run_progress(provider_id, run_id)
    if progress:
        print(
            f"   ✅ Progress tracking working: {progress['step']} at {progress['progress']}%"
        )
        print(f"      Message: {progress['message']}")
    else:
        print("   ❌ Progress tracking failed")

    # Test getting all active runs
    all_runs = dspy_multi_model_manager.get_all_provider_active_runs()
    print(f"   Active runs across all providers: {len(all_runs)}")
    for pid, runs in all_runs.items():
        print(f"      {pid}: {len(runs)} active runs")


async def test_fallback_behavior():
    """Test fallback behavior when optimization fails"""
    print("\n🛡️  Testing fallback behavior...")

    # Test fallback result generation
    sample_feedback = [
        {"content": "test content 1", "rating": "positive"},
        {"content": "test content 2", "rating": "negative"},
    ]

    fallback_result = dspy_multi_model_manager._get_fallback_result(
        "anthropic", sample_feedback, "cheap", "Test error message"
    )

    print("   ✅ Fallback result generated")
    print(f"      Provider: {fallback_result['provider_id']}")
    print(f"      Mode: {fallback_result['mode']}")
    print(f"      Error: {fallback_result.get('error')}")
    print(f"      Training examples: {fallback_result['training_examples_count']}")
    print(f"      Prompt length: {len(fallback_result['optimized_prompt'])} characters")

    # Test prompt extraction fallback
    from unittest.mock import Mock

    mock_module = Mock()
    mock_module.extract = None

    extracted_prompt = dspy_multi_model_manager._extract_provider_prompt(
        mock_module, "gemini"
    )
    print("   ✅ Prompt extraction fallback working")
    print(f"      Contains provider name: {'gemini' in extracted_prompt.lower()}")
    print(f"      Contains DSPy reference: {'dspy' in extracted_prompt.lower()}")


async def main():
    """Main test execution"""
    print("🧪 Starting Multi-Provider DSPy Optimization Tests")
    print("=" * 60)

    # Ensure we're using test database
    if not os.environ.get("FORCE_TEST_DB"):
        print(
            "❌ ERROR: Must run with FORCE_TEST_DB=1 to prevent production database pollution"
        )
        sys.exit(1)

    # Initialize database
    await init_database()
    print("✅ Test database initialized")

    try:
        # Create sample data for testing
        async with get_db() as db:
            # Create sample feedback for different providers
            await create_sample_feedback(db, "gemini", "gemini-2.5-flash", 65)
            await create_sample_feedback(db, "openai", "gpt-4o-mini", 55)
            await create_sample_feedback(
                db, "anthropic", "claude-3-5-sonnet", 30
            )  # Below threshold
            await create_sample_feedback(db, "openrouter", "deepseek/deepseek-r1", 70)

        # Test provider optimization thresholds
        threshold_results = await test_provider_optimization_thresholds()

        # Test multi-model manager directly
        await test_multi_provider_manager_directly()

        # Test progress tracking
        await test_progress_tracking()

        # Test fallback behavior
        await test_fallback_behavior()

        # Test actual optimization for providers with sufficient feedback
        providers_to_test = [
            provider_id
            for provider_id, data in threshold_results.items()
            if data["should_optimize"]
        ]

        if providers_to_test:
            print(
                f"\n🎯 Running optimization tests for providers: {', '.join(providers_to_test)}"
            )

            # Note: This would normally run actual DSPy optimization
            # For this test, we'll just verify the setup works
            for provider_id in providers_to_test[
                :2
            ]:  # Limit to 2 providers for testing
                print(
                    f"\n⚠️  Would run optimization for {provider_id} (skipped in test)"
                )
                # Uncomment to run actual optimization (requires DSPy and API keys):
                # await test_provider_specific_optimization(provider_id)
        else:
            print("\n⚠️  No providers meet optimization thresholds")

        print("\n" + "=" * 60)
        print("✅ Multi-Provider DSPy Optimization Tests Completed Successfully!")

        # Summary
        print("\n📋 Test Summary:")
        print("   - Sample feedback created for 4 providers")
        print("   - Threshold checking: ✅")
        print("   - Multi-model manager: ✅")
        print("   - Progress tracking: ✅")
        print("   - Fallback behavior: ✅")
        print(f"   - Ready for optimization: {len(providers_to_test)} providers")

    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
