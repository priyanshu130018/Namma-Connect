import axios from "axios";
import { mockFallbackData } from "@/services/mockFallback";

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
    if (!err.response && err.config) {
      const data = mockFallbackData(err.config);
      if (data !== null && data !== undefined) {
        return Promise.resolve({ data, status: 200, statusText: "OK", headers: {}, config: err.config });
      }
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
  me: (token) => api.get(`/auth/me?token=${token}`),
  // Reset flow — { identifier: email|mobile, new_password }
  changePassword: (data) => api.post("/auth/change-password", data),
  // Authenticated change — { identifier: currentPassword, new_password }
  changePasswordAuth: (userId, data) => api.post(`/auth/change-password?user_id=${userId}`, data),
  deleteAccount: (userId) => api.delete(`/users/${userId}`),
};

// ─── Tourist (/users/* + /wishlist/*) ────────────────────────────────────────
export const touristAPI = {
  getProfile: (userId) => api.get(`/users/me/${userId}`),
  updateProfile: (userId, data) => api.put(`/users/update/${userId}`, data),
  getWishlist: (userId) => api.get(`/wishlist/${userId}`),
  updateWishlist: (userId, wishlist) => api.put(`/wishlist/${userId}?wishlist=${encodeURIComponent(wishlist)}`),
};

// ─── Creator (/users/* + /creators/* + /collaborations/*) ────────────────────
export const creatorAPI = {
  register: (userId, data) => api.post(`/users/register-role/${userId}?role=creator`, data),
  getProfile: (userId) => api.get(`/users/me/${userId}`),
  getCreator: (creatorId) => api.get(`/creators/${creatorId}`),
  updateProfile: (userId, data) => api.put(`/users/update/${userId}`, data),
  getBookings: (userId) => api.get(`/collaborations/${userId}`),
  listCreators: () => api.get("/creators"),
  checkAvailability: (creatorId, start, end) => api.get(`/creators/${creatorId}/availability?date_start=${start}&date_end=${end}`),
};

// ─── Farms (/users/* + /farms/*) ──────────────────────────────────────────────
export const farmAPI = {
  // register: creates/updates farmer profile only
  register: (userId, data) => api.post(`/users/register-role/${userId}?role=farmer`, data),
  getProfile: (userId) => api.get(`/users/me/${userId}`),
  // Fetch farmer profile by farmer table primary key (farmer.id = farm_listing.farmer_id)
  getFarmerProfile: (farmerId) => api.get(`/farmers/${farmerId}`),
  updateProfile: (userId, data) => api.put(`/users/update/${userId}`, data),
  getListings: (userId) => api.get(`/farms?owner_id=${userId}`),
  createListing: (userId, data) => api.post(`/farms/create/${userId}`, data),
  getListing: (listingId) => api.get(`/farms/${listingId}`),
  updateListing: (listingId, data) => api.put(`/farms/update/${listingId}`, data),
  deleteListing: (listingId, userId) => api.delete(`/farms/delete/${listingId}/${userId}`),
  listFarms: () => api.get("/farms"),
  getBookings: (userId) => api.get(`/bookings/${userId}`),
};

// ─── Bookings (/bookings/* + /collaborations/*) ───────────────────────────────
export const bookingAPI = {
  // tourist_id is derived from user_id server-side, do not include it in body
  create: (userId, data) => api.post(`/bookings/create/${userId}`, data),
  getUserBookings: (userId) => api.get(`/bookings/${userId}`),
  // Tourist cancels / generic status update (no ownership check)
  updateStatus: (bookingId, status) => api.put(`/bookings/status/${bookingId}`, { status }),
  // Farmer approves/rejects a booking (ownership verified server-side)
  updateFarmerStatus: (bookingId, userId, data) =>
    api.put(`/bookings/status/${bookingId}?user_id=${userId}`, data),
  // Creator approves/rejects a collaboration request
  updateCreatorStatus: (bookingId, userId, data) =>
    api.put(`/collaborations/status/${bookingId}/${userId}`, data),
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

// ─── Admin (/admin/*) ───────────────────────────────────────────────────────────
export const adminAPI = {
  getStats: () => api.get("/admin/reports"),
  getUsers: (params) => api.get("/admin/users", { params }),
  getUser: (userId) => api.get(`/admin/user/${userId}`),
  deleteUser: (userId) => api.delete(`/admin/user/${userId}`),
  verifyUser: (userId) => api.put(`/admin/verify/${userId}`),
  getBookings: (params) => api.get("/admin/bookings", { params }),
};
