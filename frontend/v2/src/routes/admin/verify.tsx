import { createFileRoute } from "@tanstack/react-router";
import { AdminVerify } from "@/dashboard/admin/pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/admin/verify")({
  head: () => ({
    meta: [
      { title: "Verify Users | Namma Connect" },
      { name: "description", content: "Review identity and ownership documents." },
      { property: "og:title", content: "Verify Users | Namma Connect" },
      { property: "og:description", content: "Review identity and ownership documents." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(AdminVerify, ["admin"]),
});
