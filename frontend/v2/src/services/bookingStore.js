/**
 * Shared booking state — connects the booking flow across the whole app.
 *
 * Backed by the mock service layer:
 *   GET  /bookings
 *   POST /bookings
 *   GET  /bookings/requests
 *   POST /bookings/requests/:id/accept
 *   POST /bookings/requests/:id/reject
 *   POST /bookings/:id/cancel
 *   GET  /payments
 *   POST /payments
 *   GET  /notifications
 *   POST /notifications/:id/read
 *
 * State lives in a module-level store, persists to localStorage, and notifies
 * subscribers on every change — so a booking created by a tourist shows up in
 * the farmer's requests, status changes reflect on both dashboards, and
 * payments + notifications stay in sync without a page reload.
 */
import {
  bookings as touristSeed,
  bookingRequests as requestSeed,
  payments as paymentSeed,
  notifications as notificationSeed,
  farms,
  experiences,
} from "@/mocks";
import { getStoredUser } from "./userService";

const STORAGE_KEY = "nc_booking_state_v1";
const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* ── Seed helpers ─────────────────────────────────────────────────────────── */

function dateRange(iso, nights) {
  if (!iso) return "";
  const start = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(start.getTime())) return iso;
  if (!nights) return `${start.getDate()} ${MONTHS[start.getMonth()]} ${start.getFullYear()}`;
  const end = new Date(start);
  end.setDate(end.getDate() + nights);
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.getDate()} ${MONTHS[start.getMonth()]} ${start.getFullYear()}`;
  }
  return `${start.getDate()} ${MONTHS[start.getMonth()]} – ${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
}

/** Find a listing (farm or experience) whose name shares a word with the keyword. */
function matchListing(keyword) {
  const words = String(keyword).toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3);
  const listings = [
    ...farms.map((f) => ({ name: f.name, location: f.location, image: f.image, type: "Farm stay" })),
    ...experiences.map((e) => ({ name: e.title, location: e.location, image: e.image, type: "Experience" })),
  ];
  return listings.find((l) => words.some((w) => l.name.toLowerCase().includes(w)));
}

const REQUEST_STATUS = { pending: "pending", approved: "confirmed", rejected: "cancelled" };

function seedBookings() {
  const mine = touristSeed.map((b) => ({
    ...b,
    guest: "You (Demo Tourist)",
    mine: true,
    dates: dateRange(b.date, b.nights),
    note: "",
    payment: b.payment === "pending" ? "unpaid" : b.payment,
  }));
  const requests = requestSeed.map((r) => {
    const match = matchListing(r.experience);
    return {
      id: r.id,
      item: r.experience,
      type: match?.type ?? (/farm|stay/i.test(r.experience) ? "Farm stay" : "Experience"),
      guest: r.guest,
      host: "You (host)",
      location: match?.location ?? "Coorg, Karnataka",
      image: match?.image ?? experiences[0].image,
      date: "",
      nights: 0,
      dates: r.dates,
      guests: r.guests,
      amount: r.amount,
      note: r.note,
      status: REQUEST_STATUS[r.status] ?? "pending",
      payment: "unpaid",
      mine: false,
    };
  });
  return [...mine, ...requests];
}

function seed() {
  return {
    bookings: seedBookings(),
    payments: paymentSeed.map((p) => ({ ...p })),
    notifications: notificationSeed.map((n) => ({ ...n, audience: "all" })),
  };
}

/* ── Store core ───────────────────────────────────────────────────────────── */

function load() {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

let state = load() ?? seed();
const listeners = new Set();

function persist() {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    /* storage unavailable */
  }
}

function mutate(fn) {
  state = fn(state);
  persist();
  listeners.forEach((listener) => listener());
}

function nextId(prefix, ids) {
  const max = ids.reduce((acc, id) => {
    const n = parseInt(String(id).replace(prefix, ""), 10);
    return Number.isNaN(n) ? acc : Math.max(acc, n);
  }, 0);
  return `${prefix}${max + 1}`;
}

function pushNotification(list, n) {
  return [
    { id: `n-${Date.now()}-${list.length}`, time: "Just now", read: false, ...n },
    ...list,
  ];
}

function setBookingStatus(id, status) {
  mutate((s) => ({
    ...s,
    bookings: s.bookings.map((b) => (b.id === id ? { ...b, status } : b)),
  }));
}

/* ── Public API ───────────────────────────────────────────────────────────── */

export const bookingStore = {
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  getState() {
    return state;
  },

  /* Selectors (synchronous — for the service layer and hooks) */
  touristBookings() {
    return state.bookings.filter((b) => b.mine);
  },
  farmerRequests() {
    return state.bookings;
  },
  findBooking(id) {
    return state.bookings.find((b) => b.id === id);
  },
  allPayments() {
    return state.payments;
  },
  notificationsFor(role) {
    return state.notifications.filter((n) => n.audience === "all" || n.audience === role);
  },
  unreadCount(role) {
    return state.notifications.filter(
      (n) => !n.read && (n.audience === "all" || n.audience === role),
    ).length;
  },

  /* Mutations (async — simulate the service layer) */

  /** POST /bookings — tourist creates a booking; farmer gets notified. */
  async createBooking(payload) {
    await delay(450);
    const user = getStoredUser();
    const booking = {
      id: nextId("BK-", state.bookings.map((b) => b.id)),
      type: "Experience",
      host: "",
      location: "",
      image: null,
      date: "",
      nights: 0,
      dates: dateRange(payload.date, payload.nights ?? 0),
      note: "",
      ...payload,
      guest: user?.name ?? "You (Demo Tourist)",
      status: "pending",
      payment: "unpaid",
      mine: true,
    };
    mutate((s) => ({
      ...s,
      bookings: [booking, ...s.bookings],
      notifications: pushNotification(
        pushNotification(s.notifications, {
          audience: "farmer",
          category: "booking",
          type: "info",
          title: "New booking request",
          body: `${booking.guest} requested “${booking.item}” for ${booking.guests} guest${booking.guests > 1 ? "s" : ""}.`,
        }),
        {
          audience: "tourist",
          category: "booking",
          type: "info",
          title: "Booking request sent",
          body: `“${booking.item}” is pending — the host will confirm shortly.`,
        },
      ),
    }));
    return { ok: true, booking };
  },

  /** POST /bookings/requests/:id/accept — farmer confirms; tourist gets notified. */
  async acceptBooking(id) {
    await delay(350);
    const booking = state.bookings.find((b) => b.id === id);
    if (!booking) return { ok: false };
    setBookingStatus(id, "confirmed");
    mutate((s) => ({
      ...s,
      notifications: pushNotification(s.notifications, {
        audience: "tourist",
        category: "booking",
        type: "success",
        title: "Booking confirmed",
        body: `“${booking.item}” was confirmed by the host. You can pay now to lock it in.`,
      }),
    }));
    return { ok: true, status: "confirmed" };
  },

  /** POST /bookings/requests/:id/reject — farmer declines; tourist gets notified. */
  async rejectBooking(id) {
    await delay(350);
    const booking = state.bookings.find((b) => b.id === id);
    if (!booking) return { ok: false };
    setBookingStatus(id, "cancelled");
    mutate((s) => ({
      ...s,
      notifications: pushNotification(s.notifications, {
        audience: "tourist",
        category: "booking",
        type: "danger",
        title: "Booking declined",
        body: `Unfortunately the host couldn't take “${booking.item}”. Browse similar experiences.`,
      }),
    }));
    return { ok: true, status: "cancelled" };
  },

  /** POST /bookings/requests/:id/reopen — farmer undo; back to pending. */
  async reopenBooking(id) {
    await delay(250);
    setBookingStatus(id, "pending");
    return { ok: true, status: "pending" };
  },

  /** POST /bookings/:id/cancel — tourist cancels; farmer gets notified. */
  async cancelBooking(id) {
    await delay(350);
    const booking = state.bookings.find((b) => b.id === id);
    if (!booking) return { ok: false };
    setBookingStatus(id, "cancelled");
    mutate((s) => ({
      ...s,
      notifications: pushNotification(s.notifications, {
        audience: "farmer",
        category: "booking",
        type: "warning",
        title: "Booking cancelled",
        body: `${booking.guest} cancelled “${booking.item}”.`,
      }),
    }));
    return { ok: true, status: "cancelled" };
  },

  /** POST /payments — tourist pays; booking marked paid, payment recorded. */
  async payBooking(id, method = "UPI") {
    await delay(900); // simulate gateway processing
    const booking = state.bookings.find((b) => b.id === id);
    if (!booking || booking.payment === "paid") return { ok: false };
    const payment = {
      id: nextId("PAY-", state.payments.map((p) => p.id)),
      bookingId: booking.id,
      date: new Date().toISOString().slice(0, 10),
      method,
      amount: booking.amount,
      fee: Math.round(booking.amount * 0.05),
      status: "paid",
    };
    mutate((s) => ({
      ...s,
      bookings: s.bookings.map((b) => (b.id === id ? { ...b, payment: "paid" } : b)),
      payments: [payment, ...s.payments],
      notifications: pushNotification(
        pushNotification(s.notifications, {
          audience: "farmer",
          category: "payment",
          type: "success",
          title: "Payment received",
          body: `Payment for “${booking.item}” (${booking.id}) was received.`,
        }),
        {
          audience: "tourist",
          category: "payment",
          type: "success",
          title: "Payment successful",
          body: `You paid for “${booking.item}” via ${method}. Booking ${booking.id} is confirmed.`,
        },
      ),
    }));
    return { ok: true, payment };
  },

  /** POST /notifications/:id/read */
  markNotificationRead(id) {
    mutate((s) => ({
      ...s,
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
  },

  /** POST /notifications/read-all */
  markAllNotificationsRead(role) {
    mutate((s) => ({
      ...s,
      notifications: s.notifications.map((n) =>
        n.audience === "all" || n.audience === role ? { ...n, read: true } : n,
      ),
    }));
  },
};
