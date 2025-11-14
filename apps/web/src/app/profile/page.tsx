"use client";

import Image from "next/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, Button } from "@halo/ui";

// BlueWell Profile - Friendly, supportive layout, soft toggles, big sections
export default function ProfilePage() {
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const response = await fetch("/api/profile");
      if (!response.ok) throw new Error("Failed to fetch profile");
      return response.json();
    },
  });

  const { data: integration } = useQuery({
    queryKey: ["integration"],
    queryFn: async () => {
      const response = await fetch("/api/integration");
      if (!response.ok) throw new Error("Failed to fetch integration");
      return response.json();
    },
  });

  const toggleGCal = useMutation({
    mutationFn: async (connected: boolean) => {
      const response = await fetch("/api/integration", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gcalConnected: connected }),
      });
      if (!response.ok) throw new Error("Failed to update integration");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integration"] });
    },
  });

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
            <h1 className="text-3xl font-semibold text-neutral-dark">profile</h1>
          </div>
          <p className="text-base text-neutral-text text-center">
            manage your settings and preferences
          </p>
        </div>

        {/* Account Section - Big, clear */}
        <Card className="border-0 shadow-soft">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-neutral-dark">account</h2>
            {profile && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="text-sm text-neutral-muted">email</div>
                  <div className="text-base text-neutral-dark">{profile.email || "not set"}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-neutral-muted">name</div>
                  <div className="text-base text-neutral-dark">{profile.name || "not set"}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Goals & Preferences - Soft, supportive */}
        <Card className="border-0 shadow-soft">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-neutral-dark">goals & preferences</h2>
            {profile && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="text-sm text-neutral-muted">primary goal</div>
                  <div className="text-base text-neutral-dark">
                    {profile.primaryGoal || "not set"}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-neutral-muted">weekly workouts</div>
                  <div className="text-base text-neutral-dark">
                    {profile.weeklyWorkouts || 0} per week
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Integrations - Soft toggles */}
        <Card className="border-0 shadow-soft">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-neutral-dark">integrations</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-base text-neutral-dark">google calendar</div>
                  <div className="text-sm text-neutral-muted">
                    sync your schedule
                  </div>
                </div>
                <button
                  onClick={() => toggleGCal.mutate(!integration?.gcalConnected)}
                  className={`relative h-7 w-12 rounded-full transition-colors ${
                    integration?.gcalConnected
                      ? "bg-accent-light"
                      : "bg-neutral-border"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-transform ${
                      integration?.gcalConnected ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
