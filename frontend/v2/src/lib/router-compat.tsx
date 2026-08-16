/**
 * Thin compatibility layer so the existing page components keep their familiar
 * routing API while the app runs on TanStack Router.
 */
import {
  Link as TanstackLink,
  useNavigate as useTanstackNavigate,
  useRouterState,
  useParams as useTanstackParams,
} from "@tanstack/react-router";
import { forwardRef, type AnchorHTMLAttributes } from "react";

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  to: string;
  replace?: boolean;
  state?: unknown;
};

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { to, replace, state, ...rest },
  ref,
) {
  const extra = (replace ? { replace: true } : {}) as object;
  return <TanstackLink ref={ref} to={to} {...extra} {...(rest as object)} />;
});

export function useNavigate() {
  const navigate = useTanstackNavigate();
  return (to: string | number, options?: { replace?: boolean }) => {
    if (typeof to === "number") {
      if (typeof window !== "undefined") window.history.go(to);
      return;
    }
    // Support query strings in the target path ("/search?q=tea").
    const [path, qs] = to.split("?");
    navigate({
      to: path,
      search: qs ? Object.fromEntries(new URLSearchParams(qs)) : {},
      replace: options?.replace ?? false,
    } as never);
  };
}

export function useLocation() {
  return useRouterState({ select: (s) => s.location });
}

export function useParams<T extends Record<string, string>>() {
  return useTanstackParams({ strict: false } as never) as T;
}
