import React, { useState, useRef } from "react";
import {
  Send,
  Sparkles,
  RefreshCw,
  Plus,
  MapPin,
  TrendingDown,
  Calendar,
  Car,
  CreditCard,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AIComposerProps {
  onSend: (text: string) => void;
  isLoading: boolean;
  placeholder?: string;
  hasItinerary?: boolean;
  hasBooking?: boolean;
  className?: string;
}

export const AIComposer: React.FC<AIComposerProps> = ({
  onSend,
  isLoading,
  placeholder = "Tell Namma AI what you want to plan, change, or book...",
  hasItinerary = false,
  hasBooking = false,
  className,
}) => {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isLoading) return;
    onSend(text.trim());
    setText("");
  };

  const handleQuickAction = (actionPrompt: string) => {
    if (isLoading) return;
    onSend(actionPrompt);
  };

  // Contextual quick action pills based on current agent state
  const quickActions = hasBooking
    ? [
        { label: "Check booking status", prompt: "What is the status of my booking?", icon: <Sparkles className="h-3 w-3" /> },
        { label: "View itinerary", prompt: "Show my full day-by-day trip itinerary", icon: <Compass className="h-3 w-3" /> },
        { label: "Modify dates", prompt: "Can I move my booking date to next month?", icon: <Calendar className="h-3 w-3" /> },
      ]
    : hasItinerary
    ? [
        { label: "Add activities", prompt: "Add more local outdoor activities and workshops to this trip", icon: <Plus className="h-3 w-3" /> },
        { label: "Show local places", prompt: "Show me top local places to visit around this area", icon: <MapPin className="h-3 w-3" /> },
        { label: "Reduce budget", prompt: "Make this trip cheaper and reduce the budget", icon: <TrendingDown className="h-3 w-3" /> },
        { label: "Change dates", prompt: "Move this trip to next weekend", icon: <Calendar className="h-3 w-3" /> },
        { label: "Add transport", prompt: "Include local cab and sightseeing transport", icon: <Car className="h-3 w-3" /> },
        { label: "Book this trip", prompt: "Book it now", icon: <CreditCard className="h-3 w-3" /> },
      ]
    : [
        { label: "3-day Coorg trip", prompt: "Plan a 3-day Coorg trip for 4 people under ₹25,000 with nature and local food", icon: <Sparkles className="h-3 w-3" /> },
        { label: "Chikkamagaluru plantation", prompt: "Find quiet coffee plantation homestays in Chikkamagaluru under ₹15,000", icon: <MapPin className="h-3 w-3" /> },
        { label: "Gokarna beach & trek", prompt: "Plan a 2-day beach trekking weekend trip to Gokarna", icon: <Compass className="h-3 w-3" /> },
        { label: "Hampi heritage tour", prompt: "Plan a cultural 3-day heritage tour of Hampi", icon: <Sparkles className="h-3 w-3" /> },
      ];

  return (
    <div
      className={cn(
        "p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-2.5",
        className
      )}
    >
      {/* Quick Action Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5 select-none">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-0.5">
          <Sparkles className="h-3 w-3 text-purple-500" />
          Actions:
        </span>
        {quickActions.map((qa, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleQuickAction(qa.prompt)}
            disabled={isLoading}
            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-50 dark:bg-slate-800/80 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-700 dark:text-slate-300 hover:text-purple-700 dark:hover:text-purple-300 border border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-800 text-[11px] font-medium transition-all shadow-2xs disabled:opacity-50"
          >
            {qa.icon}
            <span>{qa.label}</span>
          </button>
        ))}
      </div>

      {/* Main Composer Input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            disabled={isLoading}
            className="w-full bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-xs sm:text-sm px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-60 shadow-2xs"
          />
        </div>

        <Button
          type="submit"
          disabled={!text.trim() || isLoading}
          aria-label="Send message to Namma AI"
          className="rounded-2xl h-10 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold shrink-0 shadow-sm shadow-purple-600/20 disabled:opacity-50 transition-all"
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
};
