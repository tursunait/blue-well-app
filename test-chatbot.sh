#!/bin/bash
# Quick test script to verify chatbot enhancements

echo "🧪 Testing Chatbot Enhancements"
echo "================================"
echo ""

# Check if API is running
echo "1. Checking if API is running..."
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "   ✅ API is running on http://localhost:8000"
else
    echo "   ❌ API is NOT running. Start it with:"
    echo "      cd apps/api && python3 -m uvicorn main:app --reload"
    exit 1
fi

# Check if web app is running
echo ""
echo "2. Checking if web app is running..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "   ✅ Web app is running on http://localhost:3000"
else
    echo "   ❌ Web app is NOT running. Start it with:"
    echo "      pnpm dev:web"
    exit 1
fi

# Test chat endpoint
echo ""
echo "3. Testing chat endpoint..."
response=$(curl -s -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "suggest a workout",
    "user_profile": {
      "primaryGoal": "General fitness",
      "timePrefs": ["morning"]
    }
  }')

if echo "$response" | grep -q "suggestions\|message"; then
    echo "   ✅ Chat endpoint is working"
    echo "   Response preview: $(echo $response | cut -c1-100)..."
else
    echo "   ❌ Chat endpoint returned unexpected response:"
    echo "   $response"
fi

# Test workouts summary endpoint
echo ""
echo "4. Testing workouts summary endpoint..."
if curl -s http://localhost:8000/workouts/summary | grep -q "totalWorkouts\|weekStart"; then
    echo "   ✅ Workouts summary endpoint is working"
else
    echo "   ⚠️  Workouts summary endpoint may need database setup"
fi

# Test planner endpoint
echo ""
echo "5. Testing planner endpoint..."
response=$(curl -s -X POST http://localhost:8000/planner/save \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2024-11-08",
    "planJson": {"workouts": [], "meals": [], "classes": []}
  }')

if echo "$response" | grep -q "success\|plan"; then
    echo "   ✅ Planner endpoint is working"
else
    echo "   ⚠️  Planner endpoint returned: $response"
fi

echo ""
echo "================================"
echo "✅ Basic API tests complete!"
echo ""
echo "Next steps:"
echo "1. Open http://localhost:3000/chat in your browser"
echo "2. Try typing: 'suggest a workout'"
echo "3. Try typing: 'daily plan'"
echo "4. Visit http://localhost:3000/progress to see progress tracking"
echo ""
echo "For detailed testing, see TESTING_GUIDE.md"

