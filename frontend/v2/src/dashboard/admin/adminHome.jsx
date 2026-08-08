import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "@/lib/router-compat";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  FiUsers, FiActivity, FiHome,
  FiSearch, FiTrash2, FiShield, FiShieldOff,
  FiX, FiChevronLeft, FiChevronRight, FiRefreshCw,
  FiDownload, FiEye, FiAlertTriangle, FiCheckCircle,
  FiSun, FiUser, FiLogOut,
  FiGrid, FiBarChart2, FiSettings, FiFileText, FiMap, FiCamera,
} from "react-icons/fi";
import { adminAPI } from "@/services/api";
import { ThemeToggle } from "@/lib/theme";

const ADMIN_NAV = [
  { to: "/admin/home",              icon: <FiGrid size={17} />,          label: "Dashboard" },
  { to: "/admin/users",             icon: <FiUsers size={17} />,         label: "Users" },
  { to: "/admin/verified-users",    icon: <FiCheckCircle size={17} />,   label: "Verified Users" },
  { to: "/admin/farm-approval",     icon: <FiMap size={17} />,           label: "Farm Approval" },
  { to: "/admin/activity-approval", icon: <FiActivity size={17} />,      label: "Activity Approval" },
  { to: "/admin/reports",           icon: <FiFileText size={17} />,      label: "Reports" },
  { to: "/admin/fraud",             icon: <FiAlertTriangle size={17} />, label: "Fraud Detection" },
  { to: "/admin/analytics",         icon: <FiBarChart2 size={17} />,     label: "Analytics" },
  { to: "/admin/settings",          icon: <FiSettings size={17} />,      label: "Settings" },
];

// ── helpers ───────────────────────────────────────────────────────────────────
const getUser = () => {
  try { return JSON.parse(localStorage.getItem("nc_user") || "null"); } catch { return null; }
};
const fmt = (s) => s ? new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

const ROLE_COLORS = {
  tourist: "bg-primary/10 text-primary border-primary/30",
  farmer: "bg-primary/10 text-primary border-primary/30",
  creator: "bg-primary/10 text-primary border-primary/30",
  admin: "bg-primary/10 text-destructive border-destructive/30",
};

const STATUS_COLORS = {
  pending: "bg-primary/10 text-primary",
  confirmed: "bg-primary/10 text-primary",
  cancelled: "bg-primary/10 text-destructive",
  completed: "bg-primary/10 text-primary",
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color = "amber" }) {
  const colors = {
    amber: "bg-primary/10 text-primary",
    blue: "bg-primary/10 text-primary",
    purple: "bg-primary/10 text-primary",
    green: "bg-primary/10 text-primary",
    slate: "bg-muted text-muted-foreground",
  };
  return (
    <Motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border shadow-sm p-6 flex items-center gap-5"
    >
      <div className={`w-14 h-14 rounded-2xl ${colors[color]} flex items-center justify-center text-2xl flex-shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-semibold text-foreground">{value ?? "—"}</p>
        <p className="text-sm font-semibold text-muted-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </Motion.div>
  );
}

// ── Delete Confirm Dialog ─────────────────────────────────────────────────────
function ConfirmDialog({ user, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-card rounded-2xl p-8 max-w-sm w-full shadow-md"
      >
        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <FiAlertTriangle size={28} className="text-destructive" />
        </div>
        <h3 className="text-xl font-semibold text-foreground text-center mb-2">Delete User?</h3>
        <p className="text-muted-foreground text-sm text-center mb-6">
          This will permanently delete <strong>{user?.full_name}</strong> and all their associated data. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 border-2 border-border text-muted-foreground font-bold rounded-2xl hover:bg-surface transition-all">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-3 bg-destructive hover:bg-primary text-primary-foreground font-bold rounded-2xl transition-all disabled:opacity-60"
          >
            {loading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </Motion.div>
    </div>
  );
}

// ── Booking Detail Modal ─────────────────────────────────────────────────────
function BookingModal({ booking, onClose }) {
  if (!booking) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <Motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        className="relative w-full max-w-lg bg-card rounded-2xl overflow-hidden shadow-md flex flex-col"
      >
        {/* Header */}
        <div className="bg-card border-b border-border flex items-center justify-between p-6 z-10">
          <h2 className="font-semibold text-foreground text-xl tracking-tight">Booking Details</h2>
          <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-surface hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-muted-foreground transition-all border border-border">
            <FiX size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-foreground text-primary-foreground flex items-center justify-center mb-4 shadow-sm">
              {booking.booking_type === "farm" ? <FiHome size={26} /> : <FiCamera size={26} />}
            </div>
            <h3 className="text-2xl font-semibold text-foreground leading-tight">
              {booking.farm_name || booking.creator_name}
            </h3>
            <p className="text-muted-foreground font-medium text-sm mt-1 flex items-center gap-1">
              <FiHome size={14} /> {booking.address}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface rounded-2xl p-4 border border-border">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Check In</p>
              <p className="font-bold text-foreground">{fmt(booking.check_in)}</p>
            </div>
            <div className="bg-surface rounded-2xl p-4 border border-border">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Check Out</p>
              <p className="font-bold text-foreground">{fmt(booking.check_out)}</p>
            </div>
          </div>

          <div className="bg-surface rounded-2xl p-5 border border-border space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-border/50">
              <span className="text-muted-foreground font-bold text-xs uppercase tracking-wider">Tourist</span>
              <span className="font-semibold text-foreground">{booking.tourist_name}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-border/50">
              <span className="text-muted-foreground font-bold text-xs uppercase tracking-wider">Guests</span>
              <span className="font-semibold text-foreground">
                {booking.adults} Adults, {booking.children} Children
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-bold text-xs uppercase tracking-wider">Total Price</span>
              <span className="font-semibold text-foreground text-lg">
                ₹{Number(booking.total_price || 0).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <span className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-widest ${STATUS_COLORS[booking.status] || "bg-muted text-muted-foreground"}`}>
              {booking.status}
            </span>
          </div>
        </div>

        <div className="p-6 pt-0">
          <button onClick={onClose} className="w-full py-4 bg-foreground text-primary-foreground font-semibold rounded-2xl hover:bg-foreground transition-all shadow-sm">
            Close Detail
          </button>
        </div>
      </Motion.div>
    </div>
  );
}

// ── User Detail Modal ────────────────────────────────────────────────────────
function UserModal({ user, onClose, onDelete, onVerify, verifyLoading }) {
  if (!user) return null;
  const p = user.profile;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <Motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        className="relative w-full max-w-2xl bg-card rounded-2xl overflow-hidden shadow-md flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-card border-b border-border flex items-center justify-between p-6 z-10 shrink-0">
          <h2 className="font-semibold text-foreground text-xl tracking-tight">User Details</h2>
          <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-surface hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-muted-foreground transition-all border border-border">
            <FiX size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1">
          {/* Avatar + role */}
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-foreground text-primary-foreground flex items-center justify-center font-semibold text-3xl shadow-sm border border-border">
              {(p?.name || user.full_name)?.[0]?.toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-2xl">{p?.name || user.full_name}</h3>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-[10px] font-semibold px-3 py-1 rounded-full border uppercase tracking-widest ${ROLE_COLORS[user.role] || ROLE_COLORS.tourist}`}>
                  {user.role}
                </span>
                {p?.is_verified && (
                  <span className="text-[10px] font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/30 flex items-center gap-1 shadow-sm uppercase tracking-widest">
                    <FiCheckCircle size={12} /> Verified
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            {/* Account Info */}
            <div className="bg-surface rounded-[24px] p-6 border border-border space-y-4">
              <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest text-center border-b border-border/60 pb-3 mb-2">Account Summary</h4>
              {[
                ["User ID", user.id],
                ["Email (login)", user.email],
                ["Mobile", user.mobile],
                ["Status", user.is_active ? "Active" : "Inactive"],
                ["Joined", fmt(user.created_at)],
              ].map(([k, v]) => (
                <div key={k} className="flex flex-col text-sm border-b border-border/40 pb-3 last:border-0 last:pb-0">
                  <span className="text-muted-foreground font-bold text-[10px] uppercase tracking-wider mb-1">{k}</span>
                  <span className="font-bold text-foreground truncate">{String(v ?? "—")}</span>
                </div>
              ))}
            </div>

            {/* Profile Info */}
            {p && (
              <div className="bg-surface rounded-[24px] p-6 border border-border space-y-4">
                <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest text-center border-b border-border/60 pb-3 mb-2">Profile Information</h4>
                {[
                  ["Contact Email", p.email],
                  ["Contact Mobile", p.mobile],
                  ["Location", [p.city, p.state].filter(Boolean).join(", ")],
                  ["Aadhaar No.", p.aadhaar_no || "—"],
                  p.niche ? ["Niche", p.niche] : null,
                  p.portfolio ? ["Portfolio", p.portfolio] : null,
                  p.identity_proof ? ["Identity Proof", <a href={p.identity_proof} target="_blank" rel="noreferrer" className="text-primary hover:text-primary hover:underline flex items-center gap-1">View Document</a>] : null,
                ].filter(Boolean).map(([k, v]) => (
                  <div key={k} className="flex flex-col text-sm border-b border-border/40 pb-3 last:border-0 last:pb-0">
                    <span className="text-muted-foreground font-bold text-[10px] uppercase tracking-wider mb-1">{k}</span>
                    <span className="font-bold text-foreground truncate">{v || "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-card border-t border-border p-6 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={() => onDelete(user)}
            className="px-6 py-4 rounded-2xl font-bold text-sm hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all flex items-center gap-2"
          >
            <FiTrash2 size={16} /> Delete Identity
          </button>
          
          <button
            onClick={() => onVerify(user.id)}
            disabled={verifyLoading}
            className={`px-8 py-4 rounded-2xl font-semibold text-sm transition-all disabled:opacity-50 flex items-center gap-3 shadow-sm hover:scale-[1.02] ${
              p?.is_verified
                ? "bg-primary/10 text-primary hover:bg-primary"
                : "bg-foreground text-primary-foreground hover:bg-foreground"
            }`}
          >
            {p?.is_verified ? <><FiShieldOff size={16} /> Revoke Verification</> : <><FiShield size={16} /> Approve & Verify</>}
          </button>
        </div>

      </Motion.div>
    </div>
  );
}

// ── Main Admin Dashboard ──────────────────────────────────────────────────────
export default function AdminHome() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const adminUser = getUser();

  // Access control — only admin role
  useEffect(() => {
    if (!adminUser || adminUser.role !== "admin") {
      navigate("/login", { replace: true });
    }
  }, [adminUser, navigate]);

  // App state
  const [tab, setTab]             = useState("users");       // "users" | "bookings"
  const [stats, setStats]         = useState(null);
  const [users, setUsers]         = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [bookings, setBookings]   = useState([]);
  const [bTotal, setBTotal]       = useState(0);

  const [search, setSearch]       = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage]           = useState(1);
  const [bPage, setBPage]         = useState(1);

  const [loading, setLoading]     = useState(true);
  const [bLoading, setBLoading]   = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [toast, setToast]         = useState(null);

  const PAGE_SIZE = 15;

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const r = await adminAPI.getStats();
      setStats(r.data);
    } catch { /* silent */ }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminAPI.getUsers({
        role: roleFilter !== "all" ? roleFilter : undefined,
        search: search || undefined,
        page,
        page_size: PAGE_SIZE,
      });
      setUsers(r.data.users);
      setUsersTotal(r.data.total);
    } catch { showToast("Failed to load users", "error"); }
    finally { setLoading(false); }
  }, [roleFilter, search, page]);

  const fetchBookings = useCallback(async () => {
    setBLoading(true);
    try {
      const r = await adminAPI.getBookings({
        status: statusFilter !== "all" ? statusFilter : undefined,
        page: bPage,
        page_size: PAGE_SIZE,
      });
      setBookings(r.data.bookings);
      setBTotal(r.data.total);
    } catch { showToast("Failed to load bookings", "error"); }
    finally { setBLoading(false); }
  }, [statusFilter, bPage]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { if (tab === "bookings") fetchBookings(); }, [tab, fetchBookings]);

  // Re-fetch users when search changes (with debounce)
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchUsers(); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await adminAPI.deleteUser(deleteTarget.id);
      showToast(`${deleteTarget.full_name} deleted.`);
      setDeleteTarget(null);
      setSelectedUser(null);
      fetchUsers();
      fetchStats();
    } catch { showToast("Delete failed.", "error"); }
    finally { setDeleteLoading(false); }
  };

  const handleVerify = async (userId) => {
    setVerifyLoading(true);
    try {
      const r = await adminAPI.verifyUser(userId);
      showToast(r.data.message);
      // Update drawer
      setSelectedUser(prev => prev ? {
        ...prev,
        profile: prev.profile ? { ...prev.profile, is_verified: r.data.is_verified } : prev.profile
      } : null);
      fetchUsers();
    } catch { showToast("Verification failed.", "error"); }
    finally { setVerifyLoading(false); }
  };

  // ── CSV Export ─────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const header = ["ID", "Name", "Email", "Mobile", "Role", "Joined"];
    const rows = users.map(u => [
      u.id, u.full_name, u.email, u.mobile, u.role, fmt(u.created_at)
    ]);
    const csv = [header, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "namma_connect_users.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const exportBookingCSV = () => {
    const header = ["ID", "Tourist", "Type", "Farm/Creator", "Check In", "Check Out", "Status", "Price"];
    const rows = bookings.map(b => [
      b.id, b.tourist_name, b.booking_type,
      b.farm_name || b.creator_name || "—",
      b.check_in, b.check_out, b.status,
      `₹${b.total_price}`
    ]);
    const csv = [header, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "namma_connect_bookings.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages  = Math.ceil(usersTotal / PAGE_SIZE);
  const totalBPages = Math.ceil(bTotal / PAGE_SIZE);

  if (!adminUser || adminUser.role !== "admin") return null;

  return (
    <div className="min-h-screen bg-surface flex">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="w-64 bg-card border-r border-border text-foreground flex flex-col fixed inset-y-0 left-0 z-30">
        {/* Logo */}
        <div className="px-6 py-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center font-semibold text-sm">NC</div>
            <div>
              <p className="font-semibold text-foreground text-sm">Namma Connect</p>
              <p className="text-[10px] text-primary font-semibold uppercase tracking-widest">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Nav — route links to every admin section */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {ADMIN_NAV.map(item => {
            const active = location.pathname === item.to;
            return (
              <Link key={item.to} to={item.to}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {item.icon} {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Admin info */}
        <div className="px-4 py-4 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 bg-muted rounded-xl flex items-center justify-center font-bold text-sm text-foreground">
              {adminUser.name?.[0] || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{adminUser.name || "Admin"}</p>
              <p className="text-[10px] text-muted-foreground">Administrator</p>
            </div>
          </div>
          <button
            onClick={() => { localStorage.clear(); navigate("/login"); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-destructive text-xs font-semibold transition-colors mt-1"
          >
            <FiLogOut size={13} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main className="ml-64 flex-1 min-h-screen">

        {/* Top Bar */}
        <div className="sticky top-0 bg-card/80 backdrop-blur-md border-b border-border px-8 py-4 flex items-center justify-between gap-4 z-20">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-foreground truncate">
              {tab === "users" ? "User Management" : "Booking Management"}
            </h1>
            <p className="text-muted-foreground text-xs mt-0.5">
              {tab === "users" ? `${usersTotal} total users` : `${bTotal} total bookings`}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {/* Internal tab toggle: Users / Bookings */}
            <div className="flex items-center gap-1 bg-surface border border-border rounded-xl p-1">
              {[
                { id: "users", label: "Users" },
                { id: "bookings", label: "Bookings" },
              ].map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    tab === t.id ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => { fetchStats(); tab === "users" ? fetchUsers() : fetchBookings(); }}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-semibold text-sm transition-colors"
            >
              <FiRefreshCw size={14} /> Refresh
            </button>
            <ThemeToggle />
            <Link
              to="/admin/settings"
              aria-label="Admin settings"
              className="grid size-9 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
            >
              {adminUser.name?.[0]?.toUpperCase() || "A"}
            </Link>
          </div>
        </div>

        <div className="p-8 space-y-8">

          {/* ── Stat Cards ────────────────────────────────────────────── */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={<FiUsers />}    label="Total Users"    value={stats.total_users}    color="slate" />
              <StatCard icon={<FiSun />}      label="Farmers"        value={stats.farmers}         color="amber" />
              <StatCard icon={<FiUser />}     label="Creators"       value={stats.creators}        color="purple"
                sub={`${stats.tourists} tourists`} />
              <StatCard icon={<FiActivity />} label="Bookings"       value={stats.total_bookings}
                sub={`${stats.pending_bookings} pending`} color="green" />
            </div>
          )}

          {/* ─────────── USERS TAB ─────────────────────────────────── */}
          {tab === "users" && (
            <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">

              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search name, email or mobile…"
                    className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-card"
                  />
                  {search && (
                    <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground">
                      <FiX size={14} />
                    </button>
                  )}
                </div>

                {/* Role filter */}
                <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1">
                  {["all","tourist","farmer","creator"].map(r => (
                    <button key={r} onClick={() => { setRoleFilter(r); setPage(1); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
                        roleFilter === r ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-surface"
                      }`}
                    >
                      {r === "all" ? "All" : r}
                    </button>
                  ))}
                </div>

                <button onClick={exportCSV}
                  className="flex items-center gap-2 px-4 py-2.5 bg-foreground hover:bg-primary text-primary-foreground font-bold rounded-xl text-sm transition-all"
                >
                  <FiDownload size={14} /> Export CSV
                </button>
              </div>

              {/* Table */}
              <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-surface">
                        {["ID", "Name", "Role", "Email", "Mobile", "Joined", "Verified", "Action"].map(h => (
                          <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        Array.from({ length: 6 }).map((_, i) => (
                          <tr key={i} className="border-b border-border">
                            {Array.from({ length: 8 }).map((_, j) => (
                              <td key={j} className="px-5 py-4">
                                <div className="h-3 bg-muted rounded animate-pulse w-20" />
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : users.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-5 py-16 text-center text-muted-foreground font-semibold">
                            No users found
                          </td>
                        </tr>
                      ) : (
                        users.map((u, i) => (
                          <Motion.tr key={u.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="border-b border-border hover:bg-primary/10/30 transition-colors cursor-pointer group"
                            onClick={() => setSelectedUser(u)}
                          >
                            <td className="px-5 py-4 text-muted-foreground font-mono text-xs">#{u.id}</td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center font-semibold text-muted-foreground text-sm flex-shrink-0">
                                  {(u.profile?.name || u.full_name)?.[0]?.toUpperCase()}
                                </div>
                                <span className="font-bold text-foreground group-hover:text-primary transition-colors truncate max-w-[160px]">
                                  {u.profile?.name || u.full_name}
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${ROLE_COLORS[u.role] || ""}`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-muted-foreground text-xs truncate max-w-[180px]">{u.email}</td>
                            <td className="px-5 py-4 text-muted-foreground text-xs">{u.mobile || "—"}</td>
                            <td className="px-5 py-4 text-muted-foreground text-xs whitespace-nowrap">{fmt(u.created_at)}</td>
                            <td className="px-5 py-4">
                              {u.profile?.is_verified
                                ? <span className="flex items-center gap-1 text-primary text-xs font-bold"><FiCheckCircle size={12} /> Yes</span>
                                : <span className="text-muted-foreground text-xs font-bold">—</span>
                              }
                            </td>
                            <td className="px-5 py-4">
                              <button
                                onClick={e => { e.stopPropagation(); setSelectedUser(u); }}
                                className="w-8 h-8 rounded-xl bg-surface hover:bg-primary/10 text-muted-foreground hover:text-primary border border-border flex items-center justify-center transition-all"
                              >
                                <FiEye size={14} />
                              </button>
                            </td>
                          </Motion.tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-5 py-4 border-t border-border">
                    <p className="text-xs text-muted-foreground font-semibold">
                      Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, usersTotal)} of {usersTotal}
                    </p>
                    <div className="flex items-center gap-2">
                      <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                        className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center disabled:opacity-40 hover:bg-muted transition-all"
                      >
                        <FiChevronLeft size={14} />
                      </button>
                      <span className="text-sm font-bold text-foreground">{page} / {totalPages}</span>
                      <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                        className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center disabled:opacity-40 hover:bg-muted transition-all"
                      >
                        <FiChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </Motion.div>
          )}

          {/* ─────────── BOOKINGS TAB ──────────────────────────────── */}
          {tab === "bookings" && (
            <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">

              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1">
                  {["all","pending","confirmed","cancelled","completed"].map(s => (
                    <button key={s} onClick={() => { setStatusFilter(s); setBPage(1); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
                        statusFilter === s ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-surface"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <button onClick={exportBookingCSV}
                  className="ml-auto flex items-center gap-2 px-4 py-2.5 bg-foreground hover:bg-primary text-primary-foreground font-bold rounded-xl text-sm transition-all"
                >
                  <FiDownload size={14} /> Export CSV
                </button>
              </div>

              {/* Table */}
              <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-surface">
                        {["ID", "Tourist", "Type", "Farm / Creator", "Check In", "Check Out", "Guests", "Price", "Status", "Date"].map(h => (
                          <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i} className="border-b border-border">
                            {Array.from({ length: 10 }).map((_, j) => (
                              <td key={j} className="px-5 py-4">
                                <div className="h-3 bg-muted rounded animate-pulse w-16" />
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : bookings.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="px-5 py-16 text-center text-muted-foreground font-semibold">
                            No bookings found
                          </td>
                        </tr>
                      ) : (
                        bookings.map((b, i) => (
                          <Motion.tr key={b.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="border-b border-border hover:bg-surface/50 transition-colors cursor-pointer group"
                            onClick={() => setSelectedBooking(b)}
                          >
                            <td className="px-5 py-4 text-muted-foreground font-mono text-xs">#{b.id}</td>
                            <td className="px-5 py-4 font-bold text-foreground whitespace-nowrap">{b.tourist_name}</td>
                            <td className="px-5 py-4">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                b.booking_type === "farm" ? "bg-primary/10 text-primary" : "bg-primary/10 text-primary"
                              }`}>
                                {b.booking_type}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-foreground font-semibold whitespace-nowrap">
                              {b.farm_name || b.creator_name || "—"}
                            </td>
                            <td className="px-5 py-4 text-muted-foreground text-xs whitespace-nowrap">{b.check_in}</td>
                            <td className="px-5 py-4 text-muted-foreground text-xs whitespace-nowrap">{b.check_out}</td>
                            <td className="px-5 py-4 text-muted-foreground text-xs">{b.guests}</td>
                            <td className="px-5 py-4 font-semibold text-foreground text-xs">
                              {b.total_price > 0 ? `₹${b.total_price.toLocaleString()}` : "Free"}
                            </td>
                            <td className="px-5 py-4">
                              <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${STATUS_COLORS[b.status] || "bg-muted text-muted-foreground"}`}>
                                {b.status}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-muted-foreground text-xs whitespace-nowrap">{fmt(b.created_at)}</td>
                          </Motion.tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalBPages > 1 && (
                  <div className="flex items-center justify-between px-5 py-4 border-t border-border">
                    <p className="text-xs text-muted-foreground font-semibold">
                      Showing {(bPage - 1) * PAGE_SIZE + 1}–{Math.min(bPage * PAGE_SIZE, bTotal)} of {bTotal}
                    </p>
                    <div className="flex items-center gap-2">
                      <button disabled={bPage === 1} onClick={() => setBPage(p => p - 1)}
                        className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center disabled:opacity-40 hover:bg-muted transition-all"
                      >
                        <FiChevronLeft size={14} />
                      </button>
                      <span className="text-sm font-bold text-foreground">{bPage} / {totalBPages}</span>
                      <button disabled={bPage === totalBPages} onClick={() => setBPage(p => p + 1)}
                        className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center disabled:opacity-40 hover:bg-muted transition-all"
                      >
                        <FiChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </Motion.div>
          )}

        </div>
      </main>

      {/* ── Booking Detail Modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {selectedBooking && (
          <BookingModal
            booking={selectedBooking}
            onClose={() => setSelectedBooking(null)}
          />
        )}
      </AnimatePresence>

      {/* ── User Detail Drawer ───────────────────────────────────────── */}
      <AnimatePresence>
        {selectedUser && (
          <UserModal
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
            onDelete={u => setDeleteTarget(u)}
            onVerify={handleVerify}
            verifyLoading={verifyLoading}
          />
        )}
      </AnimatePresence>

      {/* ── Delete Confirm Dialog ────────────────────────────────────── */}
      <AnimatePresence>
        {deleteTarget && (
          <ConfirmDialog
            user={deleteTarget}
            onConfirm={handleDelete}
            onCancel={() => setDeleteTarget(null)}
            loading={deleteLoading}
          />
        )}
      </AnimatePresence>

      {/* ── Toast ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <Motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-md font-bold text-sm ${
              toast.type === "error"
                ? "bg-destructive text-primary-foreground"
                : "bg-foreground text-primary-foreground"
            }`}
          >
            {toast.type === "error"
              ? <FiAlertTriangle size={16} />
              : <FiCheckCircle size={16} className="text-primary" />
            }
            {toast.msg}
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
