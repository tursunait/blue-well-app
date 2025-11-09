"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  MyRecClassCard,
  Timeline,
  TimelineEvent,
  Card,
  CardContent,
  Button,
  FitnessGoalCard,
} from "@halo/ui";
import { WellnessDisclaimer } from "@/components/WellnessDisclaimer";

interface PlanResponse {
  day: string;
  targets: {
    kcal: number;
    protein_g: number;
  };
  meals: Array<{
    id: string;
    item: string;
    restaurant: string;
    calories: number | null;
    protein_g: number | null;
    time?: string;
    portion_note?: string;
  }>;
  workouts: Array<{
    id: string;
    title: string;
    location?: string | null;
    start_time?: string;
    end_time?: string;
    intensity?: string;
    note?: string;
  }>;
}

interface StatsResponse {
  calories: { consumed: number; goal: number; remaining: number; burned: number };
  protein: { consumed: number; goal: number; remaining: number };
  steps: { current: number; goal: number; remaining: number };
}

const todayISODate = () => new Date().toISOString().split("T")[0];

export default function HomePage() {
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [planError, setPlanError] = useState<string | null>(null);
  const [myRecClass, setMyRecClass] = useState<{
    title: string;
    time: string;
    startTime?: string;
    endTime?: string;
    location?: string;
  } | null>(null);
  const [classLoading, setClassLoading] = useState(true);

  useEffect(() => {
    loadPlan(false);
    loadStats();
    loadNearestClass();

    const interval = setInterval(() => {
      loadPlan(false);
      loadStats();
      loadNearestClass();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadPlan = async (refresh: boolean) => {
    try {
      setPlanError(null);
      setPlanLoading(true);
      const response = await fetch("/api/plan/generate", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          day: todayISODate(),
          refresh,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const message = data.error || data.details || "Unable to load plan.";
        throw new Error(message);
      }

      const data = (await response.json()) as PlanResponse;
      setPlan(data);
    } catch (error) {
      console.error("[home/page] Error loading plan:", error);
      setPlanError(
        error instanceof Error ? error.message : "Unable to load plan right now."
      );
    } finally {
      setPlanLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch("/api/stats/today", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load stats");
      }
      const data = (await response.json()) as StatsResponse;
      setStats(data);
    } catch (error) {
      console.error("[home/page] Error loading stats:", error);
    }
  };

  const isLoading = planLoading && !plan;

  const loadNearestClass = async () => {
    try {
      const response = await fetch("/api/rec/nearest-class", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        setMyRecClass(data.class ?? null);
      }
    } catch (error) {
      console.error("[home/page] Error loading nearest class:", error);
    } finally {
      setClassLoading(false);
    }
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "";
    }
  };

  const timelineEvents: TimelineEvent[] = useMemo(() => {
    if (!plan) return [];
    return plan.workouts
      .filter((workout) => Boolean(workout.start_time))
      .slice(0, 3)
      .map((workout, index) => ({
        id: workout.id,
        label: workout.title,
        time: workout.start_time ? formatTime(workout.start_time) : "",
        color: ["blue", "green", "purple"][index % 3],
      }));
  }, [plan]);

  return (
    <div className="min-h-screen bg-neutral-bg pb-24">
      <div className="mx-auto max-w-2xl space-y-6 p-6">
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

        <WellnessDisclaimer />

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-neutral-dark">Fitness Goals</h2>
          <div className="grid grid-cols-3 gap-3">
            <FitnessGoalCard
              type="calories"
              current={stats?.calories.consumed ?? 0}
              goal={stats?.calories.goal ?? 0}
              title="Calories Consumed"
            />
            <FitnessGoalCard
              type="steps"
              current={stats?.steps.current ?? 0}
              goal={stats?.steps.goal ?? 0}
              title="Steps"
              subtitle="Today"
            />
            <FitnessGoalCard
              type="protein"
              current={stats?.protein.consumed ?? 0}
              goal={stats?.protein.goal ?? 0}
              title="Protein"
            />
          </div>
        </div>

        <Card className="border-0 shadow-soft">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-dark">Today's Meals</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => loadPlan(true)}
                disabled={planLoading}
              >
                Refresh
              </Button>
            </div>

            {planError && (
              <div className="text-sm text-red-600">{planError}</div>
            )}

            {planLoading ? (
              <div className="text-sm text-neutral-muted">Loading plan...</div>
            ) : plan && plan.meals.length > 0 ? (
              <div className="space-y-3">
                {plan.meals.map((meal) => (
                  <div
                    key={meal.id}
                    className="p-4 rounded-xl border border-neutral-border bg-neutral-white"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-neutral-dark">
                        {meal.item}
                      </span>
                      {meal.time && (
                        <span className="text-xs text-neutral-muted">{formatTime(meal.time)}</span>
                      )}
                    </div>
                    <div className="text-xs text-neutral-muted mt-1">{meal.restaurant}</div>
                    <div className="text-xs text-neutral-muted mt-1">
                      {meal.calories ?? "—"} kcal
                      {meal.protein_g !== null && typeof meal.protein_g !== "undefined"
                        ? ` • ${meal.protein_g}g protein`
                        : ""}
                    </div>
                    {meal.portion_note && (
                      <div className="text-xs text-neutral-muted mt-2">{meal.portion_note}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-neutral-muted">No meals planned yet.</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-soft">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-dark">Workouts</h2>
            </div>
            {planLoading ? (
              <div className="text-sm text-neutral-muted">Loading workouts...</div>
            ) : plan && plan.workouts.length > 0 ? (
              <div className="space-y-3">
                {plan.workouts.map((workout) => (
                  <div
                    key={workout.id}
                    className="p-4 rounded-xl border border-neutral-border bg-neutral-white"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-neutral-dark">
                        {workout.title}
                      </span>
                      {workout.start_time && (
                        <span className="text-xs text-neutral-muted">
                          {formatTime(workout.start_time)}
                        </span>
                      )}
                    </div>
                    {workout.location && (
                      <div className="text-xs text-neutral-muted mt-1">
                        {workout.location}
                      </div>
                    )}
                    {workout.intensity && (
                      <div className="text-xs text-neutral-muted mt-1">
                        Intensity: {workout.intensity}
                      </div>
                    )}
                    {workout.note && (
                      <div className="text-xs text-neutral-muted mt-2">{workout.note}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-neutral-muted">No workouts scheduled.</div>
            )}
          </CardContent>
        </Card>

        {!classLoading && myRecClass && (
          <MyRecClassCard
            classTitle={myRecClass.title}
            time={myRecClass.time}
            onAccept={() => {
              console.log("Accepted MyRec class:", myRecClass);
            }}
            onSkip={() => {
              setMyRecClass(null);
            }}
          />
        )}

        {timelineEvents.length > 0 && <Timeline events={timelineEvents} />}
      </div>
    </div>
  );
}
