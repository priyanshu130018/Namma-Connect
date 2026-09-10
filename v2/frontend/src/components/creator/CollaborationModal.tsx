import React, { useState } from "react";
import { X, Sparkles, Calendar, DollarSign, CheckCircle2, AlertCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreatorProfile, CollaborationItem } from "@/types";
import { createCollaborationProposal } from "@/services/creatorService";

interface CollaborationModalProps {
  isOpen: boolean;
  onClose: () => void;
  creator: CreatorProfile | null;
  onSuccess?: (collab: CollaborationItem) => void;
}

const DEFAULT_DELIVERABLES = [
  "Instagram Reel (1x)",
  "Instagram Story Series (3x)",
  "YouTube Vlog Feature",
  "High-Resolution Photo Pack (10x)",
  "YouTube Shorts / TikTok Video",
];

export function CollaborationModal({
  isOpen,
  onClose,
  creator,
  onSuccess,
}: CollaborationModalProps) {
  const [campaignTitle, setCampaignTitle] = useState("");
  const [proposedDates, setProposedDates] = useState("");
  const [budget, setBudget] = useState<string>("5000");
  const [selectedDeliverables, setSelectedDeliverables] = useState<string[]>([
    DEFAULT_DELIVERABLES[0],
    DEFAULT_DELIVERABLES[1],
  ]);
  const [customDeliverable, setCustomDeliverable] = useState("");
  const [message, setMessage] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen || !creator) return null;

  const toggleDeliverable = (item: string) => {
    if (selectedDeliverables.includes(item)) {
      setSelectedDeliverables(selectedDeliverables.filter((d) => d !== item));
    } else {
      setSelectedDeliverables([...selectedDeliverables, item]);
    }
  };

  const handleAddCustomDeliverable = () => {
    if (customDeliverable.trim() && !selectedDeliverables.includes(customDeliverable.trim())) {
      setSelectedDeliverables([...selectedDeliverables, customDeliverable.trim()]);
      setCustomDeliverable("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignTitle.trim()) {
      setError("Please specify a campaign title.");
      return;
    }
    if (!proposedDates.trim()) {
      setError("Please specify proposed dates or duration.");
      return;
    }
    const numBudget = Number(budget);
    if (isNaN(numBudget) || numBudget <= 0) {
      setError("Please provide a valid budget amount.");
      return;
    }
    if (selectedDeliverables.length === 0) {
      setError("Please select at least one deliverable.");
      return;
    }
    if (!message.trim()) {
      setError("Please write a short pitch message for the creator.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const collab = await createCollaborationProposal({
        creator_id: creator.id,
        campaign_title: campaignTitle.trim(),
        proposed_dates: proposedDates.trim(),
        budget: numBudget,
        deliverables: selectedDeliverables,
        message: message.trim(),
      });

      setSuccess(true);
      if (onSuccess) onSuccess(collab);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send campaign proposal.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Campaign Proposal</h3>
              <p className="text-xs text-slate-400">
                Collaborate with <span className="text-rose-400 font-bold">{creator.display_name}</span> ({creator.handle})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {success ? (
          <div className="py-8 text-center space-y-3">
            <div className="h-16 w-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h4 className="text-lg font-black text-white">Proposal Sent!</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Your campaign proposal has been sent to <strong>{creator.display_name}</strong>. You can track status updates in your Collaboration Workspace.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Campaign Title */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Campaign / Experience Title *
              </label>
              <input
                type="text"
                value={campaignTitle}
                onChange={(e) => setCampaignTitle(e.target.value)}
                placeholder="e.g. Coffee Valley Estate Plantation Reel & Tasting Vlog"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            {/* Dates & Budget Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Proposed Dates / Timeline *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={proposedDates}
                    onChange={(e) => setProposedDates(e.target.value)}
                    placeholder="e.g. Oct 15 - Oct 17, 2026"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Budget Offer (₹) *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="5000"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              </div>
            </div>

            {/* Requested Deliverables */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Requested Deliverables *
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {DEFAULT_DELIVERABLES.map((deliv) => {
                  const active = selectedDeliverables.includes(deliv);
                  return (
                    <button
                      key={deliv}
                      type="button"
                      onClick={() => toggleDeliverable(deliv)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                        active
                          ? "bg-rose-600 text-white shadow-sm"
                          : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-white"
                      }`}
                    >
                      {active && "✓ "}
                      {deliv}
                    </button>
                  );
                })}
              </div>

              {/* Add Custom Deliverable */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customDeliverable}
                  onChange={(e) => setCustomDeliverable(e.target.value)}
                  placeholder="Add custom deliverable..."
                  className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddCustomDeliverable}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Add
                </Button>
              </div>
            </div>

            {/* Proposal Message */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Pitch Message & Hospitality Offer *
              </label>
              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your offer, complimentary stays/activities included, and content expectations..."
                className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="border-slate-700 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{isSubmitting ? "Submitting..." : "Send Proposal"}</span>
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
