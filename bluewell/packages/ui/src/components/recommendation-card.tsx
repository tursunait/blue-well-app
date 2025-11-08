import * as React from "react";
import { Card, CardContent, CardFooter } from "./card";
import { Button } from "./button";
import { RecommendationCard as RecommendationCardType } from "@bluewell/types";
import { Clock, MapPin } from "lucide-react";
import { cn } from "../lib/utils";

// BlueWell Recommendation Card - Big, tappable, minimal text
export interface RecommendationCardProps {
  recommendation: RecommendationCardType;
  onAccept?: () => void;
  onSkip?: () => void;
  className?: string;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  onAccept,
  onSkip,
  className,
}) => {
  return (
    <Card className={cn("overflow-hidden border-0 shadow-soft hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-6 space-y-4">
        <h3 className="text-lg font-semibold text-neutral-dark leading-tight">
          {recommendation.title}
        </h3>
        {recommendation.description && (
          <p className="text-sm text-neutral-text leading-relaxed line-clamp-2">
            {recommendation.description}
          </p>
        )}
        {(recommendation.time || recommendation.location) && (
          <div className="flex flex-col gap-2 pt-2">
            {recommendation.time && (
              <div className="flex items-center gap-2 text-sm text-neutral-muted">
                <Clock className="h-4 w-4" />
                <span>{recommendation.time}</span>
              </div>
            )}
            {recommendation.location && (
              <div className="flex items-center gap-2 text-sm text-neutral-muted">
                <MapPin className="h-4 w-4" />
                <span>{recommendation.location}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex gap-3 p-6 pt-0">
        <Button onClick={onAccept} size="lg" className="flex-1">
          {recommendation.cta || "add to day"}
        </Button>
        {onSkip && (
          <Button variant="ghost" onClick={onSkip} size="lg">
            skip
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
