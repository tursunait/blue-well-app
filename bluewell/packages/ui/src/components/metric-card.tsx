import * as React from "react";
import { Card, CardContent } from "./card";
import { cn } from "../lib/utils";

// BlueWell Metric Card - Simple, calm, max 2-3 data points
export interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  trend,
  className,
}) => {
  return (
    <Card className={cn("border-0 shadow-sm bg-neutral-white", className)}>
      <CardContent className="p-6 space-y-2">
        <div className="text-sm text-neutral-muted font-medium lowercase">{label}</div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold text-neutral-dark">{value}</span>
          {unit && <span className="text-base text-neutral-muted">{unit}</span>}
        </div>
        {trend && trend !== "neutral" && (
          <div
            className={cn("text-xs font-medium mt-1", {
              "text-state-success": trend === "up",
              "text-neutral-muted": trend === "down",
            })}
          >
            {trend === "up" && "↑"} {trend === "down" && "↓"}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
