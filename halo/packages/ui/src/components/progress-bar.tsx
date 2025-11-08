import * as React from "react";
import { cn } from "../lib/utils";

// BlueWell Progress Bar - Calm, soft, minimal
export interface ProgressBarProps {
  current: number;
  total: number;
  className?: string;
  showLabel?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ 
  current, 
  total, 
  className,
  showLabel = true 
}) => {
  const percentage = Math.min((current / total) * 100, 100);

  return (
    <div className={cn("w-full space-y-3", className)}>
      {showLabel && (
        <div className="flex justify-between text-sm text-neutral-text">
          <span className="font-medium">question {current} of {total}</span>
          <span className="text-neutral-muted">{Math.round(percentage)}%</span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-surface">
        <div
          className="h-full bg-accent-light transition-all duration-500 ease-out rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
