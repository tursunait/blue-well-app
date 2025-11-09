"""
FastAPI Calorie Estimator Service

Main application file that exposes the /v1/estimate-calories endpoint
for analyzing food images and returning calorie estimates.
"""

from pathlib import Path

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Request, status
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.templating import Jinja2Templates
from fastapi.concurrency import run_in_threadpool
from typing import List, Optional
from pydantic import BaseModel, Field
import logging
from dotenv import load_dotenv

from app.openai_client import get_client
from app.log_manager import log_estimation, get_recent_estimations

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Calorie Estimator API",
    description="AI-powered calorie estimation from food images using OpenAI Vision API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

templates = Jinja2Templates(directory=str(Path(__file__).resolve().parent / "templates"))

# Response models for API documentation
class DimensionsModel(BaseModel):
    """Physical dimensions of the food item in centimeters"""
    length: float = Field(..., description="Length in cm")
    width: float = Field(..., description="Width in cm")
    height: float = Field(..., description="Height in cm")


class NutritionModel(BaseModel):
    """Nutritional information for a food item"""
    calories: int = Field(..., description="Total calories (kcal)")
    protein_g: float = Field(..., description="Protein in grams")
    carbohydrates_g: float = Field(..., description="Total carbohydrates in grams")
    fat_g: float = Field(..., description="Total fat in grams")
    fiber_g: float = Field(..., description="Dietary fiber in grams")
    sugar_g: float = Field(..., description="Sugar in grams")
    sodium_mg: float = Field(..., description="Sodium in milligrams")


class CalorieEstimateItem(BaseModel):
    """Single food item calorie estimation result"""
    dish_name: str = Field(..., description="Name of the dish")
    estimated_dimensions_cm: DimensionsModel = Field(..., description="Estimated dimensions")
    estimated_calories: int = Field(..., description="Estimated calories (deprecated, use nutrition.calories)")
    nutrition: NutritionModel = Field(..., description="Detailed nutritional information")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score (0-1)")
    rationale: str = Field(..., max_length=500, description="Reasoning for the estimate")
    error: Optional[str] = Field(None, description="Error message if processing failed")


class CalorieEstimateResponse(BaseModel):
    """Complete API response with all food items and metadata"""
    items: List[CalorieEstimateItem] = Field(..., description="List of analyzed food items")
    total_calories: int = Field(..., description="Sum of all estimated calories")
    model_used: str = Field(..., description="OpenAI model used for analysis")
    images_processed: int = Field(..., description="Number of images processed")


@app.get("/web/calorie-estimator", response_class=HTMLResponse)
async def render_calorie_estimator(request: Request):
    """
    Serve the interactive calorie estimator web page.
    """
    return templates.TemplateResponse(
        "calorie_estimator.html",
        {"request": request}
    )


@app.get("/")
async def root():
    """
    Root endpoint - API health check and information.

    Returns:
        Basic API information
    """
    return {
        "service": "Calorie Estimator API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "estimate": "/v1/estimate-calories",
            "docs": "/docs",
            "health": "/health"
        }
    }


@app.get("/health")
async def health_check():
    """
    Health check endpoint for monitoring and load balancers.

    Returns:
        Health status of the service
    """
    try:
        # Verify OpenAI client can be initialized
        get_client()
        return {
            "status": "healthy",
            "service": "calorie-estimator",
            "openai_client": "initialized"
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "error": str(e)
            }
        )


@app.post(
    "/v1/estimate-calories",
    response_model=CalorieEstimateResponse,
    status_code=status.HTTP_200_OK,
    summary="Estimate calories from food images",
    description="Upload one or more food images to get AI-powered calorie estimates"
)
async def estimate_calories(
    images: List[UploadFile] = File(
        ...,
        description="One or more food images (JPEG/PNG)"
    ),
    hint: Optional[str] = Form(
        None,
        description="Optional hint about the food (e.g., 'vegetarian', 'dessert')"
    ),
    plate_diameter_cm: Optional[float] = Form(
        None,
        description="Optional plate diameter in cm for scale reference",
        ge=10.0,
        le=50.0
    )
):
    """
    Main endpoint for calorie estimation from food images.

    This endpoint:
    1. Accepts one or more image uploads (JPEG/PNG format)
    2. Optionally accepts contextual hints and plate diameter
    3. Sends images to OpenAI Vision API for analysis
    4. Returns structured calorie estimates with confidence scores

    Args:
        images: List of uploaded image files
        hint: Optional context hint about the food
        plate_diameter_cm: Optional plate diameter for scale reference

    Returns:
        CalorieEstimateResponse with detailed estimates for each image

    Raises:
        HTTPException: 400 for invalid input, 502 for API errors, 500 for server errors
    """
    logger.info(
        f"Received request: {len(images)} image(s), "
        f"hint='{hint}', plate_diameter={plate_diameter_cm}"
    )

    # Validate input
    if not images:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one image is required"
        )

    # Validate file types
    allowed_types = {"image/jpeg", "image/jpg", "image/png"}
    for idx, image in enumerate(images):
        if image.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Image {idx + 1} has invalid type '{image.content_type}'. "
                       f"Allowed types: {allowed_types}"
            )

    try:
        # Get OpenAI client instance
        client = get_client()

        # Process all uploaded images
        image_data = []
        for image in images:
            # Read image bytes
            content = await image.read()

            # Determine image format from content type
            image_format = "jpeg" if "jpeg" in image.content_type or "jpg" in image.content_type else "png"

            image_data.append((content, image_format))

        logger.info(f"Processing {len(image_data)} image(s) through OpenAI API")

        # Call OpenAI API for batch processing
        results = await client.estimate_calories_batch(
            images=image_data,
            hint=hint,
            plate_diameter_cm=plate_diameter_cm
        )

        # Calculate total calories across all items
        total_calories = sum(
            item.get("estimated_calories", 0)
            for item in results
            if "error" not in item or item.get("estimated_calories", 0) > 0
        )

        # Prepare response
        response = {
            "items": results,
            "total_calories": total_calories,
            "model_used": client.model_name,
            "images_processed": len(images)
        }

        logger.info(
            f"Successfully processed {len(images)} image(s). "
            f"Total calories: {total_calories}"
        )

        log_entry = {
            "total_calories": total_calories,
            "items": results,
            "model_used": client.model_name,
            "images_processed": len(images),
            "hint": hint,
            "plate_diameter_cm": plate_diameter_cm,
        }
        await run_in_threadpool(log_estimation, log_entry)

        return response

    except ValueError as e:
        # Handle invalid JSON or malformed response from OpenAI
        logger.error(f"Invalid response from model: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Invalid response from model: {str(e)}"
        )

    except Exception as e:
        # Handle all other errors
        logger.error(f"Error processing request: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """
    Global exception handler for unhandled errors.

    Args:
        request: The request that caused the error
        exc: The exception that was raised

    Returns:
        JSON error response
    """
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An unexpected error occurred",
            "error": str(exc)
        }
    )


@app.get("/v1/estimation-history")
async def estimation_history(limit: int = 10):
    """
    Retrieve recent calorie estimation logs.
    """
    entries = await run_in_threadpool(get_recent_estimations, limit)
    return {
        "items": entries,
        "count": len(entries),
        "limit": limit
    }


@app.post(
    "/v1/estimate-calories-text",
    response_model=CalorieEstimateResponse,
    status_code=status.HTTP_200_OK,
    summary="Estimate calories from text description",
    description="Provide a text description of food to get AI-powered calorie estimates"
)
async def estimate_calories_text(
    food_description: str = Form(
        ...,
        description="Text description of food (e.g., '6 pieces of sushi', '2 donuts')"
    )
):
    """
    Endpoint for calorie estimation from text description (no image required).

    This endpoint:
    1. Accepts a text description of food
    2. Sends the description to OpenAI API for analysis
    3. Returns structured calorie estimates with confidence scores

    Args:
        food_description: Text description of the food

    Returns:
        CalorieEstimateResponse with detailed estimates

    Raises:
        HTTPException: 400 for invalid input, 502 for API errors, 500 for server errors
    """
    logger.info(f"Received text-based request: '{food_description}'")

    # Validate input
    if not food_description or len(food_description.strip()) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Food description is required"
        )

    try:
        # Get OpenAI client instance
        client = get_client()

        # Call OpenAI API for text-based estimation
        result = await client.estimate_calories_from_text(food_description)

        # Prepare response
        response = {
            "items": [result],
            "total_calories": result.get("estimated_calories", 0),
            "model_used": client.model_name,
            "images_processed": 0  # No images for text-based
        }

        logger.info(
            f"Successfully processed text description. "
            f"Total calories: {result.get('estimated_calories', 0)}"
        )

        log_entry = {
            "total_calories": result.get("estimated_calories", 0),
            "items": [result],
            "model_used": client.model_name,
            "images_processed": 0,
            "food_description": food_description,
        }
        await run_in_threadpool(log_estimation, log_entry)

        return response

    except ValueError as e:
        logger.error(f"Invalid response from model: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Invalid response from model: {str(e)}"
        )

    except Exception as e:
        logger.error(f"Error processing request: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn

    # Run the application with uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
