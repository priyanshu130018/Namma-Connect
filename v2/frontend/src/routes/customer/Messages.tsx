import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Send,
  CheckCheck,
  RefreshCw,
  AlertCircle,
  MessageSquare,
  ArrowLeft,
} from "lucide-react";
import { useTranslation } from "@/i18n";

import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/app/providers";
import {
  getConversations,
  getConversationThread,
  sendMessage,
} from "@/services/communicationService";
import { ConversationItem, ChatMessage } from "@/types";

export function CustomerMessagesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const providerIdParam = searchParams.get("provider_id");
  const subjectParam = searchParams.get("subject");

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");

  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mobile view toggle (null or thread id)
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadConversations = useCallback(async () => {
    setIsLoadingConversations(true);
    setError(null);
    try {
      const data = await getConversations();
      const list = data || [];
      setConversations(list);

      // If provider_id param passed, select or target thread with that provider
      if (providerIdParam) {
        const existing = list.find((c) => c.participant_id === providerIdParam);
        if (existing) {
          setActiveThreadId(existing.id);
        } else if (list.length > 0 && !activeThreadId) {
          setActiveThreadId(list[0].id);
        }
      } else if (list.length > 0 && !activeThreadId) {
        setActiveThreadId(list[0].id);
      }
    } catch (err: unknown) {
      console.error("Failed to load conversations:", err);
      setError("Unable to load conversations. Please try again.");
    } finally {
      setIsLoadingConversations(false);
    }
  }, [activeThreadId, providerIdParam]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Establish WebSocket connection for real-time messages & presence
  useEffect(() => {
    const token = localStorage.getItem("nc_access_token");
    if (!token) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/v2/messages/ws?token=${encodeURIComponent(token)}`;

    let socket: WebSocket | null = null;
    let heartbeatInterval: any = null;

    try {
      socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        heartbeatInterval = setInterval(() => {
          if (socket?.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "ping" }));
          }
        }, 30000);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "new_message" && data.message) {
            const incomingMsg: ChatMessage = data.message;
            if (incomingMsg.conversation_id === activeThreadId) {
              setMessages((prev) => [...prev, incomingMsg]);
            }
            // Update conversation list item
            setConversations((prev) =>
              prev.map((c) =>
                c.id === incomingMsg.conversation_id
                  ? {
                      ...c,
                      last_message_text: incomingMsg.content,
                      last_message_at: incomingMsg.created_at,
                      unread_count: c.id === activeThreadId ? 0 : c.unread_count + 1,
                    }
                  : c
              )
            );
          }
        } catch {
          // ignore parsing error
        }
      };
    } catch {
      // WebSocket gracefully falls back to polling/refresh
    }

    return () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [activeThreadId]);

  const loadThread = useCallback(async (threadId: string) => {
    setIsLoadingMessages(true);
    try {
      const data = await getConversationThread(threadId);
      setMessages(data.messages || []);
      // Reset unread count in local list
      setConversations((prev) =>
        prev.map((c) => (c.id === threadId ? { ...c, unread_count: 0 } : c))
      );
    } catch (err: unknown) {
      console.error("Failed to load messages thread:", err);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (activeThreadId) {
      loadThread(activeThreadId);
    }
  }, [activeThreadId, loadThread]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSelectThread = (id: string) => {
    setActiveThreadId(id);
    setMobileShowThread(true);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || isSending) return;

    const content = messageInput.trim();
    setMessageInput("");
    setIsSending(true);

    try {
      let newMsg: ChatMessage;
      if (activeThreadId) {
        newMsg = await sendMessage({
          conversation_id: activeThreadId,
          content,
        });
      } else if (providerIdParam) {
        newMsg = await sendMessage({
          recipient_id: providerIdParam,
          subject: subjectParam || undefined,
          content,
        });
        await loadConversations();
      } else {
        setIsSending(false);
        return;
      }

      setMessages((prev) => [...prev, newMsg]);

      // Update conversation list preview
      if (activeThreadId) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeThreadId
              ? { ...c, last_message_text: content, last_message_at: new Date().toISOString() }
              : c
          )
        );
      }
    } catch (err: unknown) {
      console.error("Failed to send message:", err);
    } finally {
      setIsSending(false);
    }
  };

  const currentConv = conversations.find((c) => c.id === activeThreadId);

  const formatTime = (dateStr?: string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };


  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Host & Partner Messages"
        subtitle="Chat directly with your plantation hosts and experience coordinators."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={loadConversations}
            disabled={isLoadingConversations}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoadingConversations ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        }
      />

      {error && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-800 font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="outline" onClick={loadConversations}>
            Retry
          </Button>
        </div>
      )}

      <Card className="rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[560px]">
          {/* ── Threads List (4 cols) ── */}
          <div
            className={`md:col-span-4 border-r border-slate-100 dark:border-slate-800 p-3 space-y-1 ${
              mobileShowThread ? "hidden md:block" : "block"
            }`}
          >
            <p className="px-3 text-[10px] uppercase font-bold text-slate-400 mb-2">
              {t("messages.activeConversations")} ({conversations.length})
            </p>

            {isLoadingConversations && (
              <div className="space-y-2 p-2 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
                ))}
              </div>
            )}

            {!isLoadingConversations && conversations.length === 0 && (
              <div className="p-8 text-center space-y-2">
                <MessageSquare className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {t("messages.noConversations")}
                </p>
                <p className="text-[11px] text-slate-400">
                  {t("messages.noConversationsDesc")}
                </p>
              </div>
            )}


            {conversations.map((tItem) => (
              <div
                key={tItem.id}
                onClick={() => handleSelectThread(tItem.id)}
                className={`p-3 rounded-2xl cursor-pointer transition-all ${
                  activeThreadId === tItem.id
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-200 border border-emerald-200/60 dark:border-emerald-800/60 shadow-sm"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <div className="relative">
                      {tItem.participant_avatar ? (
                        <img
                          src={tItem.participant_avatar}
                          alt={tItem.participant_name}
                          className="h-7 w-7 rounded-full object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 text-[11px] font-bold">
                          {tItem.participant_name.charAt(0)}
                        </div>
                      )}
                      <span
                        className={`absolute bottom-0 right-0 h-2 w-2 rounded-full border border-white dark:border-slate-900 ${
                          tItem.is_online ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                        }`}
                        title={tItem.is_online ? "Online" : "Offline"}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {tItem.participant_name}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium shrink-0">
                    {formatTime(tItem.last_message_at)}
                  </span>
                </div>
                {tItem.subject && (
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-400 font-medium truncate mt-1 pl-9">
                    {tItem.subject}
                  </p>
                )}
                <div className="flex items-center justify-between mt-1 gap-2 pl-9">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex-1">
                    {tItem.last_message_text || "No messages yet"}
                  </p>
                  {tItem.unread_count > 0 && (
                    <Badge variant="default" className="h-4 px-1.5 text-[9px] bg-emerald-600">
                      {tItem.unread_count}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ── Chat Window (8 cols) ── */}
          <div
            className={`md:col-span-8 flex flex-col justify-between p-4 sm:p-6 bg-slate-50/40 dark:bg-slate-950/40 ${
              mobileShowThread ? "block" : "hidden md:flex"
            }`}
          >
            {currentConv ? (
              <>
                {/* Thread Header */}
                <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setMobileShowThread(false)}
                      className="md:hidden p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                      aria-label="Back to conversations"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div className="relative">
                      {currentConv.participant_avatar ? (
                        <img
                          src={currentConv.participant_avatar}
                          alt={currentConv.participant_name}
                          className="h-9 w-9 rounded-full object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 text-xs font-bold">
                          {currentConv.participant_name.charAt(0)}
                        </div>
                      )}
                      <span
                        className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                          currentConv.is_online ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                        }`}
                        title={currentConv.is_online ? "Online" : "Offline"}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                          {currentConv.participant_name}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {currentConv.is_online ? "• Online" : "• Offline"}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {currentConv.subject || "Verified Host Conversation"}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800">
                    Host Partner
                  </Badge>
                </div>


                {/* Messages Feed */}
                <div className="flex-1 overflow-y-auto py-4 space-y-3 min-h-[340px] max-h-[460px]">
                  {isLoadingMessages && (
                    <div className="flex items-center justify-center h-full text-xs text-slate-400">
                      Loading messages...
                    </div>
                  )}

                  {!isLoadingMessages && messages.length === 0 && (
                    <div className="flex items-center justify-center h-full text-xs text-slate-400">
                      Say hello to start the conversation!
                    </div>
                  )}

                  {!isLoadingMessages &&
                    messages.map((m) => {
                      const isMe = m.sender_id === user?.id || m.sender_name === user?.full_name;

                      return (
                        <div
                          key={m.id}
                          className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[78%] rounded-2xl p-3.5 text-xs shadow-sm ${
                              isMe
                                ? "bg-slate-900 dark:bg-emerald-600 text-white rounded-tr-none"
                                : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 rounded-tl-none"
                            }`}
                          >
                            <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>
                            <div
                              className={`flex items-center gap-1 mt-1 text-[9px] ${
                                isMe ? "text-slate-300 justify-end" : "text-slate-400"
                              }`}
                            >
                              <span>{formatTime(m.created_at)}</span>
                              {isMe && <CheckCheck className="h-3 w-3 text-emerald-400" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Bar */}
                <form
                  onSubmit={handleSend}
                  className="flex items-center gap-2 border-t border-slate-200/80 dark:border-slate-800 pt-3"
                >
                  <input
                    type="text"
                    placeholder={t("messages.typePlaceholder")}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    disabled={isSending}
                    className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSending || !messageInput.trim()}
                    className="h-10 px-4 font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                  >
                    <Send className="h-4 w-4" />
                    <span className="hidden sm:inline">{t("messages.send")}</span>
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-2 text-slate-400">
                <MessageSquare className="h-10 w-10 text-slate-300" />
                <p className="text-xs font-semibold">{t("messages.selectToChat")}</p>
              </div>
            )}


          </div>
        </div>
      </Card>
    </div>
  );
}
