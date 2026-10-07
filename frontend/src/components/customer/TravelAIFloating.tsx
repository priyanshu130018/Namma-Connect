import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  X,
  Bot,
  Send,
  Calendar,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import {
  createAIConversation,
  sendMessageToAI,
  AIMessageResponse,
} from "@/services/aiService";
import { TripPlannerModal } from "./TripPlannerModal";

export function TravelAIFloating() {
  let navigate: (to: string) => void = (to: string) => {
    if (typeof window !== "undefined") window.location.href = to;
  };
  try {
    navigate = useNavigate();
  } catch {
    // rendered outside Router context
  }
  const [isOpen, setIsOpen] = useState(false);
  const [plannerModalOpen, setPlannerModalOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIMessageResponse[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize conversation session on first open
  useEffect(() => {
    if (isOpen && !conversationId) {
      initConversation();
    }
  }, [isOpen]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const initConversation = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const conv = await createAIConversation({
        title: "Namma Travel Assistant",
        context_type: "TRAVEL",
      });
      setConversationId(conv.id);
      // Initial welcome message
      setMessages([
        {
          id: "welcome-msg",
          conversation_id: conv.id,
          role: "assistant",
          content:
            "Namaskara! I am your Namma Connect AI assistant. I can help you discover authentic farm stays, heritage workshops, or plan a multi-day Karnataka itinerary.",
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (err: any) {
      console.error("Failed to initialize AI conversation:", err);
      setError("Unable to connect to AI Assistant. Please check connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputValue.trim();
    if (!text || isLoading) return;

    let convId = conversationId;
    if (!convId) {
      try {
        const conv = await createAIConversation({ title: "Travel Chat" });
        convId = conv.id;
        setConversationId(convId);
      } catch (err) {
        setError("Failed to create conversation session.");
        return;
      }
    }

    const optimisticUserMsg: AIMessageResponse = {
      id: `temp-${Date.now()}`,
      conversation_id: convId,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticUserMsg]);
    setInputValue("");
    setIsLoading(true);
    setError(null);

    try {
      const aiReply = await sendMessageToAI(convId, { content: text });
      setMessages((prev) => [...prev, aiReply]);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Failed to get AI response. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    "Plan a 2-day trip to Coorg",
    "Find organic farm stays in Chikkamagaluru",
    "Show traditional craft workshops in Mysuru",
  ];

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        {/* Floating Trigger Button */}
        {!isOpen && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="group flex items-center gap-2.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-700 px-5 py-3 text-sm font-bold text-white shadow-xl shadow-emerald-700/25 transition-all hover:scale-105 hover:shadow-2xl active:scale-95 border border-emerald-500/30"
            aria-label="Open Namma AI"
          >
            <Sparkles className="h-4 w-4 text-emerald-200" />
            <span>Namma AI</span>
          </button>
        )}

        {/* Floating AI Assistant Chat Window */}
        {isOpen && (
          <div className="w-[340px] sm:w-[390px] h-[520px] flex flex-col rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden animate-fade-in fixed bottom-6 right-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-emerald-700 to-teal-800 px-4 py-3 text-white select-none">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm text-white shadow-sm">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold leading-tight">Namma AI Assistant</h3>
                  <span className="text-[10px] text-emerald-200 font-medium">
                    Grounded & Verified Recommendations
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    navigate("/app/namma-ai");
                  }}
                  title="Open Full Namma AI Workspace"
                  className="p-1.5 rounded-xl text-emerald-100 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setPlannerModalOpen(true);
                  }}
                  title="Open Trip Planner"
                  className="p-1.5 rounded-xl text-emerald-100 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Calendar className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-xl text-emerald-100 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Quick Action Workspace Bar */}
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-900/40 px-3 py-2 flex items-center justify-between text-xs">
              <span className="text-emerald-900 dark:text-emerald-300 font-bold flex items-center gap-1 text-[11px]">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                <span>Namma AI Travel Agent</span>
              </span>
              <Button
                size="sm"
                onClick={() => {
                  setIsOpen(false);
                  navigate("/app/namma-ai");
                }}
                className="h-6 px-2 text-[10px] font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-none flex items-center gap-1"
              >
                <span>Full Workspace</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>

            {/* Messages Body */}
            <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-slate-50/50 dark:bg-slate-950/40 text-xs">
              {messages.map((msg) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm text-xs leading-relaxed ${
                        isUser
                          ? "bg-emerald-600 text-white font-medium rounded-br-none"
                          : "bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-bl-none"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>

                    {/* Grounded Recommended Services */}
                    {!isUser &&
                      msg.recommended_services &&
                      msg.recommended_services.length > 0 && (
                        <div className="mt-2 space-y-1.5 w-full max-w-[90%]">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block pl-1">
                            Verified Offerings
                          </span>
                          {msg.recommended_services.map((svc: any, idx: number) => (
                            <a
                              key={svc.service_id || svc.id || idx}
                              href={`/app/services/${svc.service_id || svc.id}`}
                              className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 flex items-center justify-between gap-2 shadow-xs transition-colors"
                            >
                              <div className="truncate">
                                <p className="font-bold text-slate-900 dark:text-slate-100 truncate text-[11px]">
                                  {svc.title}
                                </p>
                                <p className="text-[10px] text-slate-500 truncate">
                                  {svc.location || svc.district} • {svc.category}
                                </p>
                              </div>
                              <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 shrink-0">
                                {formatCurrency(svc.price)}
                              </span>
                            </a>
                          ))}
                        </div>
                      )}

                    {/* Trip Planner Handoff Action in Chat */}
                    {!isUser && msg.trip_planner_handoff && (
                      <div className="mt-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs w-full max-w-[90%] space-y-1.5">
                        <p className="font-bold text-emerald-900 dark:text-emerald-300 text-[11px]">
                          Ready to build this itinerary?
                        </p>
                        <Button
                          size="sm"
                          onClick={() => {
                            setIsOpen(false);
                            setPlannerModalOpen(true);
                          }}
                          className="w-full h-7 text-[11px] font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg gap-1"
                        >
                          <span>Launch Agentic Trip Planner</span>
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex items-center gap-1.5 text-slate-400 text-xs pl-2">
                  <RefreshCw className="h-3 w-3 animate-spin text-emerald-600" />
                  <span>Namma AI is thinking...</span>
                </div>
              )}

              {/* Error indicator */}
              {error && (
                <div className="p-2 rounded-xl bg-rose-50 text-rose-800 text-[11px] flex items-center gap-1.5 border border-rose-200">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Quick Prompts (if chat is fresh) */}
              {messages.length <= 1 && (
                <div className="pt-2 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block pl-1">
                    Try Asking
                  </span>
                  {quickPrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(prompt)}
                      className="w-full text-left p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 hover:border-emerald-500 hover:bg-emerald-50/50 text-[11px] text-slate-700 dark:text-slate-300 transition-colors block font-medium"
                    >
                      💡 {prompt}
                    </button>
                  ))}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-2.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-1.5"
            >
              <input
                type="text"
                placeholder="Ask about farm stays, activities, or trips..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isLoading}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!inputValue.trim() || isLoading}
                className="h-8 w-8 p-0 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
          </div>
        )}
      </div>

      {/* Embedded Agentic Trip Planner Modal */}
      <TripPlannerModal
        isOpen={plannerModalOpen}
        onClose={() => setPlannerModalOpen(false)}
      />
    </>
  );
}

