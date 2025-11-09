import { prisma } from "@/lib/prisma";

export interface ModelMealOutput {
  id: string;
  time?: string;
  portion_note?: string;
}

export interface ModelWorkoutOutput {
  id: string;
  intensity?: string;
  note?: string;
}

export interface GroundedMeal {
  id: string;
  item: string;
  restaurant: string;
  calories: number | null;
  protein_g: number | null;
  time?: string;
  portion_note?: string;
}

export interface GroundedWorkout {
  id: string;
  title: string;
  location?: string | null;
  start_time?: string;
  end_time?: string;
  intensity?: string;
  note?: string;
}

export async function groundMeals(modelMeals: ModelMealOutput[]): Promise<GroundedMeal[]> {
  const ids = modelMeals.map((meal) => meal.id).filter(Boolean);
  if (ids.length === 0) return [];

  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: ids } },
    include: { vendor: true },
  });

  const map = new Map(menuItems.map((item) => [item.id, item]));
  const grounded: GroundedMeal[] = [];

  for (const meal of modelMeals) {
    const match = map.get(meal.id);
    if (!match || !match.vendor) {
      console.warn(`[groundMeals] Dropping meal with unknown id: ${meal.id}`);
      continue;
    }

    grounded.push({
      id: meal.id,
      item: match.name,
      restaurant: match.vendor.name,
      calories: match.calories ?? null,
      protein_g: match.proteinG ?? null,
      time: meal.time,
      portion_note: meal.portion_note,
    });
  }

  return grounded;
}

export async function groundWorkouts(modelWorkouts: ModelWorkoutOutput[]): Promise<GroundedWorkout[]> {
  const ids = modelWorkouts.map((workout) => workout.id).filter(Boolean);
  if (ids.length === 0) return [];

  const classes = await prisma.fitnessClass.findMany({
    where: { id: { in: ids } },
  });
  const map = new Map(classes.map((cls) => [cls.id, cls]));
  const grounded: GroundedWorkout[] = [];

  for (const workout of modelWorkouts) {
    const match = map.get(workout.id);
    if (!match) {
      console.warn(`[groundWorkouts] Dropping workout with unknown id: ${workout.id}`);
      continue;
    }

    grounded.push({
      id: workout.id,
      title: match.title,
      location: match.location,
      start_time: match.startTime.toISOString(),
      end_time: match.endTime?.toISOString(),
      intensity: workout.intensity ?? match.intensity ?? undefined,
      note: workout.note,
    });
  }

  return grounded;
}

