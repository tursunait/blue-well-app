import type { User } from "@prisma/client";

type Gender = "Man" | "Male" | "Woman" | "Female" | string | null | undefined;

export interface TargetInput {
  age?: number | null;
  gender?: Gender;
  heightCm?: number | null;
  weightKg?: number | null;
  weeklyActivity?: number | null;
  fitnessGoal?: string | null;
}

export interface DailyTargets {
  kcal: number;
  protein_g: number;
}

const ACTIVITY_FACTORS = [1.2, 1.375, 1.55, 1.725];
const MAX_CALORIE_ADJUSTMENT = 500;
const DEFAULT_KCAL = 2000;
const DEFAULT_PROTEIN = 90;

function normalizeGender(gender: Gender): "male" | "female" | "unknown" {
  if (!gender) return "unknown";
  const lower = gender.toLowerCase();
  if (lower.includes("female") || lower.includes("woman")) return "female";
  if (lower.includes("male") || lower.includes("man")) return "male";
  return "unknown";
}

function calculateBMR(weightKg: number, heightCm: number, age: number, gender: Gender): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const normalized = normalizeGender(gender);
  if (normalized === "male") return base + 5;
  if (normalized === "female") return base - 161;
  return base;
}

function calculateTDEE(bmr: number, weeklyActivity?: number | null): number {
  const index = typeof weeklyActivity === "number" ? weeklyActivity - 1 : 0;
  const factor = ACTIVITY_FACTORS[index] ?? ACTIVITY_FACTORS[0];
  return bmr * factor;
}

function adjustForGoal(tdee: number, goal?: string | null): number {
  if (!goal) return tdee;
  switch (goal) {
    case "LOSE_FAT":
      return tdee - 350;
    case "GAIN_MUSCLE":
      return tdee + 250;
    case "FITNESS":
    case "ATHLETIC":
      return tdee + 150;
    case "MAINTAIN":
    default:
      return tdee;
  }
}

function clampCalorieTarget(tdee: number, baseline: number): number {
  const delta = tdee - baseline;
  if (delta > MAX_CALORIE_ADJUSTMENT) {
    return baseline + MAX_CALORIE_ADJUSTMENT;
  }
  if (delta < -MAX_CALORIE_ADJUSTMENT) {
    return baseline - MAX_CALORIE_ADJUSTMENT;
  }
  return tdee;
}

export function calculateDailyTargets(input: TargetInput | User): DailyTargets {
  const {
    age,
    gender,
    heightCm,
    weightKg,
    weeklyActivity,
    fitnessGoal,
  } = input;

  if (!age || !heightCm || !weightKg) {
    return {
      kcal: DEFAULT_KCAL,
      protein_g: DEFAULT_PROTEIN,
    };
  }

  const bmr = calculateBMR(weightKg, heightCm, age, gender);
  const tdee = calculateTDEE(bmr, weeklyActivity);

  const baseline = tdee;
  const adjusted = adjustForGoal(tdee, fitnessGoal);
  const kcal = Math.round(clampCalorieTarget(adjusted, baseline));

  const proteinPerKg = parseFloat(process.env.DEFAULT_PROTEIN_PER_KG || "1.2");
  const protein = Math.max(60, Math.round(weightKg * proteinPerKg));

  return {
    kcal,
    protein_g: protein,
  };
}

