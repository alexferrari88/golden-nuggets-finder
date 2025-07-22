#!/usr/bin/env python3
"""
Test script to verify DSPy's built-in cost tracking mechanism with Gemini 2.5-flash.

This tests the approach: cost = sum([x['cost'] for x in lm.history if x['cost'] is not None])
"""

import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.append(str(backend_dir))

import dspy
from dotenv import load_dotenv


def setup_dspy_with_gemini():
    """Set up DSPy with Gemini 2.5-flash model"""
    # Load environment variables from .env file
    env_path = backend_dir / ".env"
    load_dotenv(env_path)
    
    # Get API key from environment
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in environment variables")
    
    print(f"🔑 Using Gemini API key: {api_key[:10]}...{api_key[-4:]}")
    
    # Configure DSPy with Gemini using correct syntax
    gemini_lm = dspy.LM(
        model="gemini/gemini-2.5-flash",
        api_key=api_key
    )
    
    dspy.configure(lm=gemini_lm)
    return gemini_lm


def test_basic_api_call(lm):
    """Test a basic API call and check cost tracking"""
    print("\n🧪 Testing basic API call...")
    
    # Clear history before test
    lm.history.clear()
    
    # Make a simple API call
    response = lm("What is the capital of France?")
    print(f"Response: {response}")
    
    # Check history
    print(f"\n📊 History entries: {len(lm.history)}")
    
    for i, entry in enumerate(lm.history):
        print(f"\nEntry {i + 1}:")
        print(f"  Keys: {list(entry.keys())}")
        
        if 'cost' in entry:
            print(f"  Cost: {entry['cost']}")
        else:
            print("  No 'cost' key found")
            
        # Check for other cost-related keys
        cost_keys = [k for k in entry.keys() if 'cost' in k.lower() or 'price' in k.lower() or 'token' in k.lower()]
        if cost_keys:
            print(f"  Cost-related keys: {cost_keys}")
            for key in cost_keys:
                print(f"    {key}: {entry[key]}")


def test_multiple_api_calls(lm):
    """Test multiple API calls to accumulate cost data"""
    print("\n🧪 Testing multiple API calls...")
    
    # Clear history before test
    lm.history.clear()
    
    questions = [
        "What is 2 + 2?",
        "Name three colors.",
        "What is the largest planet?",
        "How do you say hello in Spanish?",
        "What year was the internet invented?"
    ]
    
    for i, question in enumerate(questions, 1):
        print(f"  Question {i}: {question}")
        response = lm(question)
        print(f"    Response: {response[:50]}...")
    
    print(f"\n📊 Total history entries: {len(lm.history)}")
    
    # Test the DSPy cost calculation approach
    try:
        cost = sum([x['cost'] for x in lm.history if x['cost'] is not None])
        print(f"💰 Total cost using DSPy method: ${cost:.6f}")
        return cost
    except KeyError:
        print("❌ No 'cost' key found in history entries")
        return None


def test_dspy_signature(lm):
    """Test using DSPy signatures and check cost tracking"""
    print("\n🧪 Testing DSPy Signature...")
    
    # Clear history before test
    lm.history.clear()
    
    # Define a simple signature
    class BasicQA(dspy.Signature):
        """Answer questions accurately and concisely."""
        question = dspy.InputField()
        answer = dspy.OutputField()
    
    # Use the signature
    qa = dspy.Predict(BasicQA)
    result = qa(question="What are the benefits of renewable energy?")
    
    print(f"Question: What are the benefits of renewable energy?")
    print(f"Answer: {result.answer}")
    
    print(f"\n📊 History entries after signature: {len(lm.history)}")
    
    # Check cost tracking
    try:
        cost = sum([x['cost'] for x in lm.history if x['cost'] is not None])
        print(f"💰 Total cost using DSPy method: ${cost:.6f}")
        return cost
    except KeyError:
        print("❌ No 'cost' key found in history entries")
        return None


def analyze_history_structure(lm):
    """Analyze the structure of lm.history to understand available data"""
    print("\n🔍 Analyzing history structure...")
    
    if not lm.history:
        print("History is empty")
        return
    
    # Look at the first entry in detail
    first_entry = lm.history[0]
    print(f"First entry keys: {list(first_entry.keys())}")
    
    for key, value in first_entry.items():
        print(f"  {key}: {type(value).__name__} = {str(value)[:100]}...")
    
    # Check if there's usage/cost information anywhere
    print("\nLooking for cost/usage information...")
    for i, entry in enumerate(lm.history):
        cost_related = {}
        for key, value in entry.items():
            if any(keyword in key.lower() for keyword in ['cost', 'price', 'token', 'usage', 'billing']):
                cost_related[key] = value
        
        if cost_related:
            print(f"  Entry {i + 1} cost-related data: {cost_related}")


def main():
    """Main test function"""
    print("🚀 Testing DSPy Built-in Cost Tracking with Gemini 2.5-flash")
    print("=" * 60)
    
    try:
        # Setup DSPy with Gemini
        lm = setup_dspy_with_gemini()
        print("✅ DSPy configured with Gemini 2.5-flash")
        
        # Test basic API call
        test_basic_api_call(lm)
        
        # Test multiple calls
        multiple_cost = test_multiple_api_calls(lm)
        
        # Test DSPy signature
        signature_cost = test_dspy_signature(lm)
        
        # Analyze history structure
        analyze_history_structure(lm)
        
        print("\n" + "=" * 60)
        print("📈 SUMMARY:")
        print(f"✅ DSPy setup: Success")
        print(f"✅ API calls: Success")
        
        if multiple_cost is not None:
            print(f"💰 Cost tracking: Working (${multiple_cost:.6f})")
            print("✅ DSPy built-in cost tracking is available!")
        else:
            print("❌ Cost tracking: Not available in history")
            print("⚠️  Need to use manual cost calculation")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()