import axios from "axios";


const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api",
  timeout: 8000,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token to every request if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("nc_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401 → clear auth and redirect to login.
// On network failure (backend unreachable) → serve mock data so every
// screen still renders realistic content in demo/preview mode.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("nc_token");
      localStorage.removeItem("nc_user");
      window.location.href = "/login";
      return Promise.reject(err);
    }

    return Promise.reject(err);
  }
);

export default api;

// ─── Auth (/auth/*) ──────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  googleLogin: (credential) => api.post(`/auth/google?credential=${credential}`),
  me: () => api.get("/auth/me"),
  // Reset flow — { identifier: email|mobile, new_password }
  changePassword: (data) => api.post("/auth/change-password", data),
  // Authenticated change — { identifier: currentPassword, new_password }
  changePasswordAuth: (userId, data) => api.post("/auth/change-password/authenticated", data),
  deleteAccount: (userId) => api.delete(`/auth/account`),
};

// ─── Tourist (/users/* + /wishlist/*) ────────────────────────────────────────
export const touristAPI = {
  getProfile: (userId) => api.get(`/profile`),
  updateProfile: (userId, data) => api.patch(`/profile`, data),
  getWishlist: () => api.get("/wishlist"),
  updateWishlist: (userId, wishlist) => api.post("/wishlist"),
};

// ─── Creator (/users/* + /creators/* + /collaborations/*) ────────────────────
export const creatorAPI = {
  register: (userId, data) => {
    const details = data?.profile || data || {};
    if (!details.display_name && details.name) {
      details.display_name = details.name;
    }
    return api.post(`/applications`, { type: "creator", creator_details: details });
  },
  getProfile: (userId) => api.get(`/profile`),
  getCreator: (creatorId) => api.get(`/creators/${creatorId}`),
  updateProfile: (userId, data) => api.patch(`/profile`, data),
  getBookings: (userId) => api.get(`/collaborations`),
  listCreators: () => api.get("/creators"),
  checkAvailability: (creatorId, start, end) => api.get(`/creators/${creatorId}/availability?date_start=${start}&date_end=${end}`),
};

// ─── Farms (/users/* + /farms/*) ──────────────────────────────────────────────
export const farmAPI = {
  // register: creates/updates farmer profile only
  register: (userId, data) => {
    const details = data?.profile || data || {};
    return api.post(`/applications`, { type: "farmer", farmer_details: details });
  },
  getProfile: (userId) => api.get(`/profile`),
  // Fetch farmer profile by farmer table primary key (farmer.id = farm_listing.farmer_id)
  getFarmerProfile: (farmerId) => api.get(`/farmers/${farmerId}`),
  updateProfile: (userId, data) => api.patch(`/profile`, data),
  getListings: (userId) => api.get(`/farms?owner_id=${userId}`),
  createListing: (userId, data) => api.post(`/farms`, data),
  getListing: (listingId) => api.get(`/farms/${listingId}`),
  updateListing: (listingId, data) => api.patch(`/farms/${listingId}`, data),
  deleteListing: (listingId, userId) => api.delete(`/farms/${listingId}`),
  listFarms: () => api.get("/farms"),
  getBookings: (userId) => api.get(`/bookings`),
};

// ─── Bookings (/bookings/* + /collaborations/*) ───────────────────────────────
export const bookingAPI = {
  // tourist_id is derived from user_id server-side, do not include it in body
  create: (userId, data) => api.post(`/bookings`, data),
  getUserBookings: (userId) => api.get(`/bookings`),
  cancel: (bookingId) => api.post(`/bookings/${bookingId}/cancel`),
  requestDateChange: (bookingId, data) => api.post(`/bookings/${bookingId}/date-change`, data),
  // Tourist cancels / generic status update (no ownership check)
  updateStatus: (bookingId, status) => api.patch(`/bookings/${bookingId}`, { status }),
  // Farmer approves/rejects a booking (ownership verified server-side)
  updateFarmerStatus: (bookingId, userId, data) =>
    api.patch(`/bookings/${bookingId}`, data),
  // Creator approves/rejects a collaboration request
  updateCreatorStatus: (bookingId, userId, data) =>
    api.patch(`/collaborations/${bookingId}`, data),
};

// ─── Payments (/payments/*) ──────────────────────────────────────────────────
export const paymentAPI = {
  createOrder: (data) => api.post("/payments/create-order", data),
  verify: (data) => api.post("/payments/verify", data),
  getHistory: () => api.get("/payments/history"),
};

// ─── Search & AI (/search + /ai/*) ─────────────────────────────────────────────
export const searchAPI = {
  farmers: (userId, q, start, end) => api.get(`/search?type=farm&query=${q || ""}&date_start=${start || ""}&date_end=${end || ""}`),
  creators: (userId, q, start, end) => api.get(`/search?type=creator&query=${q || ""}&date_start=${start || ""}&date_end=${end || ""}`),
  tourist: (userId, q, start, end) => api.get(`/search?type=all&query=${q || ""}&date_start=${start || ""}&date_end=${end || ""}`),
  getRecommendations: async () => {
    try {
      const [f, c] = await Promise.all([
        farmAPI.listFarms(),
        creatorAPI.listCreators()
      ]);
      return {
        farmers: f.data || [],
        creators: c.data || []
      };
    } catch {
      return { farmers: [], creators: [] };
    }
  },
};

export const aiAPI = {
  recommendFarms: (userId, query, startDate, endDate, timeSlot) => {
    const params = new URLSearchParams({ type: "farm" });
    if (query) params.append("query", query);
    if (startDate) params.append("date_start", startDate);
    if (endDate) params.append("date_end", endDate);
    if (timeSlot) params.append("time_slot", timeSlot);
    return api.get(`/search?${params.toString()}`);
  },
  recommendCreators: (userId, query, startDate, endDate) => {
    const params = new URLSearchParams({ type: "creator" });
    if (query) params.append("query", query);
    if (startDate) params.append("date_start", startDate);
    if (endDate) params.append("date_end", endDate);
    return api.get(`/search?${params.toString()}`);
  },
  chat: (prompt, sessionState) => api.post("/ai/chat", { prompt, session_state: sessionState }),
};

// ─── Contact (/contact) ─────────────────────────────────────────────────────────
export const contactAPI = {
  submit: (data) => api.post("/contact", data),
};

// ─── Reviews (/reviews) ────────────────────────────────────────────────────────
export const reviewAPI = {
  list: (params) => api.get("/reviews", { params }),
  getMyReviews: () => api.get("/reviews/me"),
  get: (id) => api.get(`/reviews/${id}`),
  create: (data) => api.post("/reviews", data),
  update: (id, data) => api.patch(`/reviews/${id}`, data),
  delete: (id) => api.delete(`/reviews/${id}`),
};

// ─── Admin (/admin/*) ───────────────────────────────────────────────────────────
export const adminAPI = {
  getStats: () => api.get("/admin/stats"),
  getUsers: (params) => api.get("/admin/users", { params }),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),
  getBookings: (params) => api.get("/admin/bookings", { params }),
};

