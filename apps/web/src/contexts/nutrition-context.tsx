"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  timestamp: Date;
}

interface NutritionContextType {
  // Goals
  caloriesGoal: number;
  proteinGoal: number;

  // Consumed amounts
  caloriesConsumed: number;
  proteinConsumed: number;

  // Logged meals
  loggedMeals: Meal[];

  // Actions
  addMeal: (meal: Omit<Meal, "id" | "timestamp">) => void;
  setCaloriesGoal: (goal: number) => void;
  setProteinGoal: (goal: number) => void;
}

const NutritionContext = createContext<NutritionContextType | undefined>(undefined);

export function NutritionProvider({ children }: { children: ReactNode }) {
  const [caloriesGoal] = useState(1800);
  const [proteinGoal] = useState(120);
  const [caloriesConsumed, setCaloriesConsumed] = useState(0);
  const [proteinConsumed, setProteinConsumed] = useState(0);
  const [loggedMeals, setLoggedMeals] = useState<Meal[]>([]);

  const addMeal = (meal: Omit<Meal, "id" | "timestamp">) => {
    const newMeal: Meal = {
      ...meal,
      id: Date.now().toString(),
      timestamp: new Date(),
    };

    setLoggedMeals((prev) => [newMeal, ...prev]);
    setCaloriesConsumed((prev) => prev + meal.calories);
    setProteinConsumed((prev) => prev + meal.protein);
  };

  return (
    <NutritionContext.Provider
      value={{
        caloriesGoal,
        proteinGoal,
        caloriesConsumed,
        proteinConsumed,
        loggedMeals,
        addMeal,
        setCaloriesGoal: () => {},
        setProteinGoal: () => {},
      }}
    >
      {children}
    </NutritionContext.Provider>
  );
}

export function useNutrition() {
  const context = useContext(NutritionContext);
  if (context === undefined) {
    throw new Error("useNutrition must be used within a NutritionProvider");
  }
  return context;
}
