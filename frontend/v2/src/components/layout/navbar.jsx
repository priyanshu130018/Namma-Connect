import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "@/lib/router-compat";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiMenu,
  FiX,
  FiHome,
  FiBookOpen,
  FiMail,
  FiCompass,
  FiUser,
  FiHeart,
  FiLifeBuoy,
  FiLogOut,
  FiLogIn,
  FiSearch,
  FiBell,
  FiMessageSquare,
} from "react-icons/fi";
import WishlistDrawer, { getWishlist } from "@/components/ui/wishlist";
import { roleClass } from "@/lib/roles";
import { ThemeToggle } from "@/lib/theme";
import { useApp } from "@/lib/app-context";

// Secondary (in-app) navigation — tourist / farmer / creator only.
// Admin intentionally gets NO second navbar or drawer (sidebar-only nav).
const secondaryNavByRole = {
  tourist: [
    { label: "Home", path: "/tourist/home", icon: <FiHome /> },
    { label: "Experiences", path: "/tourist/experiences", icon: <FiCompass /> },
    { label: "Blog", path: "/blog", icon: <FiBookOpen /> },
    { label: "Help Centre", path: "/tourist/help", icon: <FiLifeBuoy /> },
  ],
  farmer: [
    { label: "Home", path: "/farmer/home", icon: <FiHome /> },
    { label: "Experiences", path: "/farmer/listings", icon: <FiCompass /> },
    { label: "Blog", path: "/blog", icon: <FiBookOpen /> },
    { label: "Help Centre", path: "/farmer/help", icon: <FiLifeBuoy /> },
  ],
  creator: [
    { label: "Home", path: "/creator/home", icon: <FiHome /> },
    { label: "Experiences", path: "/creator/portfolio", icon: <FiCompass /> },
    { label: "Blog", path: "/blog", icon: <FiBookOpen /> },
    { label: "Help Centre", path: "/creator/help", icon: <FiLifeBuoy /> },
  ],
};

const drawerLinksByRole = (role) => {
  const nav = secondaryNavByRole[role] ?? secondaryNavByRole.tourist;
  return [
    ...nav,
    { label: "Contact", path: "/contact", icon: <FiMail /> },
  ];
};

export default function Navbar({ minimal = false }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [wishCount, setWishCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  // Global app state: session user + live unread counts.
  const { user, unreadNotifications, unreadMessages } = useApp();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const refresh = () => setWishCount(getWishlist().length);
    refresh();
    window.addEventListener("wishlist-change", refresh);
    return () => window.removeEventListener("wishlist-change", refresh);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("nc_token");
    localStorage.removeItem("nc_user");
    window.dispatchEvent(new Event("nc-user-change"));
    navigate("/");
    setDrawerOpen(false);
  };

  const handleRoleSwitch = () => {
    const raw = localStorage.getItem("nc_user");
    if (raw) {
      const userObj = JSON.parse(raw);
      if (userObj.role === "tourist") {
        if (userObj.has_farmer_profile) {
          userObj.role = "farmer";
          localStorage.setItem("nc_user", JSON.stringify(userObj));
          window.dispatchEvent(new Event("nc-user-change"));
          navigate("/farmer/home");
        } else if (userObj.has_creator_profile) {
          userObj.role = "creator";
          localStorage.setItem("nc_user", JSON.stringify(userObj));
          window.dispatchEvent(new Event("nc-user-change"));
          navigate("/creator/home");
        }
      } else {
        userObj.role = "tourist";
        localStorage.setItem("nc_user", JSON.stringify(userObj));
        window.dispatchEvent(new Event("nc-user-change"));
        navigate("/tourist/home");
      }
    }
  };

  const showAppNav = !!user && !minimal && user.role !== "admin";

  const secondaryNav = showAppNav
    ? (secondaryNavByRole[user.role] ?? secondaryNavByRole.tourist)
    : [];
  const drawerItems = drawerLinksByRole(user?.role);
  const profilePath = user
    ? user.role === "admin"
      ? "/admin/settings"
      : `/${user.role}/profile`
    : "/login";

  return (
    <div className={roleClass(user?.role)}>
      <header
        className={`fixed inset-x-0 top-0 z-40 transition-colors duration-200 ${
          scrolled
            ? "border-b border-border bg-card/90 backdrop-blur-md"
            : "border-b border-transparent bg-background/60 backdrop-blur-sm"
        }`}
      >
        {/* ── Navbar 1: global ── */}
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              N
            </span>
            <span className="truncate text-lg font-semibold tracking-tight text-foreground">
              Namma<span className="text-primary"> Connect</span>
            </span>
          </Link>

          {/* Global search — farms, experiences, activities */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const q = searchQuery.trim();
              navigate(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
            }}
            role="search"
            className="relative hidden min-w-0 flex-1 md:block md:max-w-md"
          >
            <FiSearch
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search farms, experiences, activities…"
              aria-label="Search Namma Connect"
              className="input-field w-full rounded-full py-2 pl-10 pr-4 text-sm"
            />
          </form>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/search"
              aria-label="Search"
              className="btn-ghost grid size-9 place-items-center p-0 md:hidden"
            >
              <FiSearch size={17} />
            </Link>
            <ThemeToggle />

            {user && user.role !== "admin" && (
              <>
                <Link
                  to={`/${user.role}/messages`}
                  aria-label="Messages"
                  className="btn-ghost relative grid size-9 place-items-center p-0"
                >
                  <FiMessageSquare size={17} />
                  {unreadMessages > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                      {unreadMessages > 9 ? "9+" : unreadMessages}
                    </span>
                  )}
                </Link>
                <Link
                  to={`/${user.role}/notifications`}
                  aria-label="Notifications"
                  className="btn-ghost relative grid size-9 place-items-center p-0"
                >
                  <FiBell size={17} />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                      {unreadNotifications > 9 ? "9+" : unreadNotifications}
                    </span>
                  )}
                </Link>
              </>
            )}

            {user && (
              <button
                onClick={() => setWishlistOpen(true)}
                aria-label="Open wishlist"
                className="btn-ghost relative size-9 p-0"
              >
                <FiHeart size={17} />
                {wishCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                    {wishCount > 9 ? "9+" : wishCount}
                  </span>
                )}
              </button>
            )}

            {user && (user.has_farmer_profile || user.has_creator_profile) && (
              <button
                onClick={handleRoleSwitch}
                className="btn-outline hidden items-center gap-1.5 px-3 py-1.5 text-xs sm:inline-flex mr-1"
              >
                {user.role === "tourist" ? "Switch to Work" : "Switch to Home"}
              </button>
            )}

            {user ? (
              <Link
                to={profilePath}
                aria-label="Profile"
                className="grid size-9 place-items-center rounded-full bg-role text-sm font-semibold text-role-foreground"
              >
                {user.name?.[0]?.toUpperCase() ?? <FiUser size={16} />}
              </Link>

            ) : (
              <Link to="/login" className="btn-primary">
                <FiLogIn size={15} /> Sign in
              </Link>
            )}
          </div>
        </div>

        {/* ── Navbar 2: in-app navigation (after login) ── */}
        {showAppNav && (
          <div className="border-t border-border bg-card/80 backdrop-blur-md">
            <div className="mx-auto flex h-12 max-w-7xl items-center gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8">
              <button
                onClick={() => setDrawerOpen(true)}
                aria-label="Open menu"
                className="btn-ghost mr-1 size-9 shrink-0 p-0"
              >
                <FiMenu size={18} />
              </button>
              {secondaryNav.map((item) => (
                <Link
                  key={item.label}
                  to={item.path}
                  className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? "bg-role-soft text-role"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* ── Left side drawer ── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-[2px]"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.22 }}
              className="fixed top-0 left-0 z-50 flex h-full w-72 flex-col border-r border-border bg-card"
            >
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <span className="text-base font-semibold text-foreground">
                  Namma<span className="text-primary"> Connect</span>
                </span>
                <button
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close menu"
                  className="btn-ghost size-8 p-0"
                >
                  <FiX size={17} />
                </button>
              </div>

              {user && (
                <div className="mx-4 mt-4 flex items-center gap-3 rounded-xl border border-border bg-role-soft px-4 py-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-role text-sm font-semibold text-role-foreground">
                    {user.name?.[0]?.toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {user.name}
                    </p>
                    <p className="text-xs text-role capitalize">{user.role}</p>
                  </div>
                </div>
              )}

              <div className="flex-1 space-y-1 overflow-y-auto p-4">
                <p className="px-3 pb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Menu
                </p>

                {drawerItems.map((item, i) => (
                  <Link
                    key={`${item.label}-${i}`}
                    to={item.path}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      location.pathname === item.path
                        ? "bg-role-soft text-role"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <span className="text-base">{item.icon}</span> {item.label}
                  </Link>
                ))}

                <div className="mt-4 border-t border-border pt-4">
                  {user && (user.has_farmer_profile || user.has_creator_profile) && (
                    <button
                      onClick={() => {
                        handleRoleSwitch();
                        setDrawerOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-muted mb-2"
                    >
                      <FiCompass size={16} />
                      {user.role === "tourist" ? "Switch to Work view" : "Switch to Home view"}
                    </button>
                  )}
                  {user ? (
                    <button

                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-muted"
                    >
                      <FiLogOut size={16} /> Log out
                    </button>
                  ) : (
                    <Link
                      to="/login"
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-muted"
                    >
                      <FiLogIn size={16} /> Sign in / Sign up
                    </Link>
                  )}
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <WishlistDrawer open={wishlistOpen} onClose={() => setWishlistOpen(false)} />
    </div>
  );
}
