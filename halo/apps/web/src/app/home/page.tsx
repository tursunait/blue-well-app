"use client";

import { useQuery } from "@tanstack/react-query";
import { MetricCard, RecommendationCard } from "@halo/ui";
import { chatRequest } from "@/lib/api";
import { RecommendationCard as RecommendationCardType } from "@halo/types";

// BlueWell Home - Calm, minimal, one primary action, max 5 elements above fold
export default function HomePage() {
  const { data: recommendations, isLoading } = useQuery({
    queryKey: ["daily-recommendations"],
    queryFn: async () => {
      const response = await chatRequest("daily plan");
      return response.suggestions || [];
    },
  });

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "good morning";
    if (hour < 18) return "good afternoon";
    return "good evening";
  };

  return (
    <div className="min-h-screen bg-neutral-bg pb-24">
      <div className="mx-auto max-w-2xl space-y-8 p-6">
        {/* Greeting - Calm, friendly */}
        <div className="pt-8 space-y-2">
          <h1 className="text-3xl font-semibold text-neutral-dark">
            {getGreeting()}
          </h1>
          <p className="text-base text-neutral-text">
            here's your wellness snapshot
          </p>
        </div>

        {/* Today's Snapshot - 3 metrics max */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricCard label="calories" value={1240} unit="kcal" trend="neutral" />
          <MetricCard label="water" value={6} unit="glasses" trend="up" />
          <MetricCard label="sleep" value={7.5} unit="hours" trend="neutral" />
        </div>

        {/* Primary Action - Next suggestion */}
        {recommendations && recommendations.length > 0 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-neutral-dark">
                do this next
              </h2>
              <p className="text-sm text-neutral-muted">
                one thing to focus on right now
              </p>
            </div>
            <RecommendationCard
              recommendation={recommendations[0] as RecommendationCardType}
              onAccept={() => console.log("Accepted")}
              onSkip={() => console.log("Skipped")}
            />
          </div>
        )}

        {/* Simplified 6-hour timeline - Only if there are more recommendations */}
        {recommendations && recommendations.length > 1 && (
          <div className="space-y-4 pt-4">
            <h2 className="text-xl font-semibold text-neutral-dark">
              today's plan
            </h2>
            <div className="space-y-3">
              {recommendations.slice(1, 4).map((rec: RecommendationCardType, idx: number) => (
                <RecommendationCard
                  key={rec.id || idx}
                  recommendation={rec}
                  onAccept={() => console.log("Accepted", rec)}
                  onSkip={() => console.log("Skipped", rec)}
                />
              ))}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-12 text-neutral-muted">
            loading your recommendations...
          </div>
        )}
      </div>
    </div>
  );
}
