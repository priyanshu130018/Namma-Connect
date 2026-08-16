import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { bookingStore } from "@/services/bookingStore";
import { conversations } from "@/mocks";

/**
 * Global app state (Context API) — logged-in user, live notifications,
 * and unread message count. Consumed by the navbar, dashboards, and
 * messages so everything stays in sync without prop drilling.
 */

export type SessionUser = {
  userId?: string;
  role?: "tourist" | "farmer" | "creator" | "admin" | string;
  name?: string;
  email?: string;
  mobile?: string;
} | null;

export type AppNotification = {
  id: string;
  category: string;
  title: string;
  body: string;
  time: string;
  type: string;
  read: boolean;
  audience: string;
};

type AppContextValue = {
  user: SessionUser;
  notifications: AppNotification[];
  unreadNotifications: number;
  unreadMessages: number;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);

/* Reactive session user — updates when login/logout writes nc_user. */
function subscribeUser(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener("nc-user-change", cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener("nc-user-change", cb);
  };
}
const getUserSnapshot = () => localStorage.getItem("nc_user");
const getUserServerSnapshot = () => null;

export function AppProvider({ children }: { children: ReactNode }) {
  const rawUser = useSyncExternalStore(subscribeUser, getUserSnapshot, getUserServerSnapshot);
  const user = useMemo<SessionUser>(() => {
    try {
      return rawUser ? JSON.parse(rawUser) : null;
    } catch {
      return null;
    }
  }, [rawUser]);

  const bookingState = useSyncExternalStore(
    (cb) => bookingStore.subscribe(cb),
    () => bookingStore.getState(),
    () => bookingStore.getState(),
  );

  const value = useMemo<AppContextValue>(() => {
    const role = user?.role ?? "guest";
    const notifications = bookingState.notifications.filter(
      (n: AppNotification) => n.audience === "all" || n.audience === role,
    );
    return {
      user,
      notifications,
      unreadNotifications: notifications.filter((n: AppNotification) => !n.read).length,
      unreadMessages: conversations.reduce((sum, c) => sum + (c.unread ?? 0), 0),
      markNotificationRead: (id: string) => bookingStore.markNotificationRead(id),
      markAllNotificationsRead: () => bookingStore.markAllNotificationsRead(role),
    };
  }, [user, bookingState]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}
