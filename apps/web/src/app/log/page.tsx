"use client";

import { useState, useEffect } from "react";
import { FitnessGoalCard, AutoDetectedMeal } from "@halo/ui";
import { Camera } from "lucide-react";

// BlueWell Log Meal - Fitness Goals + Auto-Detected Meal
export default function LogPage() {
  const [stats, setStats] = useState<{
    calories: { consumed: number; goal: number; remaining: number; burned: number };
    protein: { consumed: number; goal: number; remaining: number };
    steps: { current: number; goal: number; remaining: number };
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await fetch("/api/stats/today");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fitness Goals Data - use real data or defaults
  const caloriesConsumed = stats?.calories.consumed || 0;
  const caloriesGoal = stats?.calories.goal || 2000;
  const caloriesRemaining = stats?.calories.remaining || caloriesGoal;
  
  const stepsCurrent = stats?.steps.current || 0;
  const stepsGoal = stats?.steps.goal || 10000;
  
  const proteinCurrent = stats?.protein.consumed || 0;
  const proteinGoal = stats?.protein.goal || 120;

  // Auto-Detected Meal Data
  const [detectedMeal, setDetectedMeal] = useState<{
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    imageUrl?: string;
  } | null>({
    name: "Poke Bowl",
    calories: 450,
    protein: 30,
    carbs: 40,
    fat: 20,
    imageUrl: "/img/poke-bowl.jpg", // Placeholder - you can add actual image
  });

  const handleConfirm = async () => {
    if (!detectedMeal) return;
    
    try {
      const res = await fetch("/api/log/meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemName: detectedMeal.name,
          calories: detectedMeal.calories,
          proteinG: detectedMeal.protein,
          carbsG: detectedMeal.carbs,
          fatG: detectedMeal.fat,
          source: "PHOTO_AI",
        }),
      });
      
      if (res.ok) {
        setDetectedMeal(null);
        loadStats(); // Refresh stats
      }
    } catch (error) {
      console.error("Error confirming meal:", error);
    }
  };

  const handleEdit = () => {
    console.log("Edit meal:", detectedMeal);
    // Add logic to open edit modal
  };

  const handleDismiss = () => {
    console.log("Meal dismissed");
    setDetectedMeal(null);
  };

  const handleSnapPhoto = () => {
    console.log("Snap photo clicked");
    // Add logic to open camera/photo picker
  };

  return (
    <div className="min-h-screen bg-neutral-bg pb-24">
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        {/* Header */}
        <div className="pt-8">
          <h1 className="text-3xl font-semibold text-neutral-dark">Log Meal</h1>
        </div>

        {/* Fitness Goals Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-neutral-dark">Fitness Goals</h2>
          <div className="grid grid-cols-3 gap-3">
            <FitnessGoalCard
              type="calories"
              current={caloriesRemaining}
              goal={caloriesGoal}
              title="Calories Remaining"
            />
            <FitnessGoalCard
              type="steps"
              current={stepsCurrent}
              goal={stepsGoal}
              title="Steps Today"
              subtitle=""
            />
            <FitnessGoalCard
              type="protein"
              current={proteinCurrent}
              goal={proteinGoal}
              title="Protein:"
              subtitle="Vegan"
            />
          </div>
        </div>

        {/* Auto-Detected Meal Section */}
        {detectedMeal && (
          <AutoDetectedMeal
            mealName={detectedMeal.name}
            calories={detectedMeal.calories}
            protein={detectedMeal.protein}
            carbs={detectedMeal.carbs}
            fat={detectedMeal.fat}
            imageUrl={detectedMeal.imageUrl}
            onConfirm={handleConfirm}
            onEdit={handleEdit}
            onDismiss={handleDismiss}
            onSnapPhoto={handleSnapPhoto}
          />
        )}

        {/* If no meal detected, show camera button */}
        {!detectedMeal && (
          <div className="flex items-center justify-center py-12">
            <button
              onClick={handleSnapPhoto}
              className="flex flex-col items-center gap-3 p-6 rounded-full bg-bluewell-light text-white hover:bg-bluewell-royal transition-colors"
            >
              <Camera className="h-8 w-8" />
              <span className="text-sm font-medium">Snap Photo</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
