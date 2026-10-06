import { useState, useEffect, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import {
  LifeBuoy,
  PlusCircle,
  FileQuestion,
  CreditCard,
  RefreshCw,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Send,
  Calendar,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  createSupportTicket,
  getMySupportTickets,
  getSupportTicketDetail,
  replySupportTicket,
} from "@/services/supportService";
import { SupportTicket } from "@/types";

// ── 1. Support Hub Page (/app/support) ──
export function CustomerSupportHubPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [category, setCategory] = useState("Booking");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTicketCode, setCreatedTicketCode] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const loadRecentTickets = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getMySupportTickets();
      setTickets(data.tickets || []);
    } catch (err: unknown) {
      console.error("Failed to load tickets in hub:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecentTickets();
  }, [loadRecentTickets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    try {
      const newTicket = await createSupportTicket({
        category,
        subject,
        description,
        booking_id: bookingId.trim() || undefined,
      });
      setCreatedTicketCode(newTicket.ticket_code);
      setTickets((prev) => [newTicket, ...prev]);
      setSubject("");
      setDescription("");
      setBookingId("");
    } catch (err: unknown) {
      console.error("Failed to create ticket:", err);
      setFormError("Unable to submit support ticket. Please check your details and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const supportTopics = [
    { icon: FileQuestion, title: "Booking Questions", desc: "Check-in time, location directions, and host contacts" },
    { icon: CreditCard, title: "Payment & Invoices", desc: "Razorpay transactions, GST invoices, and failed debits" },
    { icon: RefreshCw, title: "Cancellations & Refunds", desc: "48-hour free cancellation policy and refund queries" },
    { icon: UserCheck, title: "Account & Policies", desc: "Aadhaar KYC privacy, user details, and community safety" },
  ];

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      <PageHeader
        title="Help & Concierge Support"
        subtitle="Get prompt assistance regarding retreat bookings, payment receipts, or file a support ticket."
        actions={
          <div className="flex items-center gap-2">
            <Link to="/app/support/tickets">
              <Button variant="outline" size="sm" className="gap-1.5 font-bold">
                <MessageSquare className="h-4 w-4 text-emerald-600" />
                <span>My Tickets ({tickets.length})</span>
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={() => {
                setCreatedTicketCode(null);
                setShowCreateForm(!showCreateForm);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-sm"
            >
              <PlusCircle className="h-4 w-4" />
              <span>{showCreateForm ? "Close Form" : "Create Support Ticket"}</span>
            </Button>
          </div>
        }
      />

      {/* Quick Help Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {supportTopics.map((topic, idx) => {
          const Icon = topic.icon;
          return (
            <Card key={idx} className="p-5 rounded-3xl border-slate-200 bg-white hover:border-emerald-300 transition-colors space-y-2">
              <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">{topic.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{topic.desc}</p>
            </Card>
          );
        })}
      </div>

      {/* Ticket Creation Form */}
      {showCreateForm && (
        <Card className="p-6 sm:p-8 rounded-3xl border-emerald-200 bg-emerald-50/30 space-y-5 shadow-sm">
          {createdTicketCode ? (
            <div className="py-6 text-center space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Support Ticket Created: {createdTicketCode}</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Your ticket has been assigned to our concierge support desk. You can track updates and post replies under your tickets dashboard.
              </p>
              <div className="pt-2 flex justify-center gap-3">
                <Link to="/app/support/tickets">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                    View My Tickets
                  </Button>
                </Link>
                <Button size="sm" variant="outline" onClick={() => setCreatedTicketCode(null)}>
                  Submit Another
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">File a Support Ticket</h3>
                  <p className="text-[11px] text-slate-500">Our concierge support team responds within 2-4 business hours.</p>
                </div>
                <Badge variant="outline" className="text-[10px] text-emerald-800 bg-emerald-100/60 border-emerald-300">
                  Concierge Desk
                </Badge>
              </div>

              {formError && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
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
                  label="Related Booking Code (Optional)"
                  placeholder="e.g. NC-BKG-XXXX"
                  value={bookingId}
                  onChange={(e) => setBookingId(e.target.value)}
                />
              </div>

              <Input
                label="Subject"
                placeholder="Brief summary of your query..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />

              <Textarea
                label="Detailed Description"
                placeholder="Please describe your query or problem with relevant dates and details..."
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting || !subject.trim() || !description.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-sm"
                >
                  <LifeBuoy className="h-4 w-4" />
                  <span>{isSubmitting ? "Submitting..." : "Submit Ticket"}</span>
                </Button>
              </div>
            </form>
          )}
        </Card>
      )}

      {/* Recent Tickets Preview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Your Support Inquiries</h2>
          <Link to="/app/support/tickets" className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1">
            <span>View All Tickets ({tickets.length})</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {isLoading && (
          <div className="space-y-3 animate-pulse">
            <div className="h-20 bg-slate-100 rounded-2xl" />
            <div className="h-20 bg-slate-100 rounded-2xl" />
          </div>
        )}

        {!isLoading && tickets.length === 0 && (
          <Card className="p-8 rounded-3xl border-dashed border-2 border-slate-200 text-center bg-white space-y-2">
            <ShieldCheck className="h-8 w-8 text-emerald-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900">No active support tickets</h3>
            <p className="text-xs text-slate-500">Need help with a reservation or payment? Click "Create Support Ticket" above.</p>
          </Card>
        )}

        {!isLoading && tickets.length > 0 && (
          <div className="space-y-3">
            {tickets.slice(0, 3).map((t) => (
              <Link key={t.id} to={`/app/support/tickets/${t.id}`}>
                <Card hover className="p-5 rounded-2xl border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={t.status === "OPEN" ? "warning" : t.status === "RESOLVED" ? "default" : "secondary"}
                        className="text-[10px] uppercase font-bold"
                      >
                        {t.status}
                      </Badge>
                      <span className="text-xs font-mono text-slate-400 font-bold">{t.ticket_code}</span>
                      <Badge variant="outline" className="text-[10px] text-slate-600">{t.category}</Badge>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mt-1">{t.subject}</h4>
                  </div>
                  <div className="text-xs text-emerald-700 font-bold flex items-center gap-1 shrink-0">
                    <span>View Ticket</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 2. Support Tickets List Page (/app/support/tickets) ──
export function CustomerSupportTicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getMySupportTickets();
      setTickets(data.tickets || []);
    } catch (err: unknown) {
      console.error("Failed to load tickets:", err);
      setError("Unable to load support tickets. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const openTickets = tickets.filter((t) => t.status === "OPEN");
  const inProgressTickets = tickets.filter((t) => t.status === "IN_PROGRESS");
  const resolvedTickets = tickets.filter((t) => t.status === "RESOLVED" || t.status === "CLOSED");

  const renderTicketCard = (t: SupportTicket) => (
    <Link key={t.id} to={`/app/support/tickets/${t.id}`}>
      <Card hover className="p-6 rounded-3xl border-slate-200 bg-white space-y-3 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Badge
              variant={t.status === "OPEN" ? "warning" : t.status === "RESOLVED" ? "default" : "secondary"}
              className="text-[10px] uppercase font-bold"
            >
              {t.status}
            </Badge>
            <span className="text-xs font-mono font-bold text-slate-500">{t.ticket_code}</span>
            <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
            {t.booking_id && (
              <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50 border-emerald-200">
                Ref: {t.booking_id}
              </Badge>
            )}
          </div>
          <span className="text-[11px] text-slate-400">
            {t.created_at ? new Date(t.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : ""}
          </span>
        </div>

        <div>
          <h3 className="text-base font-bold text-slate-900">{t.subject}</h3>
          <p className="text-xs text-slate-600 line-clamp-2 mt-1 leading-relaxed">{t.description}</p>
        </div>

        <div className="flex items-center justify-between pt-1 text-xs">
          <span className="text-[11px] text-slate-400">
            {t.responses.length > 0 ? `${t.responses.length} responses` : "Awaiting agent response"}
          </span>
          <span className="font-bold text-emerald-700 flex items-center gap-1">
            <span>View Thread</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </Card>
    </Link>
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/app/support" className="hover:underline">Help & Support</Link>
        <span>/</span>
        <span className="text-slate-900 font-semibold">Tickets</span>
      </div>

      <PageHeader
        title="My Support Tickets"
        subtitle="Track open platform inquiries, booking questions, and concierge assistance."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadTickets}
              disabled={isLoading}
              className="gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
            <Link to="/app/support">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-sm">
                <PlusCircle className="h-4 w-4" />
                <span>New Ticket</span>
              </Button>
            </Link>
          </div>
        }
      />

      {error && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-800 font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="outline" onClick={loadTickets}>Retry</Button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All ({tickets.length})</TabsTrigger>
          <TabsTrigger value="open">Open ({openTickets.length})</TabsTrigger>
          <TabsTrigger value="inprogress">In Progress ({inProgressTickets.length})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved ({resolvedTickets.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4 pt-2">
          {tickets.length > 0 ? (
            tickets.map(renderTicketCard)
          ) : (
            <Card className="p-12 rounded-3xl border-dashed border-2 border-slate-200 text-center bg-white space-y-3">
              <LifeBuoy className="h-10 w-10 text-emerald-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">No support tickets yet.</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Need help with a farm retreat, host contact, or payment inquiry? Submit a ticket anytime.
              </p>
              <Link to="/app/support">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold mt-2">
                  Contact Support
                </Button>
              </Link>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="open" className="space-y-4 pt-2">
          {openTickets.length > 0 ? openTickets.map(renderTicketCard) : <p className="text-xs text-slate-400 py-6 text-center">No open tickets.</p>}
        </TabsContent>

        <TabsContent value="inprogress" className="space-y-4 pt-2">
          {inProgressTickets.length > 0 ? inProgressTickets.map(renderTicketCard) : <p className="text-xs text-slate-400 py-6 text-center">No in-progress tickets.</p>}
        </TabsContent>

        <TabsContent value="resolved" className="space-y-4 pt-2">
          {resolvedTickets.length > 0 ? resolvedTickets.map(renderTicketCard) : <p className="text-xs text-slate-400 py-6 text-center">No resolved tickets.</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── 3. Support Ticket Detail Page (/app/support/tickets/:ticket_id) ──
export function CustomerSupportTicketDetailPage() {
  const { ticket_id } = useParams<{ ticket_id: string }>();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [isReplying, setIsReplying] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!ticket_id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSupportTicketDetail(ticket_id);
      setTicket(data);
    } catch (err: unknown) {
      console.error("Failed to load ticket details:", err);
      setError("Unable to load support ticket details.");
    } finally {
      setIsLoading(false);
    }
  }, [ticket_id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket_id || !replyMessage.trim() || isReplying) return;

    setIsReplying(true);
    try {
      const updated = await replySupportTicket(ticket_id, replyMessage.trim());
      setTicket(updated);
      setReplyMessage("");
    } catch (err: unknown) {
      console.error("Failed to send reply:", err);
    } finally {
      setIsReplying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto pb-16 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-32" />
        <div className="h-64 bg-slate-200 rounded-3xl" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto pb-16">
        <Link to="/app/support/tickets" className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900">
          ← Back to Support Tickets
        </Link>
        <Card className="p-8 rounded-3xl border-rose-200 bg-rose-50 text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-rose-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">Ticket Not Found</h3>
          <p className="text-xs text-slate-600">{error || "The support ticket could not be found."}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-16">
      <Link to="/app/support/tickets" className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900">
        ← Back to Support Tickets
      </Link>

      <Card className="p-6 sm:p-8 rounded-3xl border-slate-200 bg-white space-y-6 shadow-sm">
        {/* Ticket Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-extrabold text-emerald-800">{ticket.ticket_code}</span>
              <Badge
                variant={ticket.status === "OPEN" ? "warning" : ticket.status === "RESOLVED" ? "default" : "secondary"}
                className="text-[10px] uppercase font-bold"
              >
                {ticket.status}
              </Badge>
              <Badge variant="outline" className="text-[10px]">{ticket.category}</Badge>
            </div>
            <h1 className="text-xl font-extrabold text-slate-900">{ticket.subject}</h1>
          </div>

          <div className="text-left sm:text-right text-xs text-slate-400">
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{ticket.created_at ? new Date(ticket.created_at).toLocaleString("en-IN") : ""}</span>
            </div>
          </div>
        </div>

        {/* Related Booking Link */}
        {ticket.booking_id && (
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-700" />
              <span className="text-slate-700">Related Booking: <strong>{ticket.booking_id}</strong></span>
            </div>
            <Link to={`/app/bookings/${ticket.booking_id}`} className="text-emerald-700 font-bold hover:underline">
              View Reservation
            </Link>
          </div>
        )}

        {/* Original Description */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Initial Inquiry</span>
          <div className="p-4 rounded-2xl bg-slate-50 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap border border-slate-100">
            {ticket.description}
          </div>
        </div>

        {/* Responses / Conversation Thread */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Responses & Resolution History ({ticket.responses.length})
          </span>

          {ticket.responses.length === 0 && (
            <div className="p-6 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
              No replies yet. Our support agent will post an update here shortly.
            </div>
          )}

          <div className="space-y-3">
            {ticket.responses.map((r, idx) => {
              const isAdmin = r.sender_role === "admin" || r.sender_role === "agent";
              return (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl text-xs space-y-1.5 ${
                    isAdmin
                      ? "bg-emerald-50/70 border border-emerald-200 text-emerald-950 ml-4"
                      : "bg-slate-50 border border-slate-200 text-slate-800 mr-4"
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className={isAdmin ? "text-emerald-800" : "text-slate-900"}>
                      {r.sender_name} {isAdmin && "★ (Concierge Agent)"}
                    </span>
                    <span className="text-[10px] font-normal text-slate-400">
                      {r.created_at ? new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                    </span>
                  </div>
                  <p className="leading-relaxed whitespace-pre-wrap">{r.message}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Follow-up Reply Form */}
        <form onSubmit={handleSendReply} className="pt-4 border-t border-slate-100 space-y-3">
          <span className="text-xs font-bold text-slate-900 block">Post a Follow-Up Message</span>
          <Textarea
            placeholder="Type your response to the support agent..."
            rows={3}
            value={replyMessage}
            onChange={(e) => setReplyMessage(e.target.value)}
            disabled={isReplying}
            required
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={isReplying || !replyMessage.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-sm"
            >
              <Send className="h-4 w-4" />
              <span>{isReplying ? "Sending..." : "Send Response"}</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
