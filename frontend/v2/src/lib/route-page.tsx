import { useEffect, useState, Suspense, type ComponentType } from "react";
import { RoleBasedRoute } from "@/components/auth/guards";

/**
 * Wraps a client-only page component as a TanStack route component.
 * The app was ported from a client-side React SPA; its pages rely on
 * browser APIs and localStorage, so we render them only after mount.
 *
 * Access control (no SSR flash of protected content):
 *  - allowedRoles omitted → public page, rendered as-is.
 *  - allowedRoles set → RoleBasedRoute: unauthenticated visitors are
 *    redirected to /auth/login; the wrong role sees an Access Denied page.
 */
export function clientPage(Component: ComponentType, allowedRoles?: string[]) {
  return function RouteComponent() {
    const [ready, setReady] = useState(false);
    useEffect(() => {
      const id = window.requestAnimationFrame(() => setReady(true));
      return () => window.cancelAnimationFrame(id);
    }, []);

    if (!ready) return null;

    const page = (
      <Suspense fallback={null}>
        <div className="pagefade">
          <Component />
        </div>
      </Suspense>
    );

    if (!allowedRoles || allowedRoles.length === 0) return page;
    return <RoleBasedRoute roles={allowedRoles}>{page}</RoleBasedRoute>;
  };
}
