import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles,
  X,
  Send,
  Bot,
  User as UserIcon,
  Loader2,
  Maximize2,
  Minimize2,
  ExternalLink,
  MapPin,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { sendTravelChatMessage, ChatMessage } from "@/services/aiService";
import { useTranslation, useLanguage } from "@/i18n";

const CHAT_SIZE_STORAGE_KEY = "namma_connect_chat_size";

interface ChatDimensions {
  width: number;
  height: number;
}

const DEFAULT_DIMENSIONS: ChatDimensions = {
  width: 420,
  height: 650,
};

const MIN_WIDTH = 340;
const MIN_HEIGHT = 460;
const MAX_WIDTH = 800;
const MAX_HEIGHT = 900;

export function TravelAIFloating() {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);

  // Read saved dimensions from localStorage
  const [dimensions, setDimensions] = useState<ChatDimensions>(() => {
    if (typeof window === "undefined") return DEFAULT_DIMENSIONS;
    try {
      const stored = localStorage.getItem(CHAT_SIZE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.width && parsed.height) {
          return {
            width: Math.min(Math.max(parsed.width, MIN_WIDTH), MAX_WIDTH),
            height: Math.min(Math.max(parsed.height, MIN_HEIGHT), MAX_HEIGHT),
          };
        }
      }
    } catch {
      // Storage parse fallback
    }
    return DEFAULT_DIMENSIONS;
  });

  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const resizingRef = useRef<{
    isResizing: boolean;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  }>({
    isResizing: false,
    startX: 0,
    startY: 0,
    startWidth: dimensions.width,
    startHeight: dimensions.height,
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "msg-welcome",
      sender: "ai",
      content: t("chat.welcomeMessage"),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  // Update initial welcome message if language changes while conversation is untouched
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id === "msg-welcome") {
        return [
          {
            ...prev[0],
            content: t("chat.welcomeMessage"),
          },
        ];
      }
      return prev;
    });
  }, [language, t]);

  // Handle mobile viewport detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Save dimensions when changed
  const saveDimensions = useCallback((newDims: ChatDimensions) => {
    setDimensions(newDims);
    try {
      localStorage.setItem(CHAT_SIZE_STORAGE_KEY, JSON.stringify(newDims));
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Scroll to bottom on new message
  useEffect(() => {
    if (isOpen && typeof messagesEndRef.current?.scrollIntoView === "function") {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isLoading]);

  // Resize handler (bottom-left or top-left corner dragging)
  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isMaximized || isMobile) return;

    resizingRef.current = {
      isResizing: true,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: dimensions.width,
      startHeight: dimensions.height,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingRef.current.isResizing) return;
      const deltaX = resizingRef.current.startX - moveEvent.clientX;
      const deltaY = resizingRef.current.startY - moveEvent.clientY;

      const newWidth = Math.min(
        Math.max(resizingRef.current.startWidth + deltaX, MIN_WIDTH),
        Math.min(window.innerWidth - 32, MAX_WIDTH)
      );
      const newHeight = Math.min(
        Math.max(resizingRef.current.startHeight + deltaY, MIN_HEIGHT),
        Math.min(window.innerHeight - 80, MAX_HEIGHT)
      );

      setDimensions({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      if (resizingRef.current.isResizing) {
        resizingRef.current.isResizing = false;
        setDimensions((curr) => {
          saveDimensions(curr);
          return curr;
        });
      }
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || inputMessage.trim();
    if (!textToSend || isLoading) return;

    const userMsg: ChatMessage = {
      id: "user-" + Date.now(),
      sender: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const res = await sendTravelChatMessage({
        conversation_id: conversationId,
        message: textToSend,
        language: language,
      });

      if (res.data) {
        setConversationId(res.data.conversation_id);
        const aiMsg: ChatMessage = {
          id: "ai-" + Date.now(),
          sender: "ai",
          content: res.data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          suggested_services: res.data.suggested_services,
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch (err: any) {
      const statusCode = err?.response?.status;
      let errorText = t("chat.offlineNotice");

      if (statusCode === 401) {
        errorText = t("errors.unauthorized");
      } else if (statusCode === 503) {
        errorText = t("errors.serviceUnavailable");
      } else if (statusCode === 404) {
        errorText = t("errors.notFound");
      }

      setMessages((prev) => [
        ...prev,
        {
          id: "ai-err-" + Date.now(),
          sender: "ai",
          content: errorText,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    t("chat.quickPrompt1"),
    t("chat.quickPrompt2"),
    t("chat.quickPrompt3"),
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-700 px-5 py-3 text-sm font-bold text-white shadow-xl shadow-emerald-700/25 transition-all hover:scale-105 hover:shadow-2xl active:scale-95 border border-emerald-500/30"
          aria-label="Open Travel AI Assistant (Namma AI)"
        >
          <Sparkles className="h-4 w-4 text-emerald-200 animate-pulse" />
          <span>{t("chat.title")}</span>
        </button>
      )}

      {/* Floating / Responsive Resizable Chat Window */}
      {isOpen && (
        <div
          style={{
            width: isMobile || isMaximized ? "calc(100vw - 24px)" : `${dimensions.width}px`,
            height: isMobile || isMaximized ? "calc(100vh - 32px)" : `${dimensions.height}px`,
            maxWidth: isMaximized ? "100vw" : `${MAX_WIDTH}px`,
            maxHeight: isMaximized ? "100vh" : `${MAX_HEIGHT}px`,
          }}
          className={`flex flex-col rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden transition-all duration-200 ${
            isMaximized
              ? "fixed inset-3 z-50 rounded-2xl"
              : "fixed bottom-4 right-4 sm:bottom-6 sm:right-6"
          }`}
        >
          {/* Resize Corner Handle (Top-Left corner for floating window) */}
          {!isMaximized && !isMobile && (
            <div
              onMouseDown={startResizing}
              className="absolute top-0 left-0 w-6 h-6 cursor-nwse-resize z-50 flex items-center justify-center group opacity-40 hover:opacity-100"
              title="Drag to resize"
            >
              <div className="w-2 h-2 border-t-2 border-l-2 border-slate-400 dark:border-slate-500 group-hover:border-emerald-500 transition-colors" />
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 px-4 py-3 select-none">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-md shadow-emerald-500/20">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {t("chat.title")}
                </h3>
                <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  {t("chat.subtitle")}
                </p>
              </div>
            </div>

            {/* Window Controls */}
            <div className="flex items-center gap-1">
              {!isMobile && (
                <button
                  type="button"
                  onClick={() => setIsMaximized(!isMaximized)}
                  className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                  aria-label={isMaximized ? t("chat.restore") : t("chat.maximize")}
                  title={isMaximized ? t("chat.restore") : t("chat.maximize")}
                >
                  {isMaximized ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                aria-label={t("chat.close")}
                title={t("chat.close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/40 dark:bg-slate-950/40">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.sender === "ai" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-emerald-600 dark:bg-emerald-600 text-white font-medium rounded-tr-none shadow-sm"
                      : "bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-tl-none shadow-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {/* Suggested Services Cards */}
                  {msg.suggested_services && msg.suggested_services.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700 space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {t("chat.recommendedServices")}
                      </p>
                      {msg.suggested_services.map((service: any, idx: number) => (
                        <Link
                          key={service.id || idx}
                          to={`/app/services/${service.slug || service.id}`}
                          onClick={() => !isMaximized && setIsOpen(false)}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/80 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all group"
                        >
                          <div className="truncate pr-2">
                            <p className="font-bold text-[11px] text-slate-900 dark:text-slate-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                              {service.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                              <span className="flex items-center gap-0.5">
                                <MapPin className="h-3 w-3" />
                                {service.location}
                              </span>
                              {service.price && (
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                  ₹{service.price}/{service.unit || "unit"}
                                </span>
                              )}
                            </div>
                          </div>
                          <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-600 shrink-0" />
                        </Link>
                      ))}
                    </div>
                  )}

                  <span className="mt-1 block text-[9px] text-slate-400 dark:text-slate-500 text-right">
                    {msg.timestamp}
                  </span>
                </div>
                {msg.sender === "user" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                    <UserIcon className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2.5 items-center text-xs text-slate-500 dark:text-slate-400">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                </div>
                <span className="italic">{t("chat.typing")}</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          {messages.length <= 2 && (
            <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap gap-1.5">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSend(prompt)}
                  className="rounded-full bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors border border-emerald-200/50 dark:border-emerald-800/50 text-left"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={t("chat.inputPlaceholder")}
              disabled={isLoading}
              className="flex-1 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!inputMessage.trim() || isLoading}
              className="rounded-xl px-3 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
              aria-label={t("chat.send")}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
