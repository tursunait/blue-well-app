import * as React from "react";
import { Card, CardContent } from "./card";
import { Suggestion } from "@halo/types";
import { cn } from "../lib/utils";

// BlueWell Action Card - Big, tappable, minimal text
export interface ActionCardProps {
  suggestion: Suggestion;
  onAction?: (suggestion: Suggestion) => void;
  className?: string;
}

export const ActionCard: React.FC<ActionCardProps> = ({
  suggestion,
  onAction,
  className,
}) => {
  return (
    <Card
      className={cn(
        "cursor-pointer border-0 shadow-sm hover:shadow-md transition-all active:scale-[0.98] bg-neutral-white",
        className
      )}
      onClick={() => onAction?.(suggestion)}
    >
      <CardContent className="p-5">
        <h4 className="text-base font-semibold text-neutral-dark mb-1">
          {suggestion.title}
        </h4>
        {suggestion.description && (
          <p className="text-sm text-neutral-text leading-relaxed">
            {suggestion.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
