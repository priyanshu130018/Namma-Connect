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
  // Authenticated change password — sends current password for verification
  changePasswordAuth: (userId, data) => api.post(`/change-password/${userId}`, data),
  deleteAccount: (userId) => api.delete(`/delete-account/${userId}`),
};

// ─── Tourist ─────────────────────────────────────────────────────────────────
export const touristAPI = {
  register: (userId, data) => api.post(`/services/tourist/register/${userId}`, data),
  getProfile: (userId) => api.get(`/tourist/profile/${userId}`),
  updateProfile: (userId, data) => api.put(`/tourist/profile/${userId}`, data),
  getWishlist: (userId) => api.get(`/tourist/wishlist/${userId}`),
  updateWishlist: (userId, wishlist) => api.put(`/tourist/wishlist/${userId}?wishlist=${encodeURIComponent(wishlist)}`),
  getSettings: (userId) => api.get(`/tourist/settings/${userId}`),
};

// ─── Creator ─────────────────────────────────────────────────────────────────
export const creatorAPI = {
  register: (userId, data) => api.post(`/services/creator/register/${userId}`, data),
  getProfile: (userId) => api.get(`/creator/profile/${userId}`),
  getCreator: (creatorId) => api.get(`/creator/${creatorId}`),
  updateProfile: (userId, data) => api.put(`/creator/profile/${userId}`, data),
  getBookings: (userId) => api.get(`/creator/bookings/${userId}`),
  listCreators: () => api.get("/creator/listing"),
  getSettings: (userId) => api.get(`/creator/settings/${userId}`),
  checkAvailability: (creatorId, start, end) => api.get(`/creator/check-availability/${creatorId}?date_start=${start}&date_end=${end}`),
};

// ─── Farm (Backend uses /farmer) ─────────────────────────────────────────────
export const farmAPI = {
  // register: creates/updates farmer profile only
  register: (userId, data) => api.post(`/services/farmer/register/${userId}`, data),
  getProfile: (userId) => api.get(`/farmer/profile/${userId}`),
  // Fetch farmer profile by farmer table primary key (farmer.id = farm_listing.farmer_id)
  getFarmerProfile: (farmerId) => api.get(`/farmer/by-profile/${farmerId}`),
  updateProfile: (userId, data) => api.put(`/farmer/profile/${userId}`, data),
  getListings: (userId) => api.get(`/farmer/list/${userId}`),
  createListing: (userId, data) => api.post(`/farmer/list/${userId}`, data),
  getListing: (listingId) => api.get(`/farmer/listing/${listingId}`),
  updateListing: (listingId, data) => api.put(`/farmer/listing/${listingId}`, data),
  deleteListing: (listingId, userId) => api.delete(`/farmer/listing/${listingId}/${userId}`),
  listFarms: () => api.get("/farmer/farm-listing"),
  getBookings: (userId) => api.get(`/farmer/bookings/${userId}`),
  getSettings: (userId) => api.get(`/farmer/settings/${userId}`),
};

// ─── Bookings ─────────────────────────────────────────────────────────────────
export const bookingAPI = {
  // tourist_id is derived from user_id server-side, do not include it in body
  create: (userId, data) => api.post(`/tourist/booking/${userId}`, data),
  getUserBookings: (userId) => api.get(`/tourist/bookings/${userId}`),
  delete: (bookingId, userId) => api.delete(`/tourist/booking/${bookingId}/${userId}`),
  updateStatus: (bookingId, status) => api.put(`/tourist/booking/${bookingId}/status`, { status }),
  // Farmer approves/rejects a booking
  updateFarmerStatus: (bookingId, userId, data) =>
    api.put(`/farmer/booking/${bookingId}/status/${userId}`, data),
  // Creator approves/rejects a booking
  updateCreatorStatus: (bookingId, userId, data) =>
    api.put(`/creator/booking/${bookingId}/status/${userId}`, data),
};

// ─── Search & AI ──────────────────────────────────────────────────────────────
export const searchAPI = {
  farmers: (userId, q, start, end) => api.get(`/farmer/search/${userId}?query=${q || ""}&date_start=${start || ""}&date_end=${end || ""}`),
  creators: (userId, q, start, end) => api.get(`/creator/search/${userId}?query=${q || ""}&date_start=${start || ""}&date_end=${end || ""}`),
  tourist: (userId, q, start, end) => api.get(`/tourist/search/${userId}?query=${q || ""}&date_start=${start || ""}&date_end=${end || ""}`),
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
    const params = new URLSearchParams();
    if (query) params.append("query", query);
    if (startDate) params.append("date_start", startDate);
    if (endDate) params.append("date_end", endDate);
    if (timeSlot) params.append("time_slot", timeSlot);
    const qs = params.toString();
    return api.get(`/farmer/search/${userId}${qs ? `?${qs}` : ""}`);
  },
  recommendCreators: (userId, query, startDate, endDate) => {
    const params = new URLSearchParams();
    if (query) params.append("query", query);
    if (startDate) params.append("date_start", startDate);
    if (endDate) params.append("date_end", endDate);
    const qs = params.toString();
    return api.get(`/creator/search/${userId}${qs ? `?${qs}` : ""}`);
  },
  chat: (prompt, sessionState) => api.post("/ai/chat", { prompt, session_state: sessionState }),
};

// ─── Contact ──────────────────────────────────────────────────────────────────
export const contactAPI = {
  submit: (data) => api.post("/contact/submit", data),
};

// ─── Admin ────────────────────────────────────────────────────────────────────
export const adminAPI = {
  getStats: () => api.get("/admin/stats"),
  getUsers: (params) => api.get("/admin/users", { params }),
  getUser: (userId) => api.get(`/admin/user/${userId}`),
  deleteUser: (userId) => api.delete(`/admin/user/${userId}`),
  verifyUser: (userId) => api.put(`/admin/user/${userId}/verify`),
  getBookings: (params) => api.get("/admin/bookings", { params }),
};

