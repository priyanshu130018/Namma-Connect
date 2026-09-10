import { useState } from "react";
import { Outlet } from "react-router-dom";
import { DashboardNavbar } from "@/components/layout/DashboardNavbar";
import { PartnerSidebar } from "@/components/layout/PartnerSidebar";
import { cn } from "@/lib/utils";

export function PartnerLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      {/* Top Navbar */}
      <DashboardNavbar
        onToggleMobileSidebar={() => setIsMobileOpen(true)}
      />

      <div className="flex flex-1 relative pt-16">
        {/* Collapsible Left Sidebar */}
        <PartnerSidebar
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
          isMobileOpen={isMobileOpen}
          onCloseMobile={() => setIsMobileOpen(false)}
        />

        {/* Main Content Area */}
        <main
          className={cn(
            "flex-1 transition-all duration-300 ease-in-out p-4 sm:p-6 lg:p-8 min-w-0",
            isCollapsed ? "md:ml-16" : "md:ml-64"
          )}
        >
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
