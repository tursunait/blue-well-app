import * as React from "react";
import { Card, CardContent } from "./card";
import { cn } from "../lib/utils";
import { Footprints, Beef } from "lucide-react";

// BlueWell Fitness Goal Card - For Log Meal page
export interface FitnessGoalCardProps {
  type: "calories" | "steps" | "protein";
  current: number;
  goal: number;
  title?: string;
  subtitle?: string;
  className?: string;
}

export const FitnessGoalCard: React.FC<FitnessGoalCardProps> = ({
  type,
  current,
  goal,
  title,
  subtitle,
  className,
}) => {
  const percentage = Math.min((current / goal) * 100, 100);
  const isCalories = type === "calories";
  const isSteps = type === "steps";
  const isProtein = type === "protein";

  const bgColorClasses = {
    calories: "bg-green-100",
    steps: "bg-orange-100",
    protein: "bg-purple-100",
  };

  const textColorClasses = {
    calories: "text-green-700",
    steps: "text-orange-700",
    protein: "text-purple-700",
  };

  const sliderColorClasses = {
    calories: "bg-green-500",
    steps: "bg-orange-500",
    protein: "bg-purple-500",
  };

  return (
    <Card className={cn("border-0 shadow-sm", bgColorClasses[type], className)}>
      <CardContent className="p-4 space-y-3">
        {title && (
          <div className="text-sm font-semibold text-neutral-dark">{title}</div>
        )}
        {subtitle && (
          <div className="text-xs text-neutral-muted flex items-center gap-1">
            {subtitle}
            {isSteps && <Footprints className="h-3 w-3" />}
            {isProtein && <Beef className="h-3 w-3" />}
          </div>
        )}
        
        {isCalories && (
          <div className="space-y-2">
            <div className="relative">
              <input
                type="range"
                min={0}
                max={goal}
                value={current}
                disabled
                className="w-full h-2 bg-white/50 rounded-full appearance-none cursor-default slider"
                style={{
                  background: `linear-gradient(to right, ${sliderColorClasses[type]} 0%, ${sliderColorClasses[type]} ${percentage}%, rgba(255,255,255,0.5) ${percentage}%, rgba(255,255,255,0.5) 100%)`,
                }}
              />
            </div>
            <div className={cn("text-base font-bold", textColorClasses[type])}>
              {current.toLocaleString()}/{goal.toLocaleString()}m
            </div>
          </div>
        )}

        {isSteps && (
          <div className={cn("text-base font-bold", textColorClasses[type])}>
            {current.toLocaleString()}/{goal.toLocaleString()}m
          </div>
        )}

        {isProtein && (
          <div className={cn("text-base font-bold", textColorClasses[type])}>
            {current}g/{goal}g
          </div>
        )}
      </CardContent>
    </Card>
  );
};

