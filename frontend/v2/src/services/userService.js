import { authAPI, adminAPI, touristAPI } from "./api";
import api from "./api";
import { demoAuth, withDemoFallback } from "./demoAuth";

export const userEndpoints = {
  login: "/auth/login",
  register: "/auth/register",
  changePassword: "/auth/change-password",
  users: "/users",
  me: "/users/me",
  wishlist: "/wishlist",
  messages: "/messages",
  notifications: "/notifications",
  analytics: "/analytics",
};

const STORAGE_USER = "nc_user";
const STORAGE_TOKEN = "nc_token";

const getUser = () => { try { return JSON.parse(localStorage.getItem('nc_user') || 'null'); } catch { return null; } };

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function dashboardPathFor(role) {
  switch (role) {
    case "farmer":
      return "/farmer/home";
    case "creator":
      return "/creator/home";
    case "admin":
      return "/admin/home";
    default:
      return "/tourist/home";
  }
}

export const userService = {
  login: ({ identifier, password }) =>
    withDemoFallback(
      () => authAPI.login({ identifier, password }),
      () => demoAuth.login({ identifier }),
    ),

  register: ({ full_name, email, mobile, password }) =>
    withDemoFallback(
      () => authAPI.register({ full_name, email, mobile, password }),
      () => demoAuth.register({ full_name, email, mobile }),
    ),

  changePassword: (data) => authAPI.changePassword(data),

  getCurrentUser: () => {
    try {
      const raw = localStorage.getItem(STORAGE_USER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  saveSession: (token, user) => {
    localStorage.setItem(STORAGE_TOKEN, token);
    localStorage.setItem(STORAGE_USER, JSON.stringify(user));
    window.dispatchEvent(new Event("nc-user-change"));
  },

  logout: () => {
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_USER);
    window.dispatchEvent(new Event("nc-user-change"));
  },

  getUsers: () => adminAPI.getUsers().then(r => r.data?.users || r.data || []),

  getVerifiedUsers: () => adminAPI.getUsers().then(r => (r.data?.users || r.data || []).filter(u => u.is_verified)),

  getWishlist: () => {
    const userId = getUser()?.userId;
    return touristAPI.getWishlist(userId).then(r => r.data?.wishlist || []);
  },

  getConversations: () => api.get('/messages').then(r => r.data || []),

  getNotifications: () => api.get('/notifications').then(r => r.data || []),

  getAnalytics: (role) => api.get('/analytics', {params: {role}}).then(r => r.data || {}),
};

export default userService;
