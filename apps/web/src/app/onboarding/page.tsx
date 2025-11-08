"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { QuestionCard, ProgressBar, Card, CardContent, Button } from "@halo/ui";
import { SurveyQuestion } from "@halo/types";

// BlueWell Onboarding Survey - Rev 3 (Improved Questions)
// Updated with modern, natural language and fitness goals

interface SurveyQuestionExtended extends SurveyQuestion {
  block?: string;
  helperText?: string;
  optional?: boolean;
  skipCondition?: (answers: Record<string, any>) => boolean;
  sliderLabels?: string[]; // For slider questions
}

const BLUEWELL_SURVEY: SurveyQuestionExtended[] = [
  // Section A — Your Daily Pattern
  {
    id: "1",
    type: "slider",
    text: "how consistent is your daily schedule?",
    min: 1,
    max: 5,
    block: "A",
    sliderLabels: ["very inconsistent", "somewhat inconsistent", "neutral", "mostly consistent", "very consistent"],
  },
  {
    id: "2",
    type: "select",
    text: "how much time do you realistically have for yourself most days?",
    options: ["less than 10 minutes", "10–20 min", "20–40 min", "40–60 min", "more than an hour"],
    block: "A",
  },
  {
    id: "3",
    type: "slider",
    text: "how regular are your meals on most days?",
    min: 1,
    max: 5,
    block: "A",
    sliderLabels: ["very irregular", "somewhat irregular", "neutral", "mostly regular", "very regular"],
  },
  {
    id: "4",
    type: "select",
    text: "how often are you physically active during the week?",
    options: ["rarely", "1–2 days per week", "3–4 days per week", "5–6 days per week", "daily"],
    block: "A",
  },
  {
    id: "5",
    type: "multi",
    text: "any dietary preferences?",
    options: ["Vegetarian", "Vegan", "Halal", "Kosher", "Dairy-free", "Gluten-free", "None", "Other"],
    block: "A",
    helperText: "select all that apply",
  },
  {
    id: "6",
    type: "text",
    text: "any foods to avoid?",
    block: "A",
    optional: true,
    helperText: "totally optional",
    skipCondition: (answers) => {
      const q5 = answers["5"];
      return Array.isArray(q5) && q5.includes("None");
    },
  },
  // Section B — Energy, Stress, Barriers
  {
    id: "7",
    type: "slider",
    text: "how would you describe your typical daily energy?",
    min: 1,
    max: 5,
    block: "B",
    sliderLabels: ["very low", "low", "moderate", "high", "very high"],
  },
  {
    id: "8",
    type: "multi",
    text: "what usually makes healthy routines difficult for you?",
    options: ["Limited time", "Low energy", "Stress", "Forgetting", "Motivation", "Cost", "Other"],
    block: "B",
    helperText: "select all that apply",
  },
  {
    id: "9",
    type: "slider",
    text: "how overwhelmed do you feel on a typical day?",
    min: 1,
    max: 5,
    block: "B",
    sliderLabels: ["not overwhelmed", "slightly", "moderately", "quite", "very overwhelmed"],
  },
  {
    id: "10",
    type: "select",
    text: "when do you usually find things most challenging?",
    options: ["morning", "afternoon", "evening", "late night", "it varies"],
    block: "B",
  },
  // Section C — Goals (Now includes Fitness Goals)
  {
    id: "11",
    type: "multi",
    text: "what are your current wellness priorities?",
    options: ["Eating better", "Improving energy", "Feeling less stressed", "Sleeping better", "Improving fitness", "Building consistent habits", "All of these"],
    block: "C",
    helperText: "select all that apply",
  },
  {
    id: "12",
    type: "select",
    text: "what is your fitness goal?",
    options: ["Lose fat / slim down", "Maintain current shape", "Gain muscle", "Improve overall fitness", "Improve athletic performance", "I'm not sure yet"],
    block: "C",
    // Required question - not optional
  },
  {
    id: "13",
    type: "select",
    text: "how structured do you want your plan to feel?",
    options: ["very light", "balanced", "structured & guided"],
    block: "C",
  },
  {
    id: "14",
    type: "select",
    text: "how often would you like suggestions or reminders?",
    options: ["only when helpful", "a few times a week", "daily", "no reminders"],
    block: "C",
  },
  {
    id: "15",
    type: "multi",
    text: "what areas would you like to track?",
    options: ["nutrition", "movement", "hydration", "sleep", "mood/stress", "productivity", "all"],
    block: "C",
    helperText: "select all that apply",
    skipCondition: (answers) => {
      const q14 = answers["14"];
      return q14 === "no reminders";
    },
  },
  // Section D — Personal Details (all optional)
  {
    id: "16",
    type: "height",
    text: "height",
    block: "D",
    optional: true,
    helperText: "share only what you're comfortable with",
  },
  {
    id: "17",
    type: "weight",
    text: "weight",
    block: "D",
    optional: true,
    helperText: "helps tailor portion suggestions. optional.",
  },
  {
    id: "18",
    type: "number",
    text: "age",
    min: 13,
    max: 120,
    block: "D",
    optional: true,
    helperText: "totally optional",
  },
  {
    id: "19",
    type: "select",
    text: "gender",
    options: ["woman", "man", "non-binary", "prefer not to say", "self-describe"],
    block: "D",
    optional: true,
    helperText: "totally optional",
  },
  {
    id: "20",
    type: "multi",
    text: "any cultural or lifestyle food considerations?",
    options: ["None", "Cultural traditions", "Religious observances", "Family preferences", "Other"],
    block: "D",
    optional: true,
    helperText: "select all that apply",
  },
  {
    id: "21",
    type: "text",
    text: "any foods or ingredients you avoid for personal or cultural reasons?",
    block: "D",
    optional: true,
    helperText: "totally optional",
    skipCondition: (answers) => {
      const q20 = answers["20"];
      return Array.isArray(q20) && q20.includes("None");
    },
  },
  {
    id: "22",
    type: "text",
    text: "anything else that would help us support your goals?",
    block: "D",
    optional: true,
    helperText: "totally optional",
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

  // Load saved answers and progress from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("bluewell-onboarding");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setAnswers(data.answers || {});
        setUnits(data.units || { heightUnit: "cm", weightUnit: "kg" });
        if (data.currentIndex) {
          setCurrentIndex(data.currentIndex);
        }
      } catch (e) {
        console.error("Failed to load saved progress", e);
      }
    }
  }, []);

  // Save progress to localStorage on change
  useEffect(() => {
    localStorage.setItem(
      "bluewell-onboarding",
      JSON.stringify({
        answers,
        units,
        currentIndex,
      })
    );
  }, [answers, units, currentIndex]);

  // Filter questions based on branching logic
  const visibleQuestions = useMemo(() => {
    return BLUEWELL_SURVEY.filter((q) => {
      if (q.skipCondition) {
        return !q.skipCondition(answers);
      }
      return true;
    });
  }, [answers]);

  // Check if we're entering Section D (Personal Details)
  const showBlockDIntro = useMemo(() => {
    if (visibleQuestions.length === 0) return false;
    const currentQ = visibleQuestions[currentIndex];
    const prevQ = currentIndex > 0 ? visibleQuestions[currentIndex - 1] : null;
    return currentQ?.block === "D" && prevQ?.block !== "D";
  }, [visibleQuestions, currentIndex]);

  const currentQuestion = visibleQuestions[currentIndex];
  const currentAnswer = answers[currentQuestion?.id];

  // Calculate progress
  const progress = currentIndex + 1;
  const total = visibleQuestions.length;

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

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.details || "Failed to save answer");
      }
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save answer";
      throw new Error(errorMessage);
    }
  };

  const handleNext = async (skip = false) => {
    setError(null);

    // If skipping, save null
    const valueToSave = skip ? null : currentAnswer;

    // Validate non-optional questions
    if (!skip && !currentQuestion.optional) {
      if (!valueToSave || (Array.isArray(valueToSave) && valueToSave.length === 0)) {
        return;
      }
    }

    try {
      if (valueToSave !== undefined) {
        await saveAnswer(currentQuestion.id, valueToSave);
      }

      if (currentIndex < visibleQuestions.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // Survey complete
        setIsComplete(true);
        // Clear saved progress
        localStorage.removeItem("bluewell-onboarding");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save answer");
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleChange = (value: any) => {
    setAnswers({ ...answers, [currentQuestion.id]: value });
    setError(null);
    // Auto-save on change
    if (value !== null && value !== undefined && value !== "") {
      saveAnswer(currentQuestion.id, value).catch(() => {
        // Silent fail for autosave
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
            <h1 className="text-3xl font-semibold text-neutral-dark">you're all set</h1>
            <p className="text-base text-neutral-text leading-relaxed">
              we've saved your preferences and we're ready to create your personalized wellness plan.
            </p>
            <div className="pt-4">
              <Button onClick={handleStartPlan} size="lg" className="w-full">
                start my plan
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-bg flex flex-col items-center justify-center p-6 pb-24">
      <div className="w-full max-w-2xl space-y-8">
        {/* Progress - Show "Q X of Y" */}
        <div className="pt-8">
          <ProgressBar current={progress} total={total} showLabel={true} />
        </div>

        {/* Block D Intro */}
        {showBlockDIntro && (
          <Card className="w-full max-w-2xl border-0 shadow-soft bg-accent-soft/30">
            <CardContent className="p-6">
              <p className="text-base text-neutral-text leading-relaxed">
                a few optional details can help tailor meal ideas and routines. share only what you're comfortable with.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Question Card */}
        <QuestionCard
          question={currentQuestion}
          value={currentAnswer}
          onChange={handleChange}
          onNext={() => handleNext(false)}
          onSkip={handleSkip}
          onBack={handleBack}
          canGoBack={currentIndex > 0}
          units={units}
          onUnitsChange={setUnits}
        />

        {/* Error State */}
        {error && (
          <div className="rounded-xl bg-neutral-surface border border-neutral-border p-4">
            <p className="text-sm text-neutral-text">{error}</p>
          </div>
        )}

        {/* Supportive counter */}
        <p className="text-center text-sm text-neutral-muted">
          Q {progress} of {total}
        </p>
      </div>
    </div>
  );
}
