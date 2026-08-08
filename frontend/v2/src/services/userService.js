/**
 * User service — mock implementation.
 *
 * Endpoint structure (future-ready; swap internals for real HTTP calls):
 *   POST /auth/login            → authenticate (email/mobile + password)
 *   POST /auth/register         → create account
 *   POST /auth/change-password  → reset password after OTP verification
 *   GET  /users                 → admin user list
 *   GET  /users/me              → current session profile (localStorage)
 *   GET  /wishlist              → saved farms/experiences
 *   GET  /messages              → conversations
 *   GET  /notifications         → notifications feed
 *   GET  /analytics             → role analytics (revenue/traffic/engagement)
 */
import { mockApi } from "./mockApi";
import { authAPI } from "./api";
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

/** GET /users/me — current session profile from localStorage */
export function getStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Role → that role's dashboard home. */
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
  /** POST /auth/login — real API with demo fallback */
  login: ({ identifier, password }) =>
    withDemoFallback(
      () => authAPI.login({ identifier, password }),
      () => demoAuth.login({ identifier }),
    ),

  /** POST /auth/register — real API with demo fallback */
  register: ({ full_name, email, mobile, password }) =>
    withDemoFallback(
      () => authAPI.register({ full_name, email, mobile, password }),
      () => demoAuth.register({ full_name, email, mobile }),
    ),

  /** POST /auth/change-password — mock success */
  changePassword: ({ identifier, password }) =>
    Promise.resolve({ ok: true, identifier, password }),

  /** GET /users/me — session profile from localStorage */
  getCurrentUser: () => {
    try {
      const raw = localStorage.getItem(STORAGE_USER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  /** Persist session (token + user) */
  saveSession: (token, user) => {
    localStorage.setItem(STORAGE_TOKEN, token);
    localStorage.setItem(STORAGE_USER, JSON.stringify(user));
    // Notify the global app context so navbar/dashboards react instantly.
    window.dispatchEvent(new Event("nc-user-change"));
  },

  /** DELETE session */
  logout: () => {
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_USER);
    window.dispatchEvent(new Event("nc-user-change"));
  },

  /** GET /users (admin) */
  getUsers: () => mockApi.getUsers(),

  /** GET /users/verified (admin) */
  getVerifiedUsers: () => mockApi.getVerifiedUsers(),

  /** GET /wishlist */
  getWishlist: () => mockApi.getWishlist(),

  /** GET /messages */
  getConversations: () => mockApi.getConversations(),

  /** GET /notifications */
  getNotifications: () => mockApi.getNotifications(),

  /** GET /analytics — per-role metric bundles */
  getAnalytics: (role) => {
    switch (role) {
      case "farmer":
        return Promise.all([mockApi.getRevenue(), mockApi.getTraffic()]).then(
          ([revenue, traffic]) => ({ revenue, traffic }),
        );
      case "creator":
        return mockApi.getEngagement().then((engagement) => ({ engagement }));
      case "admin":
        return mockApi.getPlatformStats().then((stats) => ({ stats }));
      default:
        return mockApi.getReports().then((reports) => ({ reports }));
    }
  },
};

export default userService;
