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
    maxSelections?: number;
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

  // Compound question state - for managing field index in compound questions
  const compoundValue = question.type === "compound" ? (value || {}) : {};
  
  // Helper function to calculate field index based on compound value
  const calculateFieldIndex = React.useCallback(() => {
    if (question.type === "compound") {
      // Find first empty field or start at 0
      // Logical order: Age -> Gender -> Food preferences -> Foods to avoid (optional) -> Height -> Weight
      const fields = ["age", "gender", "foodPreferences", "foodsToAvoid", "height", "weight"];
      const cv = value || {};
      const firstEmpty = fields.findIndex((field) => {
        if (field === "age") return !cv.age || cv.age < 13;
        if (field === "gender") return !cv.gender;
        if (field === "foodPreferences") return !cv.foodPreferences || cv.foodPreferences.length === 0;
        // foodsToAvoid is optional - skip it if empty
        if (field === "foodsToAvoid") return false; // Always skip this field in auto-navigation
        if (field === "height") return !cv.heightCm || cv.heightCm < 50;
        if (field === "weight") return !cv.weightKg || cv.weightKg < 1;
        return true;
      });
      return firstEmpty >= 0 ? firstEmpty : 0;
    }
    return 0;
  }, [question.type, value]);

  // Initialize to 0
  const [currentFieldIndex, setCurrentFieldIndex] = React.useState(0);
  
  // Track previous question ID to detect question changes
  const prevQuestionIdRef = React.useRef<string | undefined>(undefined);

  // Reset currentFieldIndex only when question changes (not when value changes)
  // This prevents auto-advance when user is typing in the current field
  React.useEffect(() => {
    // On mount or when question changes, calculate the initial field index
    if (prevQuestionIdRef.current !== question.id) {
      const newIndex = calculateFieldIndex();
      setCurrentFieldIndex(newIndex);
      prevQuestionIdRef.current = question.id;
    }
  }, [question.type, question.id, calculateFieldIndex]);

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
            {otherOptions.map((opt) => {
              const isSelected = value === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleChange(opt)}
                  className={cn(
                    "w-full h-14 rounded-full border-2 text-left px-5 text-base font-medium transition-all duration-200",
                    isSelected
                      ? "border-bluewell-light bg-bluewell-light text-white shadow-sm"
                      : "border-neutral-border bg-neutral-white text-neutral-dark hover:border-bluewell-light hover:bg-neutral-bg"
                  )}
                >
                  {opt}
                </button>
              );
            })}
            {hasOther && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => handleChange("Other")}
                  className={cn(
                    "w-full h-14 rounded-full border-2 text-left px-5 text-base font-medium transition-all duration-200",
                    showOtherInput
                      ? "border-bluewell-light bg-bluewell-light text-white shadow-sm"
                      : "border-neutral-border bg-neutral-white text-neutral-dark hover:border-bluewell-light hover:bg-neutral-bg"
                  )}
                >
                  Other
                </button>
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
            )}
          </div>
        );
      case "multi":
        const hasOtherMulti = question.options?.includes("Other");
        const otherMultiOptions = question.options?.filter((opt) => opt !== "Other") || [];
        const currentArray = Array.isArray(value) ? value : [];
        const selectedOthers = currentArray.filter((v: any) => typeof v === "string" && !otherMultiOptions.includes(v));
        const maxSelections = question.maxSelections;
        const isAtMax = maxSelections ? currentArray.length >= maxSelections : false;

        return (
          <div className="space-y-3">
            {maxSelections && (
              <p className="text-sm text-neutral-muted">
                Select up to {maxSelections} {maxSelections === 1 ? "option" : "options"}
              </p>
            )}
            {otherMultiOptions.map((opt) => {
              const isSelected = currentArray.includes(opt);
              const isDisabled = !isSelected && isAtMax;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      handleChange(currentArray.filter((v: any) => v !== opt));
                    } else if (!isAtMax) {
                      handleChange([...currentArray, opt]);
                    }
                  }}
                  disabled={isDisabled}
                  className={cn(
                    "w-full h-14 rounded-full border-2 text-left px-5 text-base font-medium transition-all duration-200",
                    isSelected
                      ? "border-bluewell-light bg-bluewell-light text-white shadow-sm"
                      : isDisabled
                      ? "border-neutral-border bg-neutral-surface text-neutral-muted cursor-not-allowed opacity-50"
                      : "border-neutral-border bg-neutral-white text-neutral-dark hover:border-bluewell-light hover:bg-neutral-bg"
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
                    "w-full h-14 rounded-full border-2 text-left px-5 text-base font-medium transition-all duration-200",
                    selectedOthers.length > 0
                      ? "border-bluewell-light bg-bluewell-light text-white shadow-sm"
                      : "border-neutral-border bg-neutral-white text-neutral-dark hover:border-bluewell-light hover:bg-neutral-bg"
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
      case "compound":
        // Compound form - fields appear one by one dynamically
        // Note: compoundValue and currentFieldIndex are defined at component top level

        // Compute display values from stored canonical values
        const compoundHeightCm = compoundValue.heightCm || 0;
        const compoundHeightFeetInches = compoundHeightCm ? cmToFeetInches(compoundHeightCm) : { feet: 0, inches: 0 };
        const compoundWeightDisplay = compoundValue.weightKg 
          ? (isWeightMetric ? compoundValue.weightKg.toString() : kgToLbs(compoundValue.weightKg).toFixed(1))
          : "";

        const handleCompoundChange = (field: string, fieldValue: any) => {
          const newValue = { ...compoundValue, [field]: fieldValue };
          onChange?.(newValue);
        };

        const handleCompoundHeightMetricChange = (newCm: number) => {
          handleCompoundChange("heightCm", newCm);
        };

        const handleCompoundHeightImperialChange = (newFeet: number, newInches: number) => {
          const newCm = feetInchesToCm(newFeet, newInches);
          handleCompoundChange("heightCm", newCm);
        };

        const handleCompoundWeightChange = (inputValue: string) => {
          const numValue = Number(inputValue);
          if (!isNaN(numValue) && numValue > 0) {
            const canonicalValue = isWeightMetric ? numValue : lbsToKg(numValue);
            handleCompoundChange("weightKg", canonicalValue);
          } else {
            handleCompoundChange("weightKg", null);
          }
        };

        const handleNextField = () => {
          if (currentFieldIndex < 5) {
            setCurrentFieldIndex(currentFieldIndex + 1);
          }
        };
        
        // Update max index check - we now have 6 fields (0-5)

        const handleBackField = () => {
          if (currentFieldIndex > 0) {
            setCurrentFieldIndex(currentFieldIndex - 1);
          }
        };

        const handleSkipField = () => {
          // If we're on the last field (weight, index 5), proceed to next question
          if (currentFieldIndex === 5) {
            onNext?.();
          } else {
            handleNextField();
          }
        };

        const foodPrefsOptions = ["Vegetarian", "Vegan", "Halal", "Kosher", "Dairy-free", "Gluten-free", "None", "Other"];
        const foodPrefsValue = Array.isArray(compoundValue.foodPreferences) ? compoundValue.foodPreferences : [];
        const hasFoodPrefsOther = foodPrefsValue.some((v: any) => typeof v === "string" && !foodPrefsOptions.includes(v));
        const foodPrefsOtherValue = foodPrefsValue.find((v: any) => typeof v === "string" && !foodPrefsOptions.includes(v)) || "";

        // Render current field based on index
        const renderCurrentField = () => {
          switch (currentFieldIndex) {
            case 0: // Age
              return (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-neutral-dark">Age</label>
                  <input
                    type="number"
                    value={compoundValue.age || ""}
                    onChange={(e) => handleCompoundChange("age", e.target.value ? Number(e.target.value) : null)}
                    min={13}
                    max={120}
                    className="w-full h-14 rounded-xl border-2 border-neutral-border bg-neutral-white px-5 text-base focus:border-accent-light focus:outline-none focus:ring-2 focus:ring-accent-light/20 transition-colors"
                    placeholder="enter age"
                    autoFocus
                  />
                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="ghost"
                      onClick={handleSkipField}
                      size="lg"
                      className="flex-1 rounded-full border border-neutral-border"
                    >
                      Skip
                    </Button>
                    <Button
                      onClick={handleNextField}
                      disabled={!compoundValue.age || compoundValue.age < 13}
                      size="lg"
                      className="flex-1 rounded-full bg-gradient-to-r from-bluewell-light to-bluewell-royal text-white hover:from-bluewell-royal hover:to-bluewell-navy shadow-md hover:shadow-lg transition-all duration-200 border-0"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              );
            case 1: // Gender
              return (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-neutral-dark">Gender</label>
                  <div className="space-y-2">
                    {["Woman", "Man", "Non-binary", "Prefer not to say", "Self-describe"].map((opt) => {
                      const isSelected = compoundValue.gender === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            handleCompoundChange("gender", opt);
                            // Auto-advance after selection
                            setTimeout(() => handleNextField(), 300);
                          }}
                          className={cn(
                            "w-full h-14 rounded-full border-2 text-left px-5 text-base font-medium transition-all duration-200",
                            isSelected
                              ? "border-bluewell-light bg-bluewell-light text-white shadow-sm"
                              : "border-neutral-border bg-neutral-white text-neutral-dark hover:border-bluewell-light hover:bg-neutral-bg"
                          )}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="ghost"
                      onClick={handleBackField}
                      size="lg"
                      className="flex-1 rounded-full border border-neutral-border"
                    >
                      Back
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleSkipField}
                      size="lg"
                      className="flex-1 rounded-full border border-neutral-border"
                    >
                      Skip
                    </Button>
                  </div>
                </div>
              );
            case 2: // Food preferences
              return (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-neutral-dark">Food preferences</label>
                  <div className="space-y-2">
                    {foodPrefsOptions.filter(opt => opt !== "Other").map((opt) => {
                      const isSelected = foodPrefsValue.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            const newPrefs = isSelected
                              ? foodPrefsValue.filter((v: any) => v !== opt)
                              : [...foodPrefsValue, opt];
                            handleCompoundChange("foodPreferences", newPrefs);
                          }}
                          className={cn(
                            "w-full h-14 rounded-full border-2 text-left px-5 text-base font-medium transition-all duration-200",
                            isSelected
                              ? "border-bluewell-light bg-bluewell-light text-white shadow-sm"
                              : "border-neutral-border bg-neutral-white text-neutral-dark hover:border-bluewell-light hover:bg-neutral-bg"
                          )}
                        >
                          {opt}
                        </button>
                      );
                    })}
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (hasFoodPrefsOther) {
                            const newPrefs = foodPrefsValue.filter((v: any) => typeof v === "string" && foodPrefsOptions.includes(v));
                            handleCompoundChange("foodPreferences", newPrefs);
                          } else {
                            handleCompoundChange("foodPreferences", [...foodPrefsValue, "Other"]);
                          }
                        }}
                        className={cn(
                          "w-full h-14 rounded-full border-2 text-left px-5 text-base font-medium transition-all duration-200",
                          hasFoodPrefsOther
                            ? "border-bluewell-light bg-bluewell-light text-white shadow-sm"
                            : "border-neutral-border bg-neutral-white text-neutral-dark hover:border-bluewell-light hover:bg-neutral-bg"
                        )}
                      >
                        Other
                      </button>
                      {hasFoodPrefsOther && (
                        <input
                          type="text"
                          value={foodPrefsOtherValue}
                          onChange={(e) => {
                            const withoutOther = foodPrefsValue.filter((v: any) => typeof v === "string" && foodPrefsOptions.includes(v));
                            handleCompoundChange("foodPreferences", [...withoutOther, e.target.value]);
                          }}
                          className="w-full h-14 rounded-xl border-2 border-neutral-border bg-neutral-white px-5 text-base focus:border-accent-light focus:outline-none focus:ring-2 focus:ring-accent-light/20 transition-colors"
                          placeholder="please specify..."
                          autoFocus
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="ghost"
                      onClick={handleBackField}
                      size="lg"
                      className="flex-1 rounded-full border border-neutral-border"
                    >
                      Back
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleSkipField}
                      size="lg"
                      className="flex-1 rounded-full border border-neutral-border"
                    >
                      Skip
                    </Button>
                    <Button
                      onClick={handleNextField}
                      size="lg"
                      className="flex-1 rounded-full bg-gradient-to-r from-bluewell-light to-bluewell-royal text-white hover:from-bluewell-royal hover:to-bluewell-navy shadow-md hover:shadow-lg transition-all duration-200 border-0"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              );
            case 3: // Foods to avoid
              return (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-neutral-dark">
                    Foods to avoid <span className="text-neutral-muted font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={compoundValue.foodsToAvoid || ""}
                    onChange={(e) => handleCompoundChange("foodsToAvoid", e.target.value || null)}
                    className="w-full h-14 rounded-xl border-2 border-neutral-border bg-neutral-white px-5 text-base focus:border-accent-light focus:outline-none focus:ring-2 focus:ring-accent-light/20 transition-colors"
                    placeholder="type any foods to avoid..."
                    autoFocus
                  />
                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="ghost"
                      onClick={handleBackField}
                      size="lg"
                      className="flex-1 rounded-full border border-neutral-border"
                    >
                      Back
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleSkipField}
                      size="lg"
                      className="flex-1 rounded-full border border-neutral-border"
                    >
                      Skip
                    </Button>
                    <Button
                      onClick={handleNextField}
                      size="lg"
                      className="flex-1 rounded-full bg-gradient-to-r from-bluewell-light to-bluewell-royal text-white hover:from-bluewell-royal hover:to-bluewell-navy shadow-md hover:shadow-lg transition-all duration-200 border-0"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              );
            case 4: // Height
              return (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-neutral-dark">Height</label>
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
                      value={compoundHeightCm || ""}
                      onChange={(e) => handleCompoundHeightMetricChange(Number(e.target.value))}
                      min={50}
                      max={250}
                      className="w-full h-14 rounded-xl border-2 border-neutral-border bg-neutral-white px-5 text-base focus:border-accent-light focus:outline-none focus:ring-2 focus:ring-accent-light/20 transition-colors"
                      placeholder="enter height in cm"
                      autoFocus
                    />
                  ) : (
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-sm text-neutral-muted mb-2">feet</label>
                        <input
                          type="number"
                          value={compoundHeightFeetInches.feet || ""}
                          onChange={(e) => handleCompoundHeightImperialChange(Number(e.target.value), compoundHeightFeetInches.inches)}
                          min={0}
                          max={8}
                          className="w-full h-14 rounded-xl border-2 border-neutral-border bg-neutral-white px-5 text-base focus:border-accent-light focus:outline-none focus:ring-2 focus:ring-accent-light/20 transition-colors"
                          autoFocus
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm text-neutral-muted mb-2">inches</label>
                        <input
                          type="number"
                          value={compoundHeightFeetInches.inches || ""}
                          onChange={(e) => handleCompoundHeightImperialChange(compoundHeightFeetInches.feet, Number(e.target.value))}
                          min={0}
                          max={11}
                          className="w-full h-14 rounded-xl border-2 border-neutral-border bg-neutral-white px-5 text-base focus:border-accent-light focus:outline-none focus:ring-2 focus:ring-accent-light/20 transition-colors"
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="ghost"
                      onClick={handleBackField}
                      size="lg"
                      className="flex-1 rounded-full border border-neutral-border"
                    >
                      Back
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleSkipField}
                      size="lg"
                      className="flex-1 rounded-full border border-neutral-border"
                    >
                      Skip
                    </Button>
                    <Button
                      onClick={handleNextField}
                      disabled={!compoundHeightCm || compoundHeightCm < 50}
                      size="lg"
                      className="flex-1 rounded-full bg-gradient-to-r from-bluewell-light to-bluewell-royal text-white hover:from-bluewell-royal hover:to-bluewell-navy shadow-md hover:shadow-lg transition-all duration-200 border-0"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              );
            case 5: // Weight (last field)
              return (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-neutral-dark">
                    Weight
                    <span className="text-xs text-neutral-muted font-normal ml-2">Helps tailor portions.</span>
                  </label>
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
                    value={compoundWeightDisplay}
                    onChange={(e) => handleCompoundWeightChange(e.target.value)}
                    min={1}
                    max={500}
                    step="0.1"
                    className="w-full h-14 rounded-xl border-2 border-neutral-border bg-neutral-white px-5 text-base focus:border-accent-light focus:outline-none focus:ring-2 focus:ring-accent-light/20 transition-colors"
                    placeholder={`enter weight in ${units.weightUnit}`}
                    autoFocus
                  />
                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="ghost"
                      onClick={handleBackField}
                      size="lg"
                      className="flex-1 rounded-full border border-neutral-border"
                    >
                      Back
                    </Button>
                    {compoundValue.weightKg && compoundValue.weightKg >= 1 ? (
                      <Button
                        onClick={onNext}
                        size="lg"
                        className="flex-1 rounded-full bg-gradient-to-r from-bluewell-light to-bluewell-royal text-white hover:from-bluewell-royal hover:to-bluewell-navy shadow-md hover:shadow-lg transition-all duration-200 border-0"
                      >
                        Continue
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        onClick={handleSkipField}
                        size="lg"
                        className="flex-1 rounded-full border border-neutral-border"
                      >
                        Skip
                      </Button>
                    )}
                  </div>
                </div>
              );
            default:
              return null;
          }
        };

        return (
          <div className="space-y-6">
            {renderCurrentField()}
          </div>
        );
      case "fitness-preferences":
        // Fitness Preferences - Weekly workout target, preferred times, sports & classes
        const fitnessValue = value || {};
        
        const handleFitnessChange = (field: string, fieldValue: any) => {
          const newValue = { ...fitnessValue, [field]: fieldValue };
          onChange?.(newValue);
        };

        // Weekly workout target (slider: 1-7 days)
        const weeklyTarget = fitnessValue.weeklyTarget || 4;
        
        // Preferred times (multi-select)
        const preferredTimes = Array.isArray(fitnessValue.preferredTimes) ? fitnessValue.preferredTimes : [];
        const timeOptions = ["Morning", "Afternoon", "Evening"];
        
        // Sports & Classes (multi-select)
        const sportsClasses = Array.isArray(fitnessValue.sportsClasses) ? fitnessValue.sportsClasses : [];
        const sportsOptions = ["Yoga", "HIIT", "Running", "Swimming", "Cycling", "Pilates"];
        const sportsOtherOptions = sportsOptions.filter((opt) => opt !== "Other");
        const selectedSportsOthers = sportsClasses.filter((v: any) => typeof v === "string" && !sportsOptions.includes(v));

        return (
          <div className="space-y-8">
            {/* Weekly workout target */}
            <div className="space-y-4">
              <label className="text-base font-semibold text-neutral-dark">Weekly workout target</label>
              <div className="space-y-3">
                <div className="text-3xl font-bold text-neutral-dark">{weeklyTarget} days</div>
                <div className="relative">
                  <input
                    type="range"
                    min={1}
                    max={7}
                    value={weeklyTarget}
                    onChange={(e) => handleFitnessChange("weeklyTarget", Number(e.target.value))}
                    className="w-full h-2 bg-neutral-surface rounded-full appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, #6CA0DC 0%, #6CA0DC ${((weeklyTarget - 1) / 6) * 100}%, #DDE3EA ${((weeklyTarget - 1) / 6) * 100}%, #DDE3EA 100%)`,
                    }}
                  />
                </div>
                <div className="text-sm text-neutral-muted text-right">days per week</div>
              </div>
            </div>

            {/* Preferred times */}
            <div className="space-y-4">
              <label className="text-base font-semibold text-neutral-dark">Preferred times</label>
              <div className="flex gap-3">
                {timeOptions.map((time) => {
                  const isSelected = preferredTimes.includes(time);
                  return (
                    <button
                      key={time}
                      type="button"
                      onClick={() => {
                        const newTimes = isSelected
                          ? preferredTimes.filter((t: string) => t !== time)
                          : [...preferredTimes, time];
                        handleFitnessChange("preferredTimes", newTimes);
                      }}
                      className={cn(
                        "flex-1 h-12 rounded-full border-2 text-sm font-medium transition-all duration-200",
                        isSelected
                          ? "border-bluewell-light bg-gradient-to-r from-bluewell-light to-green-400 text-white shadow-sm"
                          : "border-neutral-border bg-neutral-white text-neutral-dark hover:border-bluewell-light"
                      )}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sports & Classes */}
            <div className="space-y-4">
              <label className="text-base font-semibold text-neutral-dark">Sports & Classes</label>
              <div className="grid grid-cols-2 gap-3">
                {sportsOtherOptions.map((sport) => {
                  const isSelected = sportsClasses.includes(sport);
                  return (
                    <button
                      key={sport}
                      type="button"
                      onClick={() => {
                        const newSports = isSelected
                          ? sportsClasses.filter((s: string) => s !== sport)
                          : [...sportsClasses, sport];
                        handleFitnessChange("sportsClasses", newSports);
                      }}
                      className={cn(
                        "h-12 rounded-full border-2 text-sm font-medium transition-all duration-200",
                        isSelected
                          ? "border-bluewell-light bg-gradient-to-r from-bluewell-light to-green-400 text-white shadow-sm"
                          : "border-neutral-border bg-neutral-white text-neutral-dark hover:border-bluewell-light"
                      )}
                    >
                      {sport}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    const hasOtherSelected = selectedSportsOthers.length > 0;
                    if (hasOtherSelected) {
                      handleFitnessChange("sportsClasses", sportsClasses.filter((s: string) => sportsOptions.includes(s)));
                    } else {
                      handleFitnessChange("sportsClasses", [...sportsClasses, "Other"]);
                    }
                  }}
                  className={cn(
                    "h-12 rounded-full border-2 text-sm font-medium transition-all duration-200",
                    selectedSportsOthers.length > 0
                      ? "border-bluewell-light bg-gradient-to-r from-bluewell-light to-green-400 text-white shadow-sm"
                      : "border-neutral-border bg-neutral-white text-neutral-dark hover:border-bluewell-light"
                  )}
                >
                  Other
                </button>
              </div>
              {selectedSportsOthers.length > 0 && (
                <input
                  type="text"
                  value={selectedSportsOthers[0] || ""}
                  onChange={(e) => {
                    const withoutOther = sportsClasses.filter((s: string) => sportsOptions.includes(s));
                    handleFitnessChange("sportsClasses", [...withoutOther, e.target.value]);
                  }}
                  className="w-full h-14 rounded-xl border-2 border-neutral-border bg-neutral-white px-5 text-base focus:border-accent-light focus:outline-none focus:ring-2 focus:ring-accent-light/20 transition-colors"
                  placeholder="please specify..."
                  autoFocus
                />
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const hasValue = value !== null && value !== undefined && (typeof value === "number" || value !== "");
  const hasArrayValue = Array.isArray(value) && value.length > 0;
  // For compound questions, check that at least one field has a meaningful value
  const hasCompoundValue = question.type === "compound" && value && typeof value === "object" && Object.keys(value).length > 0 && Object.entries(value).some(([key, v]: [string, any]) => {
    if (v === null || v === undefined || v === "") return false;
    // For heightCm, check it's a realistic height (at least 50cm)
    if (key === "heightCm" && typeof v === "number") return v >= 50;
    // For weightKg, check it's a realistic weight (at least 1kg)
    if (key === "weightKg" && typeof v === "number") return v >= 1;
    // For age, check it's a realistic age (at least 13)
    if (key === "age" && typeof v === "number") return v >= 13;
    // For numbers, check they're > 0 (not just default/empty)
    if (typeof v === "number") return v > 0;
    // For arrays, check they have items
    if (Array.isArray(v)) return v.length > 0;
    // For strings, check they're not just whitespace
    if (typeof v === "string") return v.trim().length > 0;
    return true;
  });
  const hasFitnessPreferences = question.type === "fitness-preferences" && value && typeof value === "object" && (
    value.weeklyTarget !== undefined ||
    (Array.isArray(value.preferredTimes) && value.preferredTimes.length > 0) ||
    (Array.isArray(value.sportsClasses) && value.sportsClasses.length > 0)
  );
  const isValid = hasValue || hasArrayValue || hasCompoundValue || hasFitnessPreferences;

  return (
    <Card className="w-full max-w-lg border-0 shadow-soft">
      <CardContent className="p-6 space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-neutral-dark leading-tight">
            {question.text}
          </h2>
          {question.helperText && (
            <p className="text-sm text-neutral-muted leading-relaxed">{question.helperText}</p>
          )}
        </div>
        <div className="space-y-4">{renderInput()}</div>
        <div className="flex flex-col gap-3 pt-6">
          <div className="flex justify-between gap-4">
            {canGoBack && (
              <Button 
                variant="ghost" 
                onClick={onBack} 
                size="lg" 
                className="flex-1 rounded-full"
              >
                Back
              </Button>
            )}
            {/* Hide Continue button for compound questions when on last field (weight, index 5) */}
            {!(question.type === "compound" && currentFieldIndex === 5) && (
              <Button
                onClick={onNext}
                disabled={!question.optional && !isValid}
                size="lg"
                className={cn(
                  "flex-1 rounded-full bg-gradient-to-r from-bluewell-light to-bluewell-royal text-white hover:from-bluewell-royal hover:to-bluewell-navy shadow-md hover:shadow-lg transition-all duration-200 border-0",
                  !canGoBack && "w-full"
                )}
              >
                {canGoBack ? "Next" : "Continue"}
              </Button>
            )}
          </div>
          {/* Skip for now - only show if question is optional */}
          {onSkip && question.optional && (
            <Button
              variant="minimal"
              onClick={onSkip}
              size="md"
              className="w-full rounded-full"
            >
              Skip for now
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
