import { useState, useEffect } from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import {
  Bell,
  Sun,
  Moon,
  Laptop,
  LogOut,
  ShieldCheck,
  Compass,
  Check,
  LifeBuoy,
} from "lucide-react";
import { Dropdown, DropdownItem, DropdownDivider, DropdownHeader } from "@/components/ui/dropdown";
import { Tooltip } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/app/providers";
import { useTheme } from "@/app/theme";
import { getNotifications } from "@/services/communicationService";

export function AdminLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);

  const displayName = user?.full_name || "Namma Connect";
  const displayEmail = user?.email || "admin@namnaconnect.com";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  useEffect(() => {
    async function fetchUnread() {
      try {
        const notifs = await getNotifications();
        setUnreadCount(notifs?.unread_count || 0);
      } catch {
        // Silently catch offline
      }
    }
    fetchUnread();
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <AdminSidebar />
      <div className="flex flex-1 flex-col pl-64">
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-800 bg-slate-900/95 px-6 sm:px-8 backdrop-blur-md transition-colors">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-rose-900/60 border border-rose-700 px-2.5 py-1 text-xs font-bold text-rose-300 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-rose-400" />
              System Admin Console
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Admin Support Link */}
            <Tooltip content="Support Tickets Queue" side="bottom">
              <Link
                to="/admin/support"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
                aria-label="Support Tickets"
              >
                <LifeBuoy className="h-4 w-4" />
              </Link>
            </Tooltip>

            {/* Notifications */}
            <Tooltip content="System Notifications" side="bottom">
              <Link
                to="/app/notifications"
                className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute right-2 top-2 flex h-2 w-2 rounded-full bg-rose-500 ring-2 ring-slate-900" />
                )}
              </Link>
            </Tooltip>

            {/* Theme Selector (Centralized) */}
            <Dropdown
              align="right"
              trigger={
                <Tooltip content={`Theme: ${theme}`} side="bottom">
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
                    aria-label="Toggle theme"
                  >
                    {theme === "light" && <Sun className="h-4 w-4 text-amber-500" />}
                    {theme === "dark" && <Moon className="h-4 w-4 text-indigo-400" />}
                    {theme === "system" && <Laptop className="h-4 w-4" />}
                  </button>
                </Tooltip>
              }
            >
              <DropdownHeader>Theme Settings</DropdownHeader>
              <DropdownItem
                icon={Sun}
                onClick={() => setTheme("light")}
              >
                <span className="flex-1">Light Mode</span>
                {theme === "light" && <Check className="h-4 w-4 text-emerald-500" />}
              </DropdownItem>
              <DropdownItem
                icon={Moon}
                onClick={() => setTheme("dark")}
              >
                <span className="flex-1">Dark Mode</span>
                {theme === "dark" && <Check className="h-4 w-4 text-emerald-500" />}
              </DropdownItem>
              <DropdownItem
                icon={Laptop}
                onClick={() => setTheme("system")}
              >
                <span className="flex-1">System Preference</span>
                {theme === "system" && <Check className="h-4 w-4 text-emerald-500" />}
              </DropdownItem>
            </Dropdown>

            {/* Admin Profile Dropdown */}
            <Dropdown
              align="right"
              trigger={
                <button
                  type="button"
                  className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-800/80 pl-2 pr-3 py-1 text-slate-200 hover:bg-slate-800 transition-colors"
                  aria-label="Admin account menu"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-600 text-xs font-bold text-white">
                    {initials}
                  </div>
                  <span className="hidden sm:inline-block text-xs font-semibold max-w-[100px] truncate">
                    {displayName}
                  </span>
                </button>
              }
            >
              <DropdownHeader>
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900 dark:text-slate-100">{displayName}</span>
                  <span className="text-xs text-slate-500 truncate max-w-[180px]">{displayEmail}</span>
                  <div className="mt-1">
                    <Badge variant="destructive" className="text-[10px] py-0 px-1.5 font-mono uppercase">
                      Admin Access
                    </Badge>
                  </div>
                </div>
              </DropdownHeader>
              <DropdownDivider />
              <DropdownItem
                icon={Compass}
                onClick={() => navigate("/app")}
              >
                Switch to Traveler Portal
              </DropdownItem>
              <DropdownDivider />
              <DropdownItem
                icon={LogOut}
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
              >
                Sign Out
              </DropdownItem>
            </Dropdown>
          </div>
        </header>

        <main className="flex-1 p-6 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
