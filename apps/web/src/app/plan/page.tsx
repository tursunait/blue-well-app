"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Card, CardContent, Button } from "@halo/ui";

interface TodayPlan {
  window: string;
  totals: {
    targetKcal: number;
    remainingKcal: number;
    estBurn?: number;
    targetProteinG?: number;
  };
  items: Array<{
    kind: "WORKOUT" | "MEAL" | "NUDGE";
    title?: string;
    start?: string;
    end?: string;
    location?: string;
    source?: string;
    intensity?: string;
    vendor?: string;
    calories?: number;
    proteinG?: number;
    when?: string;
    text?: string;
  }>;
  rationale: string;
  goalTips?: string[];
}

interface WeeklyPlan {
  meals: Record<string, any[]>;
  workouts: Record<string, any[]>;
  tips: string[];
}

// BlueWell Plan - User's personalized wellness plan
export default function PlanPage() {
  const [todayPlan, setTodayPlan] = useState<TodayPlan | null>(null);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [stats, setStats] = useState<{
    calories: { consumed: number; goal: number; remaining: number; burned: number };
    protein: { consumed: number; goal: number; remaining: number };
    steps: { current: number; goal: number; remaining: number };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setError(null);
      
      // Load today's stats
      const statsRes = await fetch("/api/stats/today");
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Load today's plan
      const todayRes = await fetch("/api/plan/today");
      if (todayRes.ok) {
        const today = await todayRes.json();
        setTodayPlan(today);
      } else {
        const errorData = await todayRes.json().catch(() => ({}));
        console.error("Plan API error:", {
          status: todayRes.status,
          statusText: todayRes.statusText,
          error: errorData
        });
        if (todayRes.status === 401) {
          setError("Please sign in to view your plan. Click the button below to sign in.");
        } else if (errorData.requiresOnboarding) {
          setError("Please complete the onboarding survey to generate your personalized plan. Click the button below to start onboarding.");
        } else {
          const errorMsg = errorData.details || errorData.error || "Failed to load today's plan. Please try again.";
          setError(errorMsg + (errorData.details ? ` (Details: ${errorData.details})` : ""));
        }
      }

      // Load weekly plan
      const weeklyRes = await fetch("/api/plan/weekly");
      if (weeklyRes.ok) {
        const weekly = await weeklyRes.json();
        setWeeklyPlan(weekly);
      } else {
        // Weekly plan is optional, don't set error if it fails
        console.warn("Failed to load weekly plan");
      }
    } catch (error) {
      console.error("Error loading plans:", error);
      setError("Failed to load your plan. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return "";
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    } catch {
      return timeStr;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-bg pb-24 flex items-center justify-center">
        <div className="text-neutral-text">Loading your plan...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-bg pb-24">
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        {/* Header with Logo */}
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

        {/* Error State */}
        {error && (
          <Card className="border-0 shadow-soft border-red-200 bg-red-50">
            <CardContent className="p-6 space-y-3">
              <p className="text-sm text-red-600">{error}</p>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadPlans}
                  className="mt-3"
                >
                  Retry
                </Button>
                {error.includes("sign in") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.location.href = "/api/auth/signin"}
                    className="mt-3"
                  >
                    Sign In
                  </Button>
                )}
                {error.includes("onboarding") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.location.href = "/onboarding"}
                    className="mt-3"
                  >
                    Go to Onboarding
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Today's Stats Summary */}
        {stats && (
          <Card className="border-0 shadow-soft">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-lg font-semibold text-neutral-dark">Today's Progress</h2>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-bluewell-light/10 border border-bluewell-light/20 text-center">
                  <div className="text-xs text-neutral-muted mb-1">Calories</div>
                  <div className="text-lg font-semibold text-neutral-dark">
                    {stats.calories.remaining}
                  </div>
                  <div className="text-xs text-neutral-muted">of {stats.calories.goal} remaining</div>
                </div>
                <div className="p-3 rounded-xl bg-green-100 border border-green-200 text-center">
                  <div className="text-xs text-neutral-muted mb-1">Steps</div>
                  <div className="text-lg font-semibold text-neutral-dark">
                    {stats.steps.current}
                  </div>
                  <div className="text-xs text-neutral-muted">of {stats.steps.goal} goal</div>
                </div>
                <div className="p-3 rounded-xl bg-purple-100 border border-purple-200 text-center">
                  <div className="text-xs text-neutral-muted mb-1">Protein</div>
                  <div className="text-lg font-semibold text-neutral-dark">
                    {stats.protein.consumed}g
                  </div>
                  <div className="text-xs text-neutral-muted">of {stats.protein.goal}g goal</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Today's Plan */}
        {todayPlan && (
          <Card className="border-0 shadow-soft">
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-neutral-dark">Today's Plan</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadPlans}
                  className="text-sm"
                >
                  Refresh
                </Button>
              </div>
              
              {/* Goal Achievement Explanation */}
              <div className="p-4 rounded-xl bg-bluewell-light/5 border border-bluewell-light/20">
                <h3 className="text-sm font-semibold text-neutral-dark mb-2">
                  How to Achieve Your Goals
                </h3>
                <p className="text-xs text-neutral-text leading-relaxed">
                  Based on your onboarding answers, your daily calorie target is <strong>{todayPlan.totals.targetKcal} kcal</strong> to {todayPlan.totals.targetKcal < 2000 ? "support weight loss" : todayPlan.totals.targetKcal > 2000 ? "support muscle gain" : "maintain your current weight"}. 
                  {todayPlan.totals.targetProteinG && ` Aim for ${todayPlan.totals.targetProteinG}g of protein daily`} to support your fitness goals. 
                  Track your progress throughout the day and follow the recommendations below.
                </p>
              </div>

              {/* AI Recommendations */}
              {todayPlan.items && todayPlan.items.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-neutral-dark">Recommended Actions</h3>
                  {todayPlan.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-neutral-border bg-neutral-white"
                    >
                      {item.kind === "MEAL" && (
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-neutral-dark">
                              {item.title || "Meal"}
                            </span>
                            {item.when && (
                              <span className="text-xs text-neutral-muted">{formatTime(item.when)}</span>
                            )}
                          </div>
                          {item.vendor && (
                            <div className="text-xs text-neutral-muted mt-1">{item.vendor}</div>
                          )}
                          {item.calories && (
                            <div className="text-xs text-neutral-muted mt-1">
                              {item.calories} kcal
                              {item.proteinG && ` • ${item.proteinG}g protein`}
                            </div>
                          )}
                        </div>
                      )}
                      {item.kind === "WORKOUT" && (
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-neutral-dark">
                              {item.title || "Workout"}
                            </span>
                            {item.start && (
                              <span className="text-xs text-neutral-muted">{formatTime(item.start)}</span>
                            )}
                          </div>
                          {item.location && (
                            <div className="text-xs text-neutral-muted mt-1">{item.location}</div>
                          )}
                          {item.intensity && (
                            <div className="text-xs text-neutral-muted mt-1">
                              Intensity: {item.intensity}
                            </div>
                          )}
                        </div>
                      )}
                      {item.kind === "NUDGE" && (
                        <div className="text-sm text-neutral-dark">{item.text}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Rationale */}
              {todayPlan.rationale && (
                <div className="p-3 rounded-xl bg-neutral-surface border border-neutral-border">
                  <p className="text-sm text-neutral-text">{todayPlan.rationale}</p>
                </div>
              )}

              {/* Goal Tips */}
              {todayPlan.goalTips && todayPlan.goalTips.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-neutral-dark">Tips to Achieve Your Goals</h3>
                  <ul className="space-y-1">
                    {todayPlan.goalTips.map((tip, idx) => (
                      <li key={idx} className="text-xs text-neutral-text flex items-start">
                        <span className="mr-2">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Weekly Plan */}
        {weeklyPlan && (
          <>
            {/* Weekly Meal Plan */}
            {weeklyPlan.meals && Object.keys(weeklyPlan.meals).length > 0 && (
              <Card className="border-0 shadow-soft">
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-neutral-dark">Weekly Meal Plan</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={loadPlans}
                      className="text-sm"
                    >
                      Refresh
                    </Button>
                  </div>
                  <p className="text-sm text-neutral-muted">
                    Your personalized meal plan for the week, designed to help you reach your goals.
                  </p>
                  <div className="space-y-4">
                    {Object.entries(weeklyPlan.meals).map(([day, meals]) => (
                      <div key={day} className="space-y-2">
                        <h3 className="text-sm font-medium text-neutral-dark capitalize">{day}</h3>
                        <div className="space-y-2">
                          {Array.isArray(meals) && meals.length > 0 ? (
                            meals.map((meal: any, idx: number) => (
                              <div
                                key={idx}
                                className="p-3 rounded-xl border border-neutral-border bg-neutral-white"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-neutral-dark capitalize">
                                    {meal.meal || meal.title || "Meal"}
                                  </span>
                                  {meal.calories && (
                                    <span className="text-xs text-neutral-muted">{meal.calories} kcal</span>
                                  )}
                                </div>
                                {meal.item?.name && (
                                  <div className="text-xs text-neutral-muted mt-1">{meal.item.name}</div>
                                )}
                                {meal.name && !meal.item && (
                                  <div className="text-xs text-neutral-muted mt-1">{meal.name}</div>
                                )}
                                {meal.proteinG && (
                                  <div className="text-xs text-neutral-muted mt-1">
                                    {meal.proteinG}g protein
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="p-3 rounded-xl border border-neutral-border bg-neutral-surface text-xs text-neutral-muted">
                              No meals planned for this day
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Weekly Workout Plan */}
            {weeklyPlan.workouts && Object.keys(weeklyPlan.workouts).length > 0 && (
              <Card className="border-0 shadow-soft">
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-neutral-dark">Weekly Workout Plan</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={loadPlans}
                      className="text-sm"
                    >
                      Refresh
                    </Button>
                  </div>
                  <p className="text-sm text-neutral-muted">
                    Your personalized workout schedule for the week, tailored to your fitness goals and preferences.
                  </p>
                  <div className="space-y-4">
                    {Object.entries(weeklyPlan.workouts).map(([day, workouts]) => (
                      <div key={day} className="space-y-2">
                        <h3 className="text-sm font-medium text-neutral-dark capitalize">{day}</h3>
                        <div className="space-y-2">
                          {Array.isArray(workouts) && workouts.length > 0 ? (
                            workouts.map((workout: any, idx: number) => (
                              <div
                                key={idx}
                                className="p-3 rounded-xl border border-neutral-border bg-neutral-white"
                              >
                                <div className="text-sm font-medium text-neutral-dark">
                                  {workout.title || workout.type || "Workout"}
                                </div>
                                {workout.duration && (
                                  <div className="text-xs text-neutral-muted mt-1">
                                    {workout.duration} minutes
                                  </div>
                                )}
                                {workout.intensity && (
                                  <div className="text-xs text-neutral-muted mt-1">
                                    Intensity: {workout.intensity}
                                  </div>
                                )}
                                {workout.location && (
                                  <div className="text-xs text-neutral-muted mt-1">
                                    Location: {workout.location}
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="p-3 rounded-xl border border-neutral-border bg-neutral-surface text-xs text-neutral-muted">
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

            {/* Weekly Tips */}
            {weeklyPlan.tips && weeklyPlan.tips.length > 0 && (
              <Card className="border-0 shadow-soft">
                <CardContent className="p-6 space-y-4">
                  <h2 className="text-lg font-semibold text-neutral-dark">Weekly Tips</h2>
                  <ul className="space-y-2">
                    {weeklyPlan.tips.map((tip, idx) => (
                      <li key={idx} className="text-sm text-neutral-text flex items-start">
                        <span className="mr-2">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Empty State */}
        {!todayPlan && !weeklyPlan && !loading && (
          <Card className="border-0 shadow-soft">
            <CardContent className="p-6 text-center space-y-3">
              <p className="text-base text-neutral-text">
                Your personalized plan will appear here
              </p>
              <p className="text-sm text-neutral-muted">
                Complete the onboarding survey to get started
              </p>
              <Button
                onClick={loadPlans}
                size="sm"
                className="mt-4"
              >
                Generate Plan
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

