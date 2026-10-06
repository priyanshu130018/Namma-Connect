import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Building2,
  ClipboardList,
  CalendarDays,
  Coins,
  Star,
  TrendingUp,
  Ticket,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";

export interface AdminSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function AdminSidebar({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
}: AdminSidebarProps) {
  const location = useLocation();

  // Navigation Items according to strict prompt specs
  const navSections = [
    {
      label: "Dashboard",
      href: "/admin",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      label: "Users",
      href: "/admin/users",
      icon: Users,
      exact: false,
      children: [
        { label: "All Users", href: "/admin/users" },
      ],
    },
    {
      label: "Providers",
      href: "/admin/providers",
      icon: Building2,
      exact: false,
      children: [
        { label: "All Providers", href: "/admin/providers" },
        { label: "KYC Verification", href: "/admin/providers/kyc" },
      ],
    },
    {
      label: "Listings",
      href: "/admin/listings",
      icon: ClipboardList,
      exact: false,
      children: [
        { label: "All Listings", href: "/admin/listings" },
      ],
    },
    {
      label: "Bookings",
      href: "/admin/bookings",
      icon: CalendarDays,
      exact: false,
    },
    {
      label: "Payments",
      href: "/admin/payments",
      icon: Coins,
      exact: false,
    },
    {
      label: "Reviews",
      href: "/admin/reviews",
      icon: Star,
      exact: false,
    },
    {
      label: "Analytics",
      href: "/admin/analytics",
      icon: TrendingUp,
      exact: false,
    },
    {
      label: "Tickets Raised",
      href: "/admin/tickets",
      icon: Ticket,
      exact: false,
    },
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

        {/* Admin Console Header */}
        {!isCollapsed && (
          <div className="px-3 py-2.5 rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/40">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white font-black shadow-sm">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="overflow-hidden min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">
                  Marketplace Admin
                </p>
                <p className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                  NammaConnect Console
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Core Navigation Items */}
        <nav className="space-y-1 pt-1">
          {navSections.map((item) => {
            const isActive = item.exact
              ? location.pathname === item.href
              : location.pathname.startsWith(item.href);
            const ItemIcon = item.icon;

            return (
              <div key={item.href} className="space-y-0.5">
                <Tooltip content={item.label} side="right" disabled={!isCollapsed}>
                  <Link
                    to={item.href}
                    onClick={onCloseMobile}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all",
                      isActive
                        ? "bg-rose-50/80 dark:bg-rose-950/80 text-rose-950 dark:text-rose-100 font-bold border border-rose-200/70 dark:border-rose-900/50 shadow-sm"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ItemIcon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          isActive ? "text-rose-600 dark:text-rose-400" : "text-slate-400 dark:text-slate-500"
                        )}
                      />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </div>
                  </Link>
                </Tooltip>

                {/* Sub-items rendering when expanded */}
                {!isCollapsed && item.children && item.children.length > 0 && (
                  <div className="pl-9 pr-2 py-0.5 space-y-0.5 border-l-2 border-slate-100 dark:border-slate-800 ml-5">
                    {item.children.map((sub) => {
                      const isSubActive = location.pathname === sub.href;
                      return (
                        <Link
                          key={sub.href}
                          to={sub.href}
                          onClick={onCloseMobile}
                          className={cn(
                            "block rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                            isSubActive
                              ? "bg-rose-100/60 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 font-bold"
                              : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                          )}
                        >
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
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
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Admin Navigation</span>
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
