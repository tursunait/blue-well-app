import * as React from "react";
import { Card, CardContent, CardFooter } from "./card";
import { Button } from "./button";
import { cn } from "../lib/utils";
import { ShoppingBag } from "lucide-react";

// BlueWell Meal Delivery Recommendation Card
export interface MealDeliveryCardProps {
  className?: string;
  restaurantName: string;
  mealName: string;
  deliveryService: "Grubhub" | "Uber Eats" | "DoorDash";
  onAccept?: () => void;
  onSkip?: () => void;
}

export const MealDeliveryCard: React.FC<MealDeliveryCardProps> = ({
  className,
  restaurantName,
  mealName,
  deliveryService,
  onAccept,
  onSkip,
}) => {
  return (
    <Card className={cn("border-0 shadow-soft", className)}>
      <CardContent className="p-6 space-y-3">
        <div className="flex items-start gap-3">
          <ShoppingBag className="h-5 w-5 text-neutral-muted flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-base font-semibold text-neutral-dark leading-tight">
              Order from {deliveryService}
            </h3>
            <p className="text-sm font-medium text-neutral-dark mt-1">{restaurantName}</p>
            <p className="text-sm text-neutral-muted mt-1">{mealName}</p>
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

