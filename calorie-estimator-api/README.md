# Calorie Estimator API (Google Gemini Pro)

A FastAPI-based microservice that uses Google's Gemini Pro Vision API to estimate calories from food images. Perfect for wellness apps, nutrition tracking, and dietary applications.

## Features

- **AI-Powered Analysis**: Leverages Google Gemini Pro Vision API for accurate calorie estimation
- **Multi-Image Support**: Process multiple food images in a single request
- **Detailed Estimates**: Returns dish name, dimensions, calories, confidence score, and reasoning
- **Optional Context**: Provide hints (e.g., "vegetarian") or plate diameter for improved accuracy
- **Production-Ready**: Includes error handling, logging, CORS support, and health checks
- **Well-Documented**: Interactive API docs at `/docs` and `/redoc`
- **Free Tier Available**: Gemini offers generous free tier limits

## Why Gemini Pro?

- **Free Tier**: 15 requests per minute, 1500 requests per day for free
- **Fast**: gemini-1.5-flash is optimized for speed
- **Accurate**: Excellent vision capabilities
- **Cost-Effective**: ~20x cheaper than GPT-4o when you exceed free tier

## Prerequisites

- Python 3.9 or higher
- Google Gemini API key ([Get one for FREE here](https://aistudio.google.com/app/apikey))

## Setup Instructions

### 1. Get Your FREE Gemini API Key

1. Go to https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key (starts with `AIza...`)

### 2. Navigate to Project

```bash
cd ~/calorie-estimator-api
```

### 3. Install Dependencies

```bash
# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install packages
pip install -r requirements.txt
```

### 4. Configure Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Edit and add your Gemini API key
nano .env
```

In the `.env` file:
```env
GEMINI_API_KEY=AIza-your-actual-key-here
GEMINI_MODEL=gemini-1.5-flash
```

**⚠️ SECURITY**: Never commit the `.env` file or share your API key!

### 5. Run the Application

```bash
# Make sure virtual environment is activated
source venv/bin/activate

# Start the server
uvicorn app.main:app --reload
```

The API will be available at:
- **API**: http://localhost:8000
- **Interactive Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API Usage

### Health Check

```bash
curl http://localhost:8000/health
```

### Estimate Calories from Single Image

```bash
curl -X POST "http://localhost:8000/v1/estimate-calories" \
  -H "Content-Type: multipart/form-data" \
  -F "images=@/path/to/food-image.jpg"
```

### Estimate with Context Hints

```bash
curl -X POST "http://localhost:8000/v1/estimate-calories" \
  -F "images=@/path/to/food-image.jpg" \
  -F "hint=vegetarian meal" \
  -F "plate_diameter_cm=25"
```

### Multiple Images

```bash
curl -X POST "http://localhost:8000/v1/estimate-calories" \
  -F "images=@breakfast.jpg" \
  -F "images=@lunch.jpg" \
  -F "images=@dinner.jpg"
```

### Example Response

```json
{
  "items": [
    {
      "dish_name": "Grilled chicken salad",
      "estimated_dimensions_cm": {
        "length": 20,
        "width": 15,
        "height": 5
      },
      "estimated_calories": 280,
      "confidence": 0.85,
      "rationale": "Medium portion of grilled chicken breast with mixed greens, cherry tomatoes, and light vinaigrette dressing."
    }
  ],
  "total_calories": 280,
  "model_used": "gemini-1.5-flash",
  "images_processed": 1
}
```

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `images` | File[] | Yes | One or more JPEG/PNG food images |
| `hint` | String | No | Optional context (e.g., "dessert", "vegan") |
| `plate_diameter_cm` | Float | No | Plate diameter (10-50 cm) for scale reference |

## Model Selection

| Model | Speed | Cost | Accuracy | Free Tier |
|-------|-------|------|----------|-----------|
| `gemini-1.5-flash` | Very Fast | Free* | Excellent | 15 RPM, 1500 RPD |
| `gemini-1.5-pro` | Fast | Free* | Best | 2 RPM, 50 RPD |

*Free tier limits. Paid tier: Flash $0.075/1M tokens, Pro $1.25/1M tokens

Set in `.env`:
```env
GEMINI_MODEL=gemini-1.5-flash
```

## Testing the API

### Using Python

```python
import requests

url = "http://localhost:8000/v1/estimate-calories"

with open("food.jpg", "rb") as image_file:
    files = {"images": image_file}
    data = {"hint": "Italian cuisine", "plate_diameter_cm": 25}
    response = requests.post(url, files=files, data=data)
    print(response.json())
```

### Using the Test Script

```bash
python test_api.py /path/to/food-image.jpg
```

### Using Interactive Docs

1. Go to http://localhost:8000/docs
2. Click on `/v1/estimate-calories`
3. Click "Try it out"
4. Upload an image
5. Click "Execute"

## Project Structure

```
calorie-estimator-api/
├── app/
│   ├── __init__.py          # Package initialization
│   ├── main.py              # FastAPI application and endpoints
│   └── gemini_client.py     # Gemini API integration
├── .env.example             # Environment variables template
├── .gitignore              # Git ignore rules
├── requirements.txt         # Python dependencies
├── README.md               # This file
└── test_api.py             # Testing utility
```

## Error Handling

The API returns appropriate HTTP status codes:

- **200**: Success
- **400**: Invalid request (wrong file type, missing images)
- **502**: Invalid response from Gemini API
- **500**: Internal server error
- **503**: Service unavailable (health check failed)

## Gemini API Limits

### Free Tier
- **gemini-1.5-flash**: 15 requests/minute, 1500 requests/day
- **gemini-1.5-pro**: 2 requests/minute, 50 requests/day

### Rate Limit Handling
If you hit rate limits, you'll get an error message. Consider:
- Reducing request frequency
- Using batch processing during off-peak hours
- Upgrading to paid tier if needed

## Troubleshooting

### "GEMINI_API_KEY environment variable is not set"
→ Check your `.env` file exists and contains your key

### "Cannot connect to API"
→ Run: `uvicorn app.main:app --reload`

### "google-generativeai package is not installed"
→ Run: `pip install -r requirements.txt`

### "400 Bad Request"
→ Only JPEG and PNG images are supported

### Rate Limit Errors
→ Free tier limits exceeded. Wait or upgrade to paid tier

## Getting Your Gemini API Key

1. Visit https://aistudio.google.com/app/apikey
2. Sign in with Google account
3. Click "Create API Key"
4. Select "Create API key in new project" or choose existing
5. Copy the key (format: `AIza...`)
6. Paste in `.env` file

The free tier is very generous and perfect for development and moderate production use!

## Security Best Practices

1. **Never commit `.env`**: Your `.env` file is in `.gitignore`
2. **Rotate API keys**: Regularly update your Gemini API key
3. **CORS**: Update CORS settings in `main.py` for production

## Deployment

### Docker (Optional)

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:
```bash
docker build -t calorie-estimator .
docker run -p 8000:8000 --env-file .env calorie-estimator
```

### Cloud Platforms

- **Railway**: Connect GitHub repo, add `GEMINI_API_KEY` env variable
- **Render**: Web service from GitHub, add env variables
- **Google Cloud Run**: Native Gemini integration

## Cost Comparison

| Provider | Model | Cost per 1M tokens | Free Tier |
|----------|-------|-------------------|-----------|
| Google | gemini-1.5-flash | $0.075 | 1500 req/day |
| Google | gemini-1.5-pro | $1.25 | 50 req/day |
| OpenAI | gpt-4o-mini | $0.15 | None |
| OpenAI | gpt-4o | $5.00 | None |

**Gemini is ~20x cheaper than GPT-4o and includes a generous free tier!**

## Why We Switched from OpenAI

- **Cost**: Gemini is significantly cheaper
- **Free Tier**: 1500 free requests per day
- **Speed**: gemini-1.5-flash is very fast
- **Quality**: Comparable accuracy for vision tasks
- **No Billing Required**: Start using immediately with free tier

## License

MIT License - feel free to use in your projects!

## Support

- **Gemini API Docs**: https://ai.google.dev/docs
- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **API Console**: https://aistudio.google.com/

## Changelog

### v1.1.0 (2024)
- Switched from OpenAI to Google Gemini Pro
- Added support for gemini-1.5-flash and gemini-1.5-pro
- Improved JSON parsing (handles markdown code blocks)
- Updated error handling

### v1.0.0 (2024)
- Initial release with OpenAI Vision API

---

**Built with FastAPI and Google Gemini Pro Vision API**
