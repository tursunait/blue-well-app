"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, MetricCard } from "@halo/ui";
import { getWeeklySummary } from "@/lib/api";
import { useState } from "react";

// Progress Tracking - Weekly summaries with charts
export default function ProgressPage() {
  const [weekStart, setWeekStart] = useState<string | undefined>(undefined);

  const { data: summary, isLoading } = useQuery({
    queryKey: ["weeklySummary", weekStart],
    queryFn: () => getWeeklySummary(weekStart),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-bg pb-24">
        <div className="mx-auto max-w-4xl space-y-8 p-6">
          <div className="pt-8">
            <h1 className="text-3xl font-semibold text-neutral-dark">progress</h1>
            <p className="text-base text-neutral-text mt-2">Loading your weekly summary...</p>
          </div>
        </div>
      </div>
    );
  }

  const stats = summary || {
    weekStart: new Date().toISOString().split("T")[0],
    weekEnd: new Date().toISOString().split("T")[0],
    totalWorkouts: 0,
    totalDuration: 0,
    totalCaloriesBurned: 0,
    workouts: [],
    dailyStats: [],
  };

  // Calculate averages
  const avgWorkoutsPerDay = stats.totalWorkouts / 7;
  const avgDurationPerDay = stats.totalDuration / 7;
  const avgCaloriesPerDay = stats.totalCaloriesBurned / 7;

  return (
    <div className="min-h-screen bg-neutral-bg pb-24">
      <div className="mx-auto max-w-4xl space-y-8 p-6">
        {/* Header */}
        <div className="pt-8 space-y-2">
          <h1 className="text-3xl font-semibold text-neutral-dark">progress</h1>
          <p className="text-base text-neutral-text">
            Week of {new Date(stats.weekStart).toLocaleDateString()} -{" "}
            {new Date(stats.weekEnd).toLocaleDateString()}
          </p>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <MetricCard
              label="Total Workouts"
              value={stats.totalWorkouts.toString()}
            />
            <p className="text-xs text-neutral-muted mt-2">{avgWorkoutsPerDay.toFixed(1)} per day</p>
          </div>
          <div>
            <MetricCard
              label="Total Duration"
              value={`${Math.round(stats.totalDuration / 60)}h ${stats.totalDuration % 60}m`}
            />
            <p className="text-xs text-neutral-muted mt-2">{Math.round(avgDurationPerDay)} min/day</p>
          </div>
          <div>
            <MetricCard
              label="Calories Burned"
              value={stats.totalCaloriesBurned.toLocaleString()}
            />
            <p className="text-xs text-neutral-muted mt-2">{Math.round(avgCaloriesPerDay)} per day</p>
          </div>
        </div>

        {/* Daily Stats Chart */}
        <Card className="border-0 shadow-soft">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-neutral-dark mb-6">Daily Activity</h2>
            <div className="space-y-4">
              {stats.dailyStats.map((day: any, index: number) => {
                const date = new Date(day.date);
                const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
                const maxCalories = Math.max(
                  ...stats.dailyStats.map((d: any) => d.calories || 0),
                  1
                );
                const barWidth = maxCalories > 0 ? (day.calories / maxCalories) * 100 : 0;

                return (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-neutral-text font-medium">
                        {dayName} {date.getDate()}
                      </span>
                      <span className="text-neutral-muted">
                        {day.workouts} workout{day.workouts !== 1 ? "s" : ""} • {day.calories || 0}{" "}
                        cal
                      </span>
                    </div>
                    <div className="h-3 bg-neutral-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-bluewell-royal to-accent-light transition-all"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Workout List */}
        {stats.workouts && stats.workouts.length > 0 && (
          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-neutral-dark mb-6">Recent Workouts</h2>
              <div className="space-y-4">
                {stats.workouts.map((workout: any) => (
                  <div
                    key={workout.id}
                    className="flex justify-between items-start p-4 bg-neutral-white rounded-xl border border-neutral-border"
                  >
                    <div className="space-y-1">
                      <h3 className="font-semibold text-neutral-dark">{workout.title}</h3>
                      <p className="text-sm text-neutral-muted">
                        {workout.type} • {workout.duration} min
                      </p>
                      <p className="text-xs text-neutral-muted">
                        {new Date(workout.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-bluewell-royal">
                        {workout.caloriesBurned || 0}
                      </div>
                      <div className="text-xs text-neutral-muted">calories</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {stats.totalWorkouts === 0 && (
          <Card className="border-0 shadow-soft">
            <CardContent className="p-12 text-center">
              <p className="text-neutral-text mb-4">No workouts logged this week</p>
              <p className="text-sm text-neutral-muted">
                Start logging your workouts to see your progress here!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

