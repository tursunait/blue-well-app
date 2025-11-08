"use client";

import { useState } from "react";
import {
  DailyGoalProgress,
  MyRecClassCard,
  MealPlanCard,
  MealDeliveryCard,
  Timeline,
  NavigationBar,
  TimelineEvent,
} from "@halo/ui";

// BlueWell Home - Your Day, Optimized
export default function HomePage() {
  // Daily goals data
  const caloriesConsumed = 800;
  const caloriesGoal = 2000;
  const caloriesRemaining = caloriesGoal - caloriesConsumed;

  const stepsCurrent = 8000;
  const stepsGoal = 10000;

  const proteinCurrent = 60;
  const proteinGoal = 150;

  // MyRec class recommendation
  const [myRecClass, setMyRecClass] = useState({
    title: "Full Body Strength",
    time: "5:30 PM",
  });

  // Meal plan options
  const mealOptions = ["Mediterranean Bowl", "Grilled Chicken Salad", "Quinoa Power Bowl"];
  const [selectedMeal, setSelectedMeal] = useState<string | undefined>();

  // Meal delivery recommendation
  const [mealDelivery, setMealDelivery] = useState({
    restaurant: "Yoprea",
    meal: "Mediterranean Bowl",
    service: "Grubhub" as "Grubhub" | "Uber Eats" | "DoorDash",
  });

  // Timeline events for next 6 hours
  const timelineEvents: TimelineEvent[] = [
    { id: "1", label: "Workout", time: "6:00 PM", color: "green" },
    { id: "2", label: "Meal", time: "7:30 PM", color: "blue" },
    { id: "3", label: "Yoga Class", time: "8:15 PM", color: "purple" },
  ];

  return (
    <div className="min-h-screen bg-neutral-bg pb-24">
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        {/* Header */}
        <div className="pt-8 text-center">
          <h1 className="text-3xl font-semibold text-neutral-dark">Your Day, Optimized</h1>
        </div>

        {/* Daily Progress Goals - 3 circular indicators */}
        <div className="grid grid-cols-3 gap-4">
          <DailyGoalProgress
            label="Calories"
            current={caloriesConsumed}
            goal={caloriesGoal}
            color="blue"
            showRemaining={true}
          />
          <DailyGoalProgress
            label="Steps"
            current={stepsCurrent}
            goal={stepsGoal}
            color="green"
          />
          <DailyGoalProgress
            label="Protein"
            current={proteinCurrent}
            goal={proteinGoal}
            color="purple"
          />
        </div>

        {/* AI Recommendations Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-neutral-dark">AI Recommendations</h2>

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
              console.log("Selected meal:", meal);
            }}
            onSkip={() => {
              console.log("Skipped meal plan");
            }}
          />

          {/* Meal Delivery Recommendation */}
          <MealDeliveryCard
            restaurantName={mealDelivery.restaurant}
            mealName={mealDelivery.meal}
            deliveryService={mealDelivery.service}
            onAccept={() => {
              console.log("Accepted meal delivery");
              // Add logic to open delivery app
            }}
            onSkip={() => {
              console.log("Skipped meal delivery");
            }}
          />
        </div>

        {/* Timeline - Next 6 hours */}
        <Timeline events={timelineEvents} />
      </div>

      {/* Navigation Bar */}
      <NavigationBar />
    </div>
  );
}
