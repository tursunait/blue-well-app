import { z } from "zod";

// Survey schemas
export const SurveyQuestion = z.object({
  id: z.string(),
  type: z.enum(["text", "number", "select", "multi", "slider", "height", "weight"]),
  text: z.string(),
  options: z.array(z.string()).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  next: z.record(z.string()).optional(), // branching logic
});

export const Survey = z.object({
  id: z.string(),
  title: z.string(),
  questions: z.array(SurveyQuestion),
});

export const SurveyAnswer = z.object({
  questionId: z.string(),
  answerJson: z.any(),
});

// Chat schemas
export const Suggestion = z.object({
  id: z.string(),
  kind: z.enum(["class", "workout", "meal"]),
  title: z.string(),
  desc: z.string().optional(),
  cta: z.string(),
  payload: z.record(z.any()).optional(),
});

export const ChatMessage = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  suggestions: z.array(Suggestion).optional(),
  timestamp: z.string(),
});

export const ChatRequest = z.object({
  message: z.string(),
  context: z.record(z.any()).optional(),
});

export const ChatResponse = z.object({
  type: z.enum(["message", "suggestions"]),
  message: z.string().optional(),
  suggestions: z.array(Suggestion).optional(),
});

// Recommendation card
export const RecommendationCard = z.object({
  id: z.string(),
  kind: z.enum(["class", "workout", "meal"]),
  title: z.string(),
  description: z.string().optional(),
  time: z.string().optional(),
  location: z.string().optional(),
  cta: z.string(),
  metadata: z.record(z.any()).optional(),
});

// Planner event
export const PlannerEvent = z.object({
  id: z.string(),
  type: z.enum(["workout", "meal", "class", "personal"]),
  title: z.string(),
  start: z.string(), // ISO datetime
  end: z.string(), // ISO datetime
  location: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// Meal logging
export const MealItem = z.object({
  name: z.string(),
  kcal: z.number(),
  protein: z.number(),
  fat: z.number(),
  carbs: z.number(),
  confidence: z.number().optional(),
});

export const MealEstimate = z.object({
  items: z.array(MealItem),
  totals: z.object({
    kcal: z.number(),
    protein: z.number(),
    fat: z.number(),
    carbs: z.number(),
  }),
});

// Class slot
export const ClassSlot = z.object({
  id: z.string(),
  title: z.string(),
  start: z.string(), // ISO datetime
  end: z.string(), // ISO datetime
  location: z.string().optional(),
  spotsOpen: z.number().optional(),
  provider: z.string(),
});

// Calendar event
export const CalendarEvent = z.object({
  title: z.string(),
  startISO: z.string(),
  endISO: z.string(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

// Type exports
export type SurveyQuestion = z.infer<typeof SurveyQuestion>;
export type Survey = z.infer<typeof Survey>;
export type SurveyAnswer = z.infer<typeof SurveyAnswer>;
export type Suggestion = z.infer<typeof Suggestion>;
export type ChatMessage = z.infer<typeof ChatMessage>;
export type ChatRequest = z.infer<typeof ChatRequest>;
export type ChatResponse = z.infer<typeof ChatResponse>;
export type RecommendationCard = z.infer<typeof RecommendationCard>;
export type PlannerEvent = z.infer<typeof PlannerEvent>;
export type MealItem = z.infer<typeof MealItem>;
export type MealEstimate = z.infer<typeof MealEstimate>;
export type ClassSlot = z.infer<typeof ClassSlot>;
export type CalendarEvent = z.infer<typeof CalendarEvent>;

