import { useState } from "react";
import { Outlet } from "react-router-dom";
import { CustomerNavbar } from "@/components/layout/CustomerNavbar";
import { CustomerSidebar } from "@/components/layout/CustomerSidebar";
import { TravelAIFloating } from "@/components/customer/TravelAIFloating";
import { SupportModal } from "@/components/customer/SupportModal";
import { cn } from "@/lib/utils";

export function CustomerLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      {/* Top Navbar */}
      <CustomerNavbar
        onOpenSupport={() => setIsSupportOpen(true)}
        onToggleSidebar={() => setIsMobileOpen(true)}
      />

      <div className="flex flex-1 relative">
        {/* Collapsible Left Sidebar */}
        <CustomerSidebar
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
          isMobileOpen={isMobileOpen}
          onCloseMobile={() => setIsMobileOpen(false)}
        />

        {/* Main Content Area */}
        <main
          className={cn(
            "flex-1 transition-all duration-300 ease-in-out p-4 sm:p-6 lg:p-8 min-w-0",
            isCollapsed ? "lg:ml-16" : "lg:ml-64"
          )}
        >
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Floating Travel AI Assistant */}
      <TravelAIFloating />

      {/* Concierge Help / Support Modal */}
      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
      />
    </div>
  );
}
