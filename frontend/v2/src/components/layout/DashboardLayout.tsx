import { useState, type ReactNode } from "react";
import { Link, useLocation } from "@/lib/router-compat";
import {
  FiActivity,
  FiAlertTriangle,
  FiBarChart2,
  FiBell,
  FiBookOpen,
  FiCalendar,
  FiCamera,
  FiCheckCircle,
  FiCheckSquare,
  FiClock,
  FiCloud,
  FiCompass,
  FiCreditCard,
  FiDollarSign,
  FiFileText,
  FiGrid,
  FiHeart,
  FiHome,
  FiInstagram,
  FiLifeBuoy,
  FiMapPin,
  FiMenu,
  FiMessageSquare,
  FiPlayCircle,
  FiPlusSquare,
  FiSettings,
  FiShield,
  FiStar,
  FiTrendingUp,
  FiUser,
  FiUserCheck,
  FiUsers,
} from "react-icons/fi";
import Navbar from "@/components/layout/navbar";
import { PageWrapper, PageHeader } from "@/components/kit/PageWrapper";
import { Drawer } from "@/components/kit/UI";
import { roleClass, type Role } from "@/lib/roles";
import { cn } from "@/lib/utils";

type NavItem = { label: string; to: string; icon: ReactNode };
type NavGroup = { group: string; items: NavItem[] };

export const DASHBOARD_NAV: Record<Role, NavGroup[]> = {
  tourist: [
    {
      group: "Discover",
      items: [
        { label: "Overview", to: "/tourist/home", icon: <FiHome /> },
        { label: "Explore Farms", to: "/tourist/explore", icon: <FiCompass /> },
        { label: "Experiences", to: "/tourist/experiences", icon: <FiActivity /> },
        { label: "Nearby Farms", to: "/tourist/nearby", icon: <FiMapPin /> },
        { label: "Activities", to: "/tourist/activities", icon: <FiActivity /> },
        { label: "AI Trip Planner", to: "/tourist/trip-planner", icon: <FiTrendingUp /> },
        { label: "Saved Routes", to: "/tourist/saved-routes", icon: <FiMapPin /> },
      ],
    },
    {
      group: "My trips",
      items: [
        { label: "Bookings", to: "/tourist/bookings", icon: <FiCalendar /> },
        { label: "Payments", to: "/tourist/payments", icon: <FiCreditCard /> },
        { label: "Reviews", to: "/tourist/reviews", icon: <FiStar /> },
        { label: "Wishlist", to: "/tourist/wishlist", icon: <FiHeart /> },
        { label: "Checklist", to: "/tourist/checklist", icon: <FiCheckSquare /> },
        { label: "Tour History", to: "/tourist/history", icon: <FiClock /> },
      ],
    },
    {
      group: "Account",
      items: [
        { label: "Messages", to: "/tourist/messages", icon: <FiMessageSquare /> },
        { label: "Notifications", to: "/tourist/notifications", icon: <FiBell /> },
        { label: "Profile", to: "/tourist/profile", icon: <FiUser /> },
        { label: "Settings", to: "/tourist/settings", icon: <FiSettings /> },
        { label: "Help Centre", to: "/tourist/help", icon: <FiLifeBuoy /> },
      ],
    },
  ],
  farmer: [
    {
      group: "Farm",
      items: [
        { label: "Overview", to: "/farmer/home", icon: <FiHome /> },
        { label: "Farm Listings", to: "/farmer/listings", icon: <FiGrid /> },
        { label: "Create Farm", to: "/farmer/create-farm", icon: <FiPlusSquare /> },
        { label: "Availability", to: "/farmer/availability", icon: <FiCalendar /> },
        { label: "Activities", to: "/farmer/activities", icon: <FiActivity /> },
        { label: "Add Activity", to: "/farmer/add-activity", icon: <FiPlusSquare /> },
      ],
    },
    {
      group: "Operations",
      items: [
        { label: "Booking Requests", to: "/farmer/requests", icon: <FiCheckCircle /> },
        { label: "Bookings", to: "/farmer/bookings", icon: <FiBookOpen /> },
        { label: "Collaborations", to: "/farmer/collaborations", icon: <FiCamera /> },
        { label: "Creator Requests", to: "/farmer/creator-requests", icon: <FiUsers /> },
        { label: "Calendar", to: "/farmer/calendar", icon: <FiCalendar /> },
        { label: "Messages", to: "/farmer/messages", icon: <FiMessageSquare /> },
        { label: "Notifications", to: "/farmer/notifications", icon: <FiBell /> },
        { label: "Weather", to: "/farmer/weather", icon: <FiCloud /> },
        { label: "Crop Calendar", to: "/farmer/crop-calendar", icon: <FiCheckSquare /> },
      ],
    },
    {
      group: "Business",
      items: [
        { label: "Revenue", to: "/farmer/revenue", icon: <FiDollarSign /> },
        { label: "Analytics", to: "/farmer/analytics", icon: <FiBarChart2 /> },
        { label: "Reports", to: "/farmer/reports", icon: <FiFileText /> },
        { label: "History", to: "/farmer/history", icon: <FiClock /> },
        { label: "Payments", to: "/farmer/payments", icon: <FiCreditCard /> },
        { label: "Profile", to: "/farmer/profile", icon: <FiUser /> },
        { label: "Settings", to: "/farmer/settings", icon: <FiSettings /> },
        { label: "Help Centre", to: "/farmer/help", icon: <FiLifeBuoy /> },
      ],
    },
  ],
  creator: [
    {
      group: "Studio",
      items: [
        { label: "Overview", to: "/creator/home", icon: <FiHome /> },
        { label: "Portfolio", to: "/creator/portfolio", icon: <FiCamera /> },
        { label: "Collaborations", to: "/creator/collaborations", icon: <FiUsers /> },
        { label: "Bookings", to: "/creator/bookings", icon: <FiCalendar /> },
        { label: "Brand Deals", to: "/creator/brand-deals", icon: <FiDollarSign /> },
        { label: "Messages", to: "/creator/messages", icon: <FiMessageSquare /> },
      ],
    },
    {
      group: "Growth",
      items: [
        { label: "Analytics", to: "/creator/analytics", icon: <FiBarChart2 /> },
        { label: "Revenue", to: "/creator/revenue", icon: <FiDollarSign /> },
        { label: "Instagram", to: "/creator/instagram", icon: <FiInstagram /> },
        { label: "YouTube", to: "/creator/youtube", icon: <FiPlayCircle /> },
        { label: "Social", to: "/creator/social", icon: <FiActivity /> },
        { label: "Payments", to: "/creator/payments", icon: <FiCreditCard /> },
        { label: "Reports", to: "/creator/reports", icon: <FiFileText /> },
        { label: "Followers", to: "/creator/followers", icon: <FiUsers /> },
        { label: "Saved Farms", to: "/creator/saved-farms", icon: <FiHeart /> },
      ],
    },
    {
      group: "Account",
      items: [
        { label: "Profile", to: "/creator/profile", icon: <FiUser /> },
        { label: "Settings", to: "/creator/settings", icon: <FiSettings /> },
        { label: "Notifications", to: "/creator/notifications", icon: <FiBell /> },
        { label: "Help Centre", to: "/creator/help", icon: <FiLifeBuoy /> },
      ],
    },
  ],
  admin: [
    {
      group: "Platform",
      items: [
        { label: "Overview", to: "/admin/home", icon: <FiHome /> },
        { label: "Analytics", to: "/admin/analytics", icon: <FiBarChart2 /> },
        { label: "Users", to: "/admin/users", icon: <FiUsers /> },
        { label: "Roles", to: "/admin/roles", icon: <FiShield /> },
      ],
    },
    {
      group: "Moderation",
      items: [
        { label: "Verify Users", to: "/admin/verify", icon: <FiUserCheck /> },
        { label: "Verified Users", to: "/admin/verified-users", icon: <FiCheckCircle /> },
        { label: "Farm Approval", to: "/admin/farm-approval", icon: <FiGrid /> },
        { label: "Activity Approval", to: "/admin/activity-approval", icon: <FiActivity /> },
        { label: "Fraud Detection", to: "/admin/fraud", icon: <FiAlertTriangle /> },
        { label: "Approvals", to: "/admin/approvals", icon: <FiCheckCircle /> },
        { label: "Reports & Fraud", to: "/admin/reports", icon: <FiAlertTriangle /> },
      ],
    },
    {
      group: "Content",
      items: [
        { label: "Support", to: "/admin/support", icon: <FiLifeBuoy /> },
        { label: "Blogs", to: "/admin/blogs", icon: <FiFileText /> },
        { label: "Help Centre", to: "/admin/help", icon: <FiLifeBuoy /> },
        { label: "Settings", to: "/admin/settings", icon: <FiSettings /> },
      ],
    },
  ],
};

function SidebarNav({
  role,
  pathname,
  onNavigate,
}: {
  role: Role;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="space-y-6" aria-label="Dashboard navigation">
      {DASHBOARD_NAV[role].map((section) => (
        <div key={section.group}>
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {section.group}
          </p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active = pathname === item.to;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-role-soft text-role"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <span className="shrink-0 text-base">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/**
 * Unified dashboard shell: top navbar + role-accented sidebar + page body.
 * Every role dashboard uses this so layout and spacing stay identical.
 */
export function DashboardLayout({
  role,
  title,
  description,
  actions,
  children,
}: {
  role: Role;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const location = useLocation();
  const [mobileNav, setMobileNav] = useState(false);
  const pathname = location?.pathname ?? "";

  return (
    <div className={cn("flex min-h-screen flex-col bg-background", roleClass(role))}>
      <Navbar />
      <div className="flex flex-1 pt-28">
        <aside className="sticky top-28 hidden h-[calc(100vh-7rem)] w-64 shrink-0 overflow-y-auto border-r border-border bg-card px-4 py-6 lg:block">
          <SidebarNav role={role} pathname={pathname} />
        </aside>

        <main className="min-w-0 flex-1 py-6 pb-16">
          <PageWrapper size="wide" className="space-y-6">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => setMobileNav(true)}
                aria-label="Open dashboard menu"
                className="mt-1 grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-card text-muted-foreground lg:hidden"
              >
                <FiMenu size={16} />
              </button>
              <div className="min-w-0 flex-1">
                <PageHeader title={title} description={description} actions={actions} />
              </div>
            </div>
            {children}
          </PageWrapper>
        </main>
      </div>

      <Drawer open={mobileNav} onClose={() => setMobileNav(false)} title="Dashboard" side="left">
        <SidebarNav role={role} pathname={pathname} onNavigate={() => setMobileNav(false)} />
      </Drawer>
    </div>
  );
}

export default DashboardLayout;
