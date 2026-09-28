import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  CalendarDays,
  Coins,
  TrendingUp,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";
import { useAuth } from "@/app/providers";

export interface PartnerSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function PartnerSidebar({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
}: PartnerSidebarProps) {
  const location = useLocation();
  const { user } = useAuth();

  const businessName = user?.business_name || user?.full_name || "Provider Workspace";

  // EXACT 6 Required Provider Sidebar Items
  const navItems = [
    { label: "Dashboard", href: "/provider", icon: LayoutDashboard, exact: true },
    { label: "My Listings", href: "/provider/listings", icon: ClipboardList, exact: false },
    { label: "Bookings", href: "/provider/bookings", icon: CalendarDays, exact: false },
    { label: "Earnings", href: "/provider/earnings", icon: Coins, exact: false },
    { label: "Analytics", href: "/provider/analytics", icon: TrendingUp, exact: false },
    { label: "Provider Profile", href: "/provider/profile", icon: User, exact: false },
  ];

  const renderNavContent = () => (
    <div className="flex h-full flex-col justify-between bg-white dark:bg-slate-900 transition-colors select-none text-xs">
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-3 scrollbar-none">
        {/* Toggle Collapse Button (Desktop) */}
        <div className="hidden lg:flex items-center justify-end px-1">
          <Tooltip content={isCollapsed ? "Expand sidebar" : "Collapse sidebar"} side="right">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          </Tooltip>
        </div>

        {/* Provider Profile & Unified Role Display */}
        {!isCollapsed && (
          <div className="px-3 py-2.5 rounded-xl bg-harvest-50/80 dark:bg-harvest-950/40 border border-harvest-200/60 dark:border-harvest-800/40">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-harvest-600 text-white font-bold shadow-sm">
                <UserCheck className="h-4 w-4" />
              </div>
              <div className="overflow-hidden min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-harvest-800 dark:text-harvest-300">
                  Verified Provider
                </p>
                <p className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                  {businessName}
                </p>
                <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 truncate">
                  NammaConnect Host
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Core Navigation Items (EXACT 6) ── */}
        <nav className="space-y-1 pt-1">
          {navItems.map((item) => {
            const isActive = item.exact
              ? location.pathname === item.href
              : location.pathname.startsWith(item.href);
            const ItemIcon = item.icon;

            return (
              <Tooltip key={item.href} content={item.label} side="right" disabled={!isCollapsed}>
                <Link
                  to={item.href}
                  onClick={onCloseMobile}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all",
                    isActive
                      ? "bg-harvest-100/80 dark:bg-harvest-950/80 text-harvest-950 dark:text-harvest-100 font-bold shadow-sm"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                  )}
                >
                  <ItemIcon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      isActive ? "text-harvest-700 dark:text-harvest-400" : "text-slate-400 dark:text-slate-500"
                    )}
                  />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </Link>
              </Tooltip>
            );
          })}
        </nav>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={cn(
          "hidden lg:block fixed left-0 top-16 z-30 h-[calc(100vh-4rem)] border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 ease-in-out",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        {renderNavContent()}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="fixed left-0 top-0 h-full w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl z-50 flex flex-col pt-4">
            <div className="flex items-center justify-between px-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Provider Navigation</span>
              <button
                onClick={onCloseMobile}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {renderNavContent()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
