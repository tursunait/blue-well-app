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

// Format time from ISO string
function formatTime(isoString: string): string {
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
}

// Meal Plan Page - Snapshot of today's meal plan
export default function AIPage() {
  const [todayPlan, setTodayPlan] = useState<TodayPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPlan();
  }, []);

  const loadPlan = async () => {
    try {
      setError(null);
      setLoading(true);

      const response = await fetch("/api/plan/today");
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Please sign in to view your meal plan");
        } else if (response.status === 404) {
          throw new Error("Please complete onboarding to get your meal plan");
        }
        throw new Error("Failed to load meal plan");
      }

      const data = await response.json();
      setTodayPlan(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load meal plan");
    } finally {
      setLoading(false);
    }
  };

  // Filter only meal items
  const mealItems = todayPlan?.items.filter((item) => item.kind === "MEAL") || [];

  return (
    <div className="min-h-screen bg-neutral-bg pb-24">
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        {/* Header */}
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
            <h1 className="text-3xl font-semibold text-neutral-dark">Your meal plan for today</h1>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <p className="text-center text-neutral-text">Loading your meal plan...</p>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-0 shadow-soft border-red-200 bg-red-50">
            <CardContent className="p-6 space-y-3">
              <p className="text-sm text-red-600">{error}</p>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadPlan}
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

        {/* Meal Plan */}
        {!loading && !error && todayPlan && (
          <Card className="border-0 shadow-soft">
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-neutral-dark">Today's Meals</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadPlan}
                  className="text-sm"
                >
                  Refresh
                </Button>
              </div>

              {/* Meal Items */}
              {mealItems.length > 0 ? (
                <div className="space-y-3">
                  {mealItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-neutral-border bg-neutral-white"
                    >
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
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-neutral-muted">
                    No meals planned for today. Check back later or refresh to get recommendations.
                  </p>
                </div>
              )}

              {/* Rationale */}
              {todayPlan.rationale && (
                <div className="pt-4 border-t border-neutral-border">
                  <p className="text-xs text-neutral-text leading-relaxed">
                    {todayPlan.rationale}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

