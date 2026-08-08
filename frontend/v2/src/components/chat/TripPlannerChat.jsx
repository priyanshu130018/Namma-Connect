import { useState, useEffect, useRef } from "react";
import { FiSend, FiArrowRight, FiMapPin, FiStar, FiZap } from "react-icons/fi";
import { useNavigate } from "@/lib/router-compat";
import { aiAPI } from "@/services/api";
import { slugify } from "@/components/ui/ListingCard";

const SUGGESTED_PROMPTS = [
  "Plan a weekend coffee farm stay in Coorg",
  "Find a photographer for a farm shoot",
  "3-day family trip under ₹10,000",
  "Quiet farm stay with kids' activities",
];

/**
 * Core AI trip-planner conversation. Used both by the full page and by the
 * floating chat widget — identical behaviour, just different containers.
 */
export default function TripPlannerChat({ compact = false }) {
  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: "Hi! I'm your AI trip planner. Tell me what you're looking for — a quiet coffee farm, a photographer, a weekend getaway — and I'll find it.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionState, setSessionState] = useState(null);
  const chatEndRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text) => {
    const userMsg = (text ?? input).trim();
    if (!userMsg || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);
    try {
      const res = await aiAPI.chat(userMsg, sessionState);
      const data = res.data;
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: data.response, suggestions: data.suggestions },
      ]);
      setSessionState(data.state);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    send();
  };

  const handleSuggestClick = (s) => {
    const name = s.name || "listing";
    navigate(
      s.type === "farm"
        ? `/farmercard/${slugify(name, s.id)}`
        : `/creatorcard/${slugify(name, s.id)}`,
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className={`min-h-0 flex-1 space-y-6 overflow-y-auto ${compact ? "p-4" : "p-6 sm:p-8"}`}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={
                m.role === "user"
                  ? "max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-sm leading-relaxed text-primary-foreground"
                  : "max-w-[90%] text-sm leading-relaxed text-foreground"
              }
            >
              {m.text}
            </div>

            {m.suggestions?.length > 0 && (
              <div
                className={`mt-4 grid w-full gap-3 ${compact ? "grid-cols-1" : "sm:grid-cols-2 lg:grid-cols-3"}`}
              >
                {m.suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSuggestClick(s)}
                    className="surface-card card-hover p-4 text-left"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        <span className="text-base">{s.emoji}</span>
                        {s.type}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        <FiStar size={10} /> {s.score}%
                      </span>
                    </div>
                    <h4 className="mt-2 truncate text-sm font-semibold text-foreground">
                      {s.name}
                    </h4>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <FiMapPin size={11} /> {s.location}
                    </p>
                    <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                      <span className="text-sm font-semibold text-foreground">
                        {s.price}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                        View <FiArrowRight size={11} />
                      </span>
                    </div>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => send("Show more")}
                  className="btn-outline col-span-full"
                >
                  Show more options
                </button>
              </div>
            )}
          </div>
        ))}

        {messages.length === 1 && !loading && (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              <FiZap size={11} /> Try asking
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => send(p)}
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0.15s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0.3s]" />
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className={`flex items-center gap-2 border-t border-border bg-card ${compact ? "p-3" : "p-4 sm:p-6"}`}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask for a farm stay, a guide, a photographer…"
          aria-label="Message the AI trip planner"
          className="input-field"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          aria-label="Send message"
          className="btn-primary size-10 shrink-0 p-0"
        >
          <FiSend size={16} />
        </button>
      </form>
    </div>
  );
}
