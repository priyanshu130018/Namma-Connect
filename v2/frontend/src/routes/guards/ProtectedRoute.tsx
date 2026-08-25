import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "@/app/providers";

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  const token = localStorage.getItem("nc_access_token");

  // If unauthenticated, redirect to /login preserving target destination
  if (!user && !token) {
    const fullPath = location.pathname + (location.search || "");
    return <Navigate to={`/login?returnUrl=${encodeURIComponent(fullPath)}`} replace />;
  }

  return <Outlet />;
}
