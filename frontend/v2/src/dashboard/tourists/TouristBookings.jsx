import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiSearch, FiEye, FiXCircle, FiRefreshCw, FiCalendar, FiMapPin,
  FiCheckCircle, FiX, FiAlertTriangle, FiChevronLeft, FiChevronRight,
  FiClock, FiCreditCard, FiUsers,
} from "react-icons/fi";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { Link } from "@/lib/router-compat";
import { StatusBadge, Badge, Modal, EmptyState } from "@/components/kit/UI";
import { bookingAPI } from "@/services/api";
import api from "@/services/api";

const getUser = () => { try { return JSON.parse(localStorage.getItem('nc_user') || 'null'); } catch { return null; } };

const PAGE_SIZE = 4;

const STATUS_FILTERS = [
  { id: "all", label: "All statuses" },
  { id: "pending", label: "Pending" },
  { id: "confirmed", label: "Confirmed" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });

const formatINR = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

/** Payment badge — Paid / Unpaid */
function PaymentBadge({ payment }) {
  return payment === "paid"
    ? <Badge tone="success"><span className="size-1.5 rounded-full bg-current" />Paid</Badge>
    : <Badge tone={payment === "failed" ? "danger" : "warning"}><span className="size-1.5 rounded-full bg-current" />Unpaid</Badge>;
}

/**
 * Thumbnail that probes the remote image before rendering it.
 * Shows an initial tile while loading or if the URL fails.
 */
function Thumb({ src, name, className }) {
  const [state, setState] = useState(src ? "loading" : "failed");

  useEffect(() => {
    if (!src) { setState("failed"); return; }
    let alive = true;
    setState("loading");
    const probe = new window.Image();
    probe.onload = () => { if (alive) setState("ok"); };
    probe.onerror = () => { if (alive) setState("failed"); };
    probe.src = src;
    return () => { alive = false; };
  }, [src]);

  if (state !== "ok") {
    return (
      <span className={`grid shrink-0 place-items-center rounded-lg bg-tourist-soft font-bold text-tourist ${className}`}>
        {(name || "F")[0]}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={name}
      loading="lazy"
      className={`shrink-0 rounded-lg object-cover ${className}`}
    />
  );
}

function StatCard({ label, value, icon: Icon, tone }) {
  return (
    <div className="surface-card flex items-center gap-4 p-5">
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${tone}`}>
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold leading-tight text-foreground">{value}</p>
      </div>
    </div>
  );
}

export default function TouristBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);   // booking open in View modal
  const [cancelling, setCancelling] = useState(null);
  const [paying, setPaying] = useState(null);       // booking open in Pay modal
  const [payMethod, setPayMethod] = useState("UPI");
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => setToast({ message, type });

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const uid = getUser()?.userId;
      if (uid) {
        const res = await bookingAPI.getUserBookings(uid);
        setBookings(Array.isArray(res.data) ? res.data : (res.data || []));
      }
    } catch {
      // ignore error
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  /* ── Filter + search ─────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bookings.filter((b) => {
      const matchesStatus = statusFilter === "all" || b.status === statusFilter;
      const matchesQuery =
        !q ||
        b.id.toLowerCase().includes(q) ||
        b.item.toLowerCase().includes(q) ||
        (b.location || "").toLowerCase().includes(q) ||
        (b.type || "").toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [bookings, search, statusFilter]);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const counts = useMemo(() => ({
    total: bookings.length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    pending: bookings.filter((b) => b.status === "pending").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
  }), [bookings]);

  const handleCancel = async (booking) => {
    setCancelling(booking.id);
    try {
      const res = await bookingAPI.updateStatus(booking.id, 'cancelled'); // POST /bookings/:id/cancel
      if (res?.data) {
        setSelected((prev) => (prev?.id === booking.id ? { ...prev, status: "cancelled" } : prev));
        showToast(`${booking.id} cancelled.`);
        await fetchBookings();
      } else {
        showToast("Cancellation failed.", "error");
      }
    } catch {
      showToast("Cancellation failed.", "error");
    } finally {
      setCancelling(null);
    }
  };

  const canCancel = (b) => b.status === "pending" || b.status === "confirmed";
  const canPay = (b) => canCancel(b) && b.payment !== "paid";

  const openPay = (b) => {
    setPayMethod("UPI");
    setPaying(b);
  };

  const handlePay = async () => {
    if (!paying) return;
    setProcessing(true);
    try {
      const orderRes = await api.post('/payments/create-order', { booking_id: paying.id, type: "booking" });
      if (orderRes?.data) {
        const orderId = orderRes.data.order_id || `order_mock_${paying.id}`;
        const verifyRes = await api.post('/payments/verify', {
          booking_id: paying.id,
          type: "booking",
          razorpay_order_id: orderId,
          razorpay_payment_id: `pay_mock_${Date.now()}`,
          razorpay_signature: `sig_mock_${Date.now()}`
        });

        if (verifyRes?.data?.success) {
          setSelected((prev) => (prev?.id === paying.id ? { ...prev, payment: "paid" } : prev));
          showToast(`Payment successful for ${paying.id} via ${payMethod}.`);
          setPaying(null);
          await fetchBookings();
        } else {
          showToast("Payment verification failed.", "error");
        }
      } else {
        showToast("Payment failed to initialize.", "error");
      }
    } catch {
      showToast("Payment failed. Please try again.", "error");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface font-sans">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Your Bookings
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Track farm stays and experiences — status, payments and actions in one place.
            </p>
          </div>
          <button
            onClick={fetchBookings}
            disabled={loading}
            className="inline-flex items-center gap-2 self-start rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60 sm:self-auto"
          >
            <FiRefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {/* Summary cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard label="Total" value={counts.total} icon={FiCalendar} tone="bg-muted text-muted-foreground" />
          <StatCard label="Confirmed" value={counts.confirmed} icon={FiCheckCircle} tone="bg-success/12 text-success" />
          <StatCard label="Pending" value={counts.pending} icon={FiClock} tone="bg-warning/15 text-warning" />
          <StatCard label="Cancelled" value={counts.cancelled} icon={FiXCircle} tone="bg-destructive/12 text-destructive" />
        </div>

        {/* Toolbar: search + status filter */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by booking ID, farm, experience or place…"
              className="input-field pl-10 text-sm"
              aria-label="Search bookings"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field w-full text-sm sm:w-52"
            aria-label="Filter by status"
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
        </div>

        {/* Table card */}
        <div className="surface-card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Booking ID</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Farm / Experience</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payment</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: PAGE_SIZE }).map((_, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td colSpan={6} className="px-5 py-4">
                        <div className="h-9 animate-pulse rounded-lg bg-muted" />
                      </td>
                    </tr>
                  ))
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6">
                      {bookings.length === 0 ? (
                        <EmptyState
                          icon={<FiCalendar size={20} />}
                          title="No bookings yet"
                          description="When you book a farm stay or experience, it will show up here with live status updates."
                          className="border-0 shadow-none"
                          action={
                            <Link
                              to="/tourist/experiences"
                              className="mt-1 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                            >
                              Explore experiences
                            </Link>
                          }
                        />
                      ) : (
                        <EmptyState
                          title="No bookings match"
                          description="Try a different search term or status filter."
                          className="border-0 shadow-none"
                        />
                      )}
                    </td>
                  </tr>
                ) : (
                  pageRows.map((b) => (
                    <tr key={b.id} className="border-b border-border transition-colors last:border-0 hover:bg-muted/40">
                      <td className="px-5 py-4 font-mono text-xs font-semibold text-foreground">{b.id}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Thumb src={b.image} name={b.item} className="size-10 text-sm" />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">{b.item}</p>
                            <p className="flex items-center gap-1 text-xs text-muted-foreground">
                              <FiMapPin size={11} /> {b.location} · {b.type}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-muted-foreground">{formatDate(b.date)}</td>
                      <td className="px-5 py-4"><StatusBadge status={b.status} /></td>
                      <td className="px-5 py-4"><PaymentBadge payment={b.payment} /></td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelected(b)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                          >
                            <FiEye size={13} /> View
                          </button>
                          {canPay(b) && (
                            <button
                              onClick={() => openPay(b)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                            >
                              <FiCreditCard size={13} /> Pay Now
                            </button>
                          )}
                          <button
                            onClick={() => handleCancel(b)}
                            disabled={!canCancel(b) || cancelling === b.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <FiXCircle size={13} /> {cancelling === b.id ? "Cancelling…" : "Cancel"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination (UI only) */}
          <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-5 py-4 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{pageRows.length}</span> of{" "}
              <span className="font-semibold text-foreground">{filtered.length}</span> bookings
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label="Previous page"
                className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
              >
                <FiChevronLeft size={14} />
              </button>
              {Array.from({ length: pageCount }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`size-8 rounded-lg text-xs font-semibold transition-colors ${
                    page === i + 1
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={page === pageCount}
                aria-label="Next page"
                className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
              >
                <FiChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* View modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.item}
        description={selected ? `${selected.id} · ${selected.type}` : ""}
        footer={
          selected ? (
            <>
              <button
                onClick={() => setSelected(null)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Close
              </button>
              {canPay(selected) && (
                <button
                  onClick={() => openPay(selected)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  <FiCreditCard size={13} /> Pay {formatINR(selected.amount)}
                </button>
              )}
              <button
                onClick={() => handleCancel(selected)}
                disabled={!canCancel(selected) || cancelling === selected.id}
                className="rounded-xl bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground transition-opacity disabled:opacity-40"
              >
                {cancelling === selected.id ? "Cancelling…" : "Cancel booking"}
              </button>
            </>
          ) : null
        }
      >
        {selected ? (
          <div className="space-y-4">
            <Thumb src={selected.image} name={selected.item} className="h-44 w-full rounded-xl text-4xl" />
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={selected.status} />
              <PaymentBadge payment={selected.payment} />
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <FiCalendar size={14} /> <span>{formatDate(selected.date)}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <FiMapPin size={14} /> <span>{selected.location}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <FiUsers size={14} /> <span>{selected.guests} guests{selected.nights ? ` · ${selected.nights} nights` : ""}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <FiCreditCard size={14} /> <span className="font-semibold text-foreground">{formatINR(selected.amount)}</span>
              </div>
            </dl>
            <p className="rounded-xl bg-muted/60 px-4 py-3 text-xs text-muted-foreground">
              Hosted by <span className="font-semibold text-foreground">{selected.host}</span>. Need changes? Message your host from the Messages tab.
            </p>
          </div>
        ) : null}
      </Modal>

      {/* Payment modal — simulated gateway, no real transaction */}
      <Modal
        open={!!paying}
        onClose={() => !processing && setPaying(null)}
        title="Complete payment"
        description={paying ? `${paying.item} · Booking ${paying.id}` : ""}
        footer={
          paying ? (
            <>
              <button
                onClick={() => setPaying(null)}
                disabled={processing}
                className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePay}
                disabled={processing}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {processing ? (
                  <>
                    <span className="size-3.5 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
                    Processing…
                  </>
                ) : (
                  <>Pay {formatINR(paying.amount)}</>
                )}
              </button>
            </>
          ) : null
        }
      >
        {paying ? (
          <div className="space-y-4">
            <div>
              <label htmlFor="pay-method" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Payment method
              </label>
              <select
                id="pay-method"
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="input-field w-full text-sm"
              >
                <option>UPI</option>
                <option>Card</option>
                <option>Net Banking</option>
                <option>Wallet</option>
              </select>
            </div>
            <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Booking amount</span>
                <span className="font-semibold text-foreground">{formatINR(paying.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Taxes &amp; fees</span>
                <span className="text-foreground">Included</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <span className="font-medium text-foreground">Total payable</span>
                <span className="font-semibold text-foreground">{formatINR(paying.amount)}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              This is a simulated payment — no real transaction happens. On success the booking is
              marked Paid and a receipt appears in Payments across the app.
            </p>
          </div>
        ) : null}
      </Modal>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <div className="fixed bottom-8 right-8 z-50">
            <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
          </div>
        )}
      </AnimatePresence>

      <BookingConfirmedPopup bookings={bookings} />
    </div>
  );
}

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className={`flex items-center gap-3 rounded-2xl px-6 py-4 text-sm font-semibold text-primary-foreground shadow-md ${type === "error" ? "bg-destructive" : "bg-foreground"}`}
    >
      {type === "error" ? <FiAlertTriangle /> : <FiCheckCircle className="text-primary" />}
      {message}
    </motion.div>
  );
}

function BookingConfirmedPopup({ bookings }) {
  const [popup, setPopup] = useState(null);
  const seenKey = "nc_confirmed_seen";
  useEffect(() => {
    const seen = JSON.parse(sessionStorage.getItem(seenKey) || "[]");
    const fresh = bookings.find((b) => b.status === "confirmed" && !seen.includes(b.id));
    if (!fresh) return;
    sessionStorage.setItem(seenKey, JSON.stringify([...seen, fresh.id]));
    setPopup({ id: fresh.id, itemName: fresh.item || "booking" });
    const t = setTimeout(() => setPopup(null), 3500);
    return () => clearTimeout(t);
  }, [bookings]);

  return (
    <AnimatePresence>
      {popup && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed left-1/2 top-10 z-[100] flex w-full max-w-sm -translate-x-1/2 items-center gap-4 rounded-2xl bg-primary p-5 text-primary-foreground shadow-md"
        >
          <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-white/20 bg-card/20">
            <FiCheckCircle size={22} />
          </div>
          <div className="min-w-0">
            <p className="mb-0.5 text-xs font-semibold uppercase tracking-widest opacity-70">Booking confirmed</p>
            <p className="truncate text-sm font-semibold">{popup.itemName} is waiting for you!</p>
          </div>
          <button onClick={() => setPopup(null)} aria-label="Dismiss" className="ml-auto opacity-60 transition-opacity hover:opacity-100">
            <FiX />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
