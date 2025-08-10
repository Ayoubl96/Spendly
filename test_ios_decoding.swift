import Foundation

// Test JSON that mimics the actual backend response with string-encoded decimals
let testJSON = """
{
    "total_budget": "1000.50",
    "total_spent": "250.75", 
    "total_remaining": "749.25",
    "overall_percentage": "25.075",
    "overall_status": "on_track",
    "budget_count": 5,
    "status_counts": {
        "on_track": 3,
        "warning": 1,
        "over_budget": 1
    },
    "budgets": []
}
"""

// Test mixed format (some strings, some numbers)
let mixedJSON = """
{
    "total_budget": 1000.50,
    "total_spent": "250.75", 
    "total_remaining": "749.25",
    "overall_percentage": 25.075,
    "overall_status": "on_track",
    "budget_count": 5,
    "status_counts": {
        "on_track": 3,
        "warning": 1,
        "over_budget": 1
    },
    "budgets": []
}
"""

print("✅ Test JSON samples created")
print("🔍 String-encoded decimals test:")
print(testJSON)
print("\n🔍 Mixed format test:")
print(mixedJSON)
