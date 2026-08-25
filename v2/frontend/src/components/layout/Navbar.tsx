import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Sprout,
  LogIn,
  UserPlus,
  Menu,
  X,
  Sun,
  Moon,
  Laptop,
  Globe,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Dropdown, DropdownItem, DropdownHeader } from "@/components/ui/dropdown";
import { Tooltip } from "@/components/ui/tooltip";
import { useTheme } from "@/app/theme";
import { useTranslation } from "@/i18n";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useTranslation();

  const links = [
    { label: t("nav.home"), href: "/" },
    { label: t("nav.about"), href: "/about" },
    { label: t("nav.contact"), href: "/contact" },
    { label: t("nav.faq"), href: "/faq" },
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-harvest-600 to-amber-700 text-white shadow-md shadow-harvest-600/20 group-hover:scale-105 transition-transform">
            <Sprout className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Namma<span className="text-harvest-700 dark:text-harvest-500">Connect</span>
            </span>
            <span className="ml-1.5 rounded-md bg-harvest-100 dark:bg-harvest-950/80 px-1.5 py-0.5 text-[10px] font-black uppercase text-harvest-800 dark:text-harvest-300 tracking-wider">
              {t("common.version")}
            </span>
          </div>
        </Link>

        {/* Public Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                to={link.href}
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                  active
                    ? "bg-harvest-50 dark:bg-harvest-950/50 text-harvest-800 dark:text-harvest-400 font-bold"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Controls (Theme, Language, CTA Actions) */}
        <div className="hidden md:flex items-center gap-2">
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

          {/* Language Selector */}
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

          {/* Public CTA Actions */}
          <Link to="/login">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold"
            >
              <LogIn className="h-4 w-4" /> {t("nav.signIn")}
            </Button>
          </Link>
          <Link to="/register">
            <Button
              variant="default"
              size="sm"
              className="gap-2 font-bold shadow-sm bg-harvest-600 hover:bg-harvest-700 text-white"
            >
              <UserPlus className="h-4 w-4" /> {t("nav.joinPlatform")}
            </Button>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 md:hidden hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      <Drawer
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        side="right"
        className="w-full max-w-xs p-6 flex flex-col justify-between bg-white dark:bg-slate-900"
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-harvest-700 dark:bg-harvest-600 text-white font-bold">
                <Sprout className="h-5 w-5" />
              </div>
              <span className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                Namma<span className="text-harvest-700 dark:text-harvest-500">Connect</span>
              </span>
            </div>
            <button
              onClick={() => setMobileOpen(false)}
              className="p-1 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="space-y-1">
            {links.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
                  isActive(link.href)
                    ? "bg-harvest-50 dark:bg-harvest-950/50 text-harvest-800 dark:text-harvest-400 font-bold"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t("common.language")}</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setLanguage("en")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    language === "en" ? "bg-harvest-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage("kn")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    language === "kn" ? "bg-harvest-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  KN
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage("hi")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    language === "hi" ? "bg-harvest-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  HI
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t("common.theme")}</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={`p-1.5 rounded-lg text-xs ${
                    theme === "light" ? "bg-harvest-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                  aria-label={t("common.light")}
                >
                  <Sun className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={`p-1.5 rounded-lg text-xs ${
                    theme === "dark" ? "bg-harvest-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                  aria-label={t("common.dark")}
                >
                  <Moon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("system")}
                  className={`p-1.5 rounded-lg text-xs ${
                    theme === "system" ? "bg-harvest-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                  aria-label={t("common.system")}
                >
                  <Laptop className="h-4 w-4" />
                </button>
              </div>
            </div>

            <Link to="/login" onClick={() => setMobileOpen(false)} className="block w-full">
              <Button variant="outline" className="w-full gap-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                <LogIn className="h-4 w-4" /> {t("nav.signIn")}
              </Button>
            </Link>
            <Link to="/register" onClick={() => setMobileOpen(false)} className="block w-full">
              <Button variant="default" className="w-full gap-2 font-bold bg-harvest-600 hover:bg-harvest-700 text-white">
                <UserPlus className="h-4 w-4" /> {t("nav.joinPlatform")}
              </Button>
            </Link>
          </div>
        </div>
      </Drawer>
    </header>
  );
}
