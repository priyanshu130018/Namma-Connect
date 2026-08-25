import { Link, useLocation } from "react-router-dom";
import {
  ShieldAlert,
  Users,
  Building2,
  CheckSquare,
  Layers,
  Calendar,
  CreditCard,
  Banknote,
  LifeBuoy,
  Settings,
  LogOut,
  Sprout,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminSidebar() {
  const location = useLocation();

  const adminLinks = [
    { label: "Overview", href: "/admin", icon: ShieldAlert },
    { label: "User Directory", href: "/admin/users", icon: Users },
    { label: "Partner Directory", href: "/admin/partners", icon: Building2 },
    { label: "KYC Verification", href: "/admin/partners/verification", icon: CheckSquare },
    { label: "Service Moderation", href: "/admin/services", icon: Layers },
    { label: "Global Bookings", href: "/admin/bookings", icon: Calendar },
    { label: "Payments Audit", href: "/admin/payments", icon: CreditCard },
    { label: "Host Payouts", href: "/admin/payouts", icon: Banknote },
    { label: "Support Tickets", href: "/admin/support", icon: LifeBuoy },
    { label: "Platform Settings", href: "/admin/settings", icon: Settings },
  ];

  const isActive = (href: string) => {
    if (href === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(href);
  };

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-slate-800 bg-slate-900 text-white">
      <div className="flex h-16 items-center px-6 border-b border-slate-800">
        <Link to="/admin" className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-rose-600 flex items-center justify-center text-white font-bold">
            <Sprout className="h-4 w-4" />
          </div>
          <span className="font-extrabold text-white text-sm">
            Admin<span className="text-rose-400">Control</span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        <p className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
          Management Console
        </p>
        {adminLinks.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition-all",
                active
                  ? "bg-rose-600/20 text-rose-300 font-bold border border-rose-600/30"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon className={cn("h-4 w-4", active ? "text-rose-400" : "text-slate-400")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-3">
        <button
          onClick={() => {
            localStorage.removeItem("nc_access_token");
            window.location.href = "/login";
          }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-950/40 transition-colors"
        >
          <LogOut className="h-4 w-4" /> Exit Admin
        </button>
      </div>
    </aside>
  );
}
