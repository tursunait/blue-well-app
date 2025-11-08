import * as React from "react";
import { cn } from "../lib/utils";

// BlueWell Chip - Soft, rounded-pill, minimal
export interface ChipProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "selected" | "soft";
}

const Chip = React.forwardRef<HTMLDivElement, ChipProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition-colors",
          {
            "bg-neutral-surface text-neutral-text": variant === "default",
            "bg-bluewell-royal text-white": variant === "selected",
            "bg-accent-soft text-bluewell-royal": variant === "soft",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Chip.displayName = "Chip";

export { Chip };
