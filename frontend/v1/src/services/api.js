import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000/api",
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token to every request if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ng_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401 → clear auth and redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("ng_token");
      localStorage.removeItem("ng_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  googleLogin: (credential) => api.post(`/auth/google?credential=${credential}`),
  me: () => api.get("/auth/me"),
  changePassword: (data) => api.post("/auth/change-password", data),
  changePasswordAuth: (userId, data) => api.post("/auth/change-password/authenticated", data),
  deleteAccount: (userId) => api.delete("/auth/account"),
};

// ─── Tourist ─────────────────────────────────────────────────────────────────
export const touristAPI = {
  register: (userId, data) => api.post("/applications", { type: 'tourist', ...data }),
  getProfile: (userId) => api.get("/profile"),
  updateProfile: (userId, data) => api.patch("/profile", data),
  getWishlist: () => api.get("/wishlist"),
  updateWishlist: (userId, wishlist) => api.post("/wishlist"),
  getSettings: (userId) => api.get("/profile"),
};

// ─── Creator ─────────────────────────────────────────────────────────────────
export const creatorAPI = {
  register: (userId, data) => api.post("/applications", { type: 'creator', creator_details: data }),
  getProfile: (userId) => api.get("/profile"),
  getCreator: (creatorId) => api.get(`/creators/${creatorId}`),
  updateProfile: (userId, data) => api.patch("/profile", data),
  getBookings: (userId) => api.get("/collaborations"),
  listCreators: () => api.get("/creators"),
  getSettings: (userId) => api.get("/profile"),
  checkAvailability: (creatorId, start, end) => api.get(`/creators/${creatorId}/availability?date_start=${start}&date_end=${end}`),
};

// ─── Farm ────────────────────────────────────────────────────────────────────
export const farmAPI = {
  register: (userId, data) => api.post("/applications", { type: 'farmer', farmer_details: data }),
  getProfile: (userId) => api.get("/profile"),
  getFarmerProfile: (farmerId) => api.get(`/farmers/${farmerId}`),
  updateProfile: (userId, data) => api.patch("/profile", data),
  getListings: (userId) => api.get(`/farms?owner_id=${userId}`),
  createListing: (userId, data) => api.post("/farms", data),
  getListing: (listingId) => api.get(`/farms/${listingId}`),
  updateListing: (listingId, data) => api.patch(`/farms/${listingId}`, data),
  deleteListing: (listingId, userId) => api.delete(`/farms/${listingId}`),
  listFarms: () => api.get("/farms"),
  getBookings: (userId) => api.get("/bookings"),
  getSettings: (userId) => api.get("/profile"),
};

// ─── Bookings ─────────────────────────────────────────────────────────────────
export const bookingAPI = {
  create: (userId, data) => api.post("/bookings", data),
  getUserBookings: (userId) => api.get("/bookings"),
  delete: (bookingId, userId) => api.post(`/bookings/${bookingId}/cancel`),
  updateStatus: (bookingId, status) => api.patch(`/bookings/${bookingId}`, { status }),
  updateFarmerStatus: (bookingId, userId, data) =>
    api.patch(`/bookings/${bookingId}`, data),
  updateCreatorStatus: (bookingId, userId, data) =>
    api.patch(`/collaborations/${bookingId}`, data),
};

// ─── Search & AI ──────────────────────────────────────────────────────────────
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

// ─── Contact ──────────────────────────────────────────────────────────────────
export const contactAPI = {
  submit: (data) => api.post("/contact", data),
};

// ─── Admin ────────────────────────────────────────────────────────────────────
export const adminAPI = {
  getStats: () => api.get("/admin/stats"),
  getUsers: (params) => api.get("/admin/users", { params }),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),
  getBookings: (params) => api.get("/admin/bookings", { params }),
};

