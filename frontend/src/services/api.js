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
  register: (data) => api.post("/register", data),
  login: (data) => api.post("/login", data),
  googleLogin: (credential) => api.post(`/google?credential=${credential}`),
  me: (token) => api.get(`/me?token=${token}`),
  changePassword: (data) => api.post("/change-password", data),
};

// ─── Tourist ─────────────────────────────────────────────────────────────────
export const touristAPI = {
  register: (id, data) => api.post(`/services/tourist/register/${id}`, data), // Assuming pattern matches
  getProfile: (id) => api.get(`/tourist/profile/${id}`),
  updateProfile: (id, data) => api.put(`/tourist/profile/${id}`, data),
  getWishlist: (id) => api.get(`/tourist/wishlist/${id}`),
  updateWishlist: (id, wishlist) => api.put(`/tourist/wishlist/${id}?wishlist=${encodeURIComponent(wishlist)}`),
  getSettings: (id) => api.get(`/tourist/settings/${id}`),
};

// ─── Creator ─────────────────────────────────────────────────────────────────
export const creatorAPI = {
  register: (id, data) => api.post(`/services/creator/register/${id}`, data),
  getProfile: (id) => api.get(`/creator/profile/${id}`),
  getCreator: (id) => api.get(`/creator/${id}`),
  updateProfile: (id, data) => api.put(`/creator/profile/${id}`, data),
  getBookings: (id) => api.get(`/creator/bookings/${id}`),
  listCreators: () => api.get("/creator/listing"),
  getSettings: (id) => api.get(`/creator/settings/${id}`),
};

// ─── Farm (Backend uses /farmer) ─────────────────────────────────────────────
export const farmAPI = {
  // register: creates profile + first listing
  register: (loginId, data) => api.post(`/services/farmer/register/${loginId}`, data),
  getProfile: (loginId) => api.get(`/farmer/profile/${loginId}`),
  getListings: (loginId) => api.get(`/farmer/list/${loginId}`),
  getListing: (listingId) => api.get(`/farmer/listing/${listingId}`),
  updateListing: (listingId, data) => api.put(`/farmer/listing/${listingId}`, data),
  listFarms: () => api.get("/farmer/farm-listing"),
  getBookings: (loginId) => api.get(`/farmer/bookings/${loginId}`),
  getSettings: (loginId) => api.get(`/farmer/settings/${loginId}`),
};

// ─── Bookings ─────────────────────────────────────────────────────────────────
export const bookingAPI = {
  create: (id, data) => api.post(`/tourist/booking/${id}`, data),
  getBookings: (id) => api.get(`/tourist/bookings/${id}`),
  delete: (id, loginId) => api.delete(`/tourist/booking/${id}/${loginId}`),
  updateStatus: (id, status) => api.put(`/tourist/booking/${id}/status`, { status }),
};

// ─── Search & AI ──────────────────────────────────────────────────────────────
export const searchAPI = {
  farmers: (loginId, q, start, end) => api.get(`/farmer/search/${loginId}?query=${q || ""}&date_start=${start || ""}&date_end=${end || ""}`),
  creators: (loginId, q, start, end) => api.get(`/creator/search/${loginId}?query=${q || ""}&date_start=${start || ""}&date_end=${end || ""}`),
  tourist: (loginId, q, start, end) => api.get(`/tourist/search/${loginId}?query=${q || ""}&date_start=${start || ""}&date_end=${end || ""}`),
  getRecommendations: async () => {
    try {
      const [f, c] = await Promise.all([
        farmAPI.listFarms(),
        creatorAPI.listCreators()
      ]);
      return { 
        farmers: (f.data || []).map(x => ({...x, emoji: x.emoji || "🌾", rating: 4.8, reviews: 120})), 
        creators: (c.data || []).map(x => ({...x, emoji: x.emoji || "🎬", rating: 4.9, reviews: 85}))
      };
    } catch {
      return { farmers: [], creators: [] };
    }
  },
};

export const aiAPI = {
  recommendFarms: (loginId, query, startDate, endDate, timeSlot) => {
    const params = new URLSearchParams();
    if (query) params.append("query", query);
    if (startDate) params.append("date_start", startDate);
    if (endDate) params.append("date_end", endDate);
    if (timeSlot) params.append("time_slot", timeSlot);
    const qs = params.toString();
    return api.get(`/farmer/search/${loginId}${qs ? `?${qs}` : ""}`);
  },
  recommendCreators: (loginId, query, startDate, endDate) => {
    const params = new URLSearchParams();
    if (query) params.append("query", query);
    if (startDate) params.append("date_start", startDate);
    if (endDate) params.append("date_end", endDate);
    const qs = params.toString();
    return api.get(`/creator/search/${loginId}${qs ? `?${qs}` : ""}`);
  },
  planTripChat: (prompt) => api.post(`/farmer/trip-planner?prompt=${encodeURIComponent(prompt)}`),
};

// ─── Contact ──────────────────────────────────────────────────────────────────
export const contactAPI = {
  submit: (data) => api.post("/contact/submit", data),
};
