"use client";

import React, { createContext, useContext, useState } from "react";

export interface LoggedMeal {
  id: string;
  name?: string;
  itemName?: string;
  calories: number;
  protein?: number | null;
  proteinG?: number | null;
  carbs?: number | null;
  carbsG?: number | null;
  fat?: number | null;
  fatG?: number | null;
  timestamp: Date;
}

interface NutritionContextType {
  loggedMeals: LoggedMeal[];
  addMeal: (meal: Omit<LoggedMeal, "id" | "timestamp">) => void;
  removeMeal: (id: string) => void;
  clearMeals: () => void;
}

const NutritionContext = createContext<NutritionContextType | undefined>(undefined);

export function NutritionProvider({ children }: { children: React.ReactNode }) {
  const [loggedMeals, setLoggedMeals] = useState<LoggedMeal[]>([]);

  const addMeal = (meal: Omit<LoggedMeal, "id" | "timestamp">) => {
    const newMeal: LoggedMeal = {
      ...meal,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
    };
    setLoggedMeals((prev) => [...prev, newMeal]);
  };

  const removeMeal = (id: string) => {
    setLoggedMeals((prev) => prev.filter((meal) => meal.id !== id));
  };

  const clearMeals = () => {
    setLoggedMeals([]);
  };

  return (
    <NutritionContext.Provider value={{ loggedMeals, addMeal, removeMeal, clearMeals }}>
      {children}
    </NutritionContext.Provider>
  );
}

export function useNutrition() {
  const context = useContext(NutritionContext);
  if (!context) {
    throw new Error("useNutrition must be used within a NutritionProvider");
  }
  return context;
}
