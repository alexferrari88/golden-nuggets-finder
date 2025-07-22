#!/usr/bin/env python3
"""
Test script for deduplication functionality.

This script tests the new deduplication feature by:
1. Submitting duplicate missing content feedback
2. Submitting duplicate nugget feedback
3. Verifying report counts increase properly
4. Checking API responses include deduplication info
"""

import asyncio
import json
import uuid
from datetime import datetime
import aiohttp
import time

# Test configuration
BASE_URL = "http://localhost:7532"
TEST_URL = "https://example.com/test-page"

async def test_deduplication():
    """Test the deduplication functionality"""
    print("🧪 Testing Feedback Deduplication")
    print("=" * 50)
    
    async with aiohttp.ClientSession() as session:
        # Test 1: Submit missing content feedback multiple times
        print("\n📋 Test 1: Missing Content Deduplication")
        print("-" * 30)
        
        missing_content_data = {
            "missingContentFeedback": [{
                "id": str(uuid.uuid4()),
                "content": "This is a test golden nugget that should be deduplicated",
                "suggestedType": "tool",
                "timestamp": int(time.time() * 1000),
                "url": TEST_URL,
                "context": "Test context for deduplication testing"
            }]
        }
        
        # First submission (should be new)
        print("Submitting first missing content feedback...")
        async with session.post(f"{BASE_URL}/feedback", json=missing_content_data) as response:
            result1 = await response.json()
            print(f"✅ First submission: {result1.get('message', 'Unknown')}")
            print(f"   Duplicates: {result1.get('deduplication', {})}")
        
        # Second submission (should be duplicate)
        missing_content_data["missingContentFeedback"][0]["id"] = str(uuid.uuid4())  # New ID
        print("Submitting duplicate missing content feedback...")
        async with session.post(f"{BASE_URL}/feedback", json=missing_content_data) as response:
            result2 = await response.json()
            print(f"✅ Second submission: {result2.get('message', 'Unknown')}")
            print(f"   Duplicates: {result2.get('deduplication', {})}")
        
        # Third submission (should be duplicate)
        missing_content_data["missingContentFeedback"][0]["id"] = str(uuid.uuid4())  # New ID
        print("Submitting third missing content feedback...")
        async with session.post(f"{BASE_URL}/feedback", json=missing_content_data) as response:
            result3 = await response.json()
            print(f"✅ Third submission: {result3.get('message', 'Unknown')}")
            print(f"   Duplicates: {result3.get('deduplication', {})}")
        
        # Test 2: Submit nugget feedback multiple times
        print("\n🎯 Test 2: Nugget Feedback Deduplication")
        print("-" * 30)
        
        nugget_data = {
            "nuggetFeedback": [{
                "id": str(uuid.uuid4()),
                "nuggetContent": "This is a test nugget for deduplication testing",
                "originalType": "explanation",
                "correctedType": None,
                "rating": "positive",
                "timestamp": int(time.time() * 1000),
                "url": TEST_URL,
                "context": "Test context for nugget deduplication"
            }]
        }
        
        # First nugget submission
        print("Submitting first nugget feedback...")
        async with session.post(f"{BASE_URL}/feedback", json=nugget_data) as response:
            result1 = await response.json()
            print(f"✅ First nugget: {result1.get('message', 'Unknown')}")
            print(f"   Duplicates: {result1.get('deduplication', {})}")
        
        # Second nugget submission (duplicate)
        nugget_data["nuggetFeedback"][0]["id"] = str(uuid.uuid4())  # New ID
        nugget_data["nuggetFeedback"][0]["rating"] = "negative"  # Changed rating
        print("Submitting duplicate nugget feedback (different rating)...")
        async with session.post(f"{BASE_URL}/feedback", json=nugget_data) as response:
            result2 = await response.json()
            print(f"✅ Second nugget: {result2.get('message', 'Unknown')}")
            print(f"   Duplicates: {result2.get('deduplication', {})}")
        
        # Test 3: Check duplicate analysis endpoint
        print("\n📊 Test 3: Duplicate Analysis Endpoint")
        print("-" * 30)
        
        print("Fetching duplicate analysis...")
        async with session.get(f"{BASE_URL}/feedback/duplicates") as response:
            if response.status == 200:
                duplicates = await response.json()
                print(f"✅ Found {duplicates.get('total_found', 0)} duplicate groups")
                
                for i, dup in enumerate(duplicates.get('duplicates', [])[:3]):  # Show first 3
                    print(f"   {i+1}. {dup['feedback_type']} - Count: {dup['report_count']}")
                    print(f"      Content: {dup['content'][:80]}...")
                    print(f"      URL: {dup['url']}")
            else:
                print(f"❌ Failed to fetch duplicates: {response.status}")
        
        # Test 4: Check updated dashboard stats
        print("\n📈 Test 4: Dashboard Stats with Deduplication")
        print("-" * 30)
        
        print("Fetching dashboard stats...")
        async with session.get(f"{BASE_URL}/dashboard/stats") as response:
            if response.status == 200:
                stats = await response.json()
                print(f"✅ Dashboard stats retrieved")
                print(f"   Total nugget reports: {stats.get('total_nugget_reports', 'N/A')}")
                print(f"   Total missing reports: {stats.get('total_missing_reports', 'N/A')}")
                print(f"   Duplicate nugget items: {stats.get('duplicate_nugget_items', 'N/A')}")
                print(f"   Duplicate missing items: {stats.get('duplicate_missing_items', 'N/A')}")
            else:
                print(f"❌ Failed to fetch dashboard stats: {response.status}")
    
    print("\n🎉 Deduplication testing completed!")
    print("=" * 50)


async def test_edge_cases():
    """Test edge cases for deduplication"""
    print("\n🔬 Testing Edge Cases")
    print("=" * 30)
    
    async with aiohttp.ClientSession() as session:
        # Test: Same content, different URL (should NOT be duplicate)
        print("Testing same content, different URLs...")
        
        base_data = {
            "missingContentFeedback": [{
                "id": str(uuid.uuid4()),
                "content": "Same content, different URL test",
                "suggestedType": "tool",
                "timestamp": int(time.time() * 1000),
                "url": "https://example.com/page1",
                "context": "Test context 1"
            }]
        }
        
        # First URL
        async with session.post(f"{BASE_URL}/feedback", json=base_data) as response:
            result1 = await response.json()
            print(f"   URL1: {result1.get('deduplication', {}).get('missing_content_duplicates', 0)} duplicates")
        
        # Different URL
        base_data["missingContentFeedback"][0]["id"] = str(uuid.uuid4())
        base_data["missingContentFeedback"][0]["url"] = "https://example.com/page2"
        async with session.post(f"{BASE_URL}/feedback", json=base_data) as response:
            result2 = await response.json()
            print(f"   URL2: {result2.get('deduplication', {}).get('missing_content_duplicates', 0)} duplicates")
        
        # Test: Nugget with same content but different type (should NOT be duplicate)
        print("Testing same nugget content, different types...")
        
        nugget_base = {
            "nuggetFeedback": [{
                "id": str(uuid.uuid4()),
                "nuggetContent": "Same nugget content, different type test",
                "originalType": "tool",
                "correctedType": None,
                "rating": "positive",
                "timestamp": int(time.time() * 1000),
                "url": TEST_URL,
                "context": "Nugget test context"
            }]
        }
        
        # First type
        async with session.post(f"{BASE_URL}/feedback", json=nugget_base) as response:
            result1 = await response.json()
            print(f"   Type 'tool': {result1.get('deduplication', {}).get('nugget_duplicates', 0)} duplicates")
        
        # Different type
        nugget_base["nuggetFeedback"][0]["id"] = str(uuid.uuid4())
        nugget_base["nuggetFeedback"][0]["originalType"] = "explanation"
        async with session.post(f"{BASE_URL}/feedback", json=nugget_base) as response:
            result2 = await response.json()
            print(f"   Type 'explanation': {result2.get('deduplication', {}).get('nugget_duplicates', 0)} duplicates")


if __name__ == "__main__":
    print("🚀 Starting Deduplication Tests")
    print("Make sure the backend is running on http://localhost:7532")
    print()
    
    asyncio.run(test_deduplication())
    asyncio.run(test_edge_cases())