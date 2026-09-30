import { useEffect, useState } from "react";
import { Check, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { AGENT_STEPS, DONE_STATUSES } from "./plannerShared";

export interface AgentProgressProps {
  /** True while a generate/refine request is in flight. */
  isWorking: boolean;
  /** Latest known planner status (from the API response). */
  status?: string;
  className?: string;
}

/**
 * Visual checklist of the real agent pipeline phases. While a request is in
 * flight we advance through the phases on a timer (the server runs the full
 * pipeline in one call); once the response lands we snap to the real outcome.
 */
export function AgentProgress({ isWorking, status, className }: AgentProgressProps) {
  const [simIndex, setSimIndex] = useState(0);
  const failed = status === "FAILED";
  const done = !isWorking && !!status && DONE_STATUSES.includes(status);

  useEffect(() => {
    if (!isWorking) {
      setSimIndex(0);
      return;
    }
    setSimIndex(0);
    const timer = setInterval(() => {
      setSimIndex((i) => (i < AGENT_STEPS.length - 1 ? i + 1 : i));
    }, 900);
    return () => clearInterval(timer);
  }, [isWorking]);

  return (
    <div
      className={cn(
        "rounded-2xl border border-emerald-200/70 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/30 p-3.5 space-y-2",
        className
      )}
    >
      <p
        role="status"
        aria-live="polite"
        className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300"
      >
        {failed ? "Planning stopped" : done ? "Itinerary ready" : "Namma AI is planning…"}
      </p>
      <div className="space-y-1.5">
        {AGENT_STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isComplete = done || (isWorking && idx < simIndex);
          const isActive = isWorking && idx === simIndex && !done;
          const isFailedHere = failed && idx === simIndex;

          return (
            <div key={step.key} className="flex items-center gap-2.5 text-xs">
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors",
                  isFailedHere
                    ? "bg-rose-500 text-white"
                    : isComplete
                    ? "bg-emerald-600 text-white"
                    : isActive
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
                    : "bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                )}
              >
                {isFailedHere ? (
                  <AlertTriangle className="h-3 w-3" />
                ) : isComplete ? (
                  <Check className="h-3 w-3" />
                ) : isActive ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Icon className="h-3 w-3" />
                )}
              </span>
              <span
                className={cn(
                  "font-semibold transition-colors",
                  isComplete
                    ? "text-slate-700 dark:text-slate-200"
                    : isActive
                    ? "text-emerald-800 dark:text-emerald-300"
                    : "text-slate-400 dark:text-slate-500"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
