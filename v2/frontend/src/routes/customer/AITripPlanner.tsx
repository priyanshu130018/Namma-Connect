import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { formatCurrency } from "@/lib/utils";
import {
  AIMessageResponse,
  GenerateTripPlanRequest,
  TripPlanResponse,
  TripPlanItineraryProposal,
  BookingHandoffResponse,
  createAIConversation,
  sendMessageToAI,
  generateTripPlan,
  refineTripPlan,
  confirmTripPlan,
  getTripPlan,
  getBookingHandoff,
} from "@/services/aiService";
import { ChatPanel, TripPreview, QuickAction } from "@/components/ai-planner";
import {
  QUICK_ACTIONS,
  ModifyTripContext,
  mergeConstraints,
} from "@/components/ai-planner/plannerShared";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TravelPreferences } from "@/types";
import { getTravelPreferences, updateTravelPreferences } from "@/services/userService";
import { TravelPreferencesForm } from "@/components/customer/TravelPreferencesForm";
import {
  preferencesToConstraints,
  summarizePreferences,
  hasAnyPreferences,
} from "@/components/customer/travelPreferences";

// The four spec quick-starts shown on the empty state.
const WELCOME_PROMPTS = [
  "Plan a weekend trip",
  "Plan a family trip",
  "Plan under ₹20,000",
  "Plan a nature trip",
];

/**
 * Turn a thrown request error into a friendly, user-safe message.
 * Never surfaces raw backend detail strings to the user (spec 10).
 */
function friendlyError(e: any, fallback: string): string {
  const status = e?.response?.status as number | undefined;
  if (e?.code === "ERR_NETWORK" || e?.message === "Network Error")
    return "I couldn't reach the planning service. Check your connection and try again.";
  if (status === 401 || status === 403)
    return "Your session looks like it expired. Please sign in again, then retry.";
  if (status === 404)
    return "I couldn't find what I needed for that request. Try different dates or a nearby district.";
  if (status === 409)
    return "Those details conflict (usually dates or budget). Adjust them and try again.";
  if (typeof status === "number" && status >= 500)
    return "Our planning service is having a moment. Please try again shortly.";
  return fallback;
}

let msgSeq = 0;
function localMessage(role: AIMessageResponse["role"], content: string): AIMessageResponse {
  msgSeq += 1;
  return {
    id: `local-${Date.now()}-${msgSeq}`,
    conversation_id: "local",
    role,
    content,
    created_at: new Date().toISOString(),
  };
}

export function AITripPlannerPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const modifyCtx = (location.state as { modifyTrip?: ModifyTripContext } | null)?.modifyTrip;

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIMessageResponse[]>([
    localMessage(
      "assistant",
      "Hi! I'm your Namma trip planner. Tell me where in Karnataka you'd like to go, how many days, who's travelling, and your budget — I'll build a verified, day-by-day itinerary you can book."
    ),
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const [constraints, setConstraints] = useState<GenerateTripPlanRequest>({});
  const [plan, setPlan] = useState<TripPlanResponse | null>(null);
  const [agentWorking, setAgentWorking] = useState(false);
  const [refining, setRefining] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [booking, setBooking] = useState(false);
  const [handoff, setHandoff] = useState<BookingHandoffResponse | null>(null);

  // ── Travel preferences: personalize the planner so it doesn't re-ask known info ──
  const [savedPrefs, setSavedPrefs] = useState<TravelPreferences>({});
  const [sessionPrefs, setSessionPrefs] = useState<TravelPreferences>({});
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [showPrefsDialog, setShowPrefsDialog] = useState(false);
  const [draftPrefs, setDraftPrefs] = useState<TravelPreferences>({});
  const [savingPrefsToProfile, setSavingPrefsToProfile] = useState(false);
  const [prefsSaveError, setPrefsSaveError] = useState<string | null>(null);
  const prefsApplied = useRef(false);

  // Keep a live ref to constraints so async chat handoffs read the latest set.
  const constraintsRef = useRef(constraints);
  constraintsRef.current = constraints;

  // Last failable action, so the chat error surface can offer "Try again".
  const retryRef = useRef<null | (() => void)>(null);

  const pushMessage = useCallback((msg: AIMessageResponse) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const handleRetry = useCallback(() => {
    setChatError(null);
    retryRef.current?.();
  }, []);

  // Create the conversation once, and seed "Modify with AI" context if present.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const conv = await createAIConversation({
          title: "Trip Planner",
          context_type: "trip_planning",
        });
        if (!cancelled) setConversationId(conv.id);
      } catch {
        // Non-fatal: a conversation will be created lazily on first send.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load saved travel preferences once, so the planner can personalize itself.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await getTravelPreferences();
        if (!cancelled) {
          setSavedPrefs(p || {});
          setSessionPrefs(p || {});
        }
      } catch {
        // Non-fatal: the planner works fine without preferences.
      } finally {
        if (!cancelled) setPrefsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Seed preference-derived context UNDER any explicit trip/conversation values
  // (prefs fill gaps like pace/interests; they never set destination/dates/party/budget).
  useEffect(() => {
    if (!prefsLoaded || prefsApplied.current) return;
    prefsApplied.current = true;
    if (sessionPrefs.ai_use_preferences === false) return;
    const seed = preferencesToConstraints(sessionPrefs);
    if (Object.keys(seed).length === 0) return;
    setConstraints((prev) => mergeConstraints(seed, prev));
  }, [prefsLoaded, sessionPrefs]);

  // Apply an incoming "Modify with AI" trip context exactly once.
  const appliedCtx = useRef(false);
  useEffect(() => {
    if (appliedCtx.current || !modifyCtx) return;
    appliedCtx.current = true;

    setConstraints((prev) =>
      mergeConstraints(prev, {
        destination: modifyCtx.destination,
        start_date: modifyCtx.startDate,
        end_date: modifyCtx.endDate,
        party_size: modifyCtx.guestCount,
        max_budget: modifyCtx.totalAmount,
      })
    );

    const bits = [
      modifyCtx.serviceTitle ? `"${modifyCtx.serviceTitle}"` : "your booking",
      modifyCtx.destination ? `in ${modifyCtx.destination}` : "",
      modifyCtx.startDate ? `from ${modifyCtx.startDate}` : "",
    ]
      .filter(Boolean)
      .join(" ");
    pushMessage(
      localMessage(
        "assistant",
        `I've loaded ${bits}. Tell me what you'd like to change — add a day, swap an activity, lower the budget, or extend to nearby experiences — and I'll rework the plan.`
      )
    );
  }, [modifyCtx, pushMessage]);

  // ── Agentic generation (full pipeline, one synchronous call) ──
  const runGenerate = useCallback(
    async (
      next: GenerateTripPlanRequest,
      successNote?: (p: TripPlanItineraryProposal) => string
    ) => {
      retryRef.current = () => void runGenerate(next, successNote);
      setAgentWorking(true);
      setChatError(null);
      setHandoff(null);
      try {
        const result = await generateTripPlan(next);
        setPlan(result);
        if (result.status === "FAILED") {
          pushMessage(
            localMessage(
              "assistant",
              result.last_error ||
                "I couldn't complete that plan. Try adjusting the destination, dates, or budget."
            )
          );
        } else if (result.proposal) {
          const p = result.proposal;
          const note = successNote
            ? successNote(p)
            : `Here's a ${p.total_days}-day plan${
                next.destination_district ? ` for ${next.destination_district}` : ""
              } — estimated ${formatCurrency(p.estimated_total_cost)}. Review it on the right, then refine or book.`;
          pushMessage(localMessage("assistant", note));
        }
      } catch (e: any) {
        const detail = friendlyError(e, "Something went wrong while planning. Please try again.");
        setChatError(detail);
        pushMessage(localMessage("assistant", `Sorry — ${detail}`));
      } finally {
        setAgentWorking(false);
      }
    },
    [pushMessage]
  );

  const ensureConversation = useCallback(async (): Promise<string | null> => {
    if (conversationId) return conversationId;
    try {
      const conv = await createAIConversation({
        title: "Trip Planner",
        context_type: "trip_planning",
      });
      setConversationId(conv.id);
      return conv.id;
    } catch {
      return null;
    }
  }, [conversationId]);

  // ── Conversational turn; auto-hands off to the agent when ready ──
  const handleSend = useCallback(
    async (text?: string) => {
      const content = (text ?? inputValue).trim();
      if (!content || isSending || agentWorking) return;
      retryRef.current = () => void handleSend(content);
      setInputValue("");
      setChatError(null);
      pushMessage(localMessage("user", content));
      setIsSending(true);
      try {
        const convId = await ensureConversation();
        if (!convId) throw new Error("Could not start a conversation.");
        const reply = await sendMessageToAI(convId, { content });
        pushMessage(reply);

        const info = reply.trip_planner_handoff;
        if (info) {
          const merged = mergeConstraints(constraintsRef.current, info.suggested_params);
          setConstraints(merged);
          const action = (info.recommended_action || "").toUpperCase();
          const wantsPlan = /GENERAT|PLAN|ITINERAR|BUILD/.test(action);
          const hasEnough =
            !!merged.destination_district && (!!merged.duration_days || !!merged.end_date);
          if (wantsPlan && hasEnough) await runGenerate(merged);
        }
      } catch (e: any) {
        setChatError(friendlyError(e, "Your message didn't go through. Please try again."));
      } finally {
        setIsSending(false);
      }
    },
    [inputValue, isSending, agentWorking, ensureConversation, pushMessage, runGenerate]
  );

  // ── Refine: remove a single activity ──
  const handleRemoveItem = useCallback(
    async (dayNumber: number, itemId: string) => {
      if (!plan || refining) return;
      retryRef.current = () => void handleRemoveItem(dayNumber, itemId);
      const before = plan.proposal?.estimated_total_cost;
      setRefining(true);
      setChatError(null);
      try {
        const result = await refineTripPlan(plan.plan_id, {
          action: "REMOVE",
          day_number: dayNumber,
          item_id: itemId,
        });
        setPlan(result);
        const after = result.proposal?.estimated_total_cost;
        if (typeof after === "number") {
          const saved =
            typeof before === "number" && before > after
              ? ` That saves ${formatCurrency(before - after)}.`
              : "";
          pushMessage(
            localMessage(
              "assistant",
              `Done — I removed that activity. Your estimated total is now ${formatCurrency(after)}.${saved}`
            )
          );
        }
      } catch (e: any) {
        setChatError(friendlyError(e, "I couldn't update the itinerary. Please try again."));
      } finally {
        setRefining(false);
      }
    },
    [plan, refining, pushMessage]
  );

  // ── Refine: "Make it cheaper" (target 80% of current estimate) ──
  const handleReduceBudget = useCallback(async () => {
    if (!plan?.proposal || refining) return;
    retryRef.current = () => void handleReduceBudget();
    const before = plan.proposal.estimated_total_cost;
    const target = Math.max(1000, Math.round(before * 0.8));
    setRefining(true);
    setChatError(null);
    pushMessage(localMessage("user", "Make it cheaper."));
    try {
      const result = await refineTripPlan(plan.plan_id, {
        action: "REDUCE_BUDGET",
        target_budget: target,
      });
      setPlan(result);
      const after = result.proposal?.estimated_total_cost;
      if (typeof after === "number") {
        pushMessage(
          localMessage(
            "assistant",
            `Done — I trimmed the plan to fit a tighter budget. Your estimated total is now ${formatCurrency(
              after
            )}, down from ${formatCurrency(before)}.`
          )
        );
      } else {
        pushMessage(
          localMessage("assistant", `Done — I trimmed the plan toward ${formatCurrency(target)}.`)
        );
      }
    } catch (e: any) {
      setChatError(friendlyError(e, "I couldn't reduce the budget. Please try again."));
    } finally {
      setRefining(false);
    }
  }, [plan, refining, pushMessage]);

  // ── Regenerate with mutated constraints (add day / remove trekking / more food) ──
  const regenerateWith = useCallback(
    async (
      mutate: (c: GenerateTripPlanRequest) => GenerateTripPlanRequest,
      userLabel: string,
      successNote?: (p: TripPlanItineraryProposal) => string
    ) => {
      const base = constraintsRef.current;
      if (!base.destination_district) {
        pushMessage(
          localMessage("assistant", "Tell me your destination first and I'll build the plan.")
        );
        return;
      }
      const next = mutate({ ...base });
      setConstraints(next);
      pushMessage(localMessage("user", userLabel));
      await runGenerate(next, successNote);
    },
    [pushMessage, runGenerate]
  );

  const busy = agentWorking || refining || confirming || booking;

  const quickActions: QuickAction[] = QUICK_ACTIONS.map((qa) => {
    switch (qa.key) {
      case "cheaper":
        return {
          key: qa.key,
          label: qa.label,
          disabled: busy || !plan?.proposal,
          onClick: handleReduceBudget,
        };
      case "remove-trekking":
        return {
          key: qa.key,
          label: qa.label,
          disabled: busy,
          onClick: () =>
            regenerateWith((c) => {
              c.preferred_categories = (c.preferred_categories || []).filter(
                (x) => !/adventur|trek/i.test(x)
              );
              c.special_interests = (c.special_interests || []).filter(
                (x) => !/trek|hik/i.test(x)
              );
              c.notes = [c.notes, "Avoid trekking and strenuous hikes."]
                .filter(Boolean)
                .join(" ");
              return c;
            }, "Remove trekking from the plan.", (p) =>
              `Done — I dropped the trekking and rebuilt the plan around gentler experiences. Your estimated total is now ${formatCurrency(
                p.estimated_total_cost
              )}.`),
        };
      case "add-day":
        return {
          key: qa.key,
          label: qa.label,
          disabled: busy,
          onClick: () =>
            regenerateWith((c) => {
              c.duration_days = (c.duration_days || plan?.proposal?.total_days || 2) + 1;
              return c;
            }, "Add one more day.", (p) =>
              `Done — your trip is now ${p.total_days} days. The updated estimated total is ${formatCurrency(
                p.estimated_total_cost
              )}.`),
        };
      case "more-food":
        return {
          key: qa.key,
          label: qa.label,
          disabled: busy,
          onClick: () =>
            regenerateWith((c) => {
              c.preferred_categories = Array.from(
                new Set([...(c.preferred_categories || []), "food"])
              );
              c.notes = [c.notes, "Include more local food and dining experiences."]
                .filter(Boolean)
                .join(" ");
              return c;
            }, "Add more food experiences.", (p) =>
              `Done — I worked in more local food and dining stops. Your estimated total is now ${formatCurrency(
                p.estimated_total_cost
              )}.`),
        };
      case "change-destination":
      default:
        return {
          key: qa.key,
          label: qa.label,
          disabled: busy,
          onClick: () => setInputValue("Change the destination to "),
        };
    }
  });

  // ── Confirm / save the plan ──
  const handleSave = useCallback(async () => {
    if (!plan || confirming) return;
    retryRef.current = () => void handleSave();
    setConfirming(true);
    setChatError(null);
    try {
      await confirmTripPlan(plan.plan_id, {});
      try {
        const refreshed = await getTripPlan(plan.plan_id);
        setPlan(refreshed);
      } catch {
        /* keep current plan if refresh fails */
      }
      pushMessage(
        localMessage(
          "assistant",
          "Saved! Your trip is confirmed. Continue to checkout whenever you're ready to book the experiences."
        )
      );
    } catch (e: any) {
      setChatError(friendlyError(e, "I couldn't save the trip. Please try again."));
    } finally {
      setConfirming(false);
    }
  }, [plan, confirming, pushMessage]);

  // ── Booking handoff ──
  const handleBook = useCallback(async () => {
    if (!plan || booking) return;
    retryRef.current = () => void handleBook();
    setBooking(true);
    setChatError(null);
    try {
      if (!["CONFIRMED", "HANDED_OFF"].includes(plan.status)) {
        await confirmTripPlan(plan.plan_id, {});
      }
      const h = await getBookingHandoff(plan.plan_id);
      setHandoff(h);
      try {
        const refreshed = await getTripPlan(plan.plan_id);
        setPlan(refreshed);
      } catch {
        /* non-fatal */
      }
      if (h.checkout_url) {
        if (/^https?:\/\//i.test(h.checkout_url)) window.location.href = h.checkout_url;
        else navigate(h.checkout_url);
      } else {
        pushMessage(
          localMessage(
            "assistant",
            "Your experiences are ready to book — I've sent them to My Trip. Head there to complete checkout."
          )
        );
        navigate("/my-trip");
      }
    } catch (e: any) {
      setChatError(friendlyError(e, "I couldn't prepare the booking. Please try again."));
    } finally {
      setBooking(false);
    }
  }, [plan, booking, navigate, pushMessage]);

  // ── Share: native share sheet, clipboard fallback ──
  const handleShare = useCallback(async () => {
    const p = plan?.proposal;
    if (!p) return;
    const dest = plan?.constraints.destination_district || "Karnataka";
    const text = [
      `My ${p.total_days}-day Karnataka trip to ${dest}`,
      `Estimated total: ${formatCurrency(p.estimated_total_cost)}`,
      "",
      ...p.days.map(
        (d) =>
          `Day ${d.day_number}${d.theme ? ` — ${d.theme}` : ""}: ${
            d.items.map((i) => i.title).join(", ") || "—"
          }`
      ),
    ].join("\n");
    try {
      const nav = typeof navigator !== "undefined" ? (navigator as any) : undefined;
      if (nav?.share) {
        await nav.share({ title: `${dest} trip`, text });
      } else if (nav?.clipboard?.writeText) {
        await nav.clipboard.writeText(text);
        pushMessage(
          localMessage(
            "assistant",
            "I copied your itinerary summary to the clipboard — paste it anywhere to share."
          )
        );
      } else {
        pushMessage(
          localMessage(
            "assistant",
            "Sharing isn't available in this browser, but you can screenshot the itinerary on the right."
          )
        );
      }
    } catch {
      /* user dismissed the native share sheet — nothing to do */
    }
  }, [plan, pushMessage]);

  // ── Travel-preference indicator + per-trip editing ──
  const preferencesActive =
    prefsLoaded && sessionPrefs.ai_use_preferences !== false && hasAnyPreferences(sessionPrefs);
  const preferencesSummary = summarizePreferences(sessionPrefs);
  // Only enable "Save to my profile" when the draft actually differs from what's stored.
  const prefsDirtyVsProfile = JSON.stringify(draftPrefs) !== JSON.stringify(savedPrefs);

  const openPrefsDialog = useCallback(() => {
    setDraftPrefs(sessionPrefs);
    setPrefsSaveError(null);
    setShowPrefsDialog(true);
  }, [sessionPrefs]);

  // Apply edited prefs to THIS trip only (does not touch the saved profile).
  const applyPrefsForTrip = useCallback(() => {
    setSessionPrefs(draftPrefs);
    if (draftPrefs.ai_use_preferences !== false) {
      const seed = preferencesToConstraints(draftPrefs);
      setConstraints((prev) => mergeConstraints(prev, seed));
    }
    setShowPrefsDialog(false);
  }, [draftPrefs]);

  // Explicitly persist edited prefs to the profile, then also apply to this trip.
  const savePrefsToProfile = useCallback(async () => {
    setSavingPrefsToProfile(true);
    setPrefsSaveError(null);
    try {
      const updated = await updateTravelPreferences(draftPrefs);
      const nextPrefs = updated || draftPrefs;
      setSavedPrefs(nextPrefs);
      setSessionPrefs(nextPrefs);
      if (nextPrefs.ai_use_preferences !== false) {
        const seed = preferencesToConstraints(nextPrefs);
        setConstraints((prev) => mergeConstraints(prev, seed));
      }
      setShowPrefsDialog(false);
    } catch {
      setPrefsSaveError(
        "I couldn't save these to your profile, but they still apply to this trip."
      );
    } finally {
      setSavingPrefsToProfile(false);
    }
  }, [draftPrefs]);

  // Banner text shown when arriving from "My Trip → Modify with AI".
  const modifyingLabel = modifyCtx
    ? modifyCtx.destination
      ? `Modifying your existing ${modifyCtx.destination} trip`
      : "Modifying your existing trip"
    : undefined;

  return (
    <div className="flex flex-col gap-4 lg:grid lg:h-[calc(100vh-6.5rem)] lg:min-h-[600px] lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="h-[70vh] min-h-[420px] lg:h-full lg:min-h-0">
        <ChatPanel
          messages={messages}
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSend={handleSend}
          isSending={isSending || refining}
          error={chatError}
          onRetry={handleRetry}
          modifyingLabel={modifyingLabel}
          quickPrompts={WELCOME_PROMPTS}
          quickActions={quickActions}
          showQuickActions={!!plan && !agentWorking}
          agentWorking={agentWorking}
          agentStatus={plan?.status}
          preferencesActive={preferencesActive}
          preferencesSummary={preferencesSummary}
          onEditPreferences={openPrefsDialog}
        />
      </div>

      <div className="h-[80vh] min-h-[480px] lg:h-full lg:min-h-0">
        <TripPreview
          plan={plan}
          isWorking={agentWorking}
          handoff={handoff}
          confirming={confirming}
          booking={booking}
          busy={refining}
          onRegenerate={() =>
            constraints.destination_district
              ? runGenerate(constraints)
              : pushMessage(
                  localMessage(
                    "assistant",
                    "Tell me a destination and I'll build a fresh plan."
                  )
                )
          }
          onRemoveItem={handleRemoveItem}
          onSave={handleSave}
          onShare={handleShare}
          onBook={handleBook}
        />
      </div>

      <Dialog
        isOpen={showPrefsDialog}
        onClose={() => setShowPrefsDialog(false)}
        title="Preferences for this trip"
        description="Tweak how the planner works for this trip. This won't change your saved profile unless you save it."
        className="max-w-lg"
      >
        <TravelPreferencesForm
          value={draftPrefs}
          onChange={setDraftPrefs}
          idPrefix="trip-tp"
          disabled={savingPrefsToProfile}
        />
        {prefsSaveError && (
          <p
            role="alert"
            className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300"
          >
            {prefsSaveError}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 dark:border-slate-800 pt-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPrefsDialog(false)}
            disabled={savingPrefsToProfile}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={savePrefsToProfile}
            isLoading={savingPrefsToProfile}
            disabled={!prefsDirtyVsProfile}
          >
            Save to my profile
          </Button>
          <Button type="button" size="sm" onClick={applyPrefsForTrip} disabled={savingPrefsToProfile}>
            Apply to this trip
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
