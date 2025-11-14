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
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log("[MyRecClassCard] Accept button clicked");
            
            // Open MyRec website in a new tab
            const myRecUrl = "https://myrec.recreation.duke.edu/";
            console.log("[MyRecClassCard] Opening URL:", myRecUrl);
            
            // Always try to open in a new tab
            const newWindow = window.open(myRecUrl, "_blank", "noopener,noreferrer");
            
            if (!newWindow) {
              // If window.open returns null, popup was blocked
              console.warn("[MyRecClassCard] Popup blocked. Creating temporary link to open in new tab.");
              // Create a temporary anchor element and click it (less likely to be blocked)
              const link = document.createElement("a");
              link.href = myRecUrl;
              link.target = "_blank";
              link.rel = "noopener noreferrer";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            } else {
              console.log("[MyRecClassCard] Successfully opened in new tab");
            }
            
            // Call the onAccept callback if provided
            if (onAccept) {
              console.log("[MyRecClassCard] Calling onAccept callback");
              onAccept();
            }
          }}
          size="lg"
          className="flex-1 rounded-full bg-neutral-dark text-white hover:bg-neutral-dark/90"
          type="button"
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

