import { useEffect, useRef } from "react";
import { Bot, Send, Wand2, MapPin, Compass, RefreshCw, PencilLine, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { AIMessageResponse } from "@/services/aiService";
import { AgentProgress } from "./AgentProgress";

export interface QuickAction {
  key: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export interface ChatPanelProps {
  messages: AIMessageResponse[];
  inputValue: string;
  onInputChange: (v: string) => void;
  onSend: (text?: string) => void;
  isSending: boolean;
  error?: string | null;
  /** Optional retry handler; when set, the error surface shows a "Try again" button. */
  onRetry?: () => void;
  /** When set (from "Modify with AI"), shows a context banner under the header. */
  modifyingLabel?: string;
  quickPrompts: string[];
  quickActions: QuickAction[];
  showQuickActions: boolean;
  agentWorking: boolean;
  agentStatus?: string;
  /** When true, show the "Using your travel preferences" indicator. */
  preferencesActive?: boolean;
  /** Short chip summary of the active preferences (e.g. ["Relaxed", "Food", "Couple"]). */
  preferencesSummary?: string[];
  /** Opens the per-trip "Edit preferences" dialog. */
  onEditPreferences?: () => void;
}

/** Single chat bubble + any grounded service recommendations. */
function AIMessage({ msg }: { msg: AIMessageResponse }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-sm ${
          isUser
            ? "bg-emerald-600 text-white font-medium rounded-br-none"
            : "bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-bl-none"
        }`}
      >
        <p className="whitespace-pre-wrap">{msg.content}</p>
      </div>

      {!isUser && msg.recommended_services && msg.recommended_services.length > 0 && (
        <div className="mt-2 w-full max-w-[90%] space-y-1.5">
          <span className="block pl-1 text-[10px] font-bold uppercase text-slate-400">
            Verified offerings
          </span>
          {msg.recommended_services.map((svc: any, idx: number) => (
            <a
              key={svc.service_id || svc.id || idx}
              href={`/app/services/${svc.service_id || svc.id}`}
              className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 shadow-sm transition-colors hover:border-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <div className="truncate">
                <p className="truncate text-[11px] font-bold text-slate-900 dark:text-slate-100">
                  {svc.title}
                </p>
                <p className="flex items-center gap-1 truncate text-[10px] text-slate-500">
                  <MapPin className="h-2.5 w-2.5" aria-hidden="true" />
                  {svc.location || svc.district || "Karnataka"} • {svc.category}
                </p>
              </div>
              <span className="shrink-0 text-[11px] font-black text-emerald-700 dark:text-emerald-400">
                {formatCurrency(svc.price)}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

/** Distinct empty state shown before the conversation really begins. */
function WelcomeHero({
  quickPrompts,
  onSend,
}: {
  quickPrompts: string[];
  onSend: (text?: string) => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-4 py-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md">
        <Bot className="h-8 w-8" aria-hidden="true" />
      </div>
      <div className="space-y-1.5">
        <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
          Namma AI
        </span>
        <h3 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Where would you like to go?
        </h3>
        <p className="mx-auto max-w-xs text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          Tell me your destination, dates, budget and interests. I'll build an itinerary for you.
        </p>
      </div>

      <div className="grid w-full max-w-sm grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSend(prompt)}
            className="flex items-center gap-2 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-left text-[11px] font-bold text-slate-700 dark:text-slate-200 transition-colors hover:border-emerald-500 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1"
          >
            <Compass className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
            <span>{prompt}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ChatPanel(props: ChatPanelProps) {
  const {
    messages,
    inputValue,
    onInputChange,
    onSend,
    isSending,
    error,
    onRetry,
    modifyingLabel,
    quickPrompts,
    quickActions,
    showQuickActions,
    agentWorking,
    agentStatus,
    preferencesActive,
    preferencesSummary,
    onEditPreferences,
  } = props;
  const endRef = useRef<HTMLDivElement>(null);

  // Before the conversation really begins (only the greeting, nothing planning
  // yet) we show a dedicated hero instead of a lone chat bubble.
  const isInitial = messages.length <= 1 && !agentWorking;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, agentWorking]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-emerald-700 to-teal-800 px-4 py-3 text-white">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
          <Bot className="h-4.5 w-4.5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200">
            Namma AI
          </span>
          <h2 className="text-sm font-bold leading-tight">AI Trip Planner</h2>
          <span className="block truncate text-[11px] font-medium text-emerald-100/90">
            Plan, customize and book your trip with Namma AI.
          </span>
        </div>
      </div>

      {/* "Modify with AI" context banner */}
      {modifyingLabel && (
        <div className="flex items-center gap-2 border-b border-emerald-100 dark:border-emerald-900/50 bg-emerald-50/80 dark:bg-emerald-950/40 px-4 py-2 text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
          <PencilLine className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{modifyingLabel}</span>
        </div>
      )}

      {/* "Using your travel preferences" indicator */}
      {preferencesActive && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-emerald-100 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/30 px-4 py-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
            <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Using your travel preferences
          </span>
          {preferencesSummary && preferencesSummary.length > 0 && (
            <span className="flex flex-wrap items-center gap-1" aria-label="Active preferences">
              {preferencesSummary.map((chip, idx) => (
                <span
                  key={`${chip}-${idx}`}
                  className="rounded-full bg-white/70 dark:bg-emerald-900/40 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300"
                >
                  {chip}
                </span>
              ))}
            </span>
          )}
          {onEditPreferences && (
            <button
              type="button"
              onClick={onEditPreferences}
              className="ml-auto inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 underline-offset-2 transition-colors hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <PencilLine className="h-3 w-3" aria-hidden="true" />
              Edit for this trip
            </button>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-slate-50/60 dark:bg-slate-950/40">
        {isInitial ? (
          <WelcomeHero quickPrompts={quickPrompts} onSend={onSend} />
        ) : (
          <div className="space-y-3 p-4">
            {messages.map((msg) => (
              <AIMessage key={msg.id} msg={msg} />
            ))}

            {agentWorking && <AgentProgress isWorking={agentWorking} status={agentStatus} />}

            {isSending && !agentWorking && (
              <div className="flex items-center gap-1.5 pl-2 text-xs text-slate-400">
                <span
                  className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"
                  aria-hidden="true"
                />
                <span>Namma AI is typing…</span>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="space-y-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-2.5 text-[11px] text-rose-800 dark:text-rose-300"
              >
                <p className="font-semibold">{error}</p>
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900 px-2 py-1 font-bold text-rose-700 dark:text-rose-300 transition-colors hover:bg-rose-100 dark:hover:bg-rose-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                  >
                    <RefreshCw className="h-3 w-3" aria-hidden="true" />
                    Try again
                  </button>
                )}
              </div>
            )}

            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* Quick actions */}
      {showQuickActions && quickActions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-slate-100 dark:border-slate-800 px-3 py-2">
          {quickActions.map((qa) => (
            <button
              key={qa.key}
              type="button"
              onClick={qa.onClick}
              disabled={qa.disabled}
              className="inline-flex items-center gap-1 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Wand2 className="h-3 w-3" aria-hidden="true" />
              {qa.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
        className="flex items-center gap-1.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5"
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          disabled={isSending}
          placeholder="Describe your ideal trip…"
          aria-label="Describe your ideal trip"
          className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <Button
          type="submit"
          size="sm"
          disabled={!inputValue.trim() || isSending}
          aria-label="Send message"
          className="h-9 w-9 shrink-0 rounded-xl bg-emerald-600 p-0 text-white hover:bg-emerald-700"
        >
          <Send className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </form>
    </div>
  );
}
