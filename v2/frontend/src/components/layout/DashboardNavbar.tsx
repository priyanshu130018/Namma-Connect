import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  MessageSquare,
  Sun,
  Moon,
  Laptop,
  Globe,
  User,
  Settings,
  HeartHandshake,
  LogOut,
  Sprout,
  LifeBuoy,
  Check,
  Building2,
  ShieldAlert,
  Menu,
  CheckCheck,
} from "lucide-react";
import { Dropdown, DropdownItem, DropdownDivider, DropdownHeader } from "@/components/ui/dropdown";
import { Tooltip } from "@/components/ui/tooltip";
import { useAuth } from "@/app/providers";
import { useTheme } from "@/app/theme";
import { useTranslation } from "@/i18n";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/services/communicationService";
import { AppNotification } from "@/types";

export interface DashboardNavbarProps {
  onOpenSupport?: () => void;
  onToggleMobileSidebar?: () => void;
}

export function DashboardNavbar({ onOpenSupport, onToggleMobileSidebar }: DashboardNavbarProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useTranslation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState<AppNotification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const displayName = user?.full_name || "User";
  const displayEmail = user?.email || "";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const fetchNotifs = async () => {
    try {
      const notifs = await getNotifications();
      setUnreadCount(notifs?.unread_count || 0);
      setRecentNotifications(notifs?.notifications?.slice(0, 5) || []);
    } catch {
      // Silently preserve offline
    }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 45000);
    return () => clearInterval(interval);
  }, []);

  // Close notifications on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = async (notif: AppNotification) => {
    try {
      if (!notif.is_read) {
        await markNotificationRead(notif.id);
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setRecentNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
      }
    } catch {
      // ignore
    }
    setIsNotifOpen(false);

    // Route dynamically based on resource type
    if (notif.resource_type === "booking") {
      const isProvider = user?.role === "provider" || user?.role === "partner" || user?.role === "farmer";
      navigate(isProvider ? `/provider/bookings/${notif.resource_id}` : `/app/trip/bookings`);
    } else if (notif.resource_type === "collaboration") {
      const isProvider = user?.role === "provider" || user?.role === "partner" || user?.role === "farmer";
      navigate(isProvider ? `/provider/collaborations` : `/app/collaborations`);
    } else {
      const isProvider = user?.role === "provider" || user?.role === "partner" || user?.role === "farmer";
      navigate(isProvider ? `/provider/notifications` : `/app/notifications`);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setUnreadCount(0);
      setRecentNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // ignore
    }
  };

  // Dynamic Subtype Role Branding
  const roleType = (user as any)?.provider_type || user?.role || "";
  const roleBadgeMap: Record<string, string> = {
    farmer: "Farmer Portal",
    guide: "Guide Portal",
    food: "Culinary Host",
    hotel: "Homestay Host",
    stay: "Homestay Host",
    travel: "Mobility Partner",
    creator: "Creator Portal",
    partner: "Partner Portal",
    admin: "Admin Console",
  };
  const roleBadge = roleBadgeMap[roleType] || (user?.role === "partner" ? "Partner Portal" : user?.role === "admin" ? "Admin" : null);

  const roleLabel =
    user?.role === "admin"
      ? "Admin"
      : user?.role === "partner" || user?.role === "farmer"
      ? (roleBadgeMap[roleType] || "Partner Host")
      : user?.role === "creator"
      ? "Creator"
      : "Traveler";

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-16 w-full border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md transition-colors">
      <div className="flex h-16 w-full items-center justify-between px-4 sm:px-6">
        {/* Left: Brand Logo & Mobile Toggle */}
        <div className="flex items-center gap-3">
          {onToggleMobileSidebar && (
            <button
              type="button"
              onClick={onToggleMobileSidebar}
              className="lg:hidden flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <Link
            to={user?.role === "admin" ? "/admin" : (user?.role === "provider" || user?.role === "partner" || user?.role === "farmer") ? "/provider" : "/app"}
            className="flex items-center gap-2.5 group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-sm group-hover:scale-105 transition-transform">
              <Sprout className="h-5 w-5" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                Namma<span className="text-emerald-700 dark:text-emerald-400">Connect</span>
              </span>
              {roleBadge && (
                <span
                  className={`hidden sm:inline-block rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                    user?.role === "admin"
                      ? "bg-rose-100 dark:bg-rose-950/80 text-rose-900 dark:text-rose-300"
                      : "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300"
                  }`}
                >
                  {roleBadge}
                </span>
              )}
            </div>
          </Link>
        </div>

        {/* Right: Actions & Profile Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Support Concierge */}
          {onOpenSupport && (
            <Tooltip content={t("nav.support")} side="bottom">
              <button
                type="button"
                onClick={onOpenSupport}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                aria-label={t("nav.support")}
              >
                <LifeBuoy className="h-4 w-4" />
              </button>
            </Tooltip>
          )}

          {/* Messages */}
          <Tooltip content={t("nav.messages")} side="bottom">
            <Link
              to={(user?.role === "provider" || user?.role === "partner" || user?.role === "farmer") ? "/provider/messages" : "/app/messages"}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
              aria-label={t("nav.messages")}
            >
              <MessageSquare className="h-4 w-4" />
            </Link>
          </Tooltip>

          {/* Notifications Dropdown Preview */}
          <div className="relative" ref={notifRef}>
            <Tooltip content={t("nav.notifications")} side="bottom">
              <button
                type="button"
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                aria-label={t("nav.notifications")}
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute right-2 top-2 flex h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
                )}
              </button>
            </Tooltip>

            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in duration-150">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Notifications</h4>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 text-[10px] font-bold px-1.5 py-0.2">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <CheckCheck className="h-3 w-3" /> Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                  {recentNotifications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No notifications yet.
                    </div>
                  ) : (
                    recentNotifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`p-3 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                          !n.is_read ? "bg-emerald-50/40 dark:bg-emerald-950/20" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-bold text-slate-900 dark:text-slate-100 truncate">
                            {n.title}
                          </p>
                          {!n.is_read && (
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5">
                          {n.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-center">
                  <Link
                    to={(user?.role === "provider" || user?.role === "partner" || user?.role === "farmer") ? "/provider/notifications" : "/app/notifications"}
                    onClick={() => setIsNotifOpen(false)}
                    className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                  >
                    View All Notifications →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Theme Selector */}
          <Dropdown
            align="right"
            trigger={
              <Tooltip content={`${t("common.theme")}: ${theme}`} side="bottom">
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                  aria-label={t("common.theme")}
                >
                  {theme === "dark" ? (
                    <Moon className="h-4 w-4 text-emerald-400" />
                  ) : theme === "light" ? (
                    <Sun className="h-4 w-4 text-amber-500" />
                  ) : (
                    <Laptop className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  )}
                </button>
              </Tooltip>
            }
          >
            <DropdownHeader>{t("common.theme")}</DropdownHeader>
            <DropdownItem
              icon={Sun}
              onClick={() => setTheme("light")}
              className="flex items-center justify-between text-xs"
            >
              <span>{t("common.light")}</span>
              {theme === "light" && <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
            </DropdownItem>
            <DropdownItem
              icon={Moon}
              onClick={() => setTheme("dark")}
              className="flex items-center justify-between text-xs"
            >
              <span>{t("common.dark")}</span>
              {theme === "dark" && <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
            </DropdownItem>
            <DropdownItem
              icon={Laptop}
              onClick={() => setTheme("system")}
              className="flex items-center justify-between text-xs"
            >
              <span>{t("common.system")}</span>
              {theme === "system" && <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
            </DropdownItem>
          </Dropdown>

          {/* Language Selector */}
          <Dropdown
            align="right"
            trigger={
              <Tooltip content={t("common.language")} side="bottom">
                <button
                  type="button"
                  className="flex h-9 items-center gap-1 rounded-xl px-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                  aria-label={t("common.language")}
                >
                  <Globe className="h-4 w-4" />
                  <span className="text-[11px] uppercase font-bold">{language}</span>
                </button>
              </Tooltip>
            }
          >
            <DropdownHeader>{t("common.language")}</DropdownHeader>
            <DropdownItem
              onClick={() => setLanguage("en")}
              className="flex items-center justify-between text-xs"
            >
              <span>English (EN)</span>
              {language === "en" && <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
            </DropdownItem>
            <DropdownItem
              onClick={() => setLanguage("kn")}
              className="flex items-center justify-between text-xs font-medium"
            >
              <span>ಕನ್ನಡ (KN)</span>
              {language === "kn" && <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
            </DropdownItem>
            <DropdownItem
              onClick={() => setLanguage("hi")}
              className="flex items-center justify-between text-xs font-medium"
            >
              <span>हिन्दी (HI)</span>
              {language === "hi" && <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
            </DropdownItem>
          </Dropdown>

          {/* Profile Menu Dropdown */}
          <Dropdown
            align="right"
            className="w-56"
            trigger={
              <div
                className="flex items-center gap-2 rounded-xl p-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors select-none cursor-pointer"
                aria-label="User Profile Menu"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-xs font-black text-white shadow-sm">
                  {initials || <User className="h-4 w-4" />}
                </div>
              </div>
            }
          >
            {/* User Info Header */}
            <div className="px-3 py-2.5">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{displayName}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{displayEmail}</p>
              <div className="mt-2 flex items-center justify-between rounded-lg bg-emerald-50 dark:bg-emerald-950/60 p-1.5 border border-emerald-200/60 dark:border-emerald-800/60">
                <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-semibold">Active Profile:</span>
                <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400">
                  {roleLabel}
                </span>
              </div>
            </div>

            <DropdownDivider />

            {/* Role Context Switchers */}
            {user?.role === "admin" ? (
              <DropdownItem
                icon={ShieldAlert}
                onClick={() => navigate("/admin")}
                className="text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50 font-bold"
              >
                Switch to Admin Console →
              </DropdownItem>
            ) : user?.role && ["provider", "partner", "farmer", "creator"].includes(user.role) ? (
              <DropdownItem
                icon={Building2}
                onClick={() => navigate("/provider")}
                className="text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50 font-bold"
              >
                Switch to Provider Portal →
              </DropdownItem>
            ) : (
              <DropdownItem
                icon={HeartHandshake}
                onClick={() => navigate("/app/become-partner")}
                className="text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40 font-medium"
              >
                {t("nav.becomePartner")}
              </DropdownItem>
            )}

            <DropdownDivider />

            {/* Nav Actions */}
            <DropdownItem
              icon={User}
              onClick={() => navigate((user?.role === "provider" || user?.role === "partner" || user?.role === "farmer") ? "/provider/profile" : "/app/profile")}
            >
              {t("nav.profile")}
            </DropdownItem>
            <DropdownItem
              icon={Settings}
              onClick={() => navigate((user?.role === "provider" || user?.role === "partner" || user?.role === "farmer") ? "/provider/settings" : "/app/settings")}
            >
              {t("nav.settings")}
            </DropdownItem>

            <DropdownDivider />

            {/* Sign Out */}
            <DropdownItem
              icon={LogOut}
              onClick={async () => {
                await logout();
                navigate("/login");
              }}
              className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50"
            >
              {t("nav.signOut")}
            </DropdownItem>
          </Dropdown>
        </div>
      </div>
    </header>
  );
}

