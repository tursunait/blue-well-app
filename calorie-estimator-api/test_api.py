"""
Simple test script to verify the Calorie Estimator API is working.

Usage:
    python test_api.py /path/to/food-image.jpg

Requirements:
    - API server running at http://localhost:8000
    - Valid image file path as argument
"""

import sys
import requests
from pathlib import Path


def test_health_check():
    """Test the health check endpoint."""
    print("Testing health check endpoint...")
    try:
        response = requests.get("http://localhost:8000/health")
        if response.status_code == 200:
            print("✓ Health check passed")
            print(f"  Response: {response.json()}")
            return True
        else:
            print(f"✗ Health check failed with status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("✗ Cannot connect to API. Is the server running?")
        print("  Run: uvicorn app.main:app --reload")
        return False


def test_estimate_calories(image_path: str):
    """Test the calorie estimation endpoint."""
    print(f"\nTesting calorie estimation with image: {image_path}")

    # Check if file exists
    if not Path(image_path).exists():
        print(f"✗ File not found: {image_path}")
        return False

    try:
        # Prepare the request
        url = "http://localhost:8000/v1/estimate-calories"

        with open(image_path, "rb") as image_file:
            files = {"images": image_file}
            data = {
                "hint": "test image",
                "plate_diameter_cm": 25
            }

            print("Sending request to API...")
            response = requests.post(url, files=files, data=data)

        if response.status_code == 200:
            print("✓ Calorie estimation successful")
            result = response.json()

            # Pretty print the results
            print("\n" + "=" * 60)
            print("RESULTS")
            print("=" * 60)

            for idx, item in enumerate(result.get("items", []), 1):
                print(f"\nItem {idx}:")
                print(f"  Dish: {item.get('dish_name')}")
                print(f"  Calories: {item.get('estimated_calories')}")
                print(f"  Confidence: {item.get('confidence', 0) * 100:.1f}%")
                print(f"  Dimensions: {item.get('estimated_dimensions_cm')}")
                print(f"  Rationale: {item.get('rationale')}")

                if "error" in item:
                    print(f"  ⚠️  Error: {item['error']}")

            print(f"\nTotal Calories: {result.get('total_calories')}")
            print(f"Model Used: {result.get('model_used')}")
            print("=" * 60)

            return True
        else:
            print(f"✗ Request failed with status {response.status_code}")
            print(f"  Error: {response.text}")
            return False

    except Exception as e:
        print(f"✗ Error during request: {str(e)}")
        return False


def main():
    """Main test function."""
    print("🍔 Calorie Estimator API - Test Script")
    print("=" * 60)
    print()

    # Test health check
    if not test_health_check():
        sys.exit(1)

    # Test calorie estimation if image path provided
    if len(sys.argv) > 1:
        image_path = sys.argv[1]
        if not test_estimate_calories(image_path):
            sys.exit(1)
    else:
        print("\n💡 Tip: Provide an image path to test calorie estimation")
        print("   Example: python test_api.py /path/to/food.jpg")

    print("\n✅ All tests passed!")


if __name__ == "__main__":
    main()
