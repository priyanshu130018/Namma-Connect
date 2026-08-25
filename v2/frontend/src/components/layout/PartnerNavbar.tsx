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
  Compass,
} from "lucide-react";
import { Dropdown, DropdownItem, DropdownDivider, DropdownHeader } from "@/components/ui/dropdown";
import { Tooltip } from "@/components/ui/tooltip";
import { useAuth } from "@/app/providers";
import { useTheme } from "@/app/theme";
import { useTranslation } from "@/i18n";

export interface PartnerNavbarProps {
  onToggleMobileSidebar?: () => void;
}

export function PartnerNavbar({ onToggleMobileSidebar }: PartnerNavbarProps) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useTranslation();
  const navigate = useNavigate();

  const displayName = user?.full_name || "Partner Host";
  const displayEmail = user?.email || "partner@nammaconnect.in";
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
        {onToggleMobileSidebar && (
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        <Link to="/partner" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-harvest-600 to-amber-700 text-white shadow-md shadow-harvest-600/20 group-hover:scale-105 transition-transform">
            <Sprout className="h-5 w-5" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Namma<span className="text-harvest-700 dark:text-harvest-500">Connect</span>
            </span>
            <span className="hidden sm:inline-block rounded-md bg-harvest-100 dark:bg-harvest-950/80 px-1.5 py-0.5 text-[10px] font-black uppercase text-harvest-900 dark:text-harvest-300 tracking-wider">
              {t("nav.partnerPortal")}
            </span>
          </div>
        </Link>
      </div>

      {/* Right: Actions (Notifications, Messages, Theme, Language, Profile) */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Notifications */}
        <Tooltip content={t("nav.notifications")} side="bottom">
          <Link
            to="/partner/notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            aria-label={t("nav.notifications")}
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-harvest-600 ring-2 ring-white dark:ring-slate-900" />
          </Link>
        </Tooltip>

        {/* Messages */}
        <Tooltip content={t("nav.messages")} side="bottom">
          <Link
            to="/partner/messages"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            aria-label="Customer Messages"
          >
            <MessageSquare className="h-4 w-4" />
          </Link>
        </Tooltip>

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
            {theme === "light" && <Check className="h-3.5 w-3.5 text-harvest-600 dark:text-harvest-400" />}
          </DropdownItem>
          <DropdownItem
            icon={Moon}
            onClick={() => setTheme("dark")}
            className="flex items-center justify-between text-xs"
          >
            <span>{t("common.dark")}</span>
            {theme === "dark" && <Check className="h-3.5 w-3.5 text-harvest-600 dark:text-harvest-400" />}
          </DropdownItem>
          <DropdownItem
            icon={Laptop}
            onClick={() => setTheme("system")}
            className="flex items-center justify-between text-xs"
          >
            <span>{t("common.system")}</span>
            {theme === "system" && <Check className="h-3.5 w-3.5 text-harvest-600 dark:text-harvest-400" />}
          </DropdownItem>
        </Dropdown>

        {/* Language Selector Dropdown */}
        <Dropdown
          align="right"
          trigger={
            <Tooltip content={t("common.language")} side="bottom">
              <button
                type="button"
                className="flex h-9 items-center gap-1 rounded-xl px-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
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
            {language === "en" && <Check className="h-3.5 w-3.5 text-harvest-600 dark:text-harvest-400" />}
          </DropdownItem>
          <DropdownItem
            onClick={() => setLanguage("kn")}
            className="flex items-center justify-between text-xs font-medium"
          >
            <span>ಕನ್ನಡ (KN)</span>
            {language === "kn" && <Check className="h-3.5 w-3.5 text-harvest-600 dark:text-harvest-400" />}
          </DropdownItem>
          <DropdownItem
            onClick={() => setLanguage("hi")}
            className="flex items-center justify-between text-xs font-medium"
          >
            <span>हिन्दी (HI)</span>
            {language === "hi" && <Check className="h-3.5 w-3.5 text-harvest-600 dark:text-harvest-400" />}
          </DropdownItem>
        </Dropdown>

        {/* Profile Menu Dropdown */}
        <Dropdown
          align="right"
          className="w-56"
          trigger={
            <div
              className="flex items-center gap-2 rounded-xl p-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors select-none cursor-pointer"
              aria-label="Provider Profile Menu"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-harvest-600 to-amber-700 text-xs font-black text-white shadow-sm">
                {initials || <User className="h-4 w-4" />}
              </div>
            </div>
          }
        >
          {/* User Info Header & Current Role Context */}
          <div className="px-3 py-2.5">
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{displayName}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{displayEmail}</p>
            <div className="mt-2 flex items-center justify-between rounded-lg bg-harvest-50 dark:bg-harvest-950/60 p-1.5 border border-harvest-200/60 dark:border-harvest-800/60">
              <span className="text-[10px] text-harvest-800 dark:text-harvest-300 font-semibold">Active Profile:</span>
              <span className="text-[10px] font-black uppercase text-harvest-700 dark:text-harvest-400">Partner Host</span>
            </div>
          </div>

          <DropdownDivider />

          {/* Account Context Switcher to Traveler Mode */}
          <DropdownItem
            icon={Compass}
            onClick={() => navigate("/app")}
            className="text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50 font-bold"
          >
            Switch to Traveler Mode &rarr;
          </DropdownItem>

          <DropdownDivider />

          {/* Nav Actions */}
          <DropdownItem
            icon={User}
            onClick={() => navigate("/partner/profile")}
          >
            {t("nav.profile")}
          </DropdownItem>
          <DropdownItem
            icon={Settings}
            onClick={() => navigate("/partner/settings")}
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
