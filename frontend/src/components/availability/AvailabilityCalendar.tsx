import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DayAvailability } from "@/types";

export interface AvailabilityCalendarProps {
  days: DayAvailability[];
  bookingModel: "date_range" | "time_slot" | "single_date" | string;
  selectedDate?: string; // YYYY-MM-DD
  selectedEndDate?: string; // YYYY-MM-DD for date_range
  onSelectDate: (date: string) => void;
  onSelectDateRange?: (startDate: string, endDate: string) => void;
  isLoading?: boolean;
}

export function AvailabilityCalendar({
  days,
  bookingModel,
  selectedDate,
  selectedEndDate,
  onSelectDate,
  onSelectDateRange,
  isLoading = false,
}: AvailabilityCalendarProps) {
  // Calendar current display month
  const today = new Date();
  const [currentMonthDate, setCurrentMonthDate] = useState(() => {
    if (selectedDate) {
      const parsed = new Date(selectedDate);
      if (!isNaN(parsed.getTime())) return new Date(parsed.getFullYear(), parsed.getMonth(), 1);
    }
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  // Lookup map for fast day availability query: YYYY-MM-DD -> DayAvailability
  const availabilityMap = useMemo(() => {
    const map = new Map<string, DayAvailability>();
    days.forEach((d) => map.set(d.date, d));
    return map;
  }, [days]);

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth(); // 0-indexed

  const monthName = currentMonthDate.toLocaleString("default", { month: "long" });

  const prevMonth = () => {
    setCurrentMonthDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonthDate(new Date(year, month + 1, 1));
  };

  // Build days grid for the month view
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarCells = useMemo(() => {
    const cells = [];
    // Padding for previous month days
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({ dayNumber: 0, dateStr: "", isCurrentMonth: false });
    }
    // Days in current month
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const d = String(day).padStart(2, "0");
      const m = String(month + 1).padStart(2, "0");
      const dateStr = `${year}-${m}-${d}`;
      cells.push({ dayNumber: day, dateStr, isCurrentMonth: true });
    }
    return cells;
  }, [year, month, firstDayOfWeek, totalDaysInMonth]);

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const handleCellClick = (dateStr: string, avail: DayAvailability | undefined) => {
    if (!avail || !avail.is_available || avail.status === "BLACKOUT" || avail.status === "UNAVAILABLE") {
      return;
    }

    if (bookingModel === "date_range" && onSelectDateRange) {
      if (!selectedDate || (selectedDate && selectedEndDate)) {
        onSelectDate(dateStr);
      } else if (selectedDate && !selectedEndDate) {
        if (dateStr > selectedDate) {
          onSelectDateRange(selectedDate, dateStr);
        } else {
          onSelectDate(dateStr);
        }
      }
    } else {
      onSelectDate(dateStr);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      {/* ── Month Navigation Header ── */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-900">
          {monthName} {year}
        </h4>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={prevMonth}
            className="h-8 w-8 p-0 rounded-xl"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={nextMonth}
            className="h-8 w-8 p-0 rounded-xl"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Weekday Headers ── */}
      <div className="grid grid-cols-7 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">
        <span>Su</span>
        <span>Mo</span>
        <span>Tu</span>
        <span>We</span>
        <span>Th</span>
        <span>Fr</span>
        <span>Sa</span>
      </div>

      {/* ── Calendar Days Grid ── */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {calendarCells.map((cell, idx) => {
          if (!cell.isCurrentMonth) {
            return <div key={`empty-${idx}`} className="h-10 sm:h-12" />;
          }

          const avail = availabilityMap.get(cell.dateStr);
          const isPast = cell.dateStr < todayStr;
          const isBlackout = avail?.status === "BLACKOUT";
          const isUnavailable = isPast || isBlackout || !avail?.is_available || avail?.status === "UNAVAILABLE";
          const isLimited = avail?.status === "LIMITED";

          // Range / single selected states
          const isSelectedStart = selectedDate === cell.dateStr;
          const isSelectedEnd = selectedEndDate === cell.dateStr;
          const isInRange =
            selectedDate &&
            selectedEndDate &&
            cell.dateStr > selectedDate &&
            cell.dateStr < selectedEndDate;
          const isSelected = isSelectedStart || isSelectedEnd || (!selectedEndDate && isSelectedStart);

          let buttonStyle = "border border-slate-100 bg-white text-slate-800 hover:border-harvest-600 hover:bg-harvest-50";

          if (isUnavailable) {
            buttonStyle = "border-transparent bg-slate-50 text-slate-300 cursor-not-allowed line-through";
          } else if (isSelected) {
            buttonStyle = "border-harvest-600 bg-harvest-600 text-white font-bold shadow-sm scale-105 z-10";
          } else if (isInRange) {
            buttonStyle = "border-harvest-200 bg-harvest-100/70 text-harvest-950 font-semibold";
          } else if (isLimited) {
            buttonStyle = "border-amber-200 bg-amber-50/50 text-amber-950 hover:bg-amber-100";
          }

          return (
            <button
              key={cell.dateStr}
              type="button"
              disabled={isUnavailable || isLoading}
              onClick={() => handleCellClick(cell.dateStr, avail)}
              aria-label={`${cell.dateStr}, ${isUnavailable ? "Unavailable" : isLimited ? "Limited spots" : "Available"}`}
              className={`group relative flex h-10 sm:h-12 flex-col items-center justify-center rounded-2xl text-xs transition-all ${buttonStyle}`}
            >
              <span className="font-semibold">{cell.dayNumber}</span>

              {/* Status Indicator Dot */}
              {!isUnavailable && !isSelected && (
                <span
                  className={`h-1 w-1 rounded-full mt-0.5 ${
                    isLimited ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Legend Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span>Limited</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-slate-300" />
          <span>Booked / Past</span>
        </div>
      </div>
    </div>
  );
}
