import * as React from "react";
import { Card, CardContent, CardFooter } from "./card";
import { Button } from "./button";
import { cn } from "../lib/utils";
import { Dumbbell, Clock } from "lucide-react";

// BlueWell MyRec Class Recommendation Card
export interface MyRecClassCardProps {
  className?: string;
  classTitle: string;
  time: string;
  onAccept?: () => void;
  onSkip?: () => void;
}

export const MyRecClassCard: React.FC<MyRecClassCardProps> = ({
  className,
  classTitle,
  time,
  onAccept,
  onSkip,
}) => {
  return (
    <Card className={cn("border-0 shadow-soft", className)}>
      <CardContent className="p-6 space-y-3">
        <div className="flex items-start gap-3">
          <Dumbbell className="h-5 w-5 text-neutral-muted flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-base font-semibold text-neutral-dark leading-tight">
              Take this MyRec class at {time}
            </h3>
            <p className="text-sm text-neutral-muted mt-1">{classTitle}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-3 p-6 pt-0">
        <Button
          onClick={onAccept}
          size="lg"
          className="flex-1 rounded-full bg-neutral-dark text-white hover:bg-neutral-dark/90"
        >
          Accept
        </Button>
        <Button
          variant="ghost"
          onClick={onSkip}
          size="lg"
          className="flex-1 rounded-full border border-neutral-border"
        >
          Skip
        </Button>
      </CardFooter>
    </Card>
  );
};

