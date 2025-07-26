#!/usr/bin/env python3
"""
Test script for the new monitoring and logging capabilities.

This script demonstrates the enhanced logging and monitoring API endpoints.
"""

from datetime import datetime
import os
import sys
import time

import requests

# Add the backend directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", ".."))


def test_monitoring_endpoints():
    """Test the monitoring endpoints"""
    base_url = "http://localhost:7532"

    print("🔍 Testing Monitoring Endpoints")
    print("=" * 50)

    # Test health endpoint
    print("\n📋 Testing /monitor/health")
    try:
        response = requests.get(f"{base_url}/monitor/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health Status: {data['status']}")
            print(f"   Uptime: {data['uptime_seconds']:.2f}s")
            print(f"   DSPy Available: {data['dspy_available']}")
            print(f"   Database Accessible: {data['database_accessible']}")
            print(f"   Active Optimizations: {data['active_optimizations']}")
        else:
            print(f"❌ Health endpoint failed: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"❌ Health endpoint error: {e}")

    # Test monitoring dashboard
    print("\n📊 Testing /monitor")
    try:
        response = requests.get(f"{base_url}/monitor", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print("✅ Monitoring Dashboard")
            print(f"   Active Runs: {len(data['active_runs'])}")
            print(f"   Recent Completions: {len(data['recent_completions'])}")
            print(f"   System Status: {data['system_health']['status']}")
        else:
            print(f"❌ Monitoring dashboard failed: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"❌ Monitoring dashboard error: {e}")

    # Test optimization status (should return not found for test ID)
    print("\n🔍 Testing /monitor/status/{run_id}")
    try:
        response = requests.get(f"{base_url}/monitor/status/test-run-123", timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print("✅ Status endpoint working (found run)")
            else:
                print("✅ Status endpoint working (run not found as expected)")
        else:
            print(f"❌ Status endpoint failed: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"❌ Status endpoint error: {e}")


def demonstrate_logging():
    """Demonstrate the enhanced logging features"""
    print("\n🔊 Demonstrating Enhanced Logging")
    print("=" * 50)

    from app.services.optimization_service import OptimizationService

    # Create service and simulate optimization progress
    service = OptimizationService()

    run_id = f"demo-{datetime.now().strftime('%H%M%S')}"

    print(f"📝 Simulating optimization run: {run_id}")

    # Simulate optimization steps
    steps = [
        ("initialization", 10, "🚀 Setting up optimization environment"),
        ("data_gathering", 30, "📊 Collecting training examples"),
        ("validation", 50, "✅ Validating training data"),
        ("optimization", 80, "🧠 Running DSPy optimization"),
        ("evaluation", 95, "📈 Evaluating performance"),
        ("completed", 100, "✅ Optimization completed successfully"),
    ]

    for step, progress, message in steps:
        service._log_progress(run_id, step, progress, message)
        time.sleep(0.5)  # Simulate work

    print("\n📋 Final Progress Status:")
    final_progress = service.get_run_progress(run_id)
    if final_progress:
        print(f"   Step: {final_progress['step']}")
        print(f"   Progress: {final_progress['progress']}%")
        print(f"   Message: {final_progress['message']}")
        print(f"   Timestamp: {final_progress['timestamp']}")


if __name__ == "__main__":
    print("🔧 Golden Nuggets Backend - Monitoring & Logging Test")
    print("=" * 60)

    # Test logging functionality (works without server)
    demonstrate_logging()

    print("\n" + "=" * 60)
    print("🌐 Testing API Endpoints (requires server running)")
    print("Run 'python run.py' in another terminal first")
    print("=" * 60)

    # Test API endpoints (requires server)
    test_monitoring_endpoints()

    print("\n✅ Testing Complete!")
    print("\n📚 Available Endpoints:")
    print("   GET  /monitor/health          - System health check")
    print("   GET  /monitor                 - Complete monitoring dashboard")
    print("   GET  /monitor/status/{run_id} - Individual optimization status")
    print(
        "   POST /optimize                - Trigger optimization (shows in monitoring)"
    )
