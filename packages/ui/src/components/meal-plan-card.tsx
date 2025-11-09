import * as React from "react";
import { Card, CardContent, CardFooter } from "./card";
import { Button } from "./button";
import { cn } from "../lib/utils";
import { UtensilsCrossed, ChevronDown } from "lucide-react";

// BlueWell Meal Plan Recommendation Card with Dropdown
export interface MealPlanCardProps {
  className?: string;
  mealOptions: string[];
  selectedMeal?: string;
  onSelectMeal?: (meal: string) => void;
  onSkip?: () => void;
}

export const MealPlanCard: React.FC<MealPlanCardProps> = ({
  className,
  mealOptions,
  selectedMeal,
  onSelectMeal,
  onSkip,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Card className={cn("border-0 shadow-soft", className)}>
      <CardContent className="p-6 space-y-3">
        <div className="flex items-start gap-3">
          <UtensilsCrossed className="h-5 w-5 text-neutral-muted flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-base font-semibold text-neutral-dark leading-tight">
              Grab healthy meal nearby
            </h3>
            <div className="mt-3 space-y-2">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-3 rounded-xl border-2 border-neutral-border bg-neutral-white hover:border-bluewell-light transition-colors"
              >
                <span className="text-sm font-medium text-neutral-dark">
                  {selectedMeal || "Select meal plan"}
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-neutral-muted transition-transform",
                    isOpen && "transform rotate-180"
                  )}
                />
              </button>
              {isOpen && (
                <div className="space-y-2 pt-2">
                  {mealOptions.map((meal) => (
                    <label
                      key={meal}
                      className="flex items-center gap-3 p-3 rounded-xl border-2 border-neutral-border bg-neutral-white hover:border-bluewell-light cursor-pointer transition-colors"
                    >
                      <input
                        type="radio"
                        name="meal-plan"
                        value={meal}
                        checked={selectedMeal === meal}
                        onChange={() => {
                          onSelectMeal?.(meal);
                          setIsOpen(false);
                        }}
                        className="w-4 h-4 text-bluewell-light border-neutral-border focus:ring-bluewell-light"
                      />
                      <span className="text-sm font-medium text-neutral-dark flex-1">
                        {meal}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
      {onSkip && (
        <CardFooter className="flex gap-3 p-6 pt-0">
          <Button
            variant="ghost"
            onClick={onSkip}
            size="lg"
            className="flex-1 rounded-full border border-neutral-border"
          >
            Skip
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

