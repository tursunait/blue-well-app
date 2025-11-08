import * as React from "react";
import { cn } from "../lib/utils";

// BlueWell Daily Goal Progress - Circular progress indicator
export interface DailyGoalProgressProps {
  label: string;
  current: number;
  goal: number;
  color?: "blue" | "green" | "purple";
  className?: string;
  showRemaining?: boolean; // For calories, show remaining instead of current
}

export const DailyGoalProgress: React.FC<DailyGoalProgressProps> = ({
  label,
  current,
  goal,
  color = "blue",
  className,
  showRemaining = false,
}) => {
  // For calories, calculate remaining; for others, use current
  const displayValue = showRemaining ? goal - current : current;
  const percentage = showRemaining
    ? Math.min(((goal - current) / goal) * 100, 100)
    : Math.min((current / goal) * 100, 100);
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const colorClasses = {
    blue: "text-bluewell-light",
    green: "text-green-500",
    purple: "text-purple-500",
  };

  const bgColorClasses = {
    blue: "bg-bluewell-light/10",
    green: "bg-green-500/10",
    purple: "bg-purple-500/10",
  };

  return (
    <div className={cn("flex flex-col items-center space-y-2", className)}>
      <div className="relative w-24 h-24 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90">
          {/* Background circle */}
          <circle
            className="text-neutral-border"
            strokeWidth="8"
            stroke="currentColor"
            fill="transparent"
            r="45"
            cx="48"
            cy="48"
          />
          {/* Progress circle */}
          <circle
            className={cn("transition-all duration-500 ease-out", colorClasses[color])}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r="45"
            cx="48"
            cy="48"
          />
        </svg>
        {/* Center text */}
        <div className="absolute text-center">
          <div className="text-xs text-neutral-muted font-medium">{label}</div>
        </div>
      </div>
      {/* Value display */}
      <div className="text-center space-y-1">
        {showRemaining ? (
          <div className="text-sm font-semibold text-neutral-dark">
            {displayValue.toLocaleString()} {label === "Calories" ? "Calories Remaining" : ""}
          </div>
        ) : (
          <>
            <div className="text-sm font-semibold text-neutral-dark">
              {current.toLocaleString()}{label === "Protein" && "g"} / {goal.toLocaleString()}{label === "Protein" && "g"}
            </div>
            {label === "Steps" && <div className="text-xs text-neutral-muted">Steps</div>}
            {label === "Protein" && <div className="text-xs text-neutral-muted">Protein Goal</div>}
          </>
        )}
      </div>
    </div>
  );
};

