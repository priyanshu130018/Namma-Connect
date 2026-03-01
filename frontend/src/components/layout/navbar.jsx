import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FiMenu, FiX, FiHome, FiBookOpen, FiInfo, FiMail, FiGrid,
         FiUser, FiMap, FiCalendar, FiHeart, FiSettings, FiHelpCircle, FiLogOut, FiLogIn, FiCpu } from "react-icons/fi";
import WishlistDrawer from "@/components/ui/wishlist";
import { getWishlist } from "@/components/ui/wishlist";

const getUser = () => {
  try { return JSON.parse(localStorage.getItem("ng_user") || "null"); }
  catch { return null; }
};

const navLinks = [
  { label: "Home",    path: "/home",    icon: <FiHome /> },
  { label: "Services",path: "/services",icon: <FiGrid /> },
  { label: "Blog",    path: "/blog",    icon: <FiBookOpen /> },
  { label: "About",   path: "/about",   icon: <FiInfo /> },
  { label: "Contact", path: "/contact", icon: <FiMail /> },
];

const wishlistItem = { label: "Wishlist", path: null, icon: <FiHeart />, isWishlist: true };

const touristDrawer = [
  { label: "Dashboard",   path: "/tourist/home",     icon: <FiHome /> },
  { label: "Profile",     path: "/tourist/profile",  icon: <FiUser /> },
  { label: "AI Trip Planner", path: "/AI-trip-planner", icon: <FiCpu /> },
  { label: "Bookings",    path: "/tourist/bookings", icon: <FiCalendar /> },
  wishlistItem,
  { label: "Settings",    path: "/tourist/settings", icon: <FiSettings /> },
  { label: "Help",        path: "/contact",          icon: <FiHelpCircle /> },
];

const farmerDrawer = [
  { label: "Dashboard",    path: "/farmer/home",     icon: <FiHome /> },
  { label: "Profile",      path: "/farmer/profile",  icon: <FiUser /> },
  { label: "AI Trip Planner", path: "/AI-trip-planner", icon: <FiCpu /> },
  { label: "Bookings",     path: "/farmer/bookings", icon: <FiCalendar /> },
  { label: "Farm Listings",path: "/farmer/listings", icon: <FiGrid /> },
  wishlistItem,
  { label: "Settings",     path: "/farmer/settings", icon: <FiSettings /> },
  { label: "Help",         path: "/contact",          icon: <FiHelpCircle /> },
];

const creatorDrawer = [
  { label: "Dashboard",   path: "/creator/home",     icon: <FiHome /> },
  { label: "My Profile",  path: "/creator/profile",  icon: <FiUser /> },
  { label: "AI Trip Planner", path: "/AI-trip-planner", icon: <FiCpu /> },
  { label: "Bookings",    path: "/creator/bookings", icon: <FiCalendar /> },
  wishlistItem,
  { label: "Settings",  path: "/creator/settings", icon: <FiSettings /> },
  { label: "Help",      path: "/contact",           icon: <FiHelpCircle /> },
];

export default function Navbar({ minimal = false }) {
  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [scrolled,     setScrolled]     = useState(false);
  const [wishCount,    setWishCount]    = useState(0);
  const location  = useLocation();
  const navigate  = useNavigate();
  const user      = getUser();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  // Keep wishlist badge count in sync
  useEffect(() => {
    const refresh = () => setWishCount(getWishlist().length);
    refresh();
    window.addEventListener("wishlist-change", refresh);
    return () => window.removeEventListener("wishlist-change", refresh);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("ng_token");
    localStorage.removeItem("ng_user");
    navigate("/");
    setDrawerOpen(false);
  };

  const getDrawerItems = () => {
    if (!user) return [];
    if (user.role === "farmer")  return farmerDrawer;
    if (user.role === "creator") return creatorDrawer;
    return touristDrawer;
  };

  const handleDrawerItemClick = (item) => {
    if (item.isWishlist) {
      setDrawerOpen(false);
      setTimeout(() => setWishlistOpen(true), 200);
    }
  };

  return (
    <>
      <motion.nav
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-white/90 backdrop-blur-xl shadow-lg shadow-black/8 border-b border-slate-200/60 py-3" : "bg-transparent py-5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30 group-hover:scale-110 transition-transform">
              <span className="text-white font-black text-sm">NG</span>
            </div>
            <span className="font-black text-xl text-slate-900 tracking-tight">
              Namma<span className="text-green-600">Gig</span>
            </span>
          </Link>

          {/* Center Nav Links */}
          {!minimal && (
            <div className="hidden md:flex items-center gap-1">
              {navLinks
                .filter((link) => {
                  if (link.label !== "Services") return true;
                  if (!user) return true;
                  return user.role === "tourist";
                })
                .map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      link.isAI
                        ? "bg-slate-900 text-white hover:bg-indigo-600 shadow-lg shadow-indigo-100"
                        : location.pathname === link.path
                        ? "bg-green-100 text-green-700"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    {link.icon} {link.label}
                  </Link>
                ))}
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Wishlist button (shown when logged in) */}
            {user && (
              <button
                onClick={() => setWishlistOpen(true)}
                className="relative w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-all"
                title="Wishlist"
              >
                <FiHeart size={17} />
                {wishCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                    {wishCount > 9 ? "9+" : wishCount}
                  </span>
                )}
              </button>
            )}

            {!user && !minimal && (
              <Link to="/login" className="hidden md:flex btn-primary text-sm py-2">
                <FiLogIn className="mr-1.5" /> Login
              </Link>
            )}
            {user && (
              <div className="hidden md:flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{user.name?.[0]?.toUpperCase()}</span>
                </div>
                <span className="text-sm text-slate-700 font-medium">{user.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${
                  user.role === 'farmer'  ? 'bg-amber-100 text-amber-700' :
                  user.role === 'creator' ? 'bg-purple-100 text-purple-700' :
                  'bg-green-100 text-green-700'
                }`}>{user.role}</span>
              </div>
            )}

            {/* Hamburger */}
            <button
              id="nav-menu-btn"
              onClick={() => setDrawerOpen(true)}
              className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-all"
            >
              <FiMenu size={20} />
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Drawer Overlay */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="drawer-overlay"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-72 bg-white border-l border-slate-200 z-50 flex flex-col shadow-2xl"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <span className="font-black text-xl text-slate-900">Namma<span className="text-green-600">Gig</span></span>
                <button onClick={() => setDrawerOpen(false)} className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors">
                  <FiX size={18} />
                </button>
              </div>

              {/* User info */}
              {user && (
                <div className="p-4 mx-4 mt-4 bg-green-50 border border-green-200 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center">
                      <span className="text-lg font-black text-white">{user.name?.[0]?.toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{user.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${
                        user.role === 'farmer'  ? 'bg-amber-100 text-amber-700' :
                        user.role === 'creator' ? 'bg-purple-100 text-purple-700' :
                        'bg-green-100 text-green-700'
                      }`}>{user.role}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Drawer Links */}
              <div className="flex-1 overflow-y-auto py-4 px-4 space-y-1">
                {/* Navigation and Account links below */}

                {!user ? (
                  <>
                    <p className="text-xs text-slate-400 uppercase tracking-widest px-3 mb-3">Navigation</p>
                    {navLinks.map((link) => (
                      <Link key={link.path} to={link.path}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                          location.pathname === link.path ? "bg-green-100 text-green-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                      >
                        <span className="text-lg">{link.icon}</span> {link.label}
                      </Link>
                    ))}
                    <div className="border-t border-slate-200 pt-4 mt-4">
                      <Link to="/login" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-green-700 hover:bg-green-50 transition-all">
                        <FiLogIn size={18} /> Login / Sign Up
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-slate-400 uppercase tracking-widest px-3 mb-3">My Account</p>
                    {getDrawerItems().map((item, i) => {
                      if (item.isWishlist) {
                        return (
                          <button
                            key="wish-drawer"
                            onClick={() => handleDrawerItemClick(item)}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-red-500 hover:bg-red-50"
                          >
                            <span className="text-lg">{item.icon}</span> {item.label}
                            {wishCount > 0 && <span className="ml-auto text-[10px] font-black bg-red-500 text-white px-2 py-0.5 rounded-full">{wishCount}</span>}
                          </button>
                        );
                      }
                      return (
                        <Link key={item.path || i} to={item.path}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                            location.pathname === item.path ? "bg-green-100 text-green-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          }`}
                        >
                          <span className="text-lg">{item.icon}</span> {item.label}
                        </Link>
                      );
                    })}

                    <div className="border-t border-slate-200 pt-4 mt-4">
                      <button onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition-all"
                      >
                        <FiLogOut size={18} /> Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Wishlist Drawer */}
      <WishlistDrawer open={wishlistOpen} onClose={() => setWishlistOpen(false)} />
    </>
  );
}
