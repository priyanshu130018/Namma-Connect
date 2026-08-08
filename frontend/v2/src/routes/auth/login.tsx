import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNavigate } from "@/lib/router-compat";

/**
 * Canonical sign-in URL. Route guards redirect here when a session is
 * missing; we forward to the app's login screen, keeping the requested
 * destination for post-login redirect.
 */
export const Route = createFileRoute("/auth/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Namma Connect" },
      { name: "description", content: "Sign in to your Namma Connect account." },
      { property: "og:title", content: "Sign in — Namma Connect" },
      { property: "og:description", content: "Sign in to your Namma Connect account." },
    ],
  }),
  component: AuthLoginRedirect,
});

function AuthLoginRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/login", { replace: true });
  }, [navigate]);
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <p className="text-sm font-medium text-muted-foreground">Redirecting to sign in…</p>
    </div>
  );
}
