import { Clock, Users, CalendarDays, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface WeeklyAvailability {
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
}

export interface ServiceAvailabilityState {
  weeklyAvailability: WeeklyAvailability;
  startTime: string;
  endTime: string;
  capacity: number;
}

export interface AvailabilityErrors {
  days?: string;
  startTime?: string;
  endTime?: string;
  time?: string;
  capacity?: string;
}

export const DEFAULT_WEEKLY_AVAILABILITY: WeeklyAvailability = {
  monday: true,
  tuesday: true,
  wednesday: true,
  thursday: true,
  friday: true,
  saturday: true,
  sunday: true,
};

export const DEFAULT_AVAILABILITY_STATE: ServiceAvailabilityState = {
  weeklyAvailability: DEFAULT_WEEKLY_AVAILABILITY,
  startTime: "09:00",
  endTime: "18:00",
  capacity: 10,
};

export const DAYS_OF_WEEK: { key: keyof WeeklyAvailability; label: string; short: string }[] = [
  { key: "monday", label: "Monday", short: "Mon" },
  { key: "tuesday", label: "Tuesday", short: "Tue" },
  { key: "wednesday", label: "Wednesday", short: "Wed" },
  { key: "thursday", label: "Thursday", short: "Thu" },
  { key: "friday", label: "Friday", short: "Fri" },
  { key: "saturday", label: "Saturday", short: "Sat" },
  { key: "sunday", label: "Sunday", short: "Sun" },
];

/** Parse 24hr or 12hr time format into minutes from midnight for validation */
export function parseTimeToMinutes(timeStr: string): number | null {
  if (!timeStr) return null;
  const str = timeStr.trim();
  
  // Check 12-hour format "09:00 AM" or "6:00 PM"
  const match12 = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const period = match12[3].toUpperCase();
    if (period === "PM" && hours < 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  // Check 24-hour format "09:00" or "18:00"
  const match24 = str.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    return hours * 60 + minutes;
  }

  return null;
}

/** Validate availability state */
export function validateAvailability(state: ServiceAvailabilityState): {
  isValid: boolean;
  errors: AvailabilityErrors;
} {
  const errors: AvailabilityErrors = {};

  // 1. At least one day selected
  const hasAtLeastOneDay = Object.values(state.weeklyAvailability).some(Boolean);
  if (!hasAtLeastOneDay) {
    errors.days = "At least one available day must be selected.";
  }

  // 2. Start time & End time required
  if (!state.startTime || !state.startTime.trim()) {
    errors.startTime = "Start time is required.";
  }
  if (!state.endTime || !state.endTime.trim()) {
    errors.endTime = "End time is required.";
  }

  // 3. End time must be strictly after start time
  if (state.startTime && state.endTime) {
    const startMins = parseTimeToMinutes(state.startTime);
    const endMins = parseTimeToMinutes(state.endTime);
    if (startMins === null) {
      errors.startTime = "Please provide a valid start time format (e.g. 09:00).";
    }
    if (endMins === null) {
      errors.endTime = "Please provide a valid end time format (e.g. 18:00).";
    }
    if (startMins !== null && endMins !== null && endMins <= startMins) {
      errors.time = "End time must be after start time.";
    }
  }

  // 4. Capacity validation
  const cap = Number(state.capacity);
  if (!state.capacity && state.capacity !== 0) {
    errors.capacity = "Capacity is required.";
  } else if (isNaN(cap) || cap <= 0 || !Number.isInteger(cap)) {
    errors.capacity = "Maximum capacity must be a positive integer (at least 1).";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export interface ProviderAvailabilitySectionProps {
  value: ServiceAvailabilityState;
  onChange: (value: ServiceAvailabilityState) => void;
  errors?: AvailabilityErrors;
  disabled?: boolean;
}

export function ProviderAvailabilitySection({
  value,
  onChange,
  errors = {},
  disabled = false,
}: ProviderAvailabilitySectionProps) {
  const handleToggleDay = (dayKey: keyof WeeklyAvailability) => {
    if (disabled) return;
    onChange({
      ...value,
      weeklyAvailability: {
        ...value.weeklyAvailability,
        [dayKey]: !value.weeklyAvailability[dayKey],
      },
    });
  };

  const handleStartTimeChange = (newStartTime: string) => {
    onChange({
      ...value,
      startTime: newStartTime,
    });
  };

  const handleEndTimeChange = (newEndTime: string) => {
    onChange({
      ...value,
      endTime: newEndTime,
    });
  };

  const handleCapacityChange = (newCapacityStr: string) => {
    const parsed = parseInt(newCapacityStr, 10);
    onChange({
      ...value,
      capacity: isNaN(parsed) ? (newCapacityStr === "" ? ("" as any) : 0) : parsed,
    });
  };

  return (
    <Card className="p-6 sm:p-7 rounded-3xl border-slate-200 bg-white space-y-6">
      {/* Header */}
      <div className="border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2 text-slate-900">
          <CalendarDays className="h-5 w-5 text-harvest-700 shrink-0" />
          <h3 className="text-base font-bold">Availability</h3>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Set when this service is normally available for booking.
        </p>
      </div>

      {/* 1. Weekly Availability */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Weekly Availability
          </label>
          <span className="text-[11px] text-slate-500">Select active operating days</span>
        </div>

        {errors.days && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errors.days}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {DAYS_OF_WEEK.map(({ key, label }) => {
            const isAvailable = Boolean(value.weeklyAvailability?.[key]);
            return (
              <div
                key={key}
                className={cn(
                  "flex items-center justify-between p-3 rounded-2xl border transition-all select-none",
                  isAvailable
                    ? "border-emerald-200 bg-emerald-50/50 shadow-xs"
                    : "border-slate-200 bg-slate-50/70"
                )}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full",
                      isAvailable ? "bg-emerald-500" : "bg-slate-300"
                    )}
                  />
                  <span
                    id={`label-${key}`}
                    className={cn(
                      "text-xs font-bold",
                      isAvailable ? "text-slate-900" : "text-slate-500"
                    )}
                  >
                    {label}
                  </span>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={isAvailable}
                  aria-labelledby={`label-${key}`}
                  disabled={disabled}
                  onClick={() => handleToggleDay(key)}
                  className={cn(
                    "px-3 py-1 rounded-xl text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed",
                    isAvailable
                      ? "bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 active:scale-95"
                      : "bg-slate-200 text-slate-600 hover:bg-slate-300 hover:text-slate-800"
                  )}
                >
                  {isAvailable ? "Available" : "Not Available"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Available Time & 3. Capacity Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100">
        {/* Available Time */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-slate-800">
            <Clock className="h-4 w-4 text-harvest-700 shrink-0" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Available Time
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Start Time"
              type="time"
              placeholder="09:00"
              required
              disabled={disabled}
              value={value.startTime}
              onChange={(e) => handleStartTimeChange(e.target.value)}
              error={errors.startTime}
            />
            <Input
              label="End Time"
              type="time"
              placeholder="18:00"
              required
              disabled={disabled}
              value={value.endTime}
              onChange={(e) => handleEndTimeChange(e.target.value)}
              error={errors.endTime}
            />
          </div>

          {errors.time && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-2 text-xs text-rose-700 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-600" />
              <span>{errors.time}</span>
            </div>
          )}

          <p className="text-[11px] text-slate-500">
            Standard daily operating hours for customer check-in, slots, or visits.
          </p>
        </div>

        {/* Capacity */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-slate-800">
            <Users className="h-4 w-4 text-harvest-700 shrink-0" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Capacity
            </h4>
          </div>

          <Input
            label="Maximum people per availability period"
            type="number"
            min={1}
            step={1}
            placeholder="10"
            required
            disabled={disabled}
            value={value.capacity ?? ""}
            onChange={(e) => handleCapacityChange(e.target.value)}
            error={errors.capacity}
          />

          <p className="text-[11px] text-slate-500">
            The maximum number of guests or participants allowed at one time.
          </p>
        </div>
      </div>
    </Card>
  );
}
