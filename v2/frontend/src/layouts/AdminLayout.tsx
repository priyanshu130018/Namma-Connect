import { Outlet } from "react-router-dom";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { DashboardNavbar } from "@/components/layout/DashboardNavbar";

export function AdminLayout() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      <DashboardNavbar />
      <div className="flex flex-1 relative pt-16">
        <AdminSidebar />
        <div className="flex flex-1 flex-col lg:pl-64">
          <main className="flex-1 p-6 sm:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
