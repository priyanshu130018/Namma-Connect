/**
 * Demo auth fallback.
 * Used ONLY when the real backend is unreachable (network error, not a 4xx).
 * Mimics the exact response shapes of authAPI so the UI never knows the
 * difference, and lets the full product be explored in preview/demo mode.
 *
 * Demo accounts (any password works):
 *   tourist@demo.com · farmer@demo.com · creator@demo.com · admin@demo.com
 * Any other email signs up/in as a tourist by default.
 */

const STORE_KEY = "nc_demo_users";

const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms));

const loadUsers = () => {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
  } catch {
    return [];
  }
};

const saveUsers = (users) => localStorage.setItem(STORE_KEY, JSON.stringify(users));

const inferRole = (identifier = "") => {
  const id = identifier.toLowerCase();
  if (id.includes("admin")) return "admin";
  if (id.includes("farmer")) return "farmer";
  if (id.includes("creator")) return "creator";
  return "tourist";
};

const toSession = (user) => ({
  access_token: `demo-token-${user.user_id}`,
  user_id: user.user_id,
  profile_id: user.profile_id,
  role: user.role,
  name: user.name,
  email: user.email,
  mobile: user.mobile,
});

export const isNetworkError = (err) => !err?.response;

export const demoAuth = {
  async register({ full_name, email, mobile }) {
    await delay();
    const users = loadUsers();
    const existing = users.find((u) => u.email === email.toLowerCase());
    if (!existing) {
      users.push({
        user_id: `demo-${Date.now()}`,
        profile_id: `profile-${Date.now()}`,
        role: inferRole(email),
        name: full_name,
        email: email.toLowerCase(),
        mobile: mobile || "",
      });
      saveUsers(users);
    }
    return { data: { status: "ok" } };
  },

  async login({ identifier }) {
    await delay();
    const id = identifier.trim().toLowerCase();
    const users = loadUsers();
    let user = users.find((u) => u.email === id || u.mobile === id);
    if (!user) {
      // Auto-provision a demo account so any credential works in demo mode.
      user = {
        user_id: `demo-${Date.now()}`,
        profile_id: `profile-${Date.now()}`,
        role: inferRole(id),
        name: id
          .split("@")[0]
          .replace(/[._-]+/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase()),
        email: id.includes("@") ? id : "",
        mobile: id.includes("@") ? "" : id,
      };
      users.push(user);
      saveUsers(users);
    }
    return { data: toSession(user) };
  },

  async googleLogin() {
    await delay();
    const user = {
      user_id: "demo-google",
      profile_id: "profile-google",
      role: "tourist",
      name: "Google User",
      email: "google.user@demo.com",
      mobile: "",
    };
    return { data: toSession(user) };
  },

  async changePassword() {
    await delay();
    return { data: { status: "ok" } };
  },
};

/** Run `realCall`; if the backend is unreachable, fall back to `demoCall`. */
export async function withDemoFallback(realCall, demoCall) {
  try {
    return await realCall();
  } catch (err) {
    if (isNetworkError(err)) return demoCall();
    throw err;
  }
}
