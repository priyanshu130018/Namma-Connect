import React, { useState, useEffect } from "react";
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
  LogOut,
  Sprout,
  Check,
  Menu,
  Trash2,
  CheckCheck,
} from "lucide-react";
import { Dropdown, DropdownItem, DropdownDivider } from "@/components/ui/dropdown";
import { Tooltip } from "@/components/ui/tooltip";
import { useAuth } from "@/app/providers";
import { useTheme } from "@/app/theme";
import { useTranslation } from "@/i18n";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  NotificationItem,
} from "@/services/communicationService";

export interface CustomerNavbarProps {
  onOpenSupport?: () => void;
  onToggleSidebar?: () => void;
}

export function CustomerNavbar({ onToggleSidebar }: CustomerNavbarProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useTranslation();
  
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const displayName = user?.full_name || "Traveler";
  const displayEmail = user?.email || "";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const fetchNotifs = async () => {
    try {
      const notifsRes = await getNotifications();
      if (notifsRes) {
        setNotifications(notifsRes.notifications || []);
        setUnreadCount(notifsRes.unread_count || 0);
      }
    } catch {
      // Silently preserve offline
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.is_read) {
      try {
        await markNotificationAsRead(notif.id);
        fetchNotifs();
      } catch {
        // Silently handle
      }
    }
    setIsNotifOpen(false);
    navigate("/notifications");
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      fetchNotifs();
    } catch {
      // Silently handle
    }
  };

  const handleDeleteNotif = async (e: React.MouseEvent, notif: NotificationItem) => {
    e.stopPropagation();
    if (notif.is_deletable === false || notif.title === "Welcome to Namma Connect") {
      return;
    }
    try {
      await deleteNotification(notif.id);
      fetchNotifs();
    } catch {
      // Silently handle
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-16 w-full border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md transition-colors">
      <div className="flex h-16 w-full items-center justify-between px-4 sm:px-6">
        {/* Left: Brand & Mobile Toggle */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <Link to="/home" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-sm group-hover:scale-105 transition-transform">
              <Sprout className="h-5 w-5" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Namma<span className="text-emerald-700 dark:text-emerald-400">Connect</span>
            </span>
          </Link>
        </div>

        {/* Right: Quick actions & Profile (Order from right to left: Profile -> Language -> Theme -> Notifications -> Messages) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* 5. Messages */}
          <Tooltip content={t("nav.messages")} side="bottom">
            <Link
              to="/messages"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
              aria-label={t("nav.messages")}
            >
              <MessageSquare className="h-4 w-4" />
            </Link>
          </Tooltip>

          {/* 4. Notifications Panel */}
          <div className="relative">
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

            {/* Notification Popover Panel */}
            {isNotifOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsNotifOpen(false)}
                />
                <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden transition-all">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 text-[11px] font-extrabold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* Scrollable Notification List */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((notif) => {
                        const isSystemWelcome = notif.title === "Welcome to Namma Connect";
                        return (
                          <div
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className={`p-3.5 text-xs transition-colors cursor-pointer flex items-start justify-between gap-3 ${
                              !notif.is_read
                                ? "bg-emerald-50/40 dark:bg-emerald-950/20 font-medium"
                                : "hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300"
                            }`}
                          >
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-1.5">
                                {!notif.is_read && (
                                  <span className="h-2 w-2 rounded-full bg-emerald-600 shrink-0" />
                                )}
                                <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                                  {notif.title}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                {notif.message}
                              </p>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                                {notif.created_at ? new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                              </span>
                            </div>

                            {!isSystemWelcome && notif.is_deletable !== false && (
                              <button
                                type="button"
                                onClick={(e) => handleDeleteNotif(e, notif)}
                                className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                                title="Delete notification"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Panel Footer */}
                  <div className="p-2.5 text-center border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                    <Link
                      to="/notifications"
                      onClick={() => setIsNotifOpen(false)}
                      className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                    >
                      View all notifications
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 3. Theme Selector */}
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

          {/* 2. Language Selector */}
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

          {/* 1. Profile Menu Dropdown (Rightmost) */}
          <Dropdown
            align="right"
            className="w-56"
            trigger={
              <div
                className="flex items-center gap-2 rounded-xl p-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors select-none cursor-pointer"
                aria-label="User Profile Menu"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-xs font-black text-white shadow-sm overflow-hidden">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt={displayName} className="h-full w-full object-cover" />
                  ) : (
                    initials || <User className="h-4 w-4" />
                  )}
                </div>
              </div>
            }
          >
            {/* User Info Header */}
            <div className="px-3 py-2.5">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{displayName}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{displayEmail}</p>
            </div>

            <DropdownDivider />

            {/* Nav Actions */}
            <DropdownItem
              icon={User}
              onClick={() => navigate("/profile")}
            >
              {t("nav.profile")}
            </DropdownItem>
            <DropdownItem
              icon={Settings}
              onClick={() => navigate("/setting")}
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

