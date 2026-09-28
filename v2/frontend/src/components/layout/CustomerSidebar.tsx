import { Link, useLocation } from "react-router-dom";
import {
  Compass,
  Sparkles,
  Globe,
  MapPin,
  HeartHandshake,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";

export interface CustomerSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function CustomerSidebar({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
}: CustomerSidebarProps) {
  const location = useLocation();

  const navItems = [
    { label: "Explore", href: "/explore", icon: Compass },
    { label: "Experience", href: "/experience", icon: Sparkles },
    { label: "Discover", href: "/discover", icon: Globe },
    { label: "My Trip", href: "/my-trip", icon: MapPin },
  ];

  const isLinkActive = (href: string) => {
    const path = location.pathname;
    if (href === "/explore") {
      return (
        path === "/explore" ||
        path.startsWith("/explore/") ||
        path === "/app/explore" ||
        path === "/app/activities" ||
        path === "/app/creators" ||
        path === "/app/hotel" ||
        path === "/app/stay" ||
        path === "/app/transport"
      );
    }
    if (href === "/experience") {
      return path === "/experience" || path === "/app/experience";
    }
    if (href === "/discover") {
      return path === "/discover" || path === "/app/discover";
    }
    if (href === "/my-trip") {
      return (
        path === "/my-trip" ||
        path.startsWith("/my-trip/") ||
        path === "/app/my-trip" ||
        path === "/app/trip" ||
        path.startsWith("/app/trip/") ||
        path === "/app/bookings" ||
        path === "/app/saved"
      );
    }
    return path === href || path.startsWith(href + "/");
  };

  const renderNavContent = () => (
    <div className="flex h-full flex-col justify-between bg-white dark:bg-slate-900 transition-colors select-none text-xs">
      {/* Top Header Row with Collapse Button */}
      <div className="flex items-center justify-between px-3 h-12 border-b border-slate-100 dark:border-slate-800">
        {!isCollapsed && (
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 pl-1">
            Menu
          </span>
        )}
        <div className={cn("flex items-center", isCollapsed ? "mx-auto" : "ml-auto")}>
          <Tooltip content={isCollapsed ? "Expand sidebar" : "Collapse sidebar"} side="right">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Navigation Body */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-2 scrollbar-none">
        <div className="space-y-1">
          {navItems.map((item) => {
            const active = isLinkActive(item.href);
            const Icon = item.icon;
            return (
              <Tooltip key={item.href} content={item.label} side="right" disabled={!isCollapsed}>
                <Link
                  to={item.href}
                  onClick={onCloseMobile}
                  className={cn(
                    "flex items-center rounded-xl transition-all duration-150 group",
                    isCollapsed
                      ? "h-10 w-10 mx-auto justify-center"
                      : "gap-3 px-3 py-2.5 text-xs font-semibold w-full",
                    active
                      ? "bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-bold shadow-xs border border-emerald-200/60 dark:border-emerald-800/60"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      active ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200"
                    )}
                  />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </Link>
              </Tooltip>
            );
          })}
        </div>
      </div>


      {/* ── BOTTOM: BECOME PARTNER ── */}
      <div className="shrink-0 p-2 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <Tooltip content="Become Partner" side="right" disabled={!isCollapsed}>
          <Link
            to="/app/become-partner"
            onClick={onCloseMobile}
            className={cn(
              "flex items-center rounded-xl transition-all group",
              isCollapsed
                ? "h-10 w-10 mx-auto justify-center bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60"
                : "gap-2.5 px-3 py-2.5 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 hover:bg-amber-100/60 dark:hover:bg-amber-900/50 w-full"
            )}
          >
            <HeartHandshake className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            {!isCollapsed && <span className="font-bold text-xs">Become Partner</span>}
          </Link>
        </Tooltip>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col fixed top-16 left-0 z-30 h-[calc(100vh-4rem)] border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 shrink-0",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        {renderNavContent()}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 dark:bg-slate-950/80 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Mobile Drawer Panel */}
      {isMobileOpen && (
        <div className="fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden">
          {renderNavContent()}
        </div>
      )}
    </>
  );
}
