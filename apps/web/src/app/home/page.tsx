"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  DailyGoalProgress,
  MyRecClassCard,
  MealPlanCard,
  MealDeliveryCard,
  Timeline,
  TimelineEvent,
} from "@halo/ui";
import { AIChatbot } from "@/components/ai-chatbot";
import { useNutrition } from "@/contexts/nutrition-context";
import { getRandomMealDeliveryLink, type MealDeliveryLink } from "@/data/meal-delivery-links";

// BlueWell Home - Your Day, Optimized
export default function HomePage() {
  // Get nutrition data from context
  const { caloriesConsumed, caloriesGoal, proteinConsumed, proteinGoal } = useNutrition();

  const stepsCurrent = 8000;
  const stepsGoal = 10000;

  // MyRec class recommendation
  const [myRecClass, setMyRecClass] = useState({
    title: "Full Body Strength",
    time: "5:30 PM",
  });

  // Meal plan options
  const mealOptions = ["Mediterranean Bowl", "Grilled Chicken Salad", "Quinoa Power Bowl"];
  const [selectedMeal, setSelectedMeal] = useState<string | undefined>();

  // Meal delivery link state
  const [currentDeliveryLink, setCurrentDeliveryLink] = useState<MealDeliveryLink | null>(null);
  const [excludedUrls, setExcludedUrls] = useState<string[]>([]);

  // Effect to update delivery link when meal selection changes
  useEffect(() => {
    if (selectedMeal) {
      const newLink = getRandomMealDeliveryLink(selectedMeal, excludedUrls);
      setCurrentDeliveryLink(newLink);
    }
  }, [selectedMeal, excludedUrls]);

  // Handlers for meal delivery card
  const handleMealDeliveryAccept = () => {
    if (currentDeliveryLink) {
      // Open the delivery service link in a new tab
      window.open(currentDeliveryLink.url, '_blank');
    }
  };

  const handleMealDeliverySkip = () => {
    if (currentDeliveryLink && selectedMeal) {
      // Add current URL to excluded list
      setExcludedUrls((prev) => [...prev, currentDeliveryLink.url]);
      // Get a new random link (excluding the ones we've seen)
      const newLink = getRandomMealDeliveryLink(selectedMeal, [...excludedUrls, currentDeliveryLink.url]);
      setCurrentDeliveryLink(newLink);
    }
  };

  // Timeline events for next 6 hours
  const timelineEvents: TimelineEvent[] = [
    { id: "1", label: "Workout", time: "6:00 PM", color: "green" },
    { id: "2", label: "Meal", time: "7:30 PM", color: "blue" },
    { id: "3", label: "Yoga Class", time: "8:15 PM", color: "purple" },
  ];

  return (
    <div className="min-h-screen bg-neutral-bg pb-24">
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        {/* Header with Logo */}
        <div className="pt-8 space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Image
              src="/img/logo_icon.png"
              alt="BlueWell"
              width={40}
              height={40}
              className="object-contain"
              priority
            />
            <h1 className="text-3xl font-semibold text-neutral-dark">Your Day, Optimized</h1>
          </div>
        </div>

        {/* Daily Progress Goals - 3 circular indicators */}
        <div className="grid grid-cols-3 gap-4">
          <DailyGoalProgress
            label="Calories"
            current={caloriesConsumed}
            goal={caloriesGoal}
            color="blue"
            showRemaining={false}
          />
          <DailyGoalProgress
            label="Steps"
            current={stepsCurrent}
            goal={stepsGoal}
            color="green"
          />
          <DailyGoalProgress
            label="Protein"
            current={proteinConsumed}
            goal={proteinGoal}
            color="purple"
          />
        </div>

        {/* AI Recommendations Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-neutral-dark">AI Recommendations</h2>

          {/* AI Chatbot */}
          <AIChatbot />

          {/* MyRec Class Recommendation */}
          <MyRecClassCard
            classTitle={myRecClass.title}
            time={myRecClass.time}
            onAccept={() => {
              console.log("Accepted MyRec class");
              // Add logic to register for class
            }}
            onSkip={() => {
              console.log("Skipped MyRec class");
            }}
          />

          {/* Meal Plan Recommendation with Dropdown */}
          <MealPlanCard
            mealOptions={mealOptions}
            selectedMeal={selectedMeal}
            onSelectMeal={(meal) => {
              setSelectedMeal(meal);
              setExcludedUrls([]); // Reset excluded URLs when new meal is selected
              console.log("Selected meal:", meal);
            }}
          />

          {/* Meal Delivery Recommendation - Only show when meal is selected */}
          {currentDeliveryLink && selectedMeal && (
            <MealDeliveryCard
              restaurantName={currentDeliveryLink.restaurantName}
              mealName={currentDeliveryLink.dishName}
              deliveryService={currentDeliveryLink.service}
              onAccept={handleMealDeliveryAccept}
              onSkip={handleMealDeliverySkip}
            />
          )}
        </div>

        {/* Timeline - Next 6 hours */}
        <Timeline events={timelineEvents} />
      </div>
    </div>
  );
}
