import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Layers,
  Calendar,
  Sparkles,
  Wallet,
  CreditCard,
  Users,
  Briefcase,
  BarChart3,
  HeartHandshake,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
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

  const [workExpanded, setWorkExpanded] = useState(true);
  const [reportsExpanded, setReportsExpanded] = useState(true);
  const [collabExpanded, setCollabExpanded] = useState(true);

  // Dynamic Provider Role Label from Backend
  const roleLabelMap: Record<string, string> = {
    farmer: "Farmer & Plantation Host",
    hotel: "Homestay & Accommodation Host",
    food: "Culinary & Local Food Host",
    guide: "Rural Tour & Heritage Guide",
    travel: "Mobility & Transport Partner",
    creator: "Content Creator Partner",
    artisan: "Craft & Artisan Partner",
    partner: "Verified Partner Host",
  };

  const providerRoleTitle = roleLabelMap[user?.role || ""] || "NammaConnect Host";
  const businessName = user?.business_name || user?.full_name || "Partner Workspace";

  // SECTION 1: WORK
  const workItems = [
    { label: "Services", href: "/partner/services", icon: Layers },
    { label: "Bookings", href: "/partner/bookings", icon: Calendar },
  ];

  // SECTION 2: REPORTS
  const reportsItems = [
    { label: "Earnings", href: "/partner/earnings", icon: Wallet },
    { label: "Payments / Payouts", href: "/partner/payouts", icon: CreditCard },
  ];

  // SECTION 3: COLLABORATION
  const collabItems = [
    { label: "Creators", href: "/partner/creators", icon: Users },
    { label: "Collaboration", href: "/partner/collaborations", icon: Sparkles },
  ];

  const isWorkActive = location.pathname.startsWith("/partner/services") || location.pathname.startsWith("/partner/bookings");
  const isReportsActive = location.pathname.startsWith("/partner/earnings") || location.pathname.startsWith("/partner/payouts");
  const isCollabActive = location.pathname.startsWith("/partner/creators") || location.pathname.startsWith("/partner/collaborations");

  const renderNavContent = () => (
    <div className="flex h-full flex-col justify-between bg-white dark:bg-slate-900 transition-colors select-none text-xs">
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 space-y-3 scrollbar-none">
        {/* Toggle Collapse Button (Desktop) */}
        <div className="hidden md:flex items-center justify-end px-1">
          <Tooltip content={isCollapsed ? "Expand sidebar" : "Collapse sidebar"} side="right">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
            </button>
          </Tooltip>
        </div>

        {/* Provider Profile & Role Display */}
        {!isCollapsed && (
          <div className="px-3 py-2.5 rounded-xl bg-harvest-50/80 dark:bg-harvest-950/40 border border-harvest-200/60 dark:border-harvest-800/40">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-harvest-600 text-white font-bold shadow-sm">
                <UserCheck className="h-4 w-4" />
              </div>
              <div className="overflow-hidden min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-harvest-800 dark:text-harvest-300">
                  NammaConnect Partner
                </p>
                <p className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                  {businessName}
                </p>
                <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 truncate">
                  {providerRoleTitle}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── SECTION 1: WORK ── */}
        <div className="space-y-0.5">
          <Tooltip content="WORK" side="right" disabled={!isCollapsed}>
            <div
              onClick={() => {
                if (isCollapsed) onToggleCollapse();
                else setWorkExpanded(!workExpanded);
              }}
              className={cn(
                "group flex w-full cursor-pointer items-center justify-between rounded-xl px-2.5 py-1.5 font-bold transition-all select-none",
                isWorkActive
                  ? "bg-harvest-50 dark:bg-harvest-950/60 text-harvest-900 dark:text-harvest-200"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
              )}
            >
              <div className="flex items-center gap-2.5">
                <Briefcase className={cn("h-4 w-4 shrink-0", isWorkActive ? "text-harvest-700 dark:text-harvest-400" : "text-slate-400")} />
                {!isCollapsed && <span className="uppercase tracking-wider text-[11px]">WORK</span>}
              </div>
              {!isCollapsed && (
                <ChevronRight
                  className={cn(
                    "h-3.5 w-3.5 text-slate-400 transition-transform duration-200",
                    workExpanded ? "rotate-90 text-harvest-700 dark:text-harvest-400" : ""
                  )}
                />
              )}
            </div>
          </Tooltip>

          {!isCollapsed && workExpanded && (
            <div className="ml-2 pl-2 border-l border-slate-200/80 dark:border-slate-800 space-y-0.5 pt-0.5">
              {workItems.map((sub) => {
                const isSubActive = location.pathname.startsWith(sub.href);
                const SubIcon = sub.icon;
                return (
                  <Link
                    key={sub.href}
                    to={sub.href}
                    onClick={onCloseMobile}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-all",
                      isSubActive
                        ? "bg-harvest-100/70 dark:bg-harvest-950/80 text-harvest-950 dark:text-harvest-100 font-bold"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                    )}
                  >
                    <SubIcon className={cn("h-3.5 w-3.5 shrink-0", isSubActive ? "text-harvest-700 dark:text-harvest-400" : "text-slate-400")} />
                    <span className="truncate">{sub.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* ── SECTION 2: REPORTS ── */}
        <div className="space-y-0.5">
          <Tooltip content="REPORTS" side="right" disabled={!isCollapsed}>
            <div
              onClick={() => {
                if (isCollapsed) onToggleCollapse();
                else setReportsExpanded(!reportsExpanded);
              }}
              className={cn(
                "group flex w-full cursor-pointer items-center justify-between rounded-xl px-2.5 py-1.5 font-bold transition-all select-none",
                isReportsActive
                  ? "bg-harvest-50 dark:bg-harvest-950/60 text-harvest-900 dark:text-harvest-200"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
              )}
            >
              <div className="flex items-center gap-2.5">
                <BarChart3 className={cn("h-4 w-4 shrink-0", isReportsActive ? "text-harvest-700 dark:text-harvest-400" : "text-slate-400")} />
                {!isCollapsed && <span className="uppercase tracking-wider text-[11px]">REPORTS</span>}
              </div>
              {!isCollapsed && (
                <ChevronRight
                  className={cn(
                    "h-3.5 w-3.5 text-slate-400 transition-transform duration-200",
                    reportsExpanded ? "rotate-90 text-harvest-700 dark:text-harvest-400" : ""
                  )}
                />
              )}
            </div>
          </Tooltip>

          {!isCollapsed && reportsExpanded && (
            <div className="ml-2 pl-2 border-l border-slate-200/80 dark:border-slate-800 space-y-0.5 pt-0.5">
              {reportsItems.map((sub) => {
                const isSubActive = location.pathname.startsWith(sub.href);
                const SubIcon = sub.icon;
                return (
                  <Link
                    key={sub.href}
                    to={sub.href}
                    onClick={onCloseMobile}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-all",
                      isSubActive
                        ? "bg-harvest-100/70 dark:bg-harvest-950/80 text-harvest-950 dark:text-harvest-100 font-bold"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                    )}
                  >
                    <SubIcon className={cn("h-3.5 w-3.5 shrink-0", isSubActive ? "text-harvest-700 dark:text-harvest-400" : "text-slate-400")} />
                    <span className="truncate">{sub.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* ── SECTION 3: COLLABORATION ── */}
        <div className="space-y-0.5">
          <Tooltip content="COLLABORATION" side="right" disabled={!isCollapsed}>
            <div
              onClick={() => {
                if (isCollapsed) onToggleCollapse();
                else setCollabExpanded(!collabExpanded);
              }}
              className={cn(
                "group flex w-full cursor-pointer items-center justify-between rounded-xl px-2.5 py-1.5 font-bold transition-all select-none",
                isCollabActive
                  ? "bg-harvest-50 dark:bg-harvest-950/60 text-harvest-900 dark:text-harvest-200"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
              )}
            >
              <div className="flex items-center gap-2.5">
                <HeartHandshake className={cn("h-4 w-4 shrink-0", isCollabActive ? "text-harvest-700 dark:text-harvest-400" : "text-slate-400")} />
                {!isCollapsed && <span className="uppercase tracking-wider text-[11px]">COLLABORATION</span>}
              </div>
              {!isCollapsed && (
                <ChevronRight
                  className={cn(
                    "h-3.5 w-3.5 text-slate-400 transition-transform duration-200",
                    collabExpanded ? "rotate-90 text-harvest-700 dark:text-harvest-400" : ""
                  )}
                />
              )}
            </div>
          </Tooltip>

          {!isCollapsed && collabExpanded && (
            <div className="ml-2 pl-2 border-l border-slate-200/80 dark:border-slate-800 space-y-0.5 pt-0.5">
              {collabItems.map((sub) => {
                const isSubActive = location.pathname.startsWith(sub.href);
                const SubIcon = sub.icon;
                return (
                  <Link
                    key={sub.href}
                    to={sub.href}
                    onClick={onCloseMobile}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-all",
                      isSubActive
                        ? "bg-harvest-100/70 dark:bg-harvest-950/80 text-harvest-950 dark:text-harvest-100 font-bold"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                    )}
                  >
                    <SubIcon className={cn("h-3.5 w-3.5 shrink-0", isSubActive ? "text-harvest-700 dark:text-harvest-400" : "text-slate-400")} />
                    <span className="truncate">{sub.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={cn(
          "hidden md:block fixed left-0 top-16 z-30 h-[calc(100vh-4rem)] border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 ease-in-out",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        {renderNavContent()}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="fixed left-0 top-0 h-full w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl z-50 flex flex-col pt-4">
            <div className="flex items-center justify-between px-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Partner Navigation</span>
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
