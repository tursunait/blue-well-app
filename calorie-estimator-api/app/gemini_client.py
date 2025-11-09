"""
Gemini Client Module for Calorie Estimation

This module handles all interactions with the Google Gemini Pro Vision API.
It processes images, constructs prompts, and validates responses.
"""

import base64
import json
import os
from typing import Dict, List, Optional, Any
import logging
from PIL import Image
import io

try:
    import google.generativeai as genai
except ImportError:
    genai = None

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class CalorieEstimatorClient:
    """
    Client for interacting with Google's Gemini Pro Vision API to estimate calories from food images.
    """

    def __init__(self):
        """
        Initialize the Gemini client with API key from environment variable.

        Raises:
            ValueError: If GEMINI_API_KEY is not set in environment
            ImportError: If google-generativeai package is not installed
        """
        if genai is None:
            raise ImportError(
                "google-generativeai package is not installed. "
                "Please run: pip install google-generativeai"
            )

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError(
                "GEMINI_API_KEY environment variable is not set. "
                "Please add it to your .env file."
            )

        # Configure Gemini API
        genai.configure(api_key=api_key)

        # Get model name from environment or use default
        model_env = os.getenv("GEMINI_MODEL", "gemini-flash")

        # Map common names to actual available model names
        # These models support generateContent with vision
        model_mapping = {
            "gemini-flash": "gemini-flash-latest",
            "gemini-1.5-flash": "gemini-flash-latest",
            "gemini-2.5-flash": "gemini-2.5-flash",
            "gemini-pro": "gemini-pro-latest",
            "gemini-1.5-pro": "gemini-pro-latest",
            "gemini-2.5-pro": "gemini-2.5-pro"
        }

        self.model_name = model_mapping.get(model_env, model_env)

        # Initialize the model
        self.model = genai.GenerativeModel(self.model_name)

        logger.info(f"CalorieEstimatorClient initialized with model: {self.model_name}")

    def construct_prompt(
        self,
        hint: Optional[str] = None,
        plate_diameter_cm: Optional[float] = None
    ) -> str:
        """
        Construct the prompt that instructs Gemini on how to analyze images.

        Args:
            hint: Optional hint about the food (e.g., "vegetarian meal", "dessert")
            plate_diameter_cm: Optional plate diameter for scale reference

        Returns:
            Complete prompt string
        """
        prompt = (
            "You are a professional nutrition expert and dietitian with expertise in "
            "portion size estimation and calorie calculation. Analyze this food image precisely.\n\n"
            "For the food item visible in the image, estimate:\n"
            "1. The dish name\n"
            "2. Physical dimensions in centimeters (length, width, height)\n"
            "3. Total calories based on visible portion size and ingredients\n"
            "4. Your confidence level (0.0 to 1.0)\n"
            "5. Brief rationale for your estimate (60 words or less)\n\n"
        )

        if plate_diameter_cm:
            prompt += f"Context: The plate diameter is approximately {plate_diameter_cm} cm.\n\n"

        if hint:
            prompt += f"Additional hint: {hint}\n\n"

        prompt += (
            "IMPORTANT: Return ONLY valid JSON. Do not include any markdown code blocks, "
            "backticks, or text before/after the JSON.\n\n"
            "Use this exact format:\n"
            "{\n"
            '  "dish_name": "name of the dish",\n'
            '  "estimated_dimensions_cm": {"length": 15, "width": 10, "height": 3},\n'
            '  "estimated_calories": 350,\n'
            '  "confidence": 0.85,\n'
            '  "rationale": "Concise explanation in 60 words or less"\n'
            "}"
        )

        return prompt

    def clean_json_response(self, content: str) -> str:
        """
        Clean the response from Gemini, removing markdown code blocks if present.

        Args:
            content: Raw response content

        Returns:
            Cleaned JSON string
        """
        content = content.strip()

        # Remove markdown code blocks if present
        if content.startswith("```json"):
            content = content[7:]  # Remove ```json
        elif content.startswith("```"):
            content = content[3:]  # Remove ```

        if content.endswith("```"):
            content = content[:-3]  # Remove trailing ```

        return content.strip()

    async def estimate_calories(
        self,
        image_bytes: bytes,
        image_format: str = "jpeg",
        hint: Optional[str] = None,
        plate_diameter_cm: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Send image to Gemini Vision API and get calorie estimation.

        Args:
            image_bytes: Raw image file bytes
            image_format: Image format (jpeg, png, etc.)
            hint: Optional hint about the food
            plate_diameter_cm: Optional plate diameter for scale reference

        Returns:
            Parsed JSON response from the LLM

        Raises:
            Exception: If API call fails or response is invalid
        """
        try:
            # Convert bytes to PIL Image
            image = Image.open(io.BytesIO(image_bytes))

            # Construct prompt
            prompt = self.construct_prompt(hint, plate_diameter_cm)

            logger.info(f"Sending request to Gemini API with model: {self.model_name}")

            # Make API call to Gemini with relaxed safety settings
            # Note: Gemini API is synchronous, but we wrap it in async for consistency
            safety_settings = {
                "HARM_CATEGORY_HARASSMENT": "BLOCK_NONE",
                "HARM_CATEGORY_HATE_SPEECH": "BLOCK_NONE",
                "HARM_CATEGORY_SEXUALLY_EXPLICIT": "BLOCK_NONE",
                "HARM_CATEGORY_DANGEROUS_CONTENT": "BLOCK_NONE",
            }

            response = self.model.generate_content(
                [prompt, image],
                generation_config={
                    "temperature": 0.4,
                    "top_p": 0.95,
                    "top_k": 40,
                    "max_output_tokens": 500,
                },
                safety_settings=safety_settings
            )

            # Check if response was blocked by safety filters
            if not response.parts:
                # Get the actual reason
                finish_reason = response.candidates[0].finish_reason if response.candidates else "UNKNOWN"
                safety_ratings = response.candidates[0].safety_ratings if response.candidates else []

                error_msg = f"Response blocked by Gemini safety filters. Reason: {finish_reason}"
                if safety_ratings:
                    blocked = [f"{r.category.name}: {r.probability.name}" for r in safety_ratings]
                    error_msg += f". Ratings: {', '.join(blocked)}"

                logger.error(error_msg)
                raise ValueError(error_msg)

            # Extract the response content
            content = response.text
            logger.info(f"Received response from Gemini API")
            logger.debug(f"Raw response: {content}")

            # Clean and parse JSON response
            try:
                # Clean the response (remove markdown if present)
                cleaned_content = self.clean_json_response(content)

                parsed_response = json.loads(cleaned_content)

                # Validate required fields
                required_fields = [
                    "dish_name",
                    "estimated_dimensions_cm",
                    "estimated_calories",
                    "confidence",
                    "rationale"
                ]

                missing_fields = [
                    field for field in required_fields
                    if field not in parsed_response
                ]

                if missing_fields:
                    raise ValueError(
                        f"Response missing required fields: {missing_fields}"
                    )

                return parsed_response

            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse JSON response: {e}")
                logger.error(f"Raw content: {content}")
                logger.error(f"Cleaned content: {cleaned_content}")
                raise ValueError(f"Invalid JSON response from model: {str(e)}")

        except Exception as e:
            logger.error(f"Error during API call: {str(e)}")
            raise

    async def estimate_calories_batch(
        self,
        images: List[tuple[bytes, str]],
        hint: Optional[str] = None,
        plate_diameter_cm: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Process multiple images and return calorie estimates for each.

        Args:
            images: List of tuples (image_bytes, image_format)
            hint: Optional hint about the food
            plate_diameter_cm: Optional plate diameter for scale reference

        Returns:
            List of parsed JSON responses, one per image
        """
        results = []

        for idx, (image_bytes, image_format) in enumerate(images):
            try:
                logger.info(f"Processing image {idx + 1}/{len(images)}")
                result = await self.estimate_calories(
                    image_bytes=image_bytes,
                    image_format=image_format,
                    hint=hint,
                    plate_diameter_cm=plate_diameter_cm
                )
                results.append(result)
            except Exception as e:
                logger.error(f"Failed to process image {idx + 1}: {str(e)}")
                # Add error placeholder for this image
                # Truncate error message to fit in rationale field (max 200 chars)
                error_msg = str(e)[:180]
                results.append({
                    "error": str(e),
                    "dish_name": "unknown",
                    "estimated_dimensions_cm": {
                        "length": 0,
                        "width": 0,
                        "height": 0
                    },
                    "estimated_calories": 0,
                    "confidence": 0.0,
                    "rationale": f"Processing failed: {error_msg}"
                })

        return results


# Create a singleton instance
_client_instance = None

def get_client() -> CalorieEstimatorClient:
    """
    Get or create singleton instance of CalorieEstimatorClient.

    Returns:
        CalorieEstimatorClient instance
    """
    global _client_instance
    if _client_instance is None:
        _client_instance = CalorieEstimatorClient()
    return _client_instance
