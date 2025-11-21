"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Card, CardContent, Button } from "@halo/ui";
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
  insights?: {
    summary?: string;
    recommendations?: string[];
    encouragement?: string;
  };
}

const todayISODate = () => new Date().toISOString().split("T")[0];

const PlanPage: React.FC = () => {
    const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [planError, setPlanError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
    loadPlan(false);
  }, []);

  const loadStats = async () => {
    try {
      setStatsError(null);
      const res = await fetch("/api/stats/today", { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Failed to load stats");
      }
      const data = (await res.json()) as StatsResponse;
      setStats(data);
    } catch (error) {
      console.error("[plan/page] Error loading stats:", error);
      setStatsError("Unable to load today's stats. Please try again.");
    } finally {
      setStatsLoading(false);
    }
  };

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
        const errorData = await response.json().catch(() => ({}));
        let message =
          errorData.error ||
          errorData.details ||
          "Unable to generate your plan right now. Please try again.";
        
        // Show diagnostic info if available
        if (errorData.diagnostic) {
          const diag = errorData.diagnostic;
          if (diag.itemsWithNutrition > 0) {
            message += ` (Found ${diag.itemsWithNutrition} items in database - may be filtered by preferences)`;
          } else {
            message += ` (No items found in database - please import data)`;
          }
        }
        
        throw new Error(message);
      }

      const data = (await response.json()) as PlanResponse;
      setPlan(data);
    } catch (error) {
      console.error("[plan/page] Error loading plan:", error);
      setPlanError(
        error instanceof Error
          ? error.message
          : "Unable to generate your plan right now. Please try again."
      );
    } finally {
      setPlanLoading(false);
    }
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    } catch {
      return isoString;
    }
  };

  const isLoading = planLoading || statsLoading;

  return (
    <div className="min-h-screen bg-neutral-bg pb-24">
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <div className="pt-8 space-y-2">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Image
              src="/img/logo_icon.png"
              alt="BlueWell"
              width={40}
              height={40}
              className="object-contain"
              priority
            />
            <h1 className="text-3xl font-semibold text-neutral-dark">Your Plan</h1>
          </div>
          <p className="text-base text-neutral-text text-center">
            Personalized wellness plan based on your goals
          </p>
        </div>

        <WellnessDisclaimer />

        {isLoading && (
          <Card className="border-0 shadow-soft">
            <CardContent className="p-6 text-center text-neutral-muted">
              Generating your plan...
            </CardContent>
          </Card>
        )}

        {statsError && (
          <Card className="border-0 shadow-soft border-red-200 bg-red-50">
            <CardContent className="p-6 space-y-2 text-sm text-red-600">
              <p>{statsError}</p>
              <Button variant="ghost" size="sm" onClick={loadStats}>
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {planError && (
          <Card className="border-0 shadow-soft border-red-200 bg-red-50">
            <CardContent className="p-6 space-y-2 text-sm text-red-600">
              <p>{planError}</p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => loadPlan(true)}>
                  Retry
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => (window.location.href = "/onboarding")}
                >
                  Update Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {stats && (
          <Card className="border-0 shadow-soft">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-lg font-semibold text-neutral-dark">Today's Progress</h2>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-bluewell-light/10 border border-bluewell-light/20 text-center">
                  <div className="text-xs text-neutral-muted mb-1">Calories</div>
                  <div className="text-lg font-semibold text-neutral-dark">
                    {stats.calories.consumed} / {stats.calories.goal}
                  </div>
                  <div className="text-xs text-neutral-muted">kcal consumed</div>
                </div>
                <div className="p-3 rounded-xl bg-bluewell-light/10 border border-bluewell-light/20 text-center">
                  <div className="text-xs text-neutral-muted mb-1">Protein</div>
                  <div className="text-lg font-semibold text-neutral-dark">
                    {stats.protein.consumed} / {stats.protein.goal}
                  </div>
                  <div className="text-xs text-neutral-muted">grams consumed</div>
                </div>
                <div className="p-3 rounded-xl bg-bluewell-light/10 border border-bluewell-light/20 text-center">
                  <div className="text-xs text-neutral-muted mb-1">Steps</div>
                  <div className="text-lg font-semibold text-neutral-dark">
                    {stats.steps.current} / {stats.steps.goal}
                  </div>
                  <div className="text-xs text-neutral-muted">steps today</div>
                </div>
              </div>
              {stats.insights && (stats.insights.summary || stats.insights.recommendations?.length) && (
                <div className="p-4 rounded-xl bg-neutral-white border border-neutral-border">
                  {stats.insights.summary && (
                    <p className="text-sm text-neutral-dark mb-2">{stats.insights.summary}</p>
                  )}
                  {stats.insights.recommendations && (
                    <ul className="text-xs text-neutral-muted space-y-1">
                      {stats.insights.recommendations.map((rec, idx) => (
                        <li key={idx}>• {rec}</li>
                      ))}
                    </ul>
                  )}
                  {stats.insights.encouragement && (
                    <p className="text-xs text-bluewell-royal mt-2">
                      {stats.insights.encouragement}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {plan && !planLoading && (
          <Card className="border-0 shadow-soft">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-neutral-dark">Today's Plan</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => loadPlan(true)}
                  disabled={planLoading}
                >
                  Refresh
                </Button>
              </div>

              <div className="text-sm text-neutral-muted">
                Targets: <strong>{plan.targets.kcal} kcal</strong> • {" "}
                <strong>{plan.targets.protein_g}g protein</strong>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-neutral-dark">Meals</h3>
                {plan.meals.length > 0 ? (
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
                            <span className="text-xs text-neutral-muted">
                              {formatTime(meal.time)}
                            </span>
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
                  <div className="text-xs text-neutral-muted">No meals planned yet.</div>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-neutral-dark">Workouts</h3>
                {plan.workouts.length > 0 ? (
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
                          <div className="text-xs text-neutral-muted mt-1">{workout.location}</div>
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
                  <div className="text-xs text-neutral-muted">No workouts scheduled.</div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PlanPage;

