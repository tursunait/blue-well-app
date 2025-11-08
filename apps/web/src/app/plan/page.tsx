"use client";

import { Card, CardContent } from "@halo/ui";

// BlueWell Plan - User's personalized wellness plan
export default function PlanPage() {
  return (
    <div className="min-h-screen bg-neutral-bg pb-24">
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        {/* Header */}
        <div className="pt-8 space-y-2">
          <h1 className="text-3xl font-semibold text-neutral-dark">Your Plan</h1>
          <p className="text-base text-neutral-text">
            Your personalized wellness plan
          </p>
        </div>

        {/* Plan Overview */}
        <Card className="border-0 shadow-soft">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-neutral-dark">Weekly Overview</h2>
            <p className="text-sm text-neutral-text">
              Your plan is being personalized based on your preferences and goals.
            </p>
          </CardContent>
        </Card>

        {/* Goals Summary */}
        <Card className="border-0 shadow-soft">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-neutral-dark">Your Goals</h2>
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-bluewell-light/10 border border-bluewell-light/20">
                <div className="text-sm font-medium text-neutral-dark">Fitness</div>
                <div className="text-xs text-neutral-muted mt-1">Based on your preferences</div>
              </div>
              <div className="p-3 rounded-xl bg-green-100 border border-green-200">
                <div className="text-sm font-medium text-neutral-dark">Nutrition</div>
                <div className="text-xs text-neutral-muted mt-1">Tailored to your budget and preferences</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Empty State */}
        <div className="text-center py-12 space-y-3">
          <p className="text-base text-neutral-text">
            Your personalized plan will appear here
          </p>
          <p className="text-sm text-neutral-muted">
            Complete the onboarding survey to get started
          </p>
        </div>
      </div>
    </div>
  );
}

