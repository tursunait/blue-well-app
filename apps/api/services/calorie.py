from fastapi import UploadFile
from typing import Dict, Any, List
import random


class CalorieEstimator:
    """Calorie estimation service - stub implementation"""

    async def estimate(self, file: UploadFile) -> Dict[str, Any]:
        """Estimate calories from meal photo"""
        # In dev, return deterministic sample data
        # In production, this would use a CV model

        # Simple heuristic based on filename or return sample
        filename = file.filename or ""
        filename_lower = filename.lower()

        # Sample responses based on common meal types
        if "salad" in filename_lower or "bowl" in filename_lower:
            items = [
                {
                    "name": "Mixed greens salad with chicken",
                    "kcal": 320,
                    "protein": 28,
                    "fat": 12,
                    "carbs": 18,
                    "confidence": 0.85,
                }
            ]
        elif "pasta" in filename_lower or "noodle" in filename_lower:
            items = [
                {
                    "name": "Pasta with vegetables",
                    "kcal": 450,
                    "protein": 15,
                    "fat": 8,
                    "carbs": 72,
                    "confidence": 0.78,
                }
            ]
        elif "burger" in filename_lower or "sandwich" in filename_lower:
            items = [
                {
                    "name": "Chicken burger",
                    "kcal": 580,
                    "protein": 35,
                    "fat": 22,
                    "carbs": 55,
                    "confidence": 0.82,
                }
            ]
        else:
            # Default sample
            items = [
                {
                    "name": "Grilled chicken bowl",
                    "kcal": 520,
                    "protein": 42,
                    "fat": 12,
                    "carbs": 58,
                    "confidence": 0.82,
                }
            ]

        totals = {
            "kcal": sum(item["kcal"] for item in items),
            "protein": sum(item["protein"] for item in items),
            "fat": sum(item["fat"] for item in items),
            "carbs": sum(item["carbs"] for item in items),
        }

        return {
            "items": items,
            "totals": totals,
        }

