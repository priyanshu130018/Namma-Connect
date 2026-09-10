import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Compass,
  Search,
  MapPin,
  HeartHandshake,
  ChevronRight,
  Wheat,
  TreePine,
  Car,
  Home,
  Utensils,
  CalendarDays,
  PanelLeftClose,
  PanelLeftOpen,
  Bookmark,
  History,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldAlert,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";
import { useTranslation } from "@/i18n";
import { useAuth } from "@/app/providers";
import { getMyPartnerApplication, PartnerApplicationData } from "@/services/partnerApplicationService";

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
  const { t } = useTranslation();
  const { user } = useAuth();

  const [exploreExpanded, setExploreExpanded] = useState(true);
  const [bookingCollabExpanded, setBookingCollabExpanded] = useState(true);
  const [partnerCardExpanded, setPartnerCardExpanded] = useState(false);
  const [partnerApp, setPartnerApp] = useState<PartnerApplicationData | null>(null);

  useEffect(() => {
    if (user) {
      getMyPartnerApplication().then((app) => setPartnerApp(app)).catch(() => {});
    }
  }, [user, location.pathname]);

  // SECTION 1: EXPLORE
  const exploreSubcategories = [
    { label: t("common.search"), href: "/app/explore", icon: Search },
    { label: t("search.experiences"), href: "/app/explore?category=experiences", icon: Wheat },
    { label: t("search.activities"), href: "/app/explore?category=activities", icon: TreePine },
    { label: "Farms & Agriculture", href: "/app/explore?category=farms", icon: Wheat },
    { label: "Farm Stays", href: "/app/explore?category=stay", icon: Home },
    { label: t("search.food"), href: "/app/explore?category=food", icon: Utensils },
    { label: "Events & Festivals", href: "/app/explore?category=events", icon: CalendarDays },
    { label: t("search.travelServices"), href: "/app/explore?category=travel-services", icon: Car },
    { label: t("search.guidesTours"), href: "/app/explore?category=guides-tours", icon: TreePine },
    { label: "Creators", href: "/app/creators", icon: Users },
  ];

  // SECTION 2: BOOKING & COLLAB
  const bookingCollabItems = [
    { label: "My Trip", href: "/app/trip", icon: MapPin },
    { label: "Upcoming", href: "/app/trip/bookings", icon: Bookmark },
    { label: "History", href: "/app/trip/history", icon: History },
    { label: "Collaboration", href: "/app/collaborations", icon: HeartHandshake },
  ];

  const isExploreActive =
    location.pathname === "/app" ||
    location.pathname.startsWith("/app/explore") ||
    location.pathname.startsWith("/app/services") ||
    location.pathname.startsWith("/app/creators");

  const isBookingCollabActive =
    location.pathname.startsWith("/app/trip") ||
    location.pathname.startsWith("/app/my-trip") ||
    location.pathname.startsWith("/app/bookings") ||
    location.pathname.startsWith("/app/collaborations");

  const isApprovedPartner = user?.role === "partner" || user?.role === "farmer" || partnerApp?.status === "APPROVED";
  const isPendingPartner = partnerApp?.status === "PENDING";
  const isRejectedPartner = partnerApp?.status === "REJECTED";

  const renderNavContent = () => (
    <div className="flex h-full flex-col justify-between bg-white dark:bg-slate-900 transition-colors select-none text-xs">
      {/* Navigation Body (Compact Viewport Fit) */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 space-y-2 scrollbar-none">
        {/* Toggle Collapse Button (Desktop) */}
        <div className="hidden lg:flex items-center justify-end px-1">
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

        {/* ── SECTION 1: EXPLORE ── */}
        <div className="space-y-0.5">
          <Tooltip content="EXPLORE" side="right" disabled={!isCollapsed}>
            <div
              onClick={() => {
                if (isCollapsed) onToggleCollapse();
                else setExploreExpanded(!exploreExpanded);
              }}
              className={cn(
                "group flex w-full cursor-pointer items-center justify-between rounded-xl px-2.5 py-1.5 font-bold transition-all select-none",
                isExploreActive
                  ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
              )}
            >
              <div className="flex items-center gap-2.5">
                <Compass className={cn("h-4 w-4 shrink-0", isExploreActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400")} />
                {!isCollapsed && <span className="uppercase tracking-wider text-[11px]">EXPLORE</span>}
              </div>
              {!isCollapsed && (
                <ChevronRight
                  className={cn(
                    "h-3.5 w-3.5 text-slate-400 transition-transform duration-200",
                    exploreExpanded ? "rotate-90 text-emerald-600 dark:text-emerald-400" : ""
                  )}
                />
              )}
            </div>
          </Tooltip>

          {!isCollapsed && exploreExpanded && (
            <div className="ml-2 pl-2 border-l border-slate-200/80 dark:border-slate-800 space-y-0.5 pt-0.5">
              {exploreSubcategories.map((sub) => {
                const isSubActive =
                  location.pathname === sub.href ||
                  (sub.href.includes("category=") && location.search.includes(sub.href.split("?")[1]));
                const SubIcon = sub.icon;
                return (
                  <Link
                    key={sub.href}
                    to={sub.href}
                    onClick={onCloseMobile}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2 py-1 text-[11px] font-semibold transition-all",
                      isSubActive
                        ? "bg-emerald-100/70 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 font-bold"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                    )}
                  >
                    <SubIcon className={cn("h-3.5 w-3.5 shrink-0", isSubActive ? "text-emerald-700 dark:text-emerald-400" : "text-slate-400")} />
                    <span className="truncate">{sub.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* ── SECTION 2: BOOKING & COLLAB ── */}
        <div className="space-y-0.5">
          <Tooltip content="BOOKING & COLLAB" side="right" disabled={!isCollapsed}>
            <div
              onClick={() => {
                if (isCollapsed) onToggleCollapse();
                else setBookingCollabExpanded(!bookingCollabExpanded);
              }}
              className={cn(
                "group flex w-full cursor-pointer items-center justify-between rounded-xl px-2.5 py-1.5 font-bold transition-all select-none",
                isBookingCollabActive
                  ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
              )}
            >
              <div className="flex items-center gap-2.5">
                <Bookmark className={cn("h-4 w-4 shrink-0", isBookingCollabActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400")} />
                {!isCollapsed && <span className="uppercase tracking-wider text-[11px]">BOOKING & COLLAB</span>}
              </div>
              {!isCollapsed && (
                <ChevronRight
                  className={cn(
                    "h-3.5 w-3.5 text-slate-400 transition-transform duration-200",
                    bookingCollabExpanded ? "rotate-90 text-emerald-600 dark:text-emerald-400" : ""
                  )}
                />
              )}
            </div>
          </Tooltip>

          {!isCollapsed && bookingCollabExpanded && (
            <div className="ml-2 pl-2 border-l border-slate-200/80 dark:border-slate-800 space-y-0.5 pt-0.5">
              {bookingCollabItems.map((sub) => {
                const isSubActive = location.pathname === sub.href;
                const SubIcon = sub.icon;
                return (
                  <Link
                    key={sub.href}
                    to={sub.href}
                    onClick={onCloseMobile}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2 py-1 text-[11px] font-semibold transition-all",
                      isSubActive
                        ? "bg-emerald-100/70 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 font-bold"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                    )}
                  >
                    <SubIcon className={cn("h-3.5 w-3.5 shrink-0", isSubActive ? "text-emerald-700 dark:text-emerald-400" : "text-slate-400")} />
                    <span className="truncate">{sub.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── BOTTOM CTA: BECOME PARTNER ── */}
      <div className="shrink-0 p-2 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        {user?.role === "admin" ? (
          <Tooltip content="System Admin Console" side="right" disabled={!isCollapsed}>
            <Link
              to="/admin"
              onClick={onCloseMobile}
              className="flex items-center gap-2 rounded-xl p-2 bg-rose-50 dark:bg-rose-950/60 border border-rose-200/80 dark:border-rose-800/80 text-rose-900 dark:text-rose-200 hover:bg-rose-100/70 dark:hover:bg-rose-900/60 transition-all"
            >
              <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              {!isCollapsed && <span className="font-bold text-[11px]">Admin Console</span>}
            </Link>
          </Tooltip>
        ) : isApprovedPartner ? (
          <Tooltip content="Open Partner Portal" side="right" disabled={!isCollapsed}>
            <Link
              to="/partner"
              onClick={onCloseMobile}
              className="flex items-center gap-2 rounded-xl p-2 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/60 transition-all"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              {!isCollapsed && <span className="font-bold text-[11px]">Open Partner Portal &rarr;</span>}
            </Link>
          </Tooltip>
        ) : isPendingPartner ? (
          <Tooltip content="Partner Application Pending" side="right" disabled={!isCollapsed}>
            <Link
              to="/app/become-partner"
              onClick={onCloseMobile}
              className="flex items-center gap-2 rounded-xl p-2 bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 transition-all"
            >
              <Clock className="h-4 w-4 shrink-0 text-amber-500" />
              {!isCollapsed && <span className="font-bold text-[11px]">Partner Status: Pending</span>}
            </Link>
          </Tooltip>
        ) : isRejectedPartner ? (
          <Tooltip content="Partner Application Review Needed" side="right" disabled={!isCollapsed}>
            <Link
              to="/app/become-partner"
              onClick={onCloseMobile}
              className="flex items-center gap-2 rounded-xl p-2 bg-rose-50 dark:bg-rose-950/60 border border-rose-200/80 dark:border-rose-800/80 text-rose-900 dark:text-rose-200 transition-all"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              {!isCollapsed && <span className="font-bold text-[11px]">Partner Status: Review Needed</span>}
            </Link>
          </Tooltip>
        ) : (
          <Tooltip content="Become Partner" side="right" disabled={!isCollapsed}>
            <div className="rounded-xl border border-amber-200/80 dark:border-amber-800/60 bg-amber-50/80 dark:bg-amber-950/40 transition-all overflow-hidden">
              <div
                onClick={() => {
                  if (isCollapsed) onToggleCollapse();
                  else setPartnerCardExpanded(!partnerCardExpanded);
                }}
                className="flex cursor-pointer items-center justify-between p-2 text-amber-900 dark:text-amber-200 hover:bg-amber-100/50 dark:hover:bg-amber-900/40 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <HeartHandshake className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  {!isCollapsed && <span className="font-bold text-[11px]">BECOME PARTNER</span>}
                </div>
                {!isCollapsed && (
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 text-amber-600 dark:text-amber-400 transition-transform duration-200",
                      partnerCardExpanded ? "rotate-180" : ""
                    )}
                  />
                )}
              </div>

              {!isCollapsed && partnerCardExpanded && (
                <div className="px-2.5 pb-2 pt-1 border-t border-amber-200/50 dark:border-amber-800/40 space-y-1.5">
                  <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-tight">
                    Host farm stays, agro-tours & local experiences.
                  </p>
                  <Link
                    to="/app/become-partner"
                    onClick={onCloseMobile}
                    className="block w-full text-center rounded-lg bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white py-1 px-2 text-[10px] font-bold transition-all"
                  >
                    Open Partner Portal
                  </Link>
                </div>
              )}
            </div>
          </Tooltip>
        )}
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
