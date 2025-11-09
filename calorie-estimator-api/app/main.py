"""
Calorie Estimator API
FastAPI server for estimating calories from food images
"""
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
from dotenv import load_dotenv
import openai
from openai import OpenAI
import base64
import io
from PIL import Image

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Calorie Estimator API",
    description="API for estimating calories and nutrition from food images",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenAI client
openai_api_key = os.getenv("OPENAI_API_KEY")
if not openai_api_key:
    raise ValueError("OPENAI_API_KEY not found in environment variables")

client = OpenAI(api_key=openai_api_key)
model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")


# Response models
class NutritionInfo(BaseModel):
    calories: float
    protein_g: float
    carbohydrates_g: float
    fat_g: float
    fiber_g: Optional[float] = 0.0
    sugar_g: Optional[float] = 0.0
    sodium_mg: Optional[float] = 0.0


class CalorieEstimateItem(BaseModel):
    dish_name: str
    estimated_calories: float
    nutrition: NutritionInfo
    confidence: float
    rationale: str


class CalorieEstimateResponse(BaseModel):
    items: List[CalorieEstimateItem]
    total_calories: float
    model_used: str
    images_processed: int


async def analyze_image_with_openai(image_bytes: bytes, hint: Optional[str] = None) -> Dict[str, Any]:
    """Analyze food image using OpenAI Vision API"""
    try:
        # Convert image to base64
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        image_data_url = f"data:image/jpeg;base64,{image_base64}"
        
        # Build prompt
        prompt = """Analyze this food image and estimate the nutrition information.
Return a JSON object with this exact structure:
{
  "name": "dish name",
  "calories": number,
  "proteinG": number,
  "carbsG": number,
  "fatG": number,
  "confidence": number between 0 and 1,
  "rationale": "brief explanation"
}

Be as accurate as possible. If uncertain, provide reasonable estimates."""
        
        if hint:
            prompt += f"\n\nHint: {hint}"
        
        # Call OpenAI Vision API
        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": image_data_url
                            }
                        }
                    ]
                }
            ],
            max_tokens=500,
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        if not content:
            raise ValueError("No response from OpenAI")
        
        # Parse JSON response
        import json
        result = json.loads(content)
        
        # Normalize field names
        return {
            "dish_name": result.get("name", "Unknown dish"),
            "estimated_calories": float(result.get("calories", 0)),
            "nutrition": {
                "calories": float(result.get("calories", 0)),
                "protein_g": float(result.get("proteinG", 0)),
                "carbohydrates_g": float(result.get("carbsG", 0)),
                "fat_g": float(result.get("fatG", 0)),
                "fiber_g": float(result.get("fiberG", 0)),
                "sugar_g": float(result.get("sugarG", 0)),
                "sodium_mg": float(result.get("sodiumMg", 0))
            },
            "confidence": float(result.get("confidence", 0.7)),
            "rationale": result.get("rationale", "AI estimate")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing image: {str(e)}")


@app.get("/")
async def root():
    return {"message": "Calorie Estimator API", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/v1/estimate-calories", response_model=CalorieEstimateResponse)
async def estimate_calories(
    images: List[UploadFile] = File(...),
    hint: Optional[str] = Form(None),
    plate_diameter_cm: Optional[float] = Form(None)
):
    """
    Estimate calories and nutrition from food images
    
    Args:
        images: List of image files
        hint: Optional hint about the food (e.g., "chicken salad")
        plate_diameter_cm: Optional plate diameter for size estimation
    
    Returns:
        CalorieEstimateResponse with estimated nutrition information
    """
    try:
        if not images:
            raise HTTPException(status_code=400, detail="No images provided")
        
        # Process first image (for now, we'll process one at a time)
        image_file = images[0]
        image_bytes = await image_file.read()
        
        # Analyze image
        result = await analyze_image_with_openai(image_bytes, hint)
        
        # Build response
        response = CalorieEstimateResponse(
            items=[
                CalorieEstimateItem(
                    dish_name=result["dish_name"],
                    estimated_calories=result["estimated_calories"],
                    nutrition=NutritionInfo(**result["nutrition"]),
                    confidence=result["confidence"],
                    rationale=result["rationale"]
                )
            ],
            total_calories=result["estimated_calories"],
            model_used=model,
            images_processed=1
        )
        
        return response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error estimating calories: {str(e)}")


@app.post("/v1/estimate-calories-text", response_model=CalorieEstimateResponse)
async def estimate_calories_from_text(
    food_description: str = Form(...)
):
    """
    Estimate calories and nutrition from text description
    
    Args:
        food_description: Text description of the food (e.g., "grilled chicken breast with rice")
    
    Returns:
        CalorieEstimateResponse with estimated nutrition information
    """
    try:
        if not food_description or not food_description.strip():
            raise HTTPException(status_code=400, detail="Food description is required")
        
        # Use OpenAI to estimate from text
        prompt = f"""Estimate the nutrition information for this food: "{food_description}".

Return a JSON object with this exact structure:
{{
  "name": "dish name",
  "calories": number,
  "proteinG": number,
  "carbsG": number,
  "fatG": number,
  "confidence": number between 0 and 1,
  "rationale": "brief explanation"
}}

Be as accurate as possible. Provide reasonable estimates based on typical serving sizes."""
        
        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_tokens=500,
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        if not content:
            raise ValueError("No response from OpenAI")
        
        import json
        result = json.loads(content)
        
        # Build response
        estimate_response = CalorieEstimateResponse(
            items=[
                CalorieEstimateItem(
                    dish_name=result.get("name", food_description),
                    estimated_calories=float(result.get("calories", 0)),
                    nutrition=NutritionInfo(
                        calories=float(result.get("calories", 0)),
                        protein_g=float(result.get("proteinG", 0)),
                        carbohydrates_g=float(result.get("carbsG", 0)),
                        fat_g=float(result.get("fatG", 0))
                    ),
                    confidence=float(result.get("confidence", 0.7)),
                    rationale=result.get("rationale", "AI estimate from text")
                )
            ],
            total_calories=float(result.get("calories", 0)),
            model_used=model,
            images_processed=0
        )
        
        return estimate_response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error estimating calories from text: {str(e)}")

