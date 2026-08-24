import { Clock, Check, Users } from "lucide-react";
import { TimeSlot } from "@/types";

export interface TimeSlotSelectorProps {
  slots: TimeSlot[];
  selectedSlotId?: string;
  onSelectSlot: (slot: TimeSlot) => void;
  isLoading?: boolean;
}

export function TimeSlotSelector({
  slots,
  selectedSlotId,
  onSelectSlot,
  isLoading = false,
}: TimeSlotSelectorProps) {
  if (slots.length === 0) {
    return (
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
        No time slots required or available for this date.
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
          Select Experience Time Slot
        </label>
        <span className="text-[10px] text-slate-400">Authoritative real-time slots</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {slots.map((slot) => {
          const isSelected = selectedSlotId === slot.id;
          const isUnavailable = !slot.is_available || slot.remaining_capacity <= 0;
          const isLimited = slot.remaining_capacity > 0 && slot.remaining_capacity <= 5;

          let cardStyle = "border-slate-200 bg-white hover:border-harvest-600 hover:bg-harvest-50/40 cursor-pointer";

          if (isUnavailable) {
            cardStyle = "border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed";
          } else if (isSelected) {
            cardStyle = "border-harvest-600 bg-harvest-50/70 text-harvest-950 font-bold shadow-sm ring-2 ring-harvest-600/30";
          }

          return (
            <button
              key={slot.id}
              type="button"
              disabled={isUnavailable || isLoading}
              onClick={() => onSelectSlot(slot)}
              className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all ${cardStyle}`}
            >
              <div className="flex items-center gap-2.5">
                <Clock className={`h-4 w-4 shrink-0 ${isSelected ? "text-harvest-700" : "text-slate-400"}`} />
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    {slot.start_time} – {slot.end_time}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                    <Users className="h-3 w-3 text-slate-400" />
                    <span>
                      {isUnavailable
                        ? "Full capacity"
                        : isLimited
                        ? `${slot.remaining_capacity} spots remaining`
                        : "Available"}
                    </span>
                  </div>
                </div>
              </div>

              {isSelected && (
                <div className="h-5 w-5 rounded-full bg-harvest-600 text-white flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
