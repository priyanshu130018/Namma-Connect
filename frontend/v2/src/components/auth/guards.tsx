/**
 * Route guards: session protection + role-based access control.
 *
 * Session lives in localStorage as `nc_user` (profile JSON) + `nc_token`
 * (auth token), written by userService on login.
 */
import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, Link } from "@/lib/router-compat";
import { getStoredUser, dashboardPathFor } from "@/services/userService";
import { Button } from "@/components/kit/Button";
import { FiShield, FiArrowLeft } from "react-icons/fi";

type SessionUser = { role?: string; name?: string } | null;

/** Read the current session user and keep it fresh across tabs. */
export function useSessionUser(): SessionUser {
  const [user, setUser] = useState<SessionUser>(() => getStoredUser());
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === "nc_user") setUser(getStoredUser());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return user;
}

function FullPageNotice({ title }: { title: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="h-8 w-8 animate-pulse rounded-full bg-role-soft" />
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
      </div>
    </div>
  );
}

/** Access denied screen for authenticated users hitting the wrong role area. */
export function AccessDenied({ required }: { required?: string[] }) {
  const user = getStoredUser();
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-card">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <FiShield size={26} />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-foreground">Access denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This area is restricted to{" "}
          <span className="font-medium capitalize text-foreground">
            {required && required.length > 0 ? required.join(" or ") : "other"} accounts
          </span>
          . You are signed in as a{" "}
          <span className="font-medium capitalize text-foreground">{user?.role ?? "guest"}</span>.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          {user?.role ? (
            <Link to={dashboardPathFor(user.role)}>
              <Button className="w-full sm:w-auto">Go to my dashboard</Button>
            </Link>
          ) : (
            <Link to="/auth/login">
              <Button className="w-full sm:w-auto">Sign in</Button>
            </Link>
          )}
          <Link to="/">
            <Button variant="outline" className="w-full sm:w-auto">
              <FiArrowLeft /> Back to home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Requires any authenticated session — otherwise redirects to /auth/login. */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const user = useSessionUser();
  const navigate = useNavigate();
  useEffect(() => {
    if (!user) navigate("/auth/login", { replace: true });
  }, [user, navigate]);
  if (!user) return <FullPageNotice title="Redirecting to sign in…" />;
  return <>{children}</>;
}

/** Requires a session AND a matching role — otherwise redirects or shows Access Denied. */
export function RoleBasedRoute({ roles, children }: { roles: string[]; children: ReactNode }) {
  const user = useSessionUser();
  const navigate = useNavigate();
  useEffect(() => {
    if (!user) navigate("/auth/login", { replace: true });
  }, [user, navigate]);
  if (!user) return <FullPageNotice title="Redirecting to sign in…" />;
  if (!roles.includes(user.role ?? "")) return <AccessDenied required={roles} />;
  return <>{children}</>;
}
