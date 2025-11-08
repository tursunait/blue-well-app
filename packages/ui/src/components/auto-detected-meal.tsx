import * as React from "react";
import { Card, CardContent } from "./card";
import { Button } from "./button";
import { cn } from "../lib/utils";
import { Camera, Check, Pencil, X } from "lucide-react";

// BlueWell Auto-Detected Meal - For Log Meal page
export interface AutoDetectedMealProps {
  mealName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  imageUrl?: string;
  onConfirm?: () => void;
  onEdit?: () => void;
  onDismiss?: () => void;
  onSnapPhoto?: () => void;
  className?: string;
}

export const AutoDetectedMeal: React.FC<AutoDetectedMealProps> = ({
  mealName,
  calories,
  protein,
  carbs,
  fat,
  imageUrl,
  onConfirm,
  onEdit,
  onDismiss,
  onSnapPhoto,
  className,
}) => {
  return (
    <Card className={cn("border-0 shadow-soft", className)}>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-neutral-dark mb-4">Auto-Detected Meal</h3>
        
        <div className="flex gap-4">
          {/* Meal Image */}
          <div className="relative w-32 h-32 rounded-xl overflow-hidden bg-neutral-surface flex-shrink-0">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={mealName}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-neutral-border to-neutral-surface flex items-center justify-center">
                <Camera className="h-8 w-8 text-neutral-muted" />
              </div>
            )}
            {/* Snap Photo Button Overlay */}
            <button
              onClick={onSnapPhoto}
              className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
            >
              <div className="bg-white rounded-full p-3 flex flex-col items-center gap-1">
                <Camera className="h-5 w-5 text-neutral-dark" />
                <span className="text-xs font-medium text-neutral-dark">Snap Photo</span>
              </div>
            </button>
          </div>

          {/* Meal Details */}
          <div className="flex-1 space-y-3">
            <div>
              <h4 className="text-base font-semibold text-neutral-dark">
                {mealName}, {calories} kcal
              </h4>
            </div>
            
            <div className="space-y-1 text-sm text-neutral-text">
              <div>{protein}g Protein</div>
              <div>{carbs}g Carbs, {fat}g Fat</div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={onConfirm}
                size="sm"
                className="flex-1 rounded-full bg-green-500 text-white hover:bg-green-600 border-0"
              >
                <Check className="h-4 w-4 mr-1" />
                Confirm
              </Button>
              <Button
                onClick={onEdit}
                size="sm"
                className="flex-1 rounded-full bg-yellow-500 text-white hover:bg-yellow-600 border-0"
              >
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button
                onClick={onDismiss}
                size="sm"
                className="flex-1 rounded-full bg-red-500 text-white hover:bg-red-600 border-0"
              >
                <X className="h-4 w-4 mr-1" />
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

