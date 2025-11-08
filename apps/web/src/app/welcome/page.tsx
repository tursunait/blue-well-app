"use client";

import { Button } from "@halo/ui";
import { useRouter } from "next/navigation";

// BlueWell Welcome - Calm, minimal, one clear action
export default function WelcomePage() {
  const router = useRouter();

  const handleStart = () => {
    router.push("/onboarding");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-bg p-6">
      <div className="w-full max-w-md space-y-12 text-center">
        <div className="space-y-6">
          <h1 className="text-5xl font-semibold text-neutral-dark leading-tight">
            bluewell
          </h1>
          <p className="text-lg text-neutral-text leading-relaxed max-w-sm mx-auto">
            wellness made simple for busy lives
          </p>
        </div>
        <div className="space-y-4">
          <Button
            onClick={handleStart}
            size="xl"
            variant="primary"
            className="w-full"
          >
            get started
          </Button>
          <p className="text-sm text-neutral-muted">
            takes less than 2 minutes
          </p>
        </div>
      </div>
    </div>
  );
}
