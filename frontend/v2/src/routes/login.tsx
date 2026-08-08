import { createFileRoute } from "@tanstack/react-router";
import Login from "@/auth/login";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in to Namma Connect" },
      { name: "description", content: "Sign in or create a Namma Connect account to book and manage experiences." },
      { property: "og:title", content: "Sign in to Namma Connect" },
      { property: "og:description", content: "Sign in or create a Namma Connect account to book and manage experiences." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(Login),
});
