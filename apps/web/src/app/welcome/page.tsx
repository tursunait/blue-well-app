"use client";

import { Button } from "@halo/ui";
import { useRouter } from "next/navigation";
import Image from "next/image";

// BlueWell Welcome - Personalized, warm, inviting
export default function WelcomePage() {
  const router = useRouter();

  const handleStart = () => {
    router.push("/onboarding");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-bg p-6">
      <div className="w-full max-w-md space-y-12 text-center">
        {/* Logo Headline */}
        <div className="flex justify-center">
          <Image
            src="/img/logo_headline.png"
            alt="BlueWell"
            width={240}
            height={80}
            className="object-contain"
            priority
          />
        </div>

        {/* Circular Illustration */}
        <div className="flex justify-center">
          <div className="relative w-48 h-48 rounded-full bg-gradient-to-br from-bluewell-light/20 to-accent-soft/30 flex items-center justify-center overflow-hidden">
            <Image
              src="/img/welcome.png"
              alt="Welcome illustration"
              width={192}
              height={192}
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Greeting and Message */}
        <div className="space-y-3">
          <h2 className="text-4xl font-semibold text-neutral-dark leading-tight">
            Let's personalize your wellness plan.
          </h2>
        </div>

        {/* CTA Button */}
        <div className="pt-4">
          <Button
            onClick={handleStart}
            size="xl"
            className="w-full rounded-full bg-gradient-to-r from-bluewell-light to-bluewell-royal text-white hover:from-bluewell-royal hover:to-bluewell-navy shadow-md hover:shadow-lg transition-all duration-200 border-0"
          >
            Start Your Journey
          </Button>
        </div>
      </div>
    </div>
  );
}
