import { Outlet } from "react-router-dom";
import { AdminSidebar } from "@/components/layout/AdminSidebar";

export function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <AdminSidebar />
      <div className="flex flex-1 flex-col pl-64">
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-800 bg-slate-900/90 px-8 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-rose-900/60 border border-rose-700 px-2 py-0.5 text-xs font-bold text-rose-300">
              System Admin Console
            </span>
          </div>
        </header>
        <main className="flex-1 p-6 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
