"use client";

import { useState, useEffect } from "react";
import {
  DailyGoalProgress,
  MyRecClassCard,
  MealPlanCard,
  MealDeliveryCard,
  Timeline,
  TimelineEvent,
  Card,
  CardContent,
} from "@halo/ui";

// BlueWell Home - Your Day, Optimized
export default function HomePage() {
  const [stats, setStats] = useState<{
    calories: { consumed: number; goal: number; remaining: number; burned: number };
    protein: { consumed: number; goal: number; remaining: number };
    steps: { current: number; goal: number; remaining: number };
  } | null>(null);
  const [next6hPlan, setNext6hPlan] = useState<any>(null);
  const [weeklyPlan, setWeeklyPlan] = useState<{
    meals: Record<string, any[]>;
    workouts: Record<string, any[]>;
    tips: string[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load today's stats
      const statsRes = await fetch("/api/stats/today");
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Load next 6h plan
      const planRes = await fetch("/api/plan/next6h");
      if (planRes.ok) {
        const planData = await planRes.json();
        setNext6hPlan(planData);
      }

      // Load weekly plan (meal and workout plans)
      const weeklyRes = await fetch("/api/plan/weekly");
      if (weeklyRes.ok) {
        const weeklyData = await weeklyRes.json();
        setWeeklyPlan(weeklyData);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Daily goals data - use real data or defaults
  const caloriesConsumed = stats?.calories.consumed || 0;
  const caloriesGoal = stats?.calories.goal || 2000;
  const caloriesRemaining = stats?.calories.remaining || caloriesGoal;

  const stepsCurrent = stats?.steps.current || 0;
  const stepsGoal = stats?.steps.goal || 10000;

  const proteinCurrent = stats?.protein.consumed || 0;
  const proteinGoal = stats?.protein.goal || 120;

  // Extract recommendations from plan
  const workoutItem = next6hPlan?.items?.find((item: any) => item.kind === "WORKOUT");
  const mealItems = next6hPlan?.items?.filter((item: any) => item.kind === "MEAL") || [];
  
  const myRecClass = workoutItem ? {
    title: workoutItem.title || "Workout",
    time: workoutItem.start ? new Date(workoutItem.start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "TBD",
  } : null;

  // Meal plan options from recommendations
  const mealOptions = mealItems.map((item: any) => item.title || item.name || "Meal");
  const [selectedMeal, setSelectedMeal] = useState<string | undefined>();

  // Meal delivery recommendation (first meal item)
  const firstMeal = mealItems[0];
  const mealDelivery = firstMeal ? {
    restaurant: firstMeal.vendor || "Campus Dining",
    meal: firstMeal.title || firstMeal.name || "Meal",
    service: (firstMeal.deliveryApp || "CAMPUS") as "Grubhub" | "Uber Eats" | "DoorDash" | "CAMPUS",
  } : null;

  // Timeline events for next 6 hours from plan
  const timelineEvents: TimelineEvent[] = (next6hPlan?.items || []).map((item: any, idx: number) => {
    const time = item.start || item.when || "";
    const timeStr = time ? new Date(time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";
    
    let label = "";
    let color: "green" | "blue" | "purple" = "blue";
    
    if (item.kind === "WORKOUT") {
      label = item.title || "Workout";
      color = "green";
    } else if (item.kind === "MEAL") {
      label = item.title || item.name || "Meal";
      color = "blue";
    } else if (item.kind === "NUDGE") {
      label = item.text || "Reminder";
      color = "purple";
    }
    
    return { id: String(idx), label, time: timeStr, color };
  });

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
            current={caloriesRemaining}
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

        {/* Generated Plans Based on Onboarding */}
        {weeklyPlan && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-neutral-dark">Your Personalized Plans</h2>
            
            {/* Weekly Meal Plan Preview */}
            {weeklyPlan.meals && Object.keys(weeklyPlan.meals).length > 0 && (
              <Card className="border-0 shadow-soft">
                <CardContent className="p-6 space-y-4">
                  <h3 className="text-base font-semibold text-neutral-dark">Weekly Meal Plan</h3>
                  <p className="text-sm text-neutral-muted">
                    Based on your dietary preferences and goals
                  </p>
                  <div className="space-y-3">
                    {Object.entries(weeklyPlan.meals).slice(0, 3).map(([day, meals]) => (
                      <div key={day} className="space-y-2">
                        <h4 className="text-sm font-medium text-neutral-dark capitalize">{day}</h4>
                        <div className="space-y-1">
                          {Array.isArray(meals) && meals.slice(0, 2).map((meal: any, idx: number) => (
                            <div
                              key={idx}
                              className="p-2 rounded-lg border border-neutral-border bg-neutral-white"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-neutral-dark">
                                  {meal.meal || meal.title || meal.name || "Meal"}
                                </span>
                                {meal.calories && (
                                  <span className="text-xs text-neutral-muted">{meal.calories} kcal</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Weekly Workout Plan Preview */}
            {weeklyPlan.workouts && Object.keys(weeklyPlan.workouts).length > 0 && (
              <Card className="border-0 shadow-soft">
                <CardContent className="p-6 space-y-4">
                  <h3 className="text-base font-semibold text-neutral-dark">Weekly Workout Plan</h3>
                  <p className="text-sm text-neutral-muted">
                    Tailored to your fitness goals and preferences
                  </p>
                  <div className="space-y-3">
                    {Object.entries(weeklyPlan.workouts).slice(0, 3).map(([day, workouts]) => (
                      <div key={day} className="space-y-2">
                        <h4 className="text-sm font-medium text-neutral-dark capitalize">{day}</h4>
                        <div className="space-y-1">
                          {Array.isArray(workouts) && workouts.length > 0 ? (
                            workouts.slice(0, 1).map((workout: any, idx: number) => (
                              <div
                                key={idx}
                                className="p-2 rounded-lg border border-neutral-border bg-neutral-white"
                              >
                                <div className="text-xs font-medium text-neutral-dark">
                                  {workout.title || workout.type || "Workout"}
                                </div>
                                {workout.duration && (
                                  <div className="text-xs text-neutral-muted mt-1">
                                    {workout.duration} min
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="p-2 rounded-lg border border-neutral-border bg-neutral-surface text-xs text-neutral-muted">
                              Rest day
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* AI Recommendations Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-neutral-dark">AI Recommendations</h2>

          {/* MyRec Class Recommendation */}
          {myRecClass ? (
            <MyRecClassCard
              classTitle={myRecClass.title}
              time={myRecClass.time}
              onAccept={() => {
                console.log("Accepted MyRec class");
                // Add logic to register for class
              }}
              onSkip={() => {
                console.log("Skipped MyRec class");
                loadData(); // Refresh to get new recommendations
              }}
            />
          ) : (
            !loading && (
              <MyRecClassCard
                classTitle="Full Body Strength"
                time="5:30 PM"
                onAccept={() => {
                  console.log("Accepted MyRec class");
                }}
                onSkip={() => {
                  console.log("Skipped MyRec class");
                }}
              />
            )
          )}

          {/* Meal Plan Recommendation with Dropdown */}
          {mealOptions.length > 0 ? (
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
          ) : (
            !loading && (
              <MealPlanCard
                mealOptions={["Mediterranean Bowl", "Grilled Chicken Salad", "Quinoa Power Bowl"]}
                selectedMeal={selectedMeal}
                onSelectMeal={(meal) => {
                  setSelectedMeal(meal);
                  console.log("Selected meal:", meal);
                }}
                onSkip={() => {
                  console.log("Skipped meal plan");
                }}
              />
            )
          )}

          {/* Meal Delivery Recommendation */}
          {mealDelivery ? (
            <MealDeliveryCard
              restaurantName={mealDelivery.restaurant}
              mealName={mealDelivery.meal}
              deliveryService={mealDelivery.service === "CAMPUS" ? "Grubhub" : mealDelivery.service}
              onAccept={() => {
                console.log("Accepted meal delivery");
                // Add logic to open delivery app or log meal
              }}
              onSkip={() => {
                console.log("Skipped meal delivery");
                loadData(); // Refresh to get new recommendations
              }}
            />
          ) : (
            !loading && (
              <MealDeliveryCard
                restaurantName="Yoprea"
                mealName="Mediterranean Bowl"
                deliveryService="Grubhub"
                onAccept={() => {
                  console.log("Accepted meal delivery");
                }}
                onSkip={() => {
                  console.log("Skipped meal delivery");
                }}
              />
            )
          )}
        </div>

        {/* Timeline - Next 6 hours */}
        {timelineEvents.length > 0 && <Timeline events={timelineEvents} />}
        
        {loading && (
          <div className="text-center py-8 text-neutral-text">Loading your optimized day...</div>
        )}
      </div>
    </div>
  );
}
