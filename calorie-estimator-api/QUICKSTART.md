# Quick Start Guide (Gemini Pro)

Get the Calorie Estimator API running in 5 minutes with **FREE** Google Gemini Pro!

## Why Gemini?

✅ **FREE** - 1500 requests per day at no cost
✅ **Fast** - Optimized for speed
✅ **Accurate** - Excellent vision capabilities
✅ **No Credit Card** - Start immediately

## Setup (3 Steps)

### 1. Get Your FREE Gemini API Key

Visit https://aistudio.google.com/app/apikey

1. Sign in with your Google account
2. Click "Create API Key"
3. Copy the key (starts with `AIza...`)

**Takes 30 seconds!**

### 2. Install & Configure

```bash
# Navigate to project
cd ~/calorie-estimator-api

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
nano .env
```

In the `.env` file, paste your key:
```env
GEMINI_API_KEY=AIza-your-actual-key-here
GEMINI_MODEL=gemini-1.5-flash
```

### 3. Run!

```bash
uvicorn app.main:app --reload
```

Visit **http://localhost:8000/docs**

## Test It

### Option 1: Interactive Docs (Easiest)

1. Go to http://localhost:8000/docs
2. Click `/v1/estimate-calories`
3. Click "Try it out"
4. Upload a food image
5. Click "Execute"

### Option 2: Command Line

```bash
curl -X POST "http://localhost:8000/v1/estimate-calories" \
  -F "images=@/path/to/food.jpg"
```

### Option 3: Test Script

```bash
python test_api.py /path/to/food-image.jpg
```

## Example Response

```json
{
  "items": [{
    "dish_name": "Caesar salad",
    "estimated_dimensions_cm": {"length": 20, "width": 15, "height": 5},
    "estimated_calories": 320,
    "confidence": 0.82,
    "rationale": "Mixed greens with grilled chicken, parmesan, and Caesar dressing."
  }],
  "total_calories": 320,
  "model_used": "gemini-1.5-flash",
  "images_processed": 1
}
```

## Free Tier Limits

- **gemini-1.5-flash**: 15 requests/min, 1500 requests/day
- **gemini-1.5-pro**: 2 requests/min, 50 requests/day

Perfect for development and moderate production use!

## Troubleshooting

### "GEMINI_API_KEY not set"
→ Check `.env` file exists and contains your key

### "Cannot connect"
→ Run: `uvicorn app.main:app --reload`

### "Package not installed"
→ Run: `pip install -r requirements.txt`

## Next Steps

- Read [README.md](README.md) for full documentation
- Check [API docs](http://localhost:8000/docs) for all endpoints
- Try different images
- Integrate with your wellness app!

---

**Ready in 5 minutes with Google Gemini Pro!** 🚀
