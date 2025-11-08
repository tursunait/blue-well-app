"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, Button } from "@bluewell/ui";

// BlueWell Planner - Very simplified weekly view, soft blocks, minimal text
export default function PlannerPage() {
  const { data: events } = useQuery({
    queryKey: ["planner-events"],
    queryFn: async () => {
      return [];
    },
  });

  const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

  return (
    <div className="min-h-screen bg-neutral-bg pb-24">
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        {/* Header - Minimal */}
        <div className="pt-8 space-y-2">
          <h1 className="text-3xl font-semibold text-neutral-dark">planner</h1>
          <p className="text-base text-neutral-text">
            your weekly schedule at a glance
          </p>
        </div>

        {/* Simplified Weekly View - Soft blocks */}
        <Card className="border-0 shadow-soft">
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-2 pb-2 border-b border-neutral-border">
                {days.map((day) => (
                  <div key={day} className="text-center text-sm font-medium text-neutral-muted">
                    {day}
                  </div>
                ))}
              </div>

              {/* Simplified blocks - Only essentials */}
              <div className="space-y-3">
                {days.map((day) => (
                  <div key={day} className="space-y-2">
                    <div className="text-xs text-neutral-muted font-medium px-2">{day}</div>
                    <div className="space-y-2">
                      {/* Example event - Soft blue accent */}
                      <div className="rounded-xl bg-accent-soft border border-accent-light/30 p-3">
                        <div className="text-sm font-medium text-bluewell-royal">morning workout</div>
                        <div className="text-xs text-neutral-muted mt-1">8:00 am</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Empty State - Supportive */}
        {(!events || events.length === 0) && (
          <div className="text-center py-12 space-y-3">
            <p className="text-base text-neutral-text">
              no events scheduled yet
            </p>
            <p className="text-sm text-neutral-muted">
              connect your calendar or ask the ai to plan your week
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
