import { Link, Outlet } from "react-router-dom";
import { useAuth } from "@/app/providers";
import { UserRole } from "@/types";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RoleGuard({ allowedRoles }: { allowedRoles: UserRole[] }) {
  const { user } = useAuth();
  const currentRole: UserRole = user?.role || "customer";

  const isAllowed = allowedRoles.includes(currentRole) || (currentRole as string) === "admin";

  if (!isAllowed) {
    const roleStr = String(currentRole);
    const returnPath =
      roleStr === "partner" || roleStr === "farmer"
        ? "/partner"
        : roleStr === "creator"
        ? "/partner/creator"
        : roleStr === "admin"
        ? "/admin"
        : "/app";

    return (
      <div className="mx-auto max-w-md rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center mt-12 shadow-sm">
        <div className="h-12 w-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">Access Restricted</h3>
        <p className="text-xs text-slate-600 mb-6">
          Your current account role (<span className="font-bold">{currentRole}</span>) does not have permission to view this section.
        </p>
        <Link to={returnPath}>
          <Button className="font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white">
            Return to Authorized Portal
          </Button>
        </Link>
      </div>
    );
  }

  return <Outlet />;
}
