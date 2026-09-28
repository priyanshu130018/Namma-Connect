import { useState } from "react";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Clock,
  ChevronRight,
  Check,
  Sliders,
  ShoppingBag,
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import {
  generateTripPlan,
  refineTripPlan,
  confirmTripPlan,
  getBookingHandoff,
  TripPlanResponse,
  BookingHandoffResponse,
  GenerateTripPlanRequest,
} from "@/services/aiService";

interface TripPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDistrict?: string;
}

const KARNATAKA_DISTRICTS = [
  "Kodagu (Coorg)",
  "Chikkamagaluru",
  "Mysuru",
  "Udupi",
  "Shivamogga",
  "Hassan",
  "Uttara Kannada",
  "Bengaluru Rural",
];

const CATEGORIES = ["Stays", "Activities", "Workshops", "Tours", "Food"];

export function TripPlannerModal({ isOpen, onClose, initialDistrict }: TripPlannerModalProps) {
  // Step/View state
  const [plannerState, setPlannerState] = useState<TripPlanResponse | null>(null);
  const [handoffData, setHandoffData] = useState<BookingHandoffResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form state
  const [district, setDistrict] = useState(initialDistrict || "Kodagu (Coorg)");
  const [durationDays, setDurationDays] = useState(2);
  const [partySize, setPartySize] = useState(2);
  const [maxBudget, setMaxBudget] = useState<number | undefined>(15000);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "Stays",
    "Activities",
  ]);
  const [pace, setPace] = useState<"RELAXED" | "MODERATE" | "INTENSE">("MODERATE");
  const [notes, setNotes] = useState("");

  // Refine modal state
  const [targetBudgetInput, setTargetBudgetInput] = useState<string>("");

  const handleGeneratePlan = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const payload: GenerateTripPlanRequest = {
        destination_district: district,
        duration_days: durationDays,
        party_size: partySize,
        max_budget: maxBudget,
        preferred_categories: selectedCategories,
        pace,
        notes: notes.trim() || undefined,
      };
      const result = await generateTripPlan(payload);
      setPlannerState(result);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.detail ||
          err.message ||
          "Failed to generate trip plan. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefineRemove = async (dayNumber: number, itemId: string) => {
    if (!plannerState) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const updated = await refineTripPlan(plannerState.plan_id, {
        action: "REMOVE",
        day_number: dayNumber,
        item_id: itemId,
      });
      setPlannerState(updated);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.detail || err.message || "Failed to remove activity."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefineReplace = async (dayNumber: number, itemId: string) => {
    if (!plannerState) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const updated = await refineTripPlan(plannerState.plan_id, {
        action: "REPLACE",
        day_number: dayNumber,
        item_id: itemId,
      });
      setPlannerState(updated);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.detail || err.message || "Failed to replace activity."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleReduceBudget = async () => {
    if (!plannerState || !targetBudgetInput) return;
    const target = parseFloat(targetBudgetInput);
    if (isNaN(target) || target <= 0) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const updated = await refineTripPlan(plannerState.plan_id, {
        action: "REDUCE_BUDGET",
        target_budget: target,
      });
      setPlannerState(updated);
      setTargetBudgetInput("");
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.detail || err.message || "Failed to adjust budget."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmPlan = async () => {
    if (!plannerState) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await confirmTripPlan(plannerState.plan_id, {
        prompt_text: `Plan trip to ${district} for ${partySize} travelers`,
      });
      const handoff = await getBookingHandoff(plannerState.plan_id);
      setHandoffData(handoff);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.detail ||
          err.message ||
          "Failed to confirm trip plan. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setPlannerState(null);
    setHandoffData(null);
    setErrorMessage(null);
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const renderStatusBadge = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      DRAFT: { label: "Draft", color: "bg-slate-100 text-slate-700" },
      COLLECTING_REQUIREMENTS: { label: "Collecting Info", color: "bg-blue-100 text-blue-800" },
      SEARCHING: { label: "Searching Offerings", color: "bg-amber-100 text-amber-800" },
      BUILDING_ITINERARY: { label: "Building Itinerary", color: "bg-purple-100 text-purple-800" },
      VALIDATING: { label: "Validating Constraints", color: "bg-indigo-100 text-indigo-800" },
      REFINING: { label: "Refining", color: "bg-sky-100 text-sky-800" },
      READY_FOR_REVIEW: { label: "Ready for Review", color: "bg-emerald-100 text-emerald-800" },
      CONFIRMED: { label: "Confirmed", color: "bg-emerald-600 text-white" },
      HANDED_OFF: { label: "Pre-Booking Handoff", color: "bg-teal-600 text-white" },
      FAILED: { label: "Failed", color: "bg-rose-100 text-rose-800" },
    };
    const s = map[status] || { label: status, color: "bg-slate-100 text-slate-700" };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold ${s.color}`}>
        {s.label}
      </span>
    );
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Agentic AI Trip Planner"
      description="Design a personalized, verified multi-day itinerary backed by real agro-hosts and marketplace offerings."
      className="max-w-3xl"
    >
      <div className="space-y-6 py-2">
        {/* Top Header State & Reset */}
        {plannerState && !handoffData && (
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Session Status:</span>
              {renderStatusBadge(plannerState.status)}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
              className="text-xs font-bold gap-1 rounded-xl"
            >
              <RefreshCw className="h-3 w-3" />
              <span>New Plan</span>
            </Button>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setErrorMessage(null)}
              className="h-6 w-6 p-0 text-rose-800"
            >
              ✕
            </Button>
          </div>
        )}

        {/* ── View 1: Requirement Collection Form ── */}
        {!plannerState && !handoffData && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Destination District */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Destination District
                </label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {KARNATAKA_DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Duration Days */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Duration ({durationDays} {durationDays === 1 ? "Day" : "Days"})
                </label>
                <input
                  type="range"
                  min="1"
                  max="7"
                  value={durationDays}
                  onChange={(e) => setDurationDays(parseInt(e.target.value))}
                  className="w-full accent-emerald-600"
                />
              </div>

              {/* Party Size */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Travelers ({partySize} {partySize === 1 ? "Person" : "People"})
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={partySize}
                  onChange={(e) => setPartySize(parseInt(e.target.value) || 1)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Max Budget */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Max Budget (₹ INR)
                </label>
                <input
                  type="number"
                  min="500"
                  step="500"
                  placeholder="e.g. 15000"
                  value={maxBudget || ""}
                  onChange={(e) =>
                    setMaxBudget(e.target.value ? parseFloat(e.target.value) : undefined)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Travel Pace */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Travel Pace
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["RELAXED", "MODERATE", "INTENSE"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPace(p)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                      pace === p
                        ? "bg-emerald-700 text-white shadow-sm"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {p.charAt(0) + p.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Preferred Categories */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Preferred Experiences
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => {
                  const isSelected = selectedCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                        isSelected
                          ? "bg-harvest-600 text-white shadow-sm"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                      <span>{cat}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Special Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Special Interests / Notes (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g., Interested in organic coffee plantation walks, family-friendly homestays..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Action button */}
            <div className="pt-2">
              <Button
                onClick={handleGeneratePlan}
                isLoading={isLoading}
                className="w-full gap-2 font-bold bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl shadow-md py-3"
              >
                <Sparkles className="h-4 w-4" />
                <span>Generate Agentic Itinerary</span>
              </Button>
            </div>
          </div>
        )}

        {/* ── View 2: Generated Itinerary Proposal & Review ── */}
        {plannerState && !handoffData && (
          <div className="space-y-5">
            {/* Summary Banner */}
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">
                  {plannerState.constraints.destination_district} Itinerary (
                  {plannerState.proposal?.total_days || plannerState.constraints.duration_days} Days)
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Pace: {plannerState.constraints.pace || "MODERATE"} • Party:{" "}
                  {plannerState.constraints.party_size} Travelers
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Estimated Total
                </span>
                <span className="text-lg font-black text-emerald-800">
                  {formatCurrency(plannerState.proposal?.estimated_total_cost || 0)}
                </span>
              </div>
            </div>

            {/* Validation & Conflict Report */}
            {plannerState.validation_report && (
              <div
                className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${
                  plannerState.validation_report.is_valid
                    ? "bg-slate-50 border-slate-200 text-slate-800"
                    : "bg-amber-50 border-amber-200 text-amber-900"
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5">
                    {plannerState.validation_report.is_valid ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                    )}
                    <span>
                      {plannerState.validation_report.is_valid
                        ? "Itinerary Validated & Verified"
                        : "Constraint Warnings Detected"}
                    </span>
                  </span>
                  <Badge variant="outline" className="text-[10px] font-bold">
                    Score: {Math.round((plannerState.validation_report.score || 1) * 100)}%
                  </Badge>
                </div>

                {plannerState.validation_report.issues.length > 0 && (
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600 pl-1">
                    {plannerState.validation_report.issues.map((issue, i) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Multi-Day Timeline List */}
            <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
              {plannerState.proposal?.days.map((day) => (
                <Card
                  key={day.day_number}
                  className="p-4 rounded-2xl border-slate-200 bg-white shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold flex items-center justify-center">
                        D{day.day_number}
                      </span>
                      <h5 className="text-xs font-bold text-slate-900">
                        {day.theme || `Day ${day.day_number} Experiences`}
                      </h5>
                    </div>
                    <span className="text-xs font-bold text-slate-700">
                      Day Cost: {formatCurrency(day.estimated_day_cost)}
                    </span>
                  </div>

                  {/* Slots */}
                  <div className="space-y-2">
                    {day.items.map((item) => (
                      <div
                        key={item.item_id}
                        className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-[10px] uppercase text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                              {item.time_slot}
                            </span>
                            <span className="font-bold text-slate-900">{item.title}</span>
                            {item.is_verified && (
                              <ShieldCheck className="h-3.5 w-3.5 text-harvest-600" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            {item.start_time && (
                              <span className="flex items-center gap-0.5">
                                <Clock className="h-3 w-3" />
                                {item.start_time} - {item.end_time}
                              </span>
                            )}
                            {item.provider_name && <span>Host: {item.provider_name}</span>}
                            <span>• {item.category}</span>
                          </div>
                        </div>

                        {/* Price & Refine Controls */}
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <span className="font-extrabold text-slate-900">
                            {formatCurrency(item.price)}
                          </span>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRefineReplace(day.day_number, item.item_id)}
                            disabled={isLoading}
                            className="h-7 px-2 text-[11px] font-bold text-slate-600 hover:text-emerald-700"
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Swap
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRefineRemove(day.day_number, item.item_id)}
                            disabled={isLoading}
                            className="h-7 px-2 text-[11px] font-bold text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>

            {/* Quick Budget Reduction Refine Tool */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-2 text-xs">
              <Sliders className="h-4 w-4 text-slate-500 shrink-0" />
              <input
                type="number"
                placeholder="Adjust target budget (₹)..."
                value={targetBudgetInput}
                onChange={(e) => setTargetBudgetInput(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <Button
                size="sm"
                variant="outline"
                disabled={!targetBudgetInput || isLoading}
                onClick={handleReduceBudget}
                className="text-xs font-bold rounded-xl shrink-0"
              >
                Apply Budget
              </Button>
            </div>

            {/* Bottom Confirmation Action */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={isLoading}
                className="flex-1 font-bold rounded-xl"
              >
                Start Over
              </Button>
              <Button
                onClick={handleConfirmPlan}
                isLoading={isLoading}
                className="flex-1 gap-2 font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm"
              >
                <span>Confirm Plan & Prepare Booking</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── View 3: Pre-Booking Checkout Handoff ── */}
        {handoffData && (
          <div className="space-y-4">
            <div className="text-center space-y-1.5 py-2">
              <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h4 className="text-base font-extrabold text-slate-900">
                Itinerary Confirmed & Saved!
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Your custom itinerary is persisted to your account. You can review the pre-booking checkout summary below.
              </p>
            </div>

            {/* Itemized Handoff Details */}
            <Card className="p-4 rounded-2xl border-slate-200 bg-white shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-500">
                  Itemized Services ({handoffData.items_to_book.length})
                </span>
                <span className="text-xs font-black text-slate-900">
                  Total: {formatCurrency(handoffData.estimated_total_cost)}
                </span>
              </div>

              <div className="space-y-2 max-h-[220px] overflow-y-auto">
                {handoffData.items_to_book.map((item) => (
                  <div
                    key={item.item_id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{item.title}</p>
                      <p className="text-[11px] text-slate-500">
                        Day {item.day_number} • {item.time_slot || "Full Day"} • {item.category}
                      </p>
                    </div>
                    <span className="font-extrabold text-slate-900">
                      {formatCurrency(item.price)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
              <p className="font-bold flex items-center gap-1">
                <ShoppingBag className="h-3.5 w-3.5" />
                <span>Pre-Booking Status</span>
              </p>
              <p className="text-[11px]">
                No charge has been made. Your reservations remain in draft status until you complete checkout with host confirmation.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  onClose();
                  handleReset();
                }}
                className="flex-1 font-bold rounded-xl"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  onClose();
                  window.location.assign("/app/my-trip");
                }}
                className="flex-1 gap-1.5 font-bold bg-harvest-600 hover:bg-harvest-700 text-white rounded-xl shadow-sm"
              >
                <span>View My Trips</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
