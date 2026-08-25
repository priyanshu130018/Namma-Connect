import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Compass,
  MapPin,
  HeartHandshake,
  ChevronRight,
  ChevronDown,
  Wheat,
  TreePine,
  Car,
  Home,
  Utensils,
  CalendarDays,
  PanelLeftClose,
  PanelLeftOpen,
  Clock,
  AlertCircle,
  CheckCircle2,
  Bookmark,
  History,
  Users,
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
  const [tripExpanded, setTripExpanded] = useState(true);
  const [collabExpanded, setCollabExpanded] = useState(true);
  const [partnerCardExpanded, setPartnerCardExpanded] = useState(false);
  const [partnerApp, setPartnerApp] = useState<PartnerApplicationData | null>(null);

  useEffect(() => {
    if (user) {
      getMyPartnerApplication().then((app) => setPartnerApp(app));
    }
  }, [user, location.pathname]);

  const exploreSubcategories = [
    { label: t("search.experiences"), href: "/app/explore?category=experiences", icon: Wheat },
    { label: t("search.guidesTours"), href: "/app/explore?category=guides-tours", icon: TreePine },
    { label: t("search.travelServices"), href: "/app/explore?category=travel-services", icon: Car },
    { label: t("search.stays"), href: "/app/explore?category=stay", icon: Home },
    { label: t("search.food"), href: "/app/explore?category=food", icon: Utensils },
    { label: t("search.events"), href: "/app/explore?category=events", icon: CalendarDays },
  ];

  const tripSubcategories = [
    { label: "My Trip", href: "/app/trip", icon: MapPin },
    { label: "Bookings", href: "/app/trip/bookings", icon: Bookmark },
    { label: "History", href: "/app/trip/history", icon: History },
  ];

  const collabSubcategories = [
    { label: "Collaboration", href: "/app/collaborations", icon: HeartHandshake },
    { label: "Creators", href: "/app/creators", icon: Users },
  ];

  const isExploreActive = location.pathname === "/app" || location.pathname.startsWith("/app/explore") || location.pathname.startsWith("/app/services");
  const isTripActive = location.pathname.startsWith("/app/trip") || location.pathname.startsWith("/app/my-trip") || location.pathname.startsWith("/app/bookings");
  const isCollabActive = location.pathname.startsWith("/app/collaborations") || location.pathname.startsWith("/app/creators");

  const isApprovedPartner = user?.role === "partner" || user?.role === "farmer" || partnerApp?.status === "APPROVED";
  const isPendingPartner = partnerApp?.status === "PENDING";
  const isRejectedPartner = partnerApp?.status === "REJECTED";

  const renderNavContent = () => (
    <div className="flex h-full flex-col justify-between bg-white dark:bg-slate-900 transition-colors select-none">
      {/* Scrollable Navigation Body */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-3">
        {/* Toggle Collapse Button (Desktop) */}
        <div className="hidden lg:flex items-center justify-end px-1 pb-1">
          <Tooltip content={isCollapsed ? "Expand sidebar" : "Collapse sidebar"} side="right">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          </Tooltip>
        </div>

        {/* 1. Explore Section (Expandable) */}
        <div className="space-y-1">
          <Tooltip content="Explore" side="right" disabled={!isCollapsed}>
            <div
              onClick={() => {
                if (isCollapsed) onToggleCollapse();
                else setExploreExpanded(!exploreExpanded);
              }}
              className={cn(
                "group flex w-full cursor-pointer items-center justify-between rounded-2xl px-3 py-2.5 text-xs font-bold transition-all select-none",
                isExploreActive
                  ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
              )}
            >
              <div className="flex items-center gap-3">
                <Compass className={cn("h-4 w-4 shrink-0", isExploreActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400")} />
                {!isCollapsed && <span>Explore</span>}
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
            <div className="ml-3 pl-3 border-l border-slate-200/80 dark:border-slate-800 space-y-1 pt-1">
              {exploreSubcategories.map((sub) => {
                const isSubActive = location.search.includes(`category=${sub.href.split("=")[1]}`);
                const SubIcon = sub.icon;
                return (
                  <Link
                    key={sub.href}
                    to={sub.href}
                    onClick={onCloseMobile}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold transition-all",
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

        {/* 2. Trip Section (Expandable) */}
        <div className="space-y-1">
          <Tooltip content="Trip" side="right" disabled={!isCollapsed}>
            <div
              onClick={() => {
                if (isCollapsed) onToggleCollapse();
                else setTripExpanded(!tripExpanded);
              }}
              className={cn(
                "group flex w-full cursor-pointer items-center justify-between rounded-2xl px-3 py-2.5 text-xs font-bold transition-all select-none",
                isTripActive
                  ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
              )}
            >
              <div className="flex items-center gap-3">
                <MapPin className={cn("h-4 w-4 shrink-0", isTripActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400")} />
                {!isCollapsed && <span>Trip</span>}
              </div>
              {!isCollapsed && (
                <ChevronRight
                  className={cn(
                    "h-3.5 w-3.5 text-slate-400 transition-transform duration-200",
                    tripExpanded ? "rotate-90 text-emerald-600 dark:text-emerald-400" : ""
                  )}
                />
              )}
            </div>
          </Tooltip>

          {!isCollapsed && tripExpanded && (
            <div className="ml-3 pl-3 border-l border-slate-200/80 dark:border-slate-800 space-y-1 pt-1">
              {tripSubcategories.map((sub) => {
                const isSubActive = location.pathname === sub.href;
                const SubIcon = sub.icon;
                return (
                  <Link
                    key={sub.href}
                    to={sub.href}
                    onClick={onCloseMobile}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold transition-all",
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

        {/* 3. Collaborations Section (Expandable) */}
        <div className="space-y-1">
          <Tooltip content="Collaborations" side="right" disabled={!isCollapsed}>
            <div
              onClick={() => {
                if (isCollapsed) onToggleCollapse();
                else setCollabExpanded(!collabExpanded);
              }}
              className={cn(
                "group flex w-full cursor-pointer items-center justify-between rounded-2xl px-3 py-2.5 text-xs font-bold transition-all select-none",
                isCollabActive
                  ? "bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
              )}
            >
              <div className="flex items-center gap-3">
                <HeartHandshake className={cn("h-4 w-4 shrink-0", isCollabActive ? "text-purple-600 dark:text-purple-400" : "text-slate-400")} />
                {!isCollapsed && <span>Collaborations</span>}
              </div>
              {!isCollapsed && (
                <ChevronRight
                  className={cn(
                    "h-3.5 w-3.5 text-slate-400 transition-transform duration-200",
                    collabExpanded ? "rotate-90 text-purple-600 dark:text-purple-400" : ""
                  )}
                />
              )}
            </div>
          </Tooltip>

          {!isCollapsed && collabExpanded && (
            <div className="ml-3 pl-3 border-l border-slate-200/80 dark:border-slate-800 space-y-1 pt-1">
              {collabSubcategories.map((sub) => {
                const isSubActive = location.pathname === sub.href;
                const SubIcon = sub.icon;
                return (
                  <Link
                    key={sub.href}
                    to={sub.href}
                    onClick={onCloseMobile}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold transition-all",
                      isSubActive
                        ? "bg-purple-100/70 dark:bg-purple-950/80 text-purple-900 dark:text-purple-200 font-bold"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                    )}
                  >
                    <SubIcon className={cn("h-3.5 w-3.5 shrink-0", isSubActive ? "text-purple-700 dark:text-purple-400" : "text-slate-400")} />
                    <span className="truncate">{sub.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Pinned Bottom CTA (Status-Aware & Collapsible) */}
      <div className="shrink-0 p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        {/* CASE 1: APPROVED PARTNER -> SHOW NAMMACONNECT PARTNER LINK */}
        {isApprovedPartner ? (
          <Tooltip content="NammaConnect Partner Portal" side="right" disabled={!isCollapsed}>
            <Link
              to="/partner"
              onClick={onCloseMobile}
              className="flex items-center gap-3 rounded-2xl p-2.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/60 transition-all"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              {!isCollapsed && (
                <div className="overflow-hidden">
                  <p className="text-xs font-bold leading-tight">NammaConnect Partner</p>
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">Open Partner Portal &rarr;</p>
                </div>
              )}
            </Link>
          </Tooltip>
        ) : isPendingPartner ? (
          /* CASE 2: PENDING VERIFICATION */
          <Tooltip content="Partner Application (Pending Verification)" side="right" disabled={!isCollapsed}>
            <Link
              to="/app/become-partner"
              onClick={onCloseMobile}
              className="flex items-center gap-3 rounded-2xl p-2.5 bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 hover:bg-amber-100/70 dark:hover:bg-amber-900/60 transition-all"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
                <Clock className="h-4 w-4 animate-spin-slow" />
              </div>
              {!isCollapsed && (
                <div className="overflow-hidden">
                  <p className="text-xs font-bold leading-tight">Partner Application</p>
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold">Status: Pending Verification</p>
                </div>
              )}
            </Link>
          </Tooltip>
        ) : isRejectedPartner ? (
          /* CASE 3: REJECTED / CHANGES REQUIRED */
          <Tooltip content="Partner Application (Changes Required)" side="right" disabled={!isCollapsed}>
            <Link
              to="/app/become-partner"
              onClick={onCloseMobile}
              className="flex items-center gap-3 rounded-2xl p-2.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200/80 dark:border-rose-800/80 text-rose-900 dark:text-rose-200 hover:bg-rose-100/70 dark:hover:bg-rose-900/60 transition-all"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white shadow-sm">
                <AlertCircle className="h-4 w-4" />
              </div>
              {!isCollapsed && (
                <div className="overflow-hidden">
                  <p className="text-xs font-bold leading-tight">Partner Application</p>
                  <p className="text-[10px] text-rose-700 dark:text-rose-400 font-semibold">Status: Changes Required</p>
                </div>
              )}
            </Link>
          </Tooltip>
        ) : (
          /* CASE 4: NO APPLICATION -> EXPANDABLE BECOME A PARTNER CTA */
          <Tooltip content={t("nav.becomePartner")} side="right" disabled={!isCollapsed}>
            <div className="rounded-2xl border border-amber-200/80 dark:border-amber-800/60 bg-gradient-to-br from-amber-50/80 dark:from-amber-950/40 to-amber-100/50 dark:to-amber-900/20 transition-all overflow-hidden">
              <div
                onClick={() => {
                  if (isCollapsed) onToggleCollapse();
                  else setPartnerCardExpanded(!partnerCardExpanded);
                }}
                className="flex cursor-pointer items-center justify-between p-2.5 text-amber-900 dark:text-amber-200 hover:bg-amber-100/50 dark:hover:bg-amber-900/40 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
                    <HeartHandshake className="h-4 w-4" />
                  </div>
                  {!isCollapsed && (
                    <div>
                      <p className="text-xs font-bold leading-tight">{t("nav.becomePartner")}</p>
                      <p className="text-[9px] text-amber-700 dark:text-amber-400">100% Verified Local Hosts</p>
                    </div>
                  )}
                </div>
                {!isCollapsed && (
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-amber-600 dark:text-amber-400 transition-transform duration-200",
                      partnerCardExpanded ? "rotate-180" : ""
                    )}
                  />
                )}
              </div>

              {!isCollapsed && partnerCardExpanded && (
                <div className="px-3 pb-3 pt-1 border-t border-amber-200/50 dark:border-amber-800/40 space-y-2">
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    List your farm stays, tours, food experiences, and artisanal products on NammaConnect.
                  </p>
                  <Link
                    to="/app/become-partner"
                    onClick={onCloseMobile}
                    className="block w-full text-center rounded-xl bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white py-1.5 px-3 text-xs font-bold shadow-sm transition-all active:scale-95"
                  >
                    Start Partner Application
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
        <div
          className="fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden"
        >
          {renderNavContent()}
        </div>
      )}
    </>
  );
}
