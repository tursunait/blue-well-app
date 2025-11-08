import * as React from "react";
import { Card, CardContent } from "./card";
import { Button } from "./button";
import { SurveyQuestion } from "@halo/types";
import { cn } from "../lib/utils";

// BlueWell Question Card - Calm, one question at a time, big options, skip support
export interface QuestionCardProps {
  question: SurveyQuestion & {
    helperText?: string;
    optional?: boolean;
    sliderLabels?: string[];
  };
  value?: any;
  onChange?: (value: any) => void;
  onNext?: () => void;
  onSkip?: () => void;
  onBack?: () => void;
  canGoBack?: boolean;
  units?: { heightUnit: "cm" | "ft_in"; weightUnit: "kg" | "lb" };
  onUnitsChange?: (units: { heightUnit: "cm" | "ft_in"; weightUnit: "kg" | "lb" }) => void;
}

// Height conversion helpers
const cmToFeetInches = (cm: number): { feet: number; inches: number } => {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
};

const feetInchesToCm = (feet: number, inches: number): number => {
  return Math.round((feet * 12 + inches) * 2.54);
};

// Weight conversion helpers
const kgToLbs = (kg: number): number => {
  return Math.round(kg * 2.20462 * 10) / 10;
};

const lbsToKg = (lbs: number): number => {
  return Math.round(lbs / 2.20462 * 10) / 10;
};

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  value,
  onChange,
  onNext,
  onSkip,
  onBack,
  canGoBack = false,
  units = { heightUnit: "cm", weightUnit: "kg" },
  onUnitsChange,
}) => {
  const handleChange = (newValue: any) => {
    onChange?.(newValue);
  };

  // Height state - only used when question.type === "height"
  const [heightFeet, setHeightFeet] = React.useState<number>(0);
  const [heightInches, setHeightInches] = React.useState<number>(0);
  const [heightCm, setHeightCm] = React.useState<number>(0);

  // Weight state - only used when question.type === "weight"
  const [weightDisplayValue, setWeightDisplayValue] = React.useState<string>("");

  const isHeightMetric = units.heightUnit === "cm";
  const isWeightMetric = units.weightUnit === "kg";

  // Sync height state with value
  React.useEffect(() => {
    if (question.type === "height" && value) {
      if (isHeightMetric) {
        setHeightCm(value);
        const { feet, inches } = cmToFeetInches(value);
        setHeightFeet(feet);
        setHeightInches(inches);
      } else {
        const { feet, inches } = cmToFeetInches(value);
        setHeightFeet(feet);
        setHeightInches(inches);
        setHeightCm(value);
      }
    }
  }, [value, isHeightMetric, question.type]);

  // Sync weight state with value
  React.useEffect(() => {
    if (question.type === "weight") {
      if (value) {
        if (isWeightMetric) {
          setWeightDisplayValue(value.toString());
        } else {
          setWeightDisplayValue(kgToLbs(value).toString());
        }
      } else {
        setWeightDisplayValue("");
      }
    }
  }, [value, isWeightMetric, question.type]);

  // Height input handlers
  const handleHeightMetricChange = (newCm: number) => {
    setHeightCm(newCm);
    const { feet, inches } = cmToFeetInches(newCm);
    setHeightFeet(feet);
    setHeightInches(inches);
    handleChange(newCm);
  };

  const handleHeightImperialChange = (newFeet: number, newInches: number) => {
    setHeightFeet(newFeet);
    setHeightInches(newInches);
    const newCm = feetInchesToCm(newFeet, newInches);
    setHeightCm(newCm);
    handleChange(newCm);
  };

  // Weight input handler
  const handleWeightChange = (inputValue: string) => {
    setWeightDisplayValue(inputValue);
    const numValue = Number(inputValue);
    if (!isNaN(numValue) && numValue > 0) {
      const canonicalValue = isWeightMetric ? numValue : lbsToKg(numValue);
      handleChange(canonicalValue);
    } else {
      handleChange(null);
    }
  };

  const renderInput = () => {
    switch (question.type) {
      case "text":
        return (
          <input
            type="text"
            value={value || ""}
            onChange={(e) => handleChange(e.target.value)}
            className="w-full h-14 rounded-xl border-2 border-neutral-border bg-neutral-white px-5 text-base focus:border-accent-light focus:outline-none focus:ring-2 focus:ring-accent-light/20 transition-colors"
            placeholder="type your answer..."
          />
        );
      case "number":
        return (
          <input
            type="number"
            value={value || ""}
            onChange={(e) => handleChange(Number(e.target.value))}
            min={question.min}
            max={question.max}
            className="w-full h-14 rounded-xl border-2 border-neutral-border bg-neutral-white px-5 text-base focus:border-accent-light focus:outline-none focus:ring-2 focus:ring-accent-light/20 transition-colors"
            placeholder="enter a number"
          />
        );
      case "slider":
        const sliderValue = value || question.min || 1;
        const sliderLabels = question.sliderLabels || [];
        const min = question.min || 1;
        const max = question.max || 5;
        
        return (
          <div className="space-y-4">
            <div className="relative">
              <input
                type="range"
                min={min}
                max={max}
                value={sliderValue}
                onChange={(e) => handleChange(Number(e.target.value))}
                className="w-full h-2 bg-neutral-surface rounded-full appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #6CA0DC 0%, #6CA0DC ${((sliderValue - min) / (max - min)) * 100}%, #DDE3EA ${((sliderValue - min) / (max - min)) * 100}%, #DDE3EA 100%)`,
                }}
              />
            </div>
            {sliderLabels.length > 0 && (
              <div className="flex justify-between text-xs text-neutral-muted px-1">
                {sliderLabels.map((label, idx) => (
                  <span
                    key={idx}
                    className={cn(
                      "text-center flex-1",
                      idx === sliderValue - min && "text-bluewell-royal font-medium"
                    )}
                  >
                    {label}
                  </span>
                ))}
              </div>
            )}
            <div className="text-center pt-2">
              <span className="text-lg font-semibold text-bluewell-royal">
                {sliderValue}
              </span>
            </div>
          </div>
        );
      case "select":
        const hasOther = question.options?.includes("Other");
        const showOtherInput = hasOther && value === "Other";
        const otherOptions = question.options?.filter((opt) => opt !== "Other") || [];

        return (
          <div className="space-y-3">
            <select
              value={value && !showOtherInput ? value : ""}
              onChange={(e) => {
                if (e.target.value === "Other") {
                  handleChange("Other");
                } else {
                  handleChange(e.target.value);
                }
              }}
              className="w-full h-14 rounded-xl border-2 border-neutral-border bg-neutral-white px-5 text-base focus:border-accent-light focus:outline-none focus:ring-2 focus:ring-accent-light/20 transition-colors"
            >
              <option value="">choose an option...</option>
              {otherOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
              {hasOther && <option value="Other">Other</option>}
            </select>
            {showOtherInput && (
              <input
                type="text"
                value={typeof value === "string" && value !== "Other" ? value : ""}
                onChange={(e) => handleChange(e.target.value)}
                className="w-full h-14 rounded-xl border-2 border-neutral-border bg-neutral-white px-5 text-base focus:border-accent-light focus:outline-none focus:ring-2 focus:ring-accent-light/20 transition-colors"
                placeholder="please specify..."
              />
            )}
          </div>
        );
      case "multi":
        const hasOtherMulti = question.options?.includes("Other");
        const otherMultiOptions = question.options?.filter((opt) => opt !== "Other") || [];
        const currentArray = Array.isArray(value) ? value : [];
        const selectedOthers = currentArray.filter((v: any) => typeof v === "string" && !otherMultiOptions.includes(v));

        return (
          <div className="space-y-3">
            {otherMultiOptions.map((opt) => {
              const isSelected = currentArray.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      handleChange(currentArray.filter((v: any) => v !== opt));
                    } else {
                      handleChange([...currentArray, opt]);
                    }
                  }}
                  className={cn(
                    "w-full h-14 rounded-xl border-2 text-left px-5 text-base font-medium transition-all",
                    isSelected
                      ? "border-accent-light bg-accent-soft text-bluewell-royal"
                      : "border-neutral-border bg-neutral-white text-neutral-dark hover:border-neutral-muted"
                  )}
                >
                  {opt}
                </button>
              );
            })}
            {hasOtherMulti && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    const hasOtherSelected = selectedOthers.length > 0;
                    if (hasOtherSelected) {
                      handleChange(currentArray.filter((v: any) => typeof v === "string" && otherMultiOptions.includes(v)));
                    } else {
                      handleChange([...currentArray, "Other"]);
                    }
                  }}
                  className={cn(
                    "w-full h-14 rounded-xl border-2 text-left px-5 text-base font-medium transition-all",
                    selectedOthers.length > 0
                      ? "border-accent-light bg-accent-soft text-bluewell-royal"
                      : "border-neutral-border bg-neutral-white text-neutral-dark hover:border-neutral-muted"
                  )}
                >
                  Other
                </button>
                {selectedOthers.length > 0 && (
                  <input
                    type="text"
                    value={selectedOthers[0] || ""}
                    onChange={(e) => {
                      const withoutOther = currentArray.filter((v: any) => typeof v === "string" && otherMultiOptions.includes(v));
                      handleChange([...withoutOther, e.target.value]);
                    }}
                    className="w-full h-14 rounded-xl border-2 border-neutral-border bg-neutral-white px-5 text-base focus:border-accent-light focus:outline-none focus:ring-2 focus:ring-accent-light/20 transition-colors"
                    placeholder="please specify..."
                  />
                )}
              </div>
            )}
          </div>
        );
      case "height":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  onUnitsChange?.({ ...units, heightUnit: units.heightUnit === "cm" ? "ft_in" : "cm" });
                }}
                className="text-sm text-accent-light hover:text-bluewell-royal font-medium"
              >
                switch to {units.heightUnit === "cm" ? "ft+in" : "cm"}
              </button>
            </div>
            {isHeightMetric ? (
              <input
                type="number"
                value={heightCm || ""}
                onChange={(e) => handleHeightMetricChange(Number(e.target.value))}
                min={50}
                max={250}
                className="w-full h-14 rounded-xl border-2 border-neutral-border bg-neutral-white px-5 text-base focus:border-accent-light focus:outline-none focus:ring-2 focus:ring-accent-light/20 transition-colors"
                placeholder="enter height in cm"
              />
            ) : (
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm text-neutral-muted mb-2">feet</label>
                  <input
                    type="number"
                    value={heightFeet || ""}
                    onChange={(e) => handleHeightImperialChange(Number(e.target.value), heightInches)}
                    min={0}
                    max={8}
                    className="w-full h-14 rounded-xl border-2 border-neutral-border bg-neutral-white px-5 text-base focus:border-accent-light focus:outline-none focus:ring-2 focus:ring-accent-light/20 transition-colors"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm text-neutral-muted mb-2">inches</label>
                  <input
                    type="number"
                    value={heightInches || ""}
                    onChange={(e) => handleHeightImperialChange(heightFeet, Number(e.target.value))}
                    min={0}
                    max={11}
                    className="w-full h-14 rounded-xl border-2 border-neutral-border bg-neutral-white px-5 text-base focus:border-accent-light focus:outline-none focus:ring-2 focus:ring-accent-light/20 transition-colors"
                  />
                </div>
              </div>
            )}
          </div>
        );
      case "weight":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  onUnitsChange?.({ ...units, weightUnit: units.weightUnit === "kg" ? "lb" : "kg" });
                }}
                className="text-sm text-accent-light hover:text-bluewell-royal font-medium"
              >
                switch to {units.weightUnit === "kg" ? "lbs" : "kg"}
              </button>
            </div>
            <input
              type="number"
              value={weightDisplayValue}
              onChange={(e) => handleWeightChange(e.target.value)}
              min={1}
              max={500}
              step="0.1"
              className="w-full h-14 rounded-xl border-2 border-neutral-border bg-neutral-white px-5 text-base focus:border-accent-light focus:outline-none focus:ring-2 focus:ring-accent-light/20 transition-colors"
              placeholder={`enter weight in ${units.weightUnit}`}
            />
          </div>
        );
      default:
        return null;
    }
  };

  const hasValue = value !== null && value !== undefined && value !== "";
  const hasArrayValue = Array.isArray(value) && value.length > 0;
  const isValid = hasValue || hasArrayValue;

  return (
    <Card className="w-full max-w-2xl border-0 shadow-soft">
      <CardContent className="p-8 space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-neutral-dark leading-tight">
            {question.text}
          </h2>
          {question.helperText && (
            <p className="text-sm text-neutral-muted">{question.helperText}</p>
          )}
        </div>
        <div className="space-y-4">{renderInput()}</div>
        <div className="flex flex-col gap-3 pt-4">
          <div className="flex justify-between gap-4">
            {canGoBack && (
              <Button variant="ghost" onClick={onBack} size="lg" className="flex-1">
                back
              </Button>
            )}
            <Button
              onClick={onNext}
              disabled={!question.optional && !isValid}
              size="lg"
              className={cn("flex-1", !canGoBack && "w-full")}
            >
              {canGoBack ? "next" : "continue"}
            </Button>
          </div>
          {/* Skip for now - always visible */}
          {onSkip && (
            <Button
              variant="minimal"
              onClick={onSkip}
              size="md"
              className="w-full"
            >
              skip for now
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
