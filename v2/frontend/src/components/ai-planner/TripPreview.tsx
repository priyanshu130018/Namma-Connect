import { useEffect, useState } from "react";
import {
  MapPin,
  Users,
  CalendarDays,
  Wallet,
  ShieldCheck,
  Clock,
  Trash2,
  Sparkles,
  RefreshCw,
  BookmarkCheck,
  Ticket,
  AlertTriangle,
  CheckCircle2,
  Route,
  Share2,
  ChevronDown,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import {
  TripPlanResponse,
  BookingHandoffResponse,
} from "@/services/aiService";
import { statusMeta, DONE_STATUSES } from "./plannerShared";

export interface TripPreviewProps {
  plan: TripPlanResponse | null;
  isWorking: boolean;
  handoff: BookingHandoffResponse | null;
  confirming: boolean;
  booking: boolean;
  /** True while any refine/remove request is in flight — disables controls. */
  busy?: boolean;
  onRegenerate: () => void;
  onRemoveItem: (dayNumber: number, itemId: string) => void;
  onSave: () => void;
  onShare: () => void;
  onBook: () => void;
}

const TIME_SLOT_LABEL: Record<string, string> = {
  MORNING: "Morning",
  AFTERNOON: "Afternoon",
  EVENING: "Evening",
};

/** Shown before the first itinerary exists. */
function EmptyPreview({ isWorking }: { isWorking: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100 dark:bg-emerald-950/60">
        <Route className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
          {isWorking ? "Crafting your itinerary…" : "Your itinerary will appear here"}
        </h3>
        <p className="mx-auto max-w-xs text-xs text-slate-500 dark:text-slate-400">
          {isWorking
            ? "Namma AI is searching verified experiences and building a day-by-day plan."
            : "Tell the planner where you'd like to go, for how long, and your budget — I'll build a verified, bookable plan."}
        </p>
      </div>
    </div>
  );
}

/** Action bar at the bottom of the preview (Regenerate / Save / Share / Book). */
function TripActions({
  plan,
  handoff,
  confirming,
  booking,
  busy,
  onRegenerate,
  onSave,
  onShare,
  onBook,
}: {
  plan: TripPlanResponse;
  handoff: BookingHandoffResponse | null;
  confirming: boolean;
  booking: boolean;
  busy?: boolean;
  onRegenerate: () => void;
  onSave: () => void;
  onShare: () => void;
  onBook: () => void;
}) {
  const totalItems =
    plan.proposal?.days.reduce((n, d) => n + d.items.length, 0) ?? 0;
  const isReady = DONE_STATUSES.includes(plan.status);
  const isConfirmed = plan.status === "CONFIRMED" || plan.status === "HANDED_OFF";
  const blocked = confirming || booking || busy;
  // Guard: never let a user book an incomplete / not-yet-ready plan.
  const incompleteReason =
    totalItems === 0
      ? "Add at least one activity before continuing to booking."
      : !isReady
      ? "Complete your itinerary before continuing to booking."
      : null;
  const canBook = !incompleteReason && !blocked;

  return (
    <div className="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
      {incompleteReason && (
        <p className="flex items-center gap-1.5 px-3 pt-2.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
          <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {incompleteReason}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 p-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRegenerate}
          disabled={blocked}
          aria-label="Regenerate itinerary"
          className="gap-1.5 rounded-xl border-slate-200 dark:border-slate-700 text-xs font-bold"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Regenerate
        </Button>

        {!isConfirmed && (
          <Button
            type="button"
            size="sm"
            onClick={onSave}
            disabled={!isReady || blocked}
            className="gap-1.5 rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
          >
            <BookmarkCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {confirming ? "Saving…" : "Save trip"}
          </Button>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onShare}
          disabled={confirming || booking}
          className="gap-1.5 rounded-xl border-slate-200 dark:border-slate-700 text-xs font-bold"
        >
          <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
          Share
        </Button>

        <Button
          type="button"
          size="sm"
          onClick={onBook}
          disabled={!canBook}
          title={incompleteReason ?? undefined}
          className="ml-auto gap-1.5 rounded-xl bg-teal-700 text-xs font-bold text-white hover:bg-teal-800"
        >
          <Ticket className="h-3.5 w-3.5" aria-hidden="true" />
          {booking ? "Preparing…" : handoff ? "Continue to checkout" : "Continue to Booking"}
        </Button>
      </div>
    </div>
  );
}

export function TripPreview(props: TripPreviewProps) {
  const {
    plan,
    isWorking,
    handoff,
    confirming,
    booking,
    busy,
    onRegenerate,
    onRemoveItem,
    onSave,
    onShare,
    onBook,
  } = props;

  const proposal = plan?.proposal;
  const days = proposal?.days ?? [];
  const manyDays = days.length > 3;

  // Collapsible days: with a long itinerary, keep only Day 1 open by default.
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  useEffect(() => {
    setExpanded(
      new Set(days.filter((_, i) => !manyDays || i === 0).map((d) => d.day_number))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan?.plan_id, days.length, manyDays]);

  const toggleDay = (n: number) =>
    setExpanded((prev) => {
      const s = new Set(prev);
      if (s.has(n)) s.delete(n);
      else s.add(n);
      return s;
    });

  if (!plan || !proposal) {
    return (
      <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900">
        <EmptyPreview isWorking={isWorking} />
      </div>
    );
  }

  const { constraints } = plan;
  const meta = statusMeta(plan.status);
  const title = constraints.destination_district
    ? `${constraints.destination_district} Getaway`
    : "Your Karnataka Trip";
  const dateLabel =
    constraints.start_date && constraints.end_date
      ? `${constraints.start_date} → ${constraints.end_date}`
      : `${proposal.total_days} day${proposal.total_days > 1 ? "s" : ""}`;
  const partySize = constraints.party_size || 2;
  const summaryLine = `${proposal.total_days} Day${
    proposal.total_days > 1 ? "s" : ""
  } · ${partySize} Traveller${partySize > 1 ? "s" : ""}`;
  const report = plan.validation_report;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900">
      {/* Header summary */}
      <div className="space-y-3 border-b border-slate-100 dark:border-slate-800 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              {title}
            </h2>
            <p className="flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate">
                {constraints.destination_district || "Karnataka"} · {summaryLine}
              </span>
            </p>
          </div>
          <span
            className={cn("shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold", meta.color)}
          >
            {meta.label}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2 text-center">
            <CalendarDays className="mx-auto mb-0.5 h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
            <p className="truncate text-[11px] font-bold text-slate-900 dark:text-slate-100">{dateLabel}</p>
          </div>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2 text-center">
            <Users className="mx-auto mb-0.5 h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
            <p className="text-[11px] font-bold text-slate-900 dark:text-slate-100">
              {partySize} traveller{partySize > 1 ? "s" : ""}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2 text-center">
            <Wallet className="mx-auto mb-0.5 h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
            <p className="text-[11px] font-black text-emerald-700 dark:text-emerald-400">
              {formatCurrency(proposal.estimated_total_cost)}
            </p>
            <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">estimated</p>
          </div>
        </div>
      </div>

      {/* Scrollable itinerary */}
      <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/60 dark:bg-slate-950/40 p-4">
        {report && !report.is_valid && report.issues.length > 0 && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 p-2.5">
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5" />
              A few things to review
            </p>
            <ul className="mt-1 list-disc pl-5 text-[11px] text-amber-700 dark:text-amber-400">
              {report.issues.slice(0, 4).map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          </div>
        )}

        {report && report.is_valid && (
          <div className="flex items-center gap-1.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Budget &amp; timing validated{typeof report.score === "number" ? ` • score ${Math.round(report.score)}` : ""}
          </div>
        )}

        {proposal.days.map((day) => {
          const isOpen = expanded.has(day.day_number);
          return (
            <div
              key={day.day_number}
              className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800"
            >
              <button
                type="button"
                onClick={() => toggleDay(day.day_number)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 px-3 py-2 text-left transition-colors hover:bg-slate-100/80 dark:hover:bg-slate-700/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-[11px] font-black text-white">
                    D{day.day_number}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-900 dark:text-slate-100">
                      {day.theme || `Day ${day.day_number}`}
                    </p>
                    {day.date && <p className="text-[10px] text-slate-400">{day.date}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    {formatCurrency(day.estimated_day_cost)}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-slate-400 transition-transform",
                      isOpen && "rotate-180"
                    )}
                    aria-hidden="true"
                  />
                </div>
              </button>

              {isOpen && (
                <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {day.items.map((item) => (
                    <div key={item.item_id} className="flex items-start gap-2.5 p-3">
                      <span className="mt-0.5 shrink-0 rounded-md bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-700 dark:text-emerald-300">
                        {TIME_SLOT_LABEL[item.time_slot] || item.time_slot}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1 text-xs font-bold text-slate-900 dark:text-slate-100">
                          <span className="truncate">{item.title}</span>
                          {item.is_verified && (
                            <ShieldCheck
                              className="h-3 w-3 shrink-0 text-emerald-600"
                              aria-label="Verified experience"
                            />
                          )}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                          {(item.start_time || item.end_time) && (
                            <span className="inline-flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" aria-hidden="true" />
                              {item.start_time}
                              {item.end_time ? `–${item.end_time}` : ""}
                            </span>
                          )}
                          {item.provider_name && <span className="truncate">{item.provider_name}</span>}
                          <span className="capitalize">{item.category}</span>
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-400">
                          {formatCurrency(item.price)}
                        </span>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(day.day_number, item.item_id)}
                          disabled={confirming || booking || busy}
                          title="Remove from itinerary"
                          aria-label={`Remove ${item.title} from itinerary`}
                          className="rounded-md p-1 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:opacity-40"
                        >
                          <Trash2 className="h-3 w-3" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {day.items.length === 0 && (
                    <p className="p-3 text-[11px] italic text-slate-400">
                      No activities planned for this day.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {proposal.notes && (
          <p className="flex items-start gap-1.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 p-2.5 text-[11px] text-slate-600 dark:text-slate-300">
            <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
            {proposal.notes}
          </p>
        )}
      </div>

      <TripActions
        plan={plan}
        handoff={handoff}
        confirming={confirming}
        booking={booking}
        busy={busy}
        onRegenerate={onRegenerate}
        onSave={onSave}
        onShare={onShare}
        onBook={onBook}
      />
    </div>
  );
}
