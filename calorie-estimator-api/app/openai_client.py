"""
OpenAI Client Module for Calorie Estimation

This module handles all interactions with the OpenAI ChatGPT Vision API.
It encodes images, constructs prompts, and validates responses.
"""

import base64
import json
import os
from typing import Dict, List, Optional, Any
from openai import OpenAI
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class CalorieEstimatorClient:
    """
    Client for interacting with OpenAI's Vision API to estimate calories from food images.
    """

    def __init__(self):
        """
        Initialize the OpenAI client with API key from environment variable.

        Raises:
            ValueError: If OPENAI_API_KEY is not set in environment
        """
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError(
                "OPENAI_API_KEY environment variable is not set. "
                "Please add it to your .env file."
            )

        # Initialize OpenAI client
        self.client = OpenAI(api_key=api_key)

        # Get model name from environment or use default
        self.model_name = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

        logger.info(f"CalorieEstimatorClient initialized with model: {self.model_name}")

    def encode_image_to_base64(self, image_bytes: bytes) -> str:
        """
        Encode image bytes to base64 string for API transmission.

        Args:
            image_bytes: Raw image file bytes

        Returns:
            Base64 encoded string of the image
        """
        return base64.b64encode(image_bytes).decode('utf-8')

    def construct_system_prompt(self) -> str:
        """
        Construct the system prompt that instructs the LLM on how to analyze images.

        Returns:
            System prompt string
        """
        return (
            "You are a professional nutrition expert and dietitian with expertise in "
            "portion size estimation and detailed nutritional analysis. Analyze food images precisely.\n\n"
            "CRITICAL: Carefully count and identify ALL food items visible in the image. "
            "If there are multiple items (e.g., 2 donuts, burger + fries, salad + chicken), "
            "you must include the TOTAL combined calories and nutrition for ALL items together.\n\n"
            "CARDBOARD BOX REFERENCE: If the food is served in a cardboard/paper box, use these standard dimensions:\n"
            "- Small box: 12 cm x 12 cm (typically contains 1-2 food items)\n"
            "- Large box: 19 cm x 15 cm (typically contains many food items, 3+)\n"
            "Use this information to estimate food portion sizes and dimensions more accurately.\n\n"
            "Analyze the complete plate/image and provide:\n"
            "1. A description naming ALL food items present (e.g., 'Two glazed donuts', 'Burger with french fries')\n"
            "2. Physical dimensions in centimeters (length, width, height) of the entire plate/serving\n"
            "3. TOTAL calories for ALL food items combined\n"
            "4. TOTAL macronutrients summed across all items: protein, carbohydrates, fat, fiber, sugar (in grams)\n"
            "5. TOTAL sodium content for all items (in milligrams)\n"
            "6. Your confidence level (0.0 to 1.0)\n"
            "7. Brief rationale explaining what items you counted and how you estimated\n\n"
            "IMPORTANT: Return ONLY valid JSON. Do not include any text before or after the JSON.\n"
            "Use this exact format:\n"
            "{\n"
            '  "dish_name": "Complete description of ALL items (e.g., Two chocolate donuts, Cheeseburger with french fries and soda)",\n'
            '  "estimated_dimensions_cm": {"length": 15, "width": 10, "height": 3},\n'
            '  "estimated_calories": 350,\n'
            '  "nutrition": {\n'
            '    "calories": 350,\n'
            '    "protein_g": 25.5,\n'
            '    "carbohydrates_g": 45.0,\n'
            '    "fat_g": 12.5,\n'
            '    "fiber_g": 8.0,\n'
            '    "sugar_g": 6.0,\n'
            '    "sodium_mg": 450.0\n'
            '  },\n'
            '  "confidence": 0.85,\n'
            '  "rationale": "Identified X items: [list items]. Each estimated at Y calories. Total: Z calories."\n'
            "}"
        )

    def construct_user_prompt(
        self,
        hint: Optional[str] = None,
        plate_diameter_cm: Optional[float] = None
    ) -> str:
        """
        Construct the user prompt with optional context hints.

        Args:
            hint: Optional hint about the food (e.g., "vegetarian meal", "dessert")
            plate_diameter_cm: Optional plate diameter for scale reference

        Returns:
            User prompt string
        """
        prompt = "Analyze this food image and estimate the calories."

        if plate_diameter_cm:
            prompt += f"\n\nContext: The plate diameter is approximately {plate_diameter_cm} cm."

        if hint:
            prompt += f"\n\nAdditional hint: {hint}"

        prompt += "\n\nReturn your analysis as JSON following the specified format."

        return prompt

    async def estimate_calories(
        self,
        image_bytes: bytes,
        image_format: str = "jpeg",
        hint: Optional[str] = None,
        plate_diameter_cm: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Send image to OpenAI Vision API and get calorie estimation.

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
            # Encode image to base64
            base64_image = self.encode_image_to_base64(image_bytes)

            # Construct prompts
            system_prompt = self.construct_system_prompt()
            user_prompt = self.construct_user_prompt(hint, plate_diameter_cm)

            logger.info(f"Sending request to OpenAI API with model: {self.model_name}")

            # Make API call to OpenAI
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {
                        "role": "system",
                        "content": system_prompt
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": user_prompt
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/{image_format};base64,{base64_image}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=500,
                temperature=0.7
            )

            # Extract the response content
            content = response.choices[0].message.content
            logger.info(f"Received response from OpenAI API")
            logger.debug(f"Raw response: {content}")

            # Parse JSON response
            try:
                parsed_response = json.loads(content)

                # Validate required fields
                required_fields = [
                    "dish_name",
                    "estimated_dimensions_cm",
                    "estimated_calories",
                    "nutrition",
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

                # Validate nutrition subfields
                if "nutrition" in parsed_response:
                    nutrition_fields = [
                        "calories", "protein_g", "carbohydrates_g",
                        "fat_g", "fiber_g", "sugar_g", "sodium_mg"
                    ]
                    missing_nutrition = [
                        field for field in nutrition_fields
                        if field not in parsed_response["nutrition"]
                    ]
                    if missing_nutrition:
                        raise ValueError(
                            f"Nutrition object missing required fields: {missing_nutrition}"
                        )

                return parsed_response

            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse JSON response: {e}")
                logger.error(f"Raw content: {content}")
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
                # Truncate error message to fit in rationale field (max 500 chars)
                error_msg = str(e)[:480]
                results.append({
                    "error": str(e),
                    "dish_name": "unknown",
                    "estimated_dimensions_cm": {
                        "length": 0,
                        "width": 0,
                        "height": 0
                    },
                    "estimated_calories": 0,
                    "nutrition": {
                        "calories": 0,
                        "protein_g": 0.0,
                        "carbohydrates_g": 0.0,
                        "fat_g": 0.0,
                        "fiber_g": 0.0,
                        "sugar_g": 0.0,
                        "sodium_mg": 0.0
                    },
                    "confidence": 0.0,
                    "rationale": f"Processing failed: {error_msg}"
                })

        return results

    async def estimate_calories_from_text(
        self,
        food_description: str
    ) -> Dict[str, Any]:
        """
        Estimate calories from text description of food (without image).

        Args:
            food_description: Text description of food (e.g., "6 pieces of sushi")

        Returns:
            Parsed JSON response with calorie estimation

        Raises:
            Exception: If API call fails or response is invalid
        """
        try:
            system_prompt = (
                "You are a professional nutrition expert and dietitian. "
                "When given a text description of food, provide accurate calorie and nutrition estimates.\n\n"
                "IMPORTANT: Return ONLY valid JSON. Do not include any text before or after the JSON.\n"
                "Use this exact format:\n"
                "{\n"
                '  "dish_name": "Name of the food described",\n'
                '  "estimated_calories": 350,\n'
                '  "nutrition": {\n'
                '    "calories": 350,\n'
                '    "protein_g": 25.5,\n'
                '    "carbohydrates_g": 45.0,\n'
                '    "fat_g": 12.5,\n'
                '    "fiber_g": 8.0,\n'
                '    "sugar_g": 6.0,\n'
                '    "sodium_mg": 450.0\n'
                '  },\n'
                '  "confidence": 0.85,\n'
                '  "rationale": "Brief explanation of your estimation"\n'
                "}"
            )

            user_prompt = f"Estimate the calories and nutrition for: {food_description}"

            logger.info(f"Sending text-based request to OpenAI API: {food_description}")

            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {
                        "role": "system",
                        "content": system_prompt
                    },
                    {
                        "role": "user",
                        "content": user_prompt
                    }
                ],
                max_tokens=500,
                temperature=0.7
            )

            content = response.choices[0].message.content
            logger.info("Received response from OpenAI API")
            logger.debug(f"Raw response: {content}")

            # Parse JSON response
            try:
                parsed_response = json.loads(content)

                # Validate required fields
                required_fields = [
                    "dish_name",
                    "estimated_calories",
                    "nutrition",
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

                # Add dimensions placeholder for text-based estimates
                parsed_response["estimated_dimensions_cm"] = {
                    "length": 0,
                    "width": 0,
                    "height": 0
                }

                return parsed_response

            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse JSON response: {e}")
                logger.error(f"Raw content: {content}")
                raise ValueError(f"Invalid JSON response from model: {str(e)}")

        except Exception as e:
            logger.error(f"Error during text-based API call: {str(e)}")
            raise


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
