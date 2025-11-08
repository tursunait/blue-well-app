import * as React from "react";
import { cn } from "../lib/utils";

// BlueWell Circular Progress - Modern, clean indicator
export interface CircularProgressProps {
  current: number;
  total: number;
  className?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  current,
  total,
  className,
}) => {
  return (
    <div className={cn("flex justify-center", className)}>
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-bluewell-light text-white font-semibold text-lg">
        {current}/{total}
      </div>
    </div>
  );
};

