import React from "react";
import {
  BrainCircuit,
  Heart,
  Coffee,
  Coins,
  Mountain,
  Utensils,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NammaMemoryCardProps {
  preferences?: Record<string, any> | null;
  onEditPreferences?: () => void;
  onQuickInterestClick?: (interest: string) => void;
  className?: string;
}

export const NammaMemoryCard: React.FC<NammaMemoryCardProps> = ({
  onEditPreferences,
  onQuickInterestClick,
  className,
}) => {
  const memoryItems = [
    {
      icon: <Heart className="h-3.5 w-3.5 text-rose-500" />,
      label: "Nature & Wildlife",
      prompt: "Find authentic nature trails and eco stays",
    },
    {
      icon: <Coffee className="h-3.5 w-3.5 text-amber-600" />,
      label: "Coffee Plantations",
      prompt: "Show plantation homestays in Coorg and Chikkamagaluru",
    },
    {
      icon: <Coins className="h-3.5 w-3.5 text-emerald-600" />,
      label: "Budget-Friendly",
      prompt: "Find stays under ₹3,000 per night",
    },
    {
      icon: <Mountain className="h-3.5 w-3.5 text-blue-600" />,
      label: "Western Ghats",
      prompt: "Plan a trip to Western Ghats hill stations",
    },
    {
      icon: <Utensils className="h-3.5 w-3.5 text-orange-500" />,
      label: "Local Culinary",
      prompt: "Include local Karnataka traditional food walks",
    },
  ];

  return (
    <div
      className={cn(
        "rounded-2xl border border-purple-200 dark:border-purple-900/60 bg-gradient-to-b from-purple-50/40 via-white to-white dark:from-purple-950/20 dark:via-slate-900 dark:to-slate-900 p-4 shadow-sm space-y-3",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-2xs">
            <BrainCircuit className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Namma Memory Profile</span>
              <Sparkles className="h-3 w-3 text-purple-500" />
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Personalized traveler memory & affinity
            </p>
          </div>
        </div>

        {onEditPreferences && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onEditPreferences}
            className="text-[11px] h-7 px-2 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/50 gap-1 font-semibold"
          >
            <SlidersHorizontal className="h-3 w-3" />
            <span>Customize</span>
          </Button>
        )}
      </div>

      {/* Memory Pills List */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
          Learned Preferences:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {memoryItems.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onQuickInterestClick?.(item.prompt)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:border-purple-300 dark:hover:border-purple-600 hover:text-purple-600 dark:hover:text-purple-400 transition-all shadow-2xs group"
              title="Click to search for this preference"
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
