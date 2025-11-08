"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { QuestionCard, CircularProgress, Card, CardContent, Button } from "@halo/ui";
import { SurveyQuestion } from "@halo/types";

// BlueWell Onboarding Survey - Ultra-Short Flow (8 questions)

interface SurveyQuestionExtended extends SurveyQuestion {
  helperText?: string;
  optional?: boolean;
  sliderLabels?: string[]; // For slider questions
  maxSelections?: number; // For multi-select questions
}

const BLUEWELL_SURVEY: SurveyQuestionExtended[] = [
  // 1. Personal details - Start with basic info
  {
    id: "1",
    type: "compound",
    text: "Tell us about yourself",
    optional: false, // Question is required, but individual fields are optional
    helperText: "We'll use this to personalize your wellness plan. Fill in whatever you're comfortable sharing.",
  },
  // 2. Primary wellness goal - Understand their motivation first
  {
    id: "2",
    type: "multi",
    text: "What is your primary wellness goal?",
    options: ["Lose weight", "Build muscle", "Improve endurance", "Maintain current shape", "Reduce stress", "Improve overall fitness", "Not sure yet"],
    helperText: "This helps us personalize your plan.",
    // Required - not optional
  },
  // 3. Current activity level - Know where they're starting from
  {
    id: "3",
    type: "select",
    text: "How active are you in a typical week?",
    options: ["Rarely", "1–2 days", "3–4 days", "5+ days"],
    helperText: "By 'active' we mean any physical activity that gets your heart rate up—like walking, running, workouts, sports, or even taking the stairs. Starting where you are is perfect.",
  },
  // 4. Fitness preferences - What activities they enjoy
  {
    id: "4",
    type: "fitness-preferences",
    text: "Fitness Preferences",
    helperText: "Tell us about your workout preferences.",
    optional: true,
  },
  // 5. Schedule consistency - Understand their routine
  {
    id: "5",
    type: "slider",
    text: "How consistent is your daily schedule?",
    min: 1,
    max: 5,
    sliderLabels: ["Very inconsistent", "Somewhat inconsistent", "Neutral", "Mostly consistent", "Very consistent"],
    helperText: "This helps us suggest activities that fit your routine.",
  },
  // 6. Available personal time - How much time they have
  {
    id: "6",
    type: "select",
    text: "How much time do you realistically have for yourself each day?",
    options: ["<10 min", "10–20 min", "20–40 min", "40+ min"],
    helperText: "We'll tailor suggestions to fit your schedule.",
  },
  // 7. Meal regularity - Eating patterns
  {
    id: "7",
    type: "slider",
    text: "How regular are your meals on most days?",
    min: 1,
    max: 5,
    sliderLabels: ["Very irregular", "Somewhat irregular", "Neutral", "Mostly regular", "Very regular"],
    helperText: "No judgment—we're just getting to know your patterns.",
  },
  // 8. Monthly grocery/eat out budget - Meal planning budget
  {
    id: "8",
    type: "slider",
    text: "Monthly Grocery / Eat Out Budget",
    min: 1,
    max: 4,
    sliderLabels: ["$50", "$100","$150","$200", "$300+"],
    helperText: "This helps us suggest meal plans that fit your budget.",
    optional: true,
  },
  // 9. Barriers - What gets in the way
  {
    id: "9",
    type: "multi",
    text: "What tends to make staying healthy difficult for you?",
    options: ["Time", "Energy", "Stress", "Motivation", "Forgetting", "Cost", "Other"],
    maxSelections: 3,
    helperText: "Select up to 3. We'll help you work around these.",
  },
  // 10. Support preference - How we can help (end with action)
  {
    id: "10",
    type: "multi",
    text: "How would you like BlueWell to support you?",
    options: ["Meal ideas", "Fitness routine", "Stress balance", "Daily structure / planning", "Gentle reminders", "I want help with everything"],
    helperText: "Select all that apply.",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [units, setUnits] = useState<{ heightUnit: "cm" | "ft_in"; weightUnit: "kg" | "lb" }>({
    heightUnit: "cm",
    weightUnit: "kg",
  });
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Ensure component is mounted before rendering
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load saved answers and progress from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("bluewell-onboarding");
      if (saved) {
        try {
          const data = JSON.parse(saved);
          setAnswers(data.answers || {});
          setUnits(data.units || { heightUnit: "cm", weightUnit: "kg" });
        if (data.currentIndex !== undefined) {
          // Ensure the saved index is valid
          const savedIndex = Math.max(0, Math.min(data.currentIndex, BLUEWELL_SURVEY.length - 1));
          setCurrentIndex(savedIndex);
        }
        } catch (e) {
          console.error("Failed to load saved progress", e);
        }
      }
    }
  }, []);

  // Save progress to localStorage on change
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "bluewell-onboarding",
        JSON.stringify({
          answers,
          units,
          currentIndex,
        })
      );
    }
  }, [answers, units, currentIndex]);

  // Ensure currentIndex is valid - fix if out of bounds
  useEffect(() => {
    if (currentIndex < 0 || currentIndex >= BLUEWELL_SURVEY.length) {
      setCurrentIndex(0);
    }
  }, [currentIndex]);

  // Calculate valid index and current question - memoize to avoid recalculation
  const validIndex = useMemo(() => Math.max(0, Math.min(currentIndex, BLUEWELL_SURVEY.length - 1)), [currentIndex]);
  const currentQuestion = useMemo(() => BLUEWELL_SURVEY[validIndex], [validIndex]);
  const currentAnswer = useMemo(() => currentQuestion ? answers[currentQuestion.id] : undefined, [currentQuestion, answers]);

  // Auto-initialize slider questions with default value
  useEffect(() => {
    if (currentQuestion && currentQuestion.type === "slider") {
      setAnswers((prev) => {
        if (!prev[currentQuestion.id]) {
          const defaultValue = currentQuestion.min || 1;
          return { ...prev, [currentQuestion.id]: defaultValue };
        }
        return prev;
      });
    }
    // Auto-initialize fitness-preferences with default weekly target
    if (currentQuestion && currentQuestion.type === "fitness-preferences") {
      setAnswers((prev) => {
        if (!prev[currentQuestion.id]) {
          return { ...prev, [currentQuestion.id]: { weeklyTarget: 4 } };
        }
        return prev;
      });
    }
  }, [currentQuestion]);

  // Calculate progress
  const progress = validIndex + 1;
  const total = BLUEWELL_SURVEY.length;

  const saveAnswer = async (questionId: string, value: any) => {
    try {
      const response = await fetch("/api/survey/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surveyId: "onboarding",
          questionId,
          answerJson: value,
        }),
      });

      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response from API:", text.substring(0, 200));
        throw new Error("API returned non-JSON response");
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.details || "Failed to save answer");
      }
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save answer";
      console.error("Error saving answer:", err);
      // Don't throw - just log the error for autosave
      return null;
    }
  };

  const handleNext = async (skip = false) => {
    setError(null);

    // If skipping, save null
    const valueToSave = skip ? null : currentAnswer;

    // Validate non-optional questions
    if (!skip && !currentQuestion.optional) {
      if (!valueToSave || 
          (Array.isArray(valueToSave) && valueToSave.length === 0) ||
          (currentQuestion.type === "compound" && (!valueToSave || typeof valueToSave !== "object" || Object.keys(valueToSave).length === 0 || !Object.values(valueToSave).some((v: any) => v !== null && v !== undefined && v !== ""))) ||
          (currentQuestion.type === "fitness-preferences" && (!valueToSave || typeof valueToSave !== "object" || (!valueToSave.weeklyTarget && (!valueToSave.preferredTimes || valueToSave.preferredTimes.length === 0) && (!valueToSave.sportsClasses || valueToSave.sportsClasses.length === 0))))) {
        return;
      }
    }

    try {
      if (valueToSave !== undefined) {
        const saveResult = await saveAnswer(currentQuestion.id, valueToSave);
        // If save failed but we got here, continue anyway (answer is in localStorage)
        if (saveResult === null) {
          console.warn("Save to API failed, but continuing with local storage");
        }
      }

      if (validIndex < BLUEWELL_SURVEY.length - 1) {
        setCurrentIndex(validIndex + 1);
      } else {
        // Survey complete
        setIsComplete(true);
        // Clear saved progress
        if (typeof window !== "undefined") {
          localStorage.removeItem("bluewell-onboarding");
        }
      }
    } catch (err) {
      // Only show error if it's a validation error, not an API error
      if (err instanceof Error && !err.message.includes("API")) {
        setError(err.message);
      }
    }
  };

  const handleBack = () => {
    if (validIndex > 0) {
      setCurrentIndex(validIndex - 1);
    }
  };

  const handleChange = (value: any) => {
    setAnswers({ ...answers, [currentQuestion.id]: value });
    setError(null);
    // Auto-save on change (silently fail if API is unavailable)
    if (value !== null && value !== undefined && value !== "") {
      saveAnswer(currentQuestion.id, value).catch((err) => {
        // Silent fail for autosave - just log to console
        console.warn("Autosave failed:", err);
      });
    }
  };

  const handleSkip = () => {
    handleNext(true);
  };

  const handleStartPlan = () => {
    router.push("/home");
  };

  // End screen
  if (isComplete) {
    return (
      <div className="min-h-screen bg-neutral-bg flex flex-col items-center justify-center p-6">
        <Card className="w-full max-w-2xl border-0 shadow-soft">
          <CardContent className="p-8 space-y-6 text-center">
            <h1 className="text-3xl font-semibold text-neutral-dark">You're all set.</h1>
            <p className="text-base text-neutral-text leading-relaxed">
              We'll tailor simple steps that fit your schedule.
            </p>
            <div className="pt-4">
              <Button 
                onClick={handleStartPlan} 
                size="lg" 
                className="w-full rounded-full bg-gradient-to-r from-bluewell-light to-bluewell-royal text-white hover:from-bluewell-royal hover:to-bluewell-navy shadow-md hover:shadow-lg transition-all duration-200 border-0"
              >
                Start my plan
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading state until mounted
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-neutral-bg flex flex-col items-center justify-center p-6">
        <div className="text-neutral-text">Loading...</div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-neutral-bg flex flex-col items-center justify-center p-6">
        <div className="text-neutral-text">No question found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-bg flex flex-col items-center justify-center p-6 pb-24">
      <div className="w-full max-w-lg space-y-6">
        {/* Circular Progress Indicator */}
        <div className="pt-6">
          <CircularProgress current={progress} total={total} />
        </div>

        {/* Question Card */}
        <QuestionCard
          question={currentQuestion}
          value={currentAnswer}
          onChange={handleChange}
          onNext={() => handleNext(false)}
          onSkip={handleSkip}
          onBack={handleBack}
          canGoBack={validIndex > 0}
          units={units}
          onUnitsChange={setUnits}
        />

        {/* Error State */}
        {error && (
          <div className="rounded-xl bg-neutral-surface border border-neutral-border p-4">
            <p className="text-sm text-neutral-text">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
