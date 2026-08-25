import { useState, useEffect } from "react";
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
} from "lucide-react";
import { Dropdown, DropdownItem, DropdownDivider, DropdownHeader } from "@/components/ui/dropdown";
import { Tooltip } from "@/components/ui/tooltip";
import { useAuth } from "@/app/providers";
import { useTheme } from "@/app/theme";
import { useTranslation } from "@/i18n";
import { getNotifications } from "@/services/communicationService";

export interface CustomerNavbarProps {
  onOpenSupport?: () => void;
  onToggleSidebar?: () => void;
}

export function CustomerNavbar({ onOpenSupport }: CustomerNavbarProps) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useTranslation();
  const navigate = useNavigate();
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  useEffect(() => {
    getNotifications()
      .then((data) => setUnreadNotifs(data?.unread_count || 0))
      .catch(() => setUnreadNotifs(0));
  }, []);

  const displayName = user?.full_name || "Traveler";
  const displayEmail = user?.email || "traveler@nammaconnect.in";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 px-4 sm:px-6 backdrop-blur-md transition-colors">
      {/* Left: Brand Logo & Title */}
      <div className="flex items-center gap-3">
        <Link to="/app" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <Sprout className="h-5 w-5" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Namma<span className="text-emerald-600 dark:text-emerald-500">Connect</span>
            </span>
            <span className="hidden sm:inline-block rounded-md bg-emerald-100 dark:bg-emerald-950/80 px-1.5 py-0.5 text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-300 tracking-wider">
              {t("auth.customerRole")}
            </span>
          </div>
        </Link>
      </div>

      {/* Right: Actions (Notifications, Messages, Theme, Language, Profile) */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Help & Support Trigger */}
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

        {/* Notifications */}
        <Tooltip content={unreadNotifs > 0 ? `${t("nav.notifications")} (${unreadNotifs})` : t("nav.notifications")} side="bottom">
          <Link
            to="/app/notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            aria-label={t("nav.notifications")}
          >
            <Bell className="h-4 w-4" />
            {unreadNotifs > 0 && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
            )}
          </Link>
        </Tooltip>

        {/* Messages */}
        <Tooltip content={t("nav.messages")} side="bottom">
          <Link
            to="/app/messages"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            aria-label="Host Messages"
          >
            <MessageSquare className="h-4 w-4" />
          </Link>
        </Tooltip>

        {/* Theme Selector Dropdown */}
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

        {/* Language Selector Dropdown */}
        <Dropdown
          align="right"
          trigger={
            <Tooltip content={t("common.language")} side="bottom">
              <button
                type="button"
                className="flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
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
          {/* User Info Header & Current Role Context */}
          <div className="px-3 py-2.5">
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{displayName}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{displayEmail}</p>
            <div className="mt-2 flex items-center justify-between rounded-lg bg-emerald-50 dark:bg-emerald-950/60 p-1.5 border border-emerald-200/60 dark:border-emerald-800/60">
              <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-semibold">Active Profile:</span>
              <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400">Traveler</span>
            </div>
          </div>

          <DropdownDivider />

          {/* Account Context Switcher if Partner */}
          {user?.role && ["partner", "farmer", "creator", "admin"].includes(user.role) ? (
            <DropdownItem
              icon={Building2}
              onClick={() => navigate("/partner")}
              className="text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50 font-bold"
            >
              Switch to Partner Portal &rarr;
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
            onClick={() => navigate("/app/profile")}
          >
            {t("nav.profile")}
          </DropdownItem>
          <DropdownItem
            icon={Settings}
            onClick={() => navigate("/app/settings")}
          >
            {t("nav.settings")}
          </DropdownItem>

          <DropdownDivider />

          <DropdownItem
            icon={LogOut}
            destructive
            onClick={logout}
          >
            {t("nav.logout")}
          </DropdownItem>
        </Dropdown>
      </div>
    </header>
  );
}
