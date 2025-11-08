"use client";

import { useState } from "react";
import { Button, Card, CardContent } from "@halo/ui";
import { Camera } from "lucide-react";

// BlueWell Meal Logging - Big camera button, clean results, one primary CTA
export default function LogPage() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleCameraClick = () => {
    // Simulate photo capture and analysis
    setAnalyzing(true);
    setTimeout(() => {
      setPhoto("meal-photo.jpg");
      setResult({
        name: "grilled chicken salad",
        calories: 420,
        protein: 35,
        carbs: 25,
        fat: 15,
      });
      setAnalyzing(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-neutral-bg pb-24">
      <div className="mx-auto max-w-2xl space-y-8 p-6">
        {/* Header - Minimal */}
        <div className="pt-8 space-y-2">
          <h1 className="text-3xl font-semibold text-neutral-dark">log a meal</h1>
          <p className="text-base text-neutral-text">
            take a photo or describe what you ate
          </p>
        </div>

        {/* Big Camera Button - Primary Action */}
        {!photo && (
          <Card className="border-0 shadow-soft">
            <CardContent className="p-12">
              <button
                onClick={handleCameraClick}
                disabled={analyzing}
                className="w-full flex flex-col items-center justify-center space-y-4 py-8"
              >
                <div className="h-20 w-20 rounded-full bg-accent-light flex items-center justify-center">
                  <Camera className="h-10 w-10 text-white" />
                </div>
                <div className="space-y-2 text-center">
                  <p className="text-lg font-semibold text-neutral-dark">
                    {analyzing ? "analyzing..." : "take a photo"}
                  </p>
                  <p className="text-sm text-neutral-muted">
                    {analyzing ? "identifying your meal" : "or tap to upload"}
                  </p>
                </div>
              </button>
            </CardContent>
          </Card>
        )}

        {/* Clean Result Card - Simple macro breakdown */}
        {result && (
          <Card className="border-0 shadow-soft">
            <CardContent className="p-6 space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-neutral-dark">{result.name}</h2>
                <p className="text-sm text-neutral-muted">estimated nutrition</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-sm text-neutral-muted">calories</div>
                  <div className="text-2xl font-semibold text-neutral-dark">{result.calories}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-neutral-muted">protein</div>
                  <div className="text-2xl font-semibold text-neutral-dark">{result.protein}g</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-neutral-muted">carbs</div>
                  <div className="text-2xl font-semibold text-neutral-dark">{result.carbs}g</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-neutral-muted">fat</div>
                  <div className="text-2xl font-semibold text-neutral-dark">{result.fat}g</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Primary CTA - Add to day */}
        {result && (
          <div className="space-y-3">
            <Button onClick={() => console.log("Added to day")} size="lg" className="w-full">
              add to day
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setPhoto(null);
                setResult(null);
              }}
              size="lg"
              className="w-full"
            >
              take another photo
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
