import { GenerateTripPlanRequest } from "@/services/aiService";
import {
  TravelPreferences,
  TravelStyle,
  BudgetStyle,
  TripType,
  FoodPreference,
  WalkingPreference,
  TravelInterest,
} from "@/types";

export interface Option<T extends string> {
  value: T;
  label: string;
}

export const TRAVEL_STYLE_OPTIONS: Option<TravelStyle>[] = [
  { value: "relaxed", label: "Relaxed" },
  { value: "balanced", label: "Balanced" },
  { value: "adventure", label: "Adventure" },
];

export const BUDGET_STYLE_OPTIONS: Option<BudgetStyle>[] = [
  { value: "budget", label: "Budget" },
  { value: "balanced", label: "Balanced" },
  { value: "premium", label: "Premium" },
];

export const INTEREST_OPTIONS: Option<TravelInterest>[] = [
  { value: "nature", label: "Nature" },
  { value: "food", label: "Food" },
  { value: "culture", label: "Culture" },
  { value: "adventure", label: "Adventure" },
  { value: "wellness", label: "Wellness" },
  { value: "shopping", label: "Shopping" },
  { value: "photography", label: "Photography" },
];

export const TRIP_TYPE_OPTIONS: Option<TripType>[] = [
  { value: "family", label: "Family" },
  { value: "couple", label: "Couple" },
  { value: "friends", label: "Friends" },
  { value: "solo", label: "Solo" },
  { value: "business", label: "Business" },
];

export const FOOD_OPTIONS: Option<FoodPreference>[] = [
  { value: "no_preference", label: "No Preference" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "non_vegetarian", label: "Non-Vegetarian" },
];

export const WALKING_OPTIONS: Option<WalkingPreference>[] = [
  { value: "normal", label: "Normal" },
  { value: "low_walking", label: "Low Walking" },
  { value: "accessibility_friendly", label: "Accessibility Friendly" },
];

/** Sensible defaults for the AI toggles when a user has never saved preferences. */
export const DEFAULT_AI_PREFS: Pick<
  TravelPreferences,
  "ai_use_preferences" | "ai_consider_previous_trips" | "ai_ask_before_changes"
> = {
  ai_use_preferences: true,
  ai_consider_previous_trips: true,
  ai_ask_before_changes: true,
};

function labelOf<T extends string>(opts: Option<T>[], value?: T): string | undefined {
  return opts.find((o) => o.value === value)?.label;
}

/** True when the user has set any *content* preference (AI toggles excluded). */
export function hasAnyPreferences(p?: TravelPreferences | null): boolean {
  if (!p) return false;
  return Boolean(
    p.travel_style ||
      p.budget_style ||
      p.trip_type ||
      (p.food_preference && p.food_preference !== "no_preference") ||
      (p.walking_preference && p.walking_preference !== "normal") ||
      (p.interests && p.interests.length > 0)
  );
}

/** Compact chips for the "Using your travel preferences" indicator. */
export function summarizePreferences(
  p?: TravelPreferences | null,
  maxInterests = 3
): string[] {
  if (!p) return [];
  const bits: string[] = [];
  const style = labelOf(TRAVEL_STYLE_OPTIONS, p.travel_style);
  if (style) bits.push(style);
  (p.interests || []).slice(0, maxInterests).forEach((i) => {
    const l = labelOf(INTEREST_OPTIONS, i);
    if (l) bits.push(l);
  });
  const trip = labelOf(TRIP_TYPE_OPTIONS, p.trip_type);
  if (trip) bits.push(trip);
  const budget = labelOf(BUDGET_STYLE_OPTIONS, p.budget_style);
  if (budget) bits.push(budget);
  return bits;
}

const STYLE_TO_PACE: Record<TravelStyle, "RELAXED" | "MODERATE" | "INTENSE"> = {
  relaxed: "RELAXED",
  balanced: "MODERATE",
  adventure: "INTENSE",
};

/**
 * Map saved preferences to a partial trip-plan request. Only preference-derived
 * fields are set (never destination/dates/party/budget), so this can be merged
 * UNDER explicit trip/conversation values without clobbering them.
 */
export function preferencesToConstraints(
  p?: TravelPreferences | null
): GenerateTripPlanRequest {
  const out: GenerateTripPlanRequest = {};
  if (!p) return out;

  if (p.travel_style) out.pace = STYLE_TO_PACE[p.travel_style];

  if (p.interests && p.interests.length) {
    out.preferred_categories = [...p.interests];
    out.special_interests = [...p.interests];
  }

  const notes: string[] = [];
  const trip = labelOf(TRIP_TYPE_OPTIONS, p.trip_type);
  if (trip) notes.push(`Trip type: ${trip}.`);
  const budget = labelOf(BUDGET_STYLE_OPTIONS, p.budget_style);
  if (budget) notes.push(`Budget style: ${budget}.`);
  if (p.food_preference && p.food_preference !== "no_preference") {
    notes.push(`Food preference: ${labelOf(FOOD_OPTIONS, p.food_preference)}.`);
  }
  if (p.walking_preference === "low_walking") {
    notes.push("Prefers minimal walking between activities.");
  } else if (p.walking_preference === "accessibility_friendly") {
    notes.push("Needs accessibility-friendly, low-mobility options.");
  }
  if (notes.length) out.notes = notes.join(" ");

  return out;
}
