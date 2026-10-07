import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Sparkles,
  Bot,
  User as UserIcon,
  RefreshCw,
  AlertCircle,
  Menu,
  X,
  PanelRightClose,
  PanelRightOpen,
  BrainCircuit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, cn } from "@/lib/utils";
import {
  runAgent,
  getAgentState,
  getConversationMessages,
  AgentRunResponse,
} from "@/services/aiService";

import { loadRazorpayScript, verifyPayment } from "@/services/paymentService";
import { saveService } from "@/services/savedService";
import { getServiceDetail } from "@/services/marketplaceService";
import {
  ConstraintChips,
  TripOverviewCard,
  SearchResultCard,
  ApprovalGateCard,
  BookingStatusCard,
  NammaMemoryCard,
  LeftNavigationSidebar,
  DynamicContextPanel,
  AIComposer,
  ServiceDetailModal,
} from "@/components/ai";

const AI_WORKSPACE_STORAGE_KEY = "nc_ai_workspace_state";

interface SavedAIWorkspaceState {
  conversationId: string | null;
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    step?: string;
    created_at: string;
    cardType?: "itinerary" | "search" | "comparison" | "approval" | "booking" | "budget";
    cardData?: any;
  }>;
  currentStep: string;
  itinerary: AgentRunResponse["itinerary"] | null;
  budget: AgentRunResponse["budget"] | null;
  searchResults: AgentRunResponse["search_results"];
  bookingState: AgentRunResponse["booking_state"] | null;
  extractedRequirements: AgentRunResponse["extracted_requirements"] | null;
  changedItems: string[];
  approvalRequired: boolean;
  approvalPrompt: string | null;
  approvalStatus: string | null;
  tripId: string | null;
  activeTab: "itinerary" | "marketplace" | "budget" | "booking";
}

export function NammaAIWorkspace() {
  const user = (() => {
    try {
      return (
        JSON.parse(localStorage.getItem("nc_user") || "null") ||
        JSON.parse(localStorage.getItem("user") || "null")
      );
    } catch {
      return null;
    }
  })();

  const [searchParams, setSearchParams] = useSearchParams();
  const initialPrompt = searchParams.get("q") || "";

  // Hydrate saved session from localStorage for route continuity
  const savedState: SavedAIWorkspaceState | null = (() => {
    try {
      const raw = localStorage.getItem(AI_WORKSPACE_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  // Conversation state
  const [conversationId, setConversationId] = useState<string | null>(
    () => searchParams.get("cid") || savedState?.conversationId || null
  );
  const [messages, setMessages] = useState<
    Array<{
      id: string;
      role: "user" | "assistant";
      content: string;
      step?: string;
      created_at: string;
      cardType?: "itinerary" | "search" | "comparison" | "approval" | "booking" | "budget";
      cardData?: any;
    }>
  >(() => {
    if (savedState?.messages && savedState.messages.length > 0) {
      return savedState.messages;
    }
    return [
      {
        id: "welcome",
        role: "assistant",
        content: `Namaskara ${user?.full_name ? user.full_name.split(" ")[0] : ""}! I am your Namma AI Travel Agent. Tell me where you'd like to travel in Karnataka, your duration, party size, and budget, and I'll find verified experiences, construct your itinerary, and handle bookings seamlessly.`,
        created_at: new Date().toISOString(),
      },
    ];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Rehydration lifecycle guard to prevent race conditions and partial overwrites
  const [isRehydrating, setIsRehydrating] = useState<boolean>(() => {
    const urlConvId = new URLSearchParams(window.location.search).get("cid");
    const storedConvId = (() => {
      try {
        const raw = localStorage.getItem(AI_WORKSPACE_STORAGE_KEY);
        return raw ? JSON.parse(raw)?.conversationId : null;
      } catch {
        return null;
      }
    })();
    return Boolean(urlConvId || storedConvId);
  });
  const rehydrationVersionRef = useRef<number>(0);
  const isLocalChatActiveRef = useRef<boolean>(false);

  // Active workspace state from LangGraph
  const [currentStep, setCurrentStep] = useState<string>(
    () => savedState?.currentStep ?? "IDLE"
  );
  const [itinerary, setItinerary] = useState<AgentRunResponse["itinerary"] | null>(
    () => savedState?.itinerary ?? null
  );
  const [budget, setBudget] = useState<AgentRunResponse["budget"] | null>(
    () => savedState?.budget ?? null
  );
  const [searchResults, setSearchResults] = useState<AgentRunResponse["search_results"]>(
    () => savedState?.searchResults ?? []
  );
  const [bookingState, setBookingState] = useState<AgentRunResponse["booking_state"] | null>(
    () => savedState?.bookingState ?? null
  );
  const [extractedRequirements, setExtractedRequirements] = useState<
    AgentRunResponse["extracted_requirements"] | null
  >(() => savedState?.extractedRequirements ?? null);
  const [changedItems, setChangedItems] = useState<string[]>(
    () => savedState?.changedItems ?? []
  );
  const [approvalRequired, setApprovalRequired] = useState<boolean>(
    () => savedState?.approvalRequired ?? false
  );
  const [approvalPrompt, setApprovalPrompt] = useState<string | null>(
    () => savedState?.approvalPrompt ?? null
  );
  const [approvalStatus, setApprovalStatus] = useState<string | null>(
    () => savedState?.approvalStatus ?? null
  );
  const [tripId, setTripId] = useState<string | null>(() => savedState?.tripId ?? null);
  const [activeTab, setActiveTab] = useState<"itinerary" | "marketplace" | "budget" | "booking">(
    () => savedState?.activeTab ?? "itinerary"
  );

  // Modals and Drawers
  const [selectedDetailService, setSelectedDetailService] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [savedServiceIds, setSavedServiceIds] = useState<Set<string>>(new Set());

  // UI responsive toggles
  const [showLeftSidebarMobile, setShowLeftSidebarMobile] = useState(false);
  const [showRightPanelMobile, setShowRightPanelMobile] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  const [loadingStatusText, setLoadingStatusText] = useState<string>(
    "Namma AI is checking inventory & optimizing your plan..."
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, isRehydrating]);

  // Keep URL query parameter synchronized with active conversation
  useEffect(() => {
    if (conversationId && searchParams.get("cid") !== conversationId) {
      setSearchParams({ cid: conversationId }, { replace: true });
    }
  }, [conversationId, searchParams, setSearchParams]);

  // Rehydrate state and messages from backend database / checkpoint on mount with version guard
  useEffect(() => {
    if (isLocalChatActiveRef.current) {
      return;
    }
    const urlConvId = searchParams.get("cid");
    const effectiveConvId = urlConvId || conversationId || savedState?.conversationId;

    if (!effectiveConvId) {
      setIsRehydrating(false);
      return;
    }

    const currentVersion = ++rehydrationVersionRef.current;
    setIsRehydrating(true);

    const rehydrate = async () => {
      try {
        // Fetch agent state and conversation messages concurrently
        const [stateRes, msgsRes] = await Promise.all([
          getAgentState(effectiveConvId).catch((err) => {
            console.warn("Could not fetch agent state:", err);
            return null;
          }),
          getConversationMessages(effectiveConvId).catch((err) => {
            console.warn("Could not fetch conversation messages:", err);
            return null;
          }),
        ]);

        // Stale response guard: Ignore if another rehydration was initiated
        if (currentVersion !== rehydrationVersionRef.current) {
          return;
        }

        if (!stateRes && (!msgsRes || msgsRes.length === 0)) {
          setError("Could not restore previous conversation state from backend.");
          setIsRehydrating(false);
          return;
        }

        // Reconstruct message list and interactive card types atomically
        let reconstructedMessages = messages;
        if (msgsRes && msgsRes.length > 0) {
          reconstructedMessages = msgsRes.map((m) => {
            let cardType: SavedAIWorkspaceState["messages"][0]["cardType"] = undefined;
            let cardData: any = undefined;
            const roleLower = (m.role || "").toLowerCase();
            if (roleLower === "assistant" || roleLower === "system") {
              if (m.approval_required && m.approval_prompt) {
                cardType = "approval";
                cardData = {
                  prompt: m.approval_prompt,
                  requirements: m.extracted_requirements,
                  itinerary: m.itinerary,
                  budget: m.budget,
                };
              } else if (m.booking_state && m.booking_state.success) {
                cardType = "booking";
                cardData = m.booking_state;
              } else if (m.itinerary && m.itinerary.days && m.itinerary.days.length > 0) {
                cardType = "itinerary";
                cardData = m.itinerary;
              } else if (m.recommended_services && m.recommended_services.length > 0) {
                cardType = "search";
                cardData = m.recommended_services;
              }
            }
            return {
              id: m.id,
              role: (roleLower === "user" ? "user" : "assistant") as "user" | "assistant",
              content: m.content,
              step: m.current_agent_step || "COMPLETED",
              created_at: m.created_at,
              cardType,
              cardData,
            };
          });
        }

        // Apply all backend states atomically
        if (stateRes) {
          if (stateRes.trip_id) setTripId(stateRes.trip_id);
          if (stateRes.itinerary && stateRes.itinerary.days && stateRes.itinerary.days.length > 0) {
            setItinerary(stateRes.itinerary);
            setActiveTab("itinerary");
          }
          if (stateRes.budget) setBudget(stateRes.budget);
          if (stateRes.search_results && stateRes.search_results.length > 0) {
            setSearchResults(stateRes.search_results);
          }
          if (stateRes.booking_state) setBookingState(stateRes.booking_state as any);
          if (stateRes.changed_items) setChangedItems(stateRes.changed_items);
          if (stateRes.approval_required !== undefined) {
            setApprovalRequired(stateRes.approval_required);
            setApprovalPrompt(stateRes.approval_prompt || null);
            setApprovalStatus(stateRes.approval_status || null);
          }
          if (stateRes.current_agent_step) setCurrentStep(stateRes.current_agent_step);
        } else if (reconstructedMessages.length > 0) {
          const latestAssistant = [...reconstructedMessages].reverse().find((m) => m.role === "assistant" && m.cardData);
          if (latestAssistant?.cardType === "itinerary" && latestAssistant.cardData) {
            setItinerary(latestAssistant.cardData);
          }
        }

        setMessages(reconstructedMessages);
        setConversationId(effectiveConvId);
        setError(null);
      } catch (err: any) {
        console.error("Rehydration error:", err);
        if (currentVersion === rehydrationVersionRef.current) {
          setError("Failed to restore trip planning session. Please refresh or try again.");
        }
      } finally {
        if (currentVersion === rehydrationVersionRef.current) {
          setIsRehydrating(false);
        }
      }
    };

    rehydrate();
  }, [searchParams.get("cid")]);

  // Handle URL param query if starting fresh after rehydration resolves
  useEffect(() => {
    if (!isRehydrating && initialPrompt && (!savedState?.messages || savedState.messages.length <= 1)) {
      handleSend(initialPrompt);
    }
  }, [isRehydrating]);

  // Persist conversation and workspace state (Do not write during rehydration!)
  useEffect(() => {
    if (isRehydrating) return;
    try {
      const stateToPersist: SavedAIWorkspaceState = {
        conversationId,
        messages,
        currentStep,
        itinerary,
        budget,
        searchResults,
        bookingState,
        extractedRequirements,
        changedItems,
        approvalRequired,
        approvalPrompt,
        approvalStatus,
        tripId,
        activeTab,
      };
      localStorage.setItem(AI_WORKSPACE_STORAGE_KEY, JSON.stringify(stateToPersist));
    } catch (e) {
      console.warn("Could not persist AI workspace state to localStorage:", e);
    }
  }, [
    isRehydrating,
    conversationId,
    messages,
    currentStep,
    itinerary,
    budget,
    searchResults,
    bookingState,
    extractedRequirements,
    changedItems,
    approvalRequired,
    approvalPrompt,
    approvalStatus,
    tripId,
    activeTab,
  ]);

  const handleSend = async (userPrompt: string) => {
    const text = userPrompt.trim();
    if (!text || isLoading || isRehydrating) return;

    isLocalChatActiveRef.current = true;
    setError(null);
    const userMsgId = `user-${Date.now()}`;
    const newMessages = [
      ...messages,
      {
        id: userMsgId,
        role: "user" as const,
        content: text,
        created_at: new Date().toISOString(),
      },
    ];
    setMessages(newMessages);
    setIsLoading(true);
    setCurrentStep("UNDERSTANDING");

    // Contextual loading status message
    const lower = text.toLowerCase();
    if (lower.includes("cheaper") || lower.includes("budget") || lower.includes("cut cost")) {
      setLoadingStatusText("Updating itinerary & reducing budget costs...");
    } else if (lower.includes("remove") || lower.includes("delete") || lower.includes("drop")) {
      setLoadingStatusText("Updating itinerary & removing item...");
    } else if (lower.includes("hotel") || lower.includes("stay") || lower.includes("resort")) {
      setLoadingStatusText("Searching alternative accommodations...");
    } else if (lower.includes("add") || lower.includes("food") || lower.includes("experience")) {
      setLoadingStatusText("Finding verified experiences & adding to itinerary...");
    } else if (lower.includes("replace") || lower.includes("alternative") || lower.includes("another option")) {
      setLoadingStatusText("Finding alternative options & updating plan...");
    } else if (lower.includes("plan") || lower.includes("trip")) {
      setLoadingStatusText("Planning your customized Karnataka itinerary...");
    } else {
      setLoadingStatusText("Namma AI is finding verified experiences & calculating optimal budget...");
    }

    try {
      const response = await runAgent({
        conversation_id: conversationId || undefined,
        message: text,
      });

      if (!conversationId && response.conversation_id) {
        setConversationId(response.conversation_id);
      }

      setCurrentStep(response.current_agent_step || "COMPLETED");

      let hasItin = false;
      let hasSearch = false;

      if (response.itinerary && response.itinerary.days && response.itinerary.days.length > 0) {
        setItinerary(response.itinerary);
        setActiveTab("itinerary");
        hasItin = true;
      }
      if (response.budget) {
        setBudget(response.budget);
      }
      if (response.changed_items && response.changed_items.length > 0) {
        setChangedItems(response.changed_items);
      }
      if (response.search_results && response.search_results.length > 0) {
        setSearchResults(response.search_results);
        hasSearch = true;
        if (!response.itinerary) {
          setActiveTab("marketplace");
        }
      }
      if (response.trip_id) {
        setTripId(response.trip_id);
      }
      if (response.extracted_requirements) {
        setExtractedRequirements(response.extracted_requirements);
      }
      if (response.approval_required !== undefined) {
        setApprovalRequired(response.approval_required);
        setApprovalPrompt(response.approval_prompt || null);
        setApprovalStatus(response.approval_status || null);
      }
      if (response.booking_state) {
        setBookingState(response.booking_state);
        setActiveTab("booking");
      }

      // Determine cardType for the assistant message
      let cardType: "itinerary" | "search" | "comparison" | "approval" | "booking" | "budget" | undefined;
      let cardData: any = undefined;

      if (response.approval_required && response.approval_prompt) {
        cardType = "approval";
        cardData = {
          prompt: response.approval_prompt,
          requirements: response.extracted_requirements,
          itinerary: response.itinerary,
          budget: response.budget,
        };
      } else if (response.booking_state && response.booking_state.success) {
        cardType = "booking";
        cardData = response.booking_state;
      } else if (hasItin) {
        cardType = "itinerary";
        cardData = response.itinerary;
      } else if (hasSearch) {
        cardType = "search";
        cardData = response.search_results;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `${response.id || "ai"}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          role: "assistant",
          content: response.content,
          step: response.current_agent_step,
          created_at: response.created_at || new Date().toISOString(),
          cardType,
          cardData,
        },
      ]);
    } catch (err: any) {
      console.error("Agent error:", err);
      let userFriendlyError = "I couldn't complete that adjustment with the current constraints. You can ask me to change dates, budget, or try another option.";
      if (err.response?.data?.detail && typeof err.response.data.detail === "string" && !err.response.data.detail.includes("Traceback") && !err.response.data.detail.includes("sqlalchemy")) {
        userFriendlyError = err.response.data.detail;
      }
      setError(null);
      setCurrentStep("IDLE");
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: userFriendlyError,
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };


  const handleApproveAction = () => {
    setApprovalRequired(false);
    handleSend("Yes, I approve. Please proceed.");
  };

  const handleDeclineAction = () => {
    setApprovalRequired(false);
    handleSend("Not now, please keep searching for alternatives.");
  };

  const handleKeepSearching = () => {
    setApprovalRequired(false);
    handleSend("Show me more alternative options for this trip.");
  };

  const handlePaymentCheckout = async () => {
    if (!bookingState?.payment_order_id || !bookingState.booking_id) return;
    setIsPaying(true);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || typeof window.Razorpay === "undefined") {
        // Fallback simulated payment in test environment
        const verified = await verifyPayment({
          booking_id: bookingState.booking_id,
          razorpay_order_id: bookingState.payment_order_id,
          razorpay_payment_id: `pay_mock_${Date.now()}`,
          razorpay_signature: "mock_signature_valid",
        });
        if (verified.success) {
          setBookingState((prev) =>
            prev ? { ...prev, status: "CONFIRMED", payment_status: "PAID" } : null
          );
          setMessages((prev) => [
            ...prev,
            {
              id: `pay-${Date.now()}`,
              role: "assistant",
              content: `Payment of ${formatCurrency(
                bookingState.total_amount || 0
              )} was verified successfully! Your booking is now confirmed.`,
              created_at: new Date().toISOString(),
              cardType: "booking",
              cardData: {
                ...bookingState,
                status: "CONFIRMED",
                payment_status: "PAID",
              },
            },
          ]);
        }
        return;
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_placeholder",
        amount: Math.round((bookingState.total_amount || 0) * 100),
        currency: "INR",
        name: "NammaConnect",
        description: `Booking #${bookingState.booking_code || "NC"}`,
        order_id: bookingState.payment_order_id,
        handler: async (response: any) => {
          try {
            const verifyRes = await verifyPayment({
              booking_id: bookingState.booking_id!,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            if (verifyRes.success) {
              setBookingState((prev) =>
                prev ? { ...prev, status: "CONFIRMED", payment_status: "PAID" } : null
              );
              setMessages((prev) => [
                ...prev,
                {
                  id: `pay-${Date.now()}`,
                  role: "assistant",
                  content: `Payment verified successfully! Receipt #${response.razorpay_payment_id}. Your booking is fully confirmed.`,
                  created_at: new Date().toISOString(),
                  cardType: "booking",
                  cardData: {
                    ...bookingState,
                    status: "CONFIRMED",
                    payment_status: "PAID",
                  },
                },
              ]);
            }
          } catch (e: any) {
            setError("Payment verification failed. Please contact support.");
          }
        },
        prefill: {
          name: user?.full_name || "",
          email: user?.email || "",
          contact: user?.phone || "",
        },
        theme: {
          color: "#7c3aed",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e: any) {
      setError(e.message || "Could not launch Razorpay checkout.");
    } finally {
      setIsPaying(false);
    }
  };

  const handleResetChat = () => {
    try {
      localStorage.removeItem(AI_WORKSPACE_STORAGE_KEY);
    } catch {}
    isLocalChatActiveRef.current = false;
    setSearchParams({}, { replace: true });
    setConversationId(null);
    setItinerary(null);
    setBudget(null);
    setSearchResults([]);
    setBookingState(null);
    setExtractedRequirements(null);
    setChangedItems([]);
    setApprovalRequired(false);
    setApprovalPrompt(null);
    setApprovalStatus(null);
    setTripId(null);
    setCurrentStep("IDLE");
    setActiveTab("itinerary");
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        content: `Namaskara ${user?.full_name ? user.full_name.split(" ")[0] : ""}! Ready for a new travel plan. Where would you like to explore in Karnataka next?`,
        created_at: new Date().toISOString(),
      },
    ]);
  };

  const handleOpenServiceModal = async (serviceId: string) => {
    try {
      const found = searchResults.find((s) => s.id === serviceId);
      if (found) {
        setSelectedDetailService(found);
        setIsDetailModalOpen(true);
      } else {
        const detail = await getServiceDetail(serviceId);
        setSelectedDetailService(detail);
        setIsDetailModalOpen(true);
      }
    } catch {
      const found = searchResults.find((s) => s.id === serviceId);
      if (found) {
        setSelectedDetailService(found);
        setIsDetailModalOpen(true);
      }
    }
  };

  const handleAddToTrip = async (service: any) => {
    try {
      await saveService(service.id);
      setSavedServiceIds((prev) => new Set([...prev, service.id]));
      setMessages((prev) => [
        ...prev,
        {
          id: `saved-${Date.now()}`,
          role: "assistant",
          content: `Added **${service.title}** to your saved trip wishlist!`,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (e) {
      console.warn("Could not save service to wishlist:", e);
    }
  };

  const handleItemAction = (action: "replace" | "remove" | "view", item: any) => {
    if (action === "view" && item.service_id) {
      handleOpenServiceModal(item.service_id);
    } else if (action === "replace") {
      handleSend(`Replace "${item.title}" with a different activity or stay`);
    } else if (action === "remove") {
      handleSend(`Remove "${item.title}" from this itinerary`);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-[1720px] mx-auto px-2 sm:px-4 py-2 select-none">
      {/* ── Workspace Header ── */}
      <header className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowLeftSidebarMobile(!showLeftSidebarMobile)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 md:hidden"
            aria-label="Toggle Navigation Sidebar"
          >
            <Menu className="h-4 w-4" />
          </button>

          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-600/20">
            <Sparkles className="h-4 w-4 animate-pulse" />
          </div>

          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              Namma AI Travel Agent
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                Autonomous
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Conversational travel agent powered by LangGraph, real Karnataka catalog, & verified booking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetChat}
            className="text-xs h-8 gap-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            title="Start new conversation"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Chat</span>
          </Button>

          <button
            type="button"
            onClick={() => setShowRightPanelMobile(!showRightPanelMobile)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 lg:hidden"
            aria-label="Toggle Context Panel"
          >
            {showRightPanelMobile ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRightOpen className="h-4 w-4" />
            )}
          </button>
        </div>
      </header>

      {/* ── Desktop 3-Column Workspace Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 flex-1 mt-2.5 overflow-hidden">
        {/* ── COLUMN 1: LEFT NAVIGATION & SAVED TRIPS (2 cols on md, 2 cols on lg) ── */}
        <div
          className={cn(
            "fixed inset-y-16 left-0 z-40 w-72 bg-white dark:bg-slate-900 p-4 shadow-xl md:static md:z-auto md:w-auto md:p-0 md:shadow-none md:col-span-3 lg:col-span-2 transition-transform duration-300",
            showLeftSidebarMobile ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          )}
        >
          <div className="h-full flex flex-col justify-between">
            <LeftNavigationSidebar
              tripId={tripId}
              destination={extractedRequirements?.destination_district}
              duration={extractedRequirements?.duration_days}
              totalDays={itinerary?.total_days}
              onNewChat={handleResetChat}
              onOpenMemory={() => setIsMemoryModalOpen(true)}
            />
          </div>
        </div>

        {/* ── COLUMN 2: CENTER AI CONVERSATION STREAM & STRUCTURED CARDS (6 cols on lg) ── */}
        <div className="md:col-span-9 lg:col-span-6 flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          {/* Status Header & Constraint Chips */}
          <div className="px-4 py-2 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    isRehydrating || isLoading ? "bg-amber-500 animate-ping" : "bg-emerald-500"
                  )}
                />
                <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                  {isRehydrating
                    ? "Restoring trip session from backend..."
                    : isLoading
                    ? "Namma AI is checking Karnataka inventory..."
                    : "Namma AI is Ready"}
                </span>
              </div>

              {itinerary?.total_estimated_cost !== undefined && (
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  Plan: {formatCurrency(itinerary.total_estimated_cost)}
                </span>
              )}
            </div>

            {/* Editable Constraint Chips */}
            <ConstraintChips
              requirements={extractedRequirements}
              onChipClick={(prompt) => {
                if (!isLoading && !isRehydrating) handleSend(prompt);
              }}
            />
          </div>

          {/* Conversation Messages Stream (Silent Execution: No raw traces) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isRehydrating ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3">
                <div className="h-10 w-10 rounded-2xl bg-purple-100 dark:bg-purple-950/80 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Restoring Your Trip Session...
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Fetching authoritative itinerary, prices, and history from Namma Connect.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "flex flex-col max-w-[95%] sm:max-w-[90%]",
                    m.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  {/* Role Header */}
                  <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-400">
                    {m.role === "user" ? (
                      <>
                        <span>You</span>
                        <UserIcon className="h-3 w-3" />
                      </>
                    ) : (
                      <>
                        <Bot className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                        <span className="font-bold text-slate-700 dark:text-slate-300">Namma AI</span>
                      </>
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={cn(
                      "p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed",
                      m.role === "user"
                        ? "bg-purple-600 text-white rounded-br-xs shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 rounded-bl-xs border border-slate-200 dark:border-slate-700/60 shadow-2xs w-full"
                    )}
                  >
                    <div className="whitespace-pre-line">{m.content}</div>

                    {/* Inline Structured Card for Assistant Messages */}
                    {m.role === "assistant" && m.cardType === "itinerary" && (m.cardData || itinerary) && (
                      <div className="mt-3">
                        <TripOverviewCard
                          itinerary={m.cardData || itinerary}
                          budget={budget}
                          requirements={extractedRequirements}
                          tripId={tripId}
                          onViewDetailed={() => setActiveTab("itinerary")}
                          onCustomize={(prompt) => handleSend(prompt)}
                          onBookTrip={() => handleSend("Book this trip now")}
                        />
                      </div>
                    )}

                    {m.role === "assistant" && m.cardType === "search" && searchResults.length > 0 && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {searchResults.slice(0, 4).map((svc) => (
                          <SearchResultCard
                            key={svc.id}
                            service={svc}
                            isSaved={savedServiceIds.has(svc.id)}
                            onSelect={(s) => handleSend(`Select ${s.title} for this trip`)}
                            onAddToTrip={handleAddToTrip}
                            onCardClick={handleOpenServiceModal}
                          />
                        ))}
                      </div>
                    )}

                    {m.role === "assistant" && m.cardType === "approval" && approvalRequired && approvalPrompt && (
                      <div className="mt-3">
                        <ApprovalGateCard
                          prompt={approvalPrompt}
                          requirements={extractedRequirements}
                          itinerary={itinerary}
                          budget={budget}
                          onApprove={handleApproveAction}
                          onDecline={handleDeclineAction}
                          onKeepSearching={handleKeepSearching}
                          isLoading={isLoading}
                        />
                      </div>
                    )}

                    {m.role === "assistant" && m.cardType === "booking" && bookingState && (
                      <div className="mt-3">
                        <BookingStatusCard
                          bookingState={bookingState}
                          isPaying={isPaying}
                          onPayNow={handlePaymentCheckout}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {/* Thinking / Searching Spinner */}
            {isLoading && (
              <div className="mr-auto items-start max-w-[85%]">
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-400">
                  <Bot className="h-3 w-3 text-purple-600" />
                  <span>Thinking & Searching...</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-bl-xs border border-slate-200 dark:border-slate-700/60 text-xs flex items-center gap-2 shadow-2xs">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-purple-600" />
                  <span>{loadingStatusText}</span>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Persistent Bottom Composer with Contextual Quick Actions */}
          <AIComposer
            onSend={(text) => handleSend(text)}
            isLoading={isLoading || isRehydrating}
            hasItinerary={Boolean(itinerary && itinerary.days && itinerary.days.length > 0)}
            hasBooking={Boolean(bookingState && bookingState.success)}
          />
        </div>

        {/* ── COLUMN 3: RIGHT DYNAMIC CONTEXTUAL PANEL (4 cols on lg) ── */}
        <div
          className={cn(
            "fixed inset-y-16 right-0 z-40 w-80 bg-white dark:bg-slate-900 p-4 shadow-xl lg:static lg:z-auto lg:w-auto lg:p-0 lg:shadow-none lg:col-span-4 transition-transform duration-300",
            showRightPanelMobile ? "translate-x-0" : "translate-x-full lg:translate-x-0 hidden lg:block"
          )}
        >
          <DynamicContextPanel
            currentStep={currentStep}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            itinerary={itinerary}
            budget={budget}
            searchResults={searchResults}
            bookingState={bookingState}
            requirements={extractedRequirements}
            changedItems={changedItems}
            savedServiceIds={savedServiceIds}
            onSelectService={handleOpenServiceModal}
            onAddToTrip={handleAddToTrip}
            onChooseComparison={(item) => handleSend(`Choose ${item.title} and add it to my itinerary`)}
            onItemAction={handleItemAction}
            onPayNow={handlePaymentCheckout}
            isPaying={isPaying}
            onQuickPrompt={(prompt) => handleSend(prompt)}
          />
        </div>
      </div>

      {/* ── Service Detail Modal ── */}
      <ServiceDetailModal
        service={selectedDetailService}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedDetailService(null);
        }}
        onAddToTrip={handleAddToTrip}
        onSelect={(svc) => handleSend(`Select ${svc.title} for this trip`)}
      />

      {/* ── Namma Memory / Preferences Modal ── */}
      {isMemoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <BrainCircuit className="h-5 w-5 text-purple-600" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Traveler Memory & Preferences
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMemoryModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <NammaMemoryCard
              onQuickInterestClick={(prompt) => {
                setIsMemoryModalOpen(false);
                handleSend(prompt);
              }}
            />

            <div className="pt-2">
              <Button
                type="button"
                onClick={() => setIsMemoryModalOpen(false)}
                className="w-full text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white"
              >
                Close Memory View
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default NammaAIWorkspace;
