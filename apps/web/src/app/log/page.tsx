"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { FitnessGoalCard, AutoDetectedMeal } from "@halo/ui";
import { Camera, PenSquare } from "lucide-react";
import { estimateCalories, estimateCaloriesFromText, type CalorieEstimateResponse } from "@/lib/api";
import { useNutrition } from "@/contexts/nutrition-context";

interface Stats {
  calories: { consumed: number; goal: number; remaining: number; burned: number };
  protein: { consumed: number; goal: number; remaining: number };
  steps: { current: number; goal: number; remaining: number };
}

// BlueWell Log Meal - Fitness Goals + Auto-Detected Meal
export default function LogPage() {
  // Get nutrition data from context
  const { loggedMeals, addMeal } = useNutrition();
  
  // Fetch stats from API for consistency
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    loadStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch("/api/stats/today");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Error loading stats:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Use API stats if available, fallback to context
  const caloriesConsumed = stats?.calories.consumed ?? 0;
  const caloriesGoal = stats?.calories.goal ?? 1800;
  const proteinConsumed = stats?.protein.consumed ?? 0;
  const proteinGoal = stats?.protein.goal ?? 120;
  const stepsCurrent = stats?.steps.current ?? 0;
  const stepsGoal = stats?.steps.goal ?? 10000;

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-Detected Meal Data
  const [detectedMeal, setDetectedMeal] = useState<{
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    imageUrl?: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [manualFoodText, setManualFoodText] = useState("");
  const [editedMeal, setEditedMeal] = useState<{
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null>(null);

  // Calculated values for display
  const caloriesRemaining = caloriesGoal - caloriesConsumed; // Still calculate for summary

  const handleConfirm = () => {
    if (detectedMeal) {
      console.log("Meal confirmed:", detectedMeal);

      // Add meal using context
      addMeal({
        name: detectedMeal.name,
        calories: detectedMeal.calories,
        protein: detectedMeal.protein,
        carbs: detectedMeal.carbs,
        fat: detectedMeal.fat,
      });

      // Clear the detected meal
      setDetectedMeal(null);
      
      // Refresh stats after a short delay to allow backend to process
      setTimeout(() => {
        loadStats();
      }, 1000);
    }
  };

  const handleEdit = () => {
    if (detectedMeal) {
      setEditedMeal({ ...detectedMeal });
      setIsEditModalOpen(true);
    }
  };

  const handleDismiss = () => {
    console.log("Meal dismissed");
    setDetectedMeal(null);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);
    try {
      const fileArray = Array.from(files);
      const response: CalorieEstimateResponse = await estimateCalories(fileArray);

      if (response.items && response.items.length > 0) {
        const firstItem = response.items[0];

        // Create a preview URL for the uploaded image
        const imageUrl = URL.createObjectURL(files[0]);

        setDetectedMeal({
          name: firstItem.dish_name,
          calories: firstItem.nutrition.calories,
          protein: Math.round(firstItem.nutrition.protein_g),
          carbs: Math.round(firstItem.nutrition.carbohydrates_g),
          fat: Math.round(firstItem.nutrition.fat_g),
          imageUrl: imageUrl,
        });
      }
    } catch (error) {
      console.error("Error estimating calories:", error);
      alert("Failed to estimate calories. Please try again.");
    } finally {
      setIsLoading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSnapPhoto = () => {
    console.log("Snap photo clicked");
    fileInputRef.current?.click();
  };

  const handleSaveEdit = () => {
    if (editedMeal) {
      setDetectedMeal(editedMeal);
      setIsEditModalOpen(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedMeal(null);
    setIsEditModalOpen(false);
  };

  const handleManualEntry = () => {
    setIsManualEntryOpen(true);
  };

  const handleManualEntrySubmit = async () => {
    if (!manualFoodText.trim()) return;

    setIsLoading(true);
    setIsManualEntryOpen(false);

    try {
      const response: CalorieEstimateResponse = await estimateCaloriesFromText(manualFoodText);

      if (response.items && response.items.length > 0) {
        const firstItem = response.items[0];

        setDetectedMeal({
          name: firstItem.dish_name,
          calories: firstItem.nutrition.calories,
          protein: Math.round(firstItem.nutrition.protein_g),
          carbs: Math.round(firstItem.nutrition.carbohydrates_g),
          fat: Math.round(firstItem.nutrition.fat_g),
        });
      }

      setManualFoodText("");
    } catch (error) {
      console.error("Error estimating calories from text:", error);
      alert("Failed to estimate calories. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelManualEntry = () => {
    setManualFoodText("");
    setIsManualEntryOpen(false);
  };

  return (
    <div className="min-h-screen bg-neutral-bg pb-24">
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          onChange={handleFileSelect}
          className="hidden"
          multiple={false}
        />

        {/* Header with Logo */}
        <div className="pt-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Image
              src="/img/logo_icon.png"
              alt="BlueWell"
              width={40}
              height={40}
              className="object-contain"
              priority
            />
            <h1 className="text-3xl font-semibold text-neutral-dark">Log Meal</h1>
          </div>
        </div>

        {/* Fitness Goals Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-neutral-dark">Fitness Goals</h2>
          <div className="grid grid-cols-3 gap-3">
            <FitnessGoalCard
              type="calories"
              current={caloriesConsumed}
              goal={caloriesGoal}
              title="Calories Consumed"
            />
            <FitnessGoalCard
              type="steps"
              current={stepsCurrent}
              goal={stepsGoal}
              title="Lose Weight"
              subtitle="Steps:"
            />
            <FitnessGoalCard
              type="protein"
              current={proteinConsumed}
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

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bluewell-light mx-auto"></div>
              <p className="text-neutral-text">Analyzing your meal...</p>
            </div>
          </div>
        )}

        {/* If no meal detected and not loading, show camera and manual entry buttons */}
        {!detectedMeal && !isLoading && (
          <div className="flex flex-col items-center gap-4 py-12">
            <button
              onClick={handleSnapPhoto}
              className="flex flex-col items-center gap-3 p-6 rounded-full bg-bluewell-light text-white hover:bg-bluewell-royal transition-colors"
            >
              <Camera className="h-8 w-8" />
              <span className="text-sm font-medium">Snap Photo</span>
            </button>

            <div className="text-neutral-muted font-medium">or</div>

            <button
              onClick={handleManualEntry}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-white border-2 border-bluewell-light text-bluewell-light hover:bg-bluewell-light hover:text-white transition-colors"
            >
              <PenSquare className="h-5 w-5" />
              <span className="text-sm font-medium">Enter Manually</span>
            </button>
          </div>
        )}

        {/* Manual Entry Modal */}
        {isManualEntryOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
              <h2 className="text-xl font-semibold text-neutral-dark">Enter Food Manually</h2>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-text">
                  What did you eat?
                </label>
                <input
                  type="text"
                  value={manualFoodText}
                  onChange={(e) => setManualFoodText(e.target.value)}
                  placeholder="e.g., 6 pieces of sushi, 2 donuts, chicken salad"
                  className="w-full px-3 py-2 border border-neutral-border rounded-lg focus:outline-none focus:ring-2 focus:ring-bluewell-light"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleManualEntrySubmit();
                    }
                  }}
                  autoFocus
                />
                <p className="text-xs text-neutral-muted">
                  Describe your food and we&apos;ll estimate the calories and macros
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCancelManualEntry}
                  className="flex-1 px-4 py-2 border border-neutral-border rounded-lg text-neutral-text hover:bg-neutral-surface transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleManualEntrySubmit}
                  disabled={!manualFoodText.trim()}
                  className="flex-1 px-4 py-2 bg-bluewell-light text-white rounded-lg hover:bg-bluewell-royal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Estimate
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {isEditModalOpen && editedMeal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
              <h2 className="text-xl font-semibold text-neutral-dark">Edit Meal Details</h2>

              <div className="space-y-4">
                {/* Meal Name */}
                <div>
                  <label className="block text-sm font-medium text-neutral-text mb-1">
                    Meal Name
                  </label>
                  <input
                    type="text"
                    value={editedMeal.name}
                    onChange={(e) =>
                      setEditedMeal({ ...editedMeal, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-neutral-border rounded-lg focus:outline-none focus:ring-2 focus:ring-bluewell-light"
                  />
                </div>

                {/* Calories */}
                <div>
                  <label className="block text-sm font-medium text-neutral-text mb-1">
                    Calories (kcal)
                  </label>
                  <input
                    type="number"
                    value={editedMeal.calories}
                    onChange={(e) =>
                      setEditedMeal({
                        ...editedMeal,
                        calories: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-neutral-border rounded-lg focus:outline-none focus:ring-2 focus:ring-bluewell-light"
                  />
                </div>

                {/* Protein */}
                <div>
                  <label className="block text-sm font-medium text-neutral-text mb-1">
                    Protein (g)
                  </label>
                  <input
                    type="number"
                    value={editedMeal.protein}
                    onChange={(e) =>
                      setEditedMeal({
                        ...editedMeal,
                        protein: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-neutral-border rounded-lg focus:outline-none focus:ring-2 focus:ring-bluewell-light"
                  />
                </div>

                {/* Carbs */}
                <div>
                  <label className="block text-sm font-medium text-neutral-text mb-1">
                    Carbohydrates (g)
                  </label>
                  <input
                    type="number"
                    value={editedMeal.carbs}
                    onChange={(e) =>
                      setEditedMeal({
                        ...editedMeal,
                        carbs: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-neutral-border rounded-lg focus:outline-none focus:ring-2 focus:ring-bluewell-light"
                  />
                </div>

                {/* Fat */}
                <div>
                  <label className="block text-sm font-medium text-neutral-text mb-1">
                    Fat (g)
                  </label>
                  <input
                    type="number"
                    value={editedMeal.fat}
                    onChange={(e) =>
                      setEditedMeal({
                        ...editedMeal,
                        fat: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-neutral-border rounded-lg focus:outline-none focus:ring-2 focus:ring-bluewell-light"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCancelEdit}
                  className="flex-1 px-4 py-2 border border-neutral-border rounded-lg text-neutral-text hover:bg-neutral-surface transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 px-4 py-2 bg-bluewell-light text-white rounded-lg hover:bg-bluewell-royal transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Logged Meals History */}
        {loggedMeals.length > 0 && (
          <div className="space-y-4 mt-8">
            <h2 className="text-lg font-semibold text-neutral-dark">Today&apos;s Meals</h2>
            <div className="space-y-3">
              {loggedMeals.map((meal) => (
                <div
                  key={meal.id}
                  className="bg-white rounded-xl p-4 shadow-soft border border-neutral-border"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-neutral-dark">
                        {meal.name}
                      </h3>
                      <p className="text-sm text-neutral-text mt-1">
                        {meal.calories} calories • {meal.protein}g protein • {meal.carbs}g carbs • {meal.fat}g fat
                      </p>
                    </div>
                    <div className="text-xs text-neutral-muted">
                      {meal.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Daily Summary */}
            <div className="bg-gradient-to-br from-bluewell-light/10 to-bluewell-royal/10 rounded-xl p-4 border border-bluewell-light/20">
              <h3 className="font-semibold text-neutral-dark mb-2">Daily Summary</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-neutral-text">Total Calories</p>
                  <p className="font-semibold text-neutral-dark">{caloriesConsumed} / {caloriesGoal}</p>
                </div>
                <div>
                  <p className="text-neutral-text">Remaining</p>
                  <p className={`font-semibold ${caloriesRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {caloriesRemaining} kcal
                  </p>
                </div>
                <div>
                  <p className="text-neutral-text">Protein</p>
                  <p className="font-semibold text-neutral-dark">{proteinConsumed}g / {proteinGoal}g</p>
                </div>
                <div>
                  <p className="text-neutral-text">Meals Logged</p>
                  <p className="font-semibold text-neutral-dark">{loggedMeals.length}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
