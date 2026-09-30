import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { TravelPreferences } from "@/types";
import {
  Option,
  TRAVEL_STYLE_OPTIONS,
  BUDGET_STYLE_OPTIONS,
  INTEREST_OPTIONS,
  TRIP_TYPE_OPTIONS,
  FOOD_OPTIONS,
  WALKING_OPTIONS,
  DEFAULT_AI_PREFS,
} from "./travelPreferences";

export interface TravelPreferencesFormProps {
  value: TravelPreferences;
  onChange: (next: TravelPreferences) => void;
  /** Show the "Namma AI" toggle block. Default true. */
  showAiOptions?: boolean;
  disabled?: boolean;
  /** Prefix so label ids stay unique when two forms render on one page. */
  idPrefix?: string;
}

function Chip({
  selected,
  onClick,
  disabled,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
        selected
          ? "border-emerald-500 bg-emerald-600 text-white shadow-sm"
          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-emerald-400 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30"
      )}
    >
      {selected && <Check className="h-3 w-3 shrink-0" aria-hidden="true" />}
      <span>{children}</span>
    </button>
  );
}

function Field({
  label,
  labelId,
  children,
}: {
  label: string;
  labelId: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <span id={labelId} className="block text-xs font-bold text-slate-700 dark:text-slate-300">
        {label}
      </span>
      <div role="group" aria-labelledby={labelId} className="flex flex-wrap gap-1.5">
        {children}
      </div>
    </div>
  );
}

export function TravelPreferencesForm({
  value,
  onChange,
  showAiOptions = true,
  disabled = false,
  idPrefix = "tp",
}: TravelPreferencesFormProps) {
  const set = (patch: Partial<TravelPreferences>) => onChange({ ...value, ...patch });

  // Single-select: clicking the active chip again clears it.
  const single = <K extends keyof TravelPreferences>(key: K, v: TravelPreferences[K]) =>
    set({ [key]: value[key] === v ? undefined : v } as Partial<TravelPreferences>);

  const toggleInterest = (v: (typeof INTEREST_OPTIONS)[number]["value"]) => {
    const current = value.interests || [];
    const next = current.includes(v)
      ? current.filter((x) => x !== v)
      : [...current, v];
    set({ interests: next });
  };

  const singleField = <T extends string>(
    label: string,
    key: keyof TravelPreferences,
    opts: Option<T>[]
  ) => (
    <Field label={label} labelId={`${idPrefix}-${String(key)}`}>
      {opts.map((o) => (
        <Chip
          key={o.value}
          selected={value[key] === o.value}
          disabled={disabled}
          onClick={() => single(key, o.value as TravelPreferences[typeof key])}
        >
          {o.label}
        </Chip>
      ))}
    </Field>
  );

  const ai = { ...DEFAULT_AI_PREFS, ...value };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {singleField("Travel Style", "travel_style", TRAVEL_STYLE_OPTIONS)}
        {singleField("Budget Style", "budget_style", BUDGET_STYLE_OPTIONS)}
      </div>

      <Field label="Interests" labelId={`${idPrefix}-interests`}>
        {INTEREST_OPTIONS.map((o) => (
          <Chip
            key={o.value}
            selected={(value.interests || []).includes(o.value)}
            disabled={disabled}
            onClick={() => toggleInterest(o.value)}
          >
            {o.label}
          </Chip>
        ))}
      </Field>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {singleField("Trip Type", "trip_type", TRIP_TYPE_OPTIONS)}
        {singleField("Food Preference", "food_preference", FOOD_OPTIONS)}
      </div>

      {singleField("Pace / Accessibility", "walking_preference", WALKING_OPTIONS)}

      {showAiOptions && (
        <div className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Namma AI
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              How the trip planner should use your preferences.
            </p>
          </div>
          <Switch
            id={`${idPrefix}-ai-use`}
            checked={ai.ai_use_preferences !== false}
            disabled={disabled}
            onCheckedChange={(c) => set({ ai_use_preferences: c })}
            label="Use my travel preferences when planning"
          />
          <Switch
            id={`${idPrefix}-ai-prev`}
            checked={ai.ai_consider_previous_trips !== false}
            disabled={disabled}
            onCheckedChange={(c) => set({ ai_consider_previous_trips: c })}
            label="Consider my previous trips"
          />
          <Switch
            id={`${idPrefix}-ai-ask`}
            checked={ai.ai_ask_before_changes !== false}
            disabled={disabled}
            onCheckedChange={(c) => set({ ai_ask_before_changes: c })}
            label="Ask before changing my itinerary"
          />
        </div>
      )}
    </div>
  );
}
