import { LucideIcon, Brain, Search, CalendarCheck, Route, ShieldCheck } from "lucide-react";
import { GenerateTripPlanRequest } from "@/services/aiService";

/** A step in the visible agent progress checklist, tied to a real planner phase. */
export interface AgentStep {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Planner status values that mean this step is currently running. */
  statuses: string[];
}

export const AGENT_STEPS: AgentStep[] = [
  {
    key: "understand",
    label: "Understanding your preferences",
    icon: Brain,
    statuses: ["COLLECTING_REQUIREMENTS", "DRAFT"],
  },
  {
    key: "search",
    label: "Searching verified experiences",
    icon: Search,
    statuses: ["SEARCHING"],
  },
  {
    key: "availability",
    label: "Checking availability",
    icon: CalendarCheck,
    statuses: ["SEARCHING"],
  },
  {
    key: "build",
    label: "Building your itinerary",
    icon: Route,
    statuses: ["BUILDING_ITINERARY", "REFINING"],
  },
  {
    key: "validate",
    label: "Validating budget & timing",
    icon: ShieldCheck,
    statuses: ["VALIDATING"],
  },
];

/** Statuses that mean the planner has finished and produced a reviewable proposal. */
export const DONE_STATUSES = ["READY_FOR_REVIEW", "CONFIRMED", "HANDED_OFF"];

export interface QuickActionDef {
  key: string;
  label: string;
  /** REFINE uses the refine endpoint; REGENERATE mutates constraints and re-generates; PROMPT nudges the user. */
  kind: "REFINE_BUDGET" | "REGENERATE" | "PROMPT";
}

export const QUICK_ACTIONS: QuickActionDef[] = [
  { key: "cheaper", label: "Make it cheaper", kind: "REFINE_BUDGET" },
  { key: "remove-trekking", label: "Remove trekking", kind: "REGENERATE" },
  { key: "add-day", label: "Add one day", kind: "REGENERATE" },
  { key: "more-food", label: "Add more food", kind: "REGENERATE" },
];

/** Context passed from "My Trip → Modify with AI" so the planner can modify an existing trip. */
export interface ModifyTripContext {
  bookingId?: string;
  bookingCode?: string;
  serviceId?: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  guestCount?: number;
  totalAmount?: number;
  serviceTitle?: string;
}

export const KARNATAKA_DISTRICTS = [
  "Kodagu (Coorg)",
  "Chikkamagaluru",
  "Mysuru",
  "Udupi",
  "Shivamogga",
  "Hassan",
  "Uttara Kannada",
  "Dakshina Kannada",
  "Bengaluru Rural",
  "Belagavi",
  "Hampi (Ballari)",
  "Chikkaballapur",
];

/** Map a planner status to a human label + colour (reused across the planner UI). */
export function statusMeta(status?: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    DRAFT: { label: "Draft", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
    COLLECTING_REQUIREMENTS: { label: "Collecting info", color: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300" },
    SEARCHING: { label: "Searching", color: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300" },
    BUILDING_ITINERARY: { label: "Building itinerary", color: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300" },
    VALIDATING: { label: "Validating", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300" },
    REFINING: { label: "Refining", color: "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300" },
    READY_FOR_REVIEW: { label: "Ready for review", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" },
    CONFIRMED: { label: "Confirmed", color: "bg-emerald-600 text-white" },
    HANDED_OFF: { label: "Ready to book", color: "bg-teal-600 text-white" },
    FAILED: { label: "Failed", color: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300" },
  };
  return map[status || ""] || { label: status || "—", color: "bg-slate-100 text-slate-700" };
}

/** Merge partial constraints coming from a chat handoff into the working constraint set. */
export function mergeConstraints(
  base: GenerateTripPlanRequest,
  incoming?: Record<string, any>
): GenerateTripPlanRequest {
  if (!incoming) return base;
  const next: GenerateTripPlanRequest = { ...base };
  const destination = incoming.destination_district || incoming.district || incoming.destination;
  if (destination) next.destination_district = String(destination);
  if (incoming.duration_days) next.duration_days = Number(incoming.duration_days);
  if (incoming.party_size) next.party_size = Number(incoming.party_size);
  if (incoming.max_budget) next.max_budget = Number(incoming.max_budget);
  if (incoming.start_date) next.start_date = String(incoming.start_date);
  if (incoming.end_date) next.end_date = String(incoming.end_date);
  if (Array.isArray(incoming.preferred_categories)) next.preferred_categories = incoming.preferred_categories;
  if (Array.isArray(incoming.special_interests)) next.special_interests = incoming.special_interests;
  if (incoming.pace) next.pace = String(incoming.pace);
  if (incoming.notes) next.notes = String(incoming.notes);
  return next;
}
