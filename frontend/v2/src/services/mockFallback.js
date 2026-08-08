/**
 * Mock backend fallback.
 * When the real API is unreachable (network error — not a 4xx), the axios
 * layer calls mockFallbackData(config) and resolves a synthetic response so
 * every screen renders realistic data in demo/preview mode.
 *
 * All mappers reproduce the exact field shapes the legacy components expect
 * from the FastAPI backend (v2 route map). When the backend is up, none of
 * this runs.
 */
import * as db from "@/mocks";

const getUser = () => {
  try { return JSON.parse(localStorage.getItem("nc_user") || "null"); } catch { return null; }
};

// ── Farm listings (numeric ids: ListingCard slug + photo fallback need them) ─
const FARM_LISTINGS = db.farms.map((f, i) => ({
  id: i + 1,
  farm_name: f.name,
  name: f.name,
  location: f.location,
  state: f.location,
  area: f.category,
  price: f.price,
  price_per_night: f.price,
  rating: f.rating,
  reviews: f.reviews,
  farm_photo: f.image,
  is_verified: f.verified,
  is_active: true,
  beds: f.beds,
  capacity: f.capacity,
  tags: f.tags,
  description: `${f.category} farm stay hosted by ${f.owner}. Rated ${f.rating} by ${f.reviews} guests.`,
  latitude: f.latitude,
  longitude: f.longitude,
  created_at: "2026-01-15",
}));

const CREATOR_LISTINGS = [
  { id: 1, name: "Ishita Rao", niche: "Travel & Food", rating: 4.9, reviews: 210, price: 8000, location: "Bengaluru, Karnataka", state: "Karnataka", is_verified: true, experience: 46, followers: "128K" },
  { id: 2, name: "Tara Fernandes", niche: "Lifestyle Vlogs", rating: 4.7, reviews: 164, price: 6500, location: "Goa", state: "Goa", is_verified: true, experience: 32, followers: "96K" },
  { id: 3, name: "Arjun Menon", niche: "Agriculture Tech", rating: 4.8, reviews: 98, price: 7200, location: "Kochi, Kerala", state: "Kerala", is_verified: true, experience: 28, followers: "74K" },
  { id: 4, name: "Kavya Nair", niche: "Rural Culture", rating: 4.6, reviews: 122, price: 5400, location: "Mysuru, Karnataka", state: "Karnataka", is_verified: false, experience: 19, followers: "51K" },
  { id: 5, name: "Dev Patel", niche: "Adventure & Trekking", rating: 4.8, reviews: 187, price: 9100, location: "Manali, HP", state: "Himachal Pradesh", is_verified: true, experience: 41, followers: "143K" },
  { id: 6, name: "Meera Krishnan", niche: "Food & Recipes", rating: 4.9, reviews: 240, price: 7800, location: "Madurai, TN", state: "Tamil Nadu", is_verified: true, experience: 52, followers: "167K" },
];

// ── Bookings ──────────────────────────────────────────────────────────────────
const TOURIST_BOOKINGS = db.bookings.map((b, i) => ({
  id: i + 1,
  booking_type: b.type === "Experience" ? "creator" : "farm",
  farm_id: b.type === "Experience" ? null : (i % FARM_LISTINGS.length) + 1,
  creator_id: b.type === "Experience" ? (i % CREATOR_LISTINGS.length) + 1 : null,
  item_name: b.item,
  item_emoji: b.type === "Experience" ? "🎬" : "🌾",
  check_in: b.date,
  check_out: b.date,
  total_price: b.amount,
  status: b.status,
}));

const legacyHostBooking = (b, i) => ({
  id: i + 1,
  tourist_name: b.guest,
  item_name: b.item,
  item_emoji: b.type === "Experience" ? "🎬" : "🌾",
  region: b.location,
  check_in: b.date,
  check_out: b.date,
  adults: Math.max(1, b.guests - 1),
  children: b.guests > 2 ? 1 : 0,
  total_price: b.amount,
  status: b.status,
  collab_note: "Looking forward to collaborating on authentic farm content.",
});

const HOST_BOOKINGS = {
  received: db.bookings.map(legacyHostBooking),
  made: db.bookings.slice(0, 2).map(legacyHostBooking),
};

// ── Admin ─────────────────────────────────────────────────────────────────────
const ADMIN_STATS = {
  total_users: db.platformStats.users,
  farmers: 4821,
  creators: 2960,
  tourists: 7351,
  total_bookings: db.platformStats.bookings,
  pending_bookings: 128,
};

const ADMIN_USERS = db.users.map((u) => ({
  id: u.id,
  full_name: u.name,
  email: u.email,
  mobile: "98450 12345",
  role: u.role,
  is_active: u.status === "active",
  created_at: u.joined,
  profile: {
    name: u.name,
    email: u.email,
    mobile: "98450 12345",
    city: "Bengaluru",
    state: "Karnataka",
    is_verified: u.verified,
  },
}));

const ADMIN_BOOKINGS = db.bookings.map((b, i) => ({
  id: i + 1,
  booking_type: b.type === "Experience" ? "creator" : "farm",
  farm_name: b.type === "Experience" ? null : b.item,
  creator_name: b.type === "Experience" ? b.item : null,
  address: b.location,
  check_in: b.date,
  check_out: b.date,
  tourist_name: b.guest,
  adults: Math.max(1, b.guests - 1),
  children: b.guests > 2 ? 1 : 0,
  total_price: b.amount,
  status: b.status,
}));

// ── Profile ───────────────────────────────────────────────────────────────────
const profileFor = () => {
  const u = getUser() || {};
  return {
    id: u.userId || u.id || 1,
    name: u.name || "Demo User",
    full_name: u.name || "Demo User",
    email: u.email || "demo@namma.connect",
    mobile: u.mobile || "98450 12345",
    role: u.role || "tourist",
    city: "Coorg",
    state: "Karnataka",
    is_verified: true,
    bio: "Passionate about sustainable travel and authentic farm experiences.",
    created_at: "2026-01-15",
  };
};

const AI_REPLY = (prompt) => ({
  response:
    `Great choice! Based on "${(prompt || "").slice(0, 60)}", I'd suggest a 2-night stay at Green Valley Organic Farm in Coorg — coffee estate walks, a honey-tasting session, and a traditional Kodava dinner. ` +
    "Want me to add a spice-estate trek in Munnar on the way back?",
  suggestions: [
    { id: 1, name: "Green Valley Organic Farm", type: "farm" },
    { id: 3, name: "Hillcrest Spice Estate", type: "farm" },
  ],
});

// ── Router ────────────────────────────────────────────────────────────────────
export function mockFallbackData(config) {
  const method = (config.method || "get").toLowerCase();
  const path = (config.url || "").startsWith("http")
    ? new URL(config.url).pathname.replace(/^.*\/api/, "")
    : config.url || "";

  // Writes (contact, status updates, deletes) succeed silently in demo mode.
  if (method !== "get") {
    if (path.startsWith("/ai/chat")) return AI_REPLY(JSON.parse(config.data || "{}").prompt);
    return { status: "ok", success: true };
  }

  // Unified search — /search?type=farm|creator|all
  if (path.startsWith("/search")) {
    if (path.includes("type=creator")) return CREATOR_LISTINGS;
    if (path.includes("type=all")) return { farms: FARM_LISTINGS, creators: CREATOR_LISTINGS };
    return FARM_LISTINGS;
  }

  // Farms — /farms, /farms?owner_id=, /farms/{id}
  if (/^\/farms\/\d+/.test(path)) {
    const id = parseInt(path.split("/")[2], 10);
    return FARM_LISTINGS.find((f) => f.id === id) || FARM_LISTINGS[0];
  }
  if (path.startsWith("/farms")) {
    if (path.includes("owner_id=")) return FARM_LISTINGS.slice(0, 4);
    return FARM_LISTINGS;
  }

  // Host profile by farmer id — /farmers/{id}
  if (/^\/farmers\/\d+/.test(path)) return profileFor();

  // Creators — /creators, /creators/{id}, /creators/{id}/availability
  if (/^\/creators\/\d+\/availability/.test(path)) {
    return { available: true, suggested_dates: [] };
  }
  if (/^\/creators\/\d+/.test(path)) {
    const id = parseInt(path.split("/")[2], 10);
    return CREATOR_LISTINGS.find((c) => c.id === id) || CREATOR_LISTINGS[0];
  }
  if (path.startsWith("/creators")) return CREATOR_LISTINGS;

  // Bookings — /bookings/{user_id} is role-aware server-side
  if (/^\/bookings\/\d+/.test(path)) {
    const role = getUser()?.role;
    return role === "farmer" || role === "creator" ? HOST_BOOKINGS : TOURIST_BOOKINGS;
  }
  if (/^\/collaborations\/\d+/.test(path)) return HOST_BOOKINGS;

  // Wishlist
  if (/^\/wishlist\/\d+/.test(path)) return FARM_LISTINGS.slice(0, 4);

  // Admin
  if (path.startsWith("/admin/reports")) return ADMIN_STATS;
  if (path.startsWith("/admin/users")) return { users: ADMIN_USERS, total: ADMIN_USERS.length };
  if (path.startsWith("/admin/bookings")) return { bookings: ADMIN_BOOKINGS, total: ADMIN_BOOKINGS.length };

  // Users / auth
  if (/^\/users\/me\//.test(path)) return profileFor();
  if (path.startsWith("/auth/me")) return profileFor();

  return null;
}
