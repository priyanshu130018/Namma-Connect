import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Layers,
  Calendar,
  Sparkles,
  Wallet,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";

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

  const navItems = [
    { label: "Dashboard", href: "/partner", icon: LayoutDashboard },
    { label: "My Services", href: "/partner/services", icon: Layers },
    { label: "Bookings", href: "/partner/bookings", icon: Calendar },
    { label: "Collaborations", href: "/partner/collaborations", icon: Sparkles },
    { label: "Earnings", href: "/partner/earnings", icon: Wallet },
  ];

  const isActive = (href: string) => {
    if (href === "/partner") {
      return location.pathname === "/partner";
    }
    return location.pathname.startsWith(href);
  };

  const renderNavContent = () => (
    <div className="flex h-full flex-col justify-between overflow-y-auto overflow-x-hidden p-3">
      {/* Primary Navigation Stack */}
      <div className="space-y-4">
        {/* Toggle Collapse Button (Desktop) */}
        <div className="hidden lg:flex items-center justify-end px-1 pb-1">
          <Tooltip content={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"} side="right">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          </Tooltip>
        </div>

        <div className="space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Tooltip key={item.href} content={item.label} side="right" disabled={!isCollapsed}>
                <Link
                  to={item.href}
                  onClick={onCloseMobile}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-xs font-bold transition-all",
                    active
                      ? "bg-harvest-100/80 text-harvest-950 font-extrabold"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", active ? "text-harvest-700" : "text-slate-400")} />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </Link>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop & Tablet Collapsible Sidebar */}
      <aside
        className={cn(
          "hidden md:block fixed left-0 top-16 z-20 h-[calc(100vh-4rem)] border-r border-slate-200/80 bg-white transition-all duration-300 ease-in-out",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        {renderNavContent()}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="fixed left-0 top-0 h-full w-72 bg-white shadow-2xl z-50 flex flex-col pt-4">
            <div className="flex items-center justify-between px-4 pb-3 border-b border-slate-100">
              <span className="text-sm font-bold text-slate-900">Partner Navigation</span>
              <button
                onClick={onCloseMobile}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
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
