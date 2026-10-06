import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import {
  LifeBuoy,
  CheckCircle2,
  FileQuestion,
  CreditCard,
  RefreshCw,
  UserCheck,
  AlertCircle,
} from "lucide-react";
import { createSupportTicket } from "@/services/supportService";

export interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SupportModal({ isOpen, onClose }: SupportModalProps) {
  const [createdTicketCode, setCreatedTicketCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    category: "Booking",
    subject: "",
    bookingId: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.message.trim() || !formData.subject.trim()) return;

    setError(null);
    setIsSubmitting(true);
    try {
      const newTicket = await createSupportTicket({
        category: formData.category,
        subject: formData.subject,
        description: formData.message,
        booking_id: formData.bookingId.trim() || undefined,
      });
      setCreatedTicketCode(newTicket.ticket_code);
    } catch (err: unknown) {
      console.error("Failed to submit support ticket via modal:", err);
      setError("Unable to submit support ticket. Please check details and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const supportTopics = [
    { icon: FileQuestion, title: "Booking Questions", desc: "Check-in time, location directions, and host contacts" },
    { icon: CreditCard, title: "Payment & Invoices", desc: "Razorpay transactions, GST invoices, and failed debits" },
    { icon: RefreshCw, title: "Cancellations & Refunds", desc: "48-hour free cancellation policy and refund queries" },
    { icon: UserCheck, title: "Account & Policies", desc: "Aadhaar KYC privacy, user details, and community guidelines" },
  ];

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => {
        setCreatedTicketCode(null);
        setError(null);
        onClose();
      }}
      title="Customer Help & Support"
      description="Resolve booking inquiries, cancellation requests, or file a support ticket."
      className="max-w-xl"
    >
      {createdTicketCode ? (
        <div className="py-8 text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h4 className="text-base font-bold text-slate-900">Support Ticket Created: {createdTicketCode}</h4>
          <p className="text-xs text-slate-600 max-w-sm mx-auto">
            Your inquiry has been assigned to our concierge support team. You can view progress under your support dashboard.
          </p>
          <div className="pt-3 flex justify-center gap-2">
            <Link
              to="/app/support/tickets"
              onClick={() => {
                setCreatedTicketCode(null);
                onClose();
              }}
            >
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                View My Tickets
              </Button>
            </Link>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setCreatedTicketCode(null);
                onClose();
              }}
            >
              Done
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Quick Help Pillars */}
          <div className="grid grid-cols-2 gap-2.5">
            {supportTopics.map((topic, idx) => {
              const Icon = topic.icon;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 text-left hover:border-emerald-300 transition-colors"
                >
                  <Icon className="h-4 w-4 text-emerald-600 mb-1" />
                  <p className="text-xs font-bold text-slate-900">{topic.title}</p>
                  <p className="text-[10px] text-slate-500 line-clamp-1">{topic.desc}</p>
                </div>
              );
            })}
          </div>

          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Ticket Submission Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5 border-t border-slate-100 pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Submit Grievance or Support Ticket
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Topic Category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                options={[
                  { value: "Booking", label: "Booking Inquiry / Modification" },
                  { value: "Payment", label: "Payment / Invoice Question" },
                  { value: "Cancellation", label: "Cancellation Assistance" },
                  { value: "Refund", label: "Refund Information" },
                  { value: "Account", label: "Account & KYC Verification" },
                  { value: "Service", label: "Retreat & Workshop Quality" },
                  { value: "Other", label: "Other Platform Feedback" },
                ]}
                required
              />
              <Input
                label="Booking ID (Optional)"
                placeholder="e.g. NC-2026-8812"
                value={formData.bookingId}
                onChange={(e) => setFormData({ ...formData, bookingId: e.target.value })}
              />
            </div>

            <Input
              label="Subject"
              placeholder="Brief summary of your query..."
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              required
            />

            <Textarea
              label="Describe your issue"
              placeholder="Provide details about your query..."
              rows={3}
              required
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || !formData.subject.trim() || !formData.message.trim()}
                className="gap-2 font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <LifeBuoy className="h-4 w-4" />
                <span>{isSubmitting ? "Submitting..." : "Submit Ticket"}</span>
              </Button>
            </div>
          </form>
        </div>
      )}
    </Dialog>
  );
}
