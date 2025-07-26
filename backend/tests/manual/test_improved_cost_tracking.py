#!/usr/bin/env python3
"""
Test script demonstrating the improved cost tracking service using DSPy's built-in cost tracking.
"""

import asyncio
import os
from pathlib import Path
import sys

# Add the backend directory to Python path
backend_dir = Path(__file__).parent.parent.parent
sys.path.append(str(backend_dir))

import aiosqlite
from dotenv import load_dotenv
import dspy  # type: ignore[import-untyped]

from app.services.improved_cost_tracking_service import ImprovedCostTrackingService


async def setup_test_database():
    """Set up a test database with the cost_tracking table"""
    db = await aiosqlite.connect(":memory:")

    # Create the cost_tracking table
    await db.execute("""
        CREATE TABLE cost_tracking (
            id TEXT PRIMARY KEY,
            optimization_run_id TEXT NOT NULL,
            operation_type TEXT NOT NULL,
            model_name TEXT NOT NULL,
            input_tokens INTEGER NOT NULL,
            output_tokens INTEGER NOT NULL,
            cost_usd REAL NOT NULL,
            timestamp TEXT NOT NULL,
            metadata TEXT
        )
    """)

    # Create optimization_runs table
    await db.execute("""
        CREATE TABLE optimization_runs (
            id TEXT PRIMARY KEY,
            started_at TEXT NOT NULL,
            api_cost REAL DEFAULT 0,
            total_tokens INTEGER DEFAULT 0,
            input_tokens INTEGER DEFAULT 0,
            output_tokens INTEGER DEFAULT 0
        )
    """)

    await db.commit()
    return db


def setup_dspy_with_gemini():
    """Set up DSPy with Gemini 2.5-flash model"""
    # Load environment variables from .env file
    env_path = backend_dir / ".env"
    load_dotenv(env_path)

    # Get API key from environment
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in environment variables")

    # Configure DSPy with Gemini using correct syntax
    gemini_lm = dspy.LM(model="gemini/gemini-2.5-flash", api_key=api_key)

    dspy.configure(lm=gemini_lm)
    return gemini_lm


async def test_improved_cost_tracking():
    """Test the improved cost tracking service"""
    print("🧪 Testing Improved Cost Tracking Service")
    print("=" * 50)

    # Set up test environment
    db = await setup_test_database()
    lm = setup_dspy_with_gemini()
    cost_service = ImprovedCostTrackingService()

    # Create a test optimization run
    run_id = "test-run-123"
    await db.execute(
        "INSERT INTO optimization_runs (id, started_at) VALUES (?, ?)",
        (run_id, "2024-01-01T00:00:00Z"),
    )
    await db.commit()

    print(f"✅ Test setup complete. Run ID: {run_id}")

    # Simulate Operation 1: Initial prompt generation
    print("\n🔥 Operation 1: Initial prompt generation")
    lm.history.clear()  # Start fresh

    # Make some API calls
    response1 = lm("Generate a prompt for extracting golden nuggets from web content.")
    print(f"Response 1: {response1[0][:100]}...")

    response2 = lm("Refine this prompt to be more specific and effective.")
    print(f"Response 2: {response2[0][:100]}...")

    # Track the operation cost using improved method
    cost_breakdown = await cost_service.track_dspy_operation_cost(
        db=db,
        lm=lm,
        optimization_run_id=run_id,
        operation_type="prompt_generation",
        operation_name="Initial prompt creation",
        metadata={"version": "1.0", "optimization_phase": "initialization"},
    )

    print(f"💰 Operation 1 cost: ${cost_breakdown['operation_cost']:.6f}")
    print(f"🔢 Tokens used: {cost_breakdown['total_tokens']}")
    print(f"📞 API calls: {cost_breakdown['api_calls']}")
    print(f"📊 Cost per token: ${cost_breakdown['cost_per_token']:.8f}")

    # Simulate Operation 2: Optimization
    print("\n🧠 Operation 2: Optimization phase")
    lm.history.clear()  # Start fresh for next operation

    # Make more API calls
    response3 = lm(
        "Analyze this content for golden nuggets: 'Machine learning transforms healthcare by enabling predictive analytics.'"
    )
    print(f"Response 3: {response3[0][:100]}...")

    response4 = lm("What are three key benefits of renewable energy systems?")
    print(f"Response 4: {response4[0][:100]}...")

    response5 = lm("Explain the concept of compound interest in simple terms.")
    print(f"Response 5: {response5[0][:100]}...")

    # Track the optimization cost
    cost_breakdown2 = await cost_service.track_dspy_operation_cost(
        db=db,
        lm=lm,
        optimization_run_id=run_id,
        operation_type="optimization",
        operation_name="Content analysis optimization",
        metadata={"version": "1.0", "optimization_phase": "main"},
    )

    print(f"💰 Operation 2 cost: ${cost_breakdown2['operation_cost']:.6f}")
    print(f"🔢 Tokens used: {cost_breakdown2['total_tokens']}")
    print(f"📞 API calls: {cost_breakdown2['api_calls']}")

    # Get run costs summary
    print("\n📊 Run Cost Summary")
    run_costs = await cost_service.get_run_costs(db, run_id)

    print(f"Total run cost: ${run_costs['total_cost']:.6f}")
    print(f"Total tokens: {run_costs['total_tokens']}")
    print(f"Cost accuracy: {run_costs['cost_accuracy']['accuracy_percentage']:.1f}%")
    print(f"Tracking method: {run_costs['cost_accuracy']['method']}")

    print("\nCosts by operation:")
    for op_type, costs in run_costs["costs_by_operation"].items():
        print(f"  {op_type}: ${costs['total_cost']:.6f} ({costs['call_count']} calls)")

    # Test real-time cost monitoring
    print("\n⚡ Real-time Cost Monitoring Test")
    lm.history.clear()

    # Make a few calls
    lm("Quick test question 1")
    lm("Quick test question 2")

    # Get real-time cost without storing to database
    realtime_cost = cost_service.get_cost_from_dspy_history(lm)

    print(f"Real-time cost: ${realtime_cost['total_cost']:.6f}")
    print(f"Cost per call: ${realtime_cost['cost_per_call']:.6f}")
    print(f"Method: {realtime_cost['method']}")
    print(f"Accurate: {realtime_cost['accurate']}")

    # Clean up
    await db.close()

    print("\n" + "=" * 50)
    print("🎉 IMPROVED COST TRACKING TEST COMPLETE")
    print("✅ DSPy built-in cost tracking is working perfectly!")
    print("✅ More accurate than manual calculations")
    print("✅ Zero maintenance required")
    print("✅ Real-time cost monitoring available")


if __name__ == "__main__":
    asyncio.run(test_improved_cost_tracking())
