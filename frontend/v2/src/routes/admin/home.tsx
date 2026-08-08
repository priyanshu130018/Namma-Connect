import { createFileRoute } from "@tanstack/react-router";
import AdminHome from "@/dashboard/admin/adminHome";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/admin/home")({
  head: () => ({
    meta: [
      { title: "Admin Console | Namma Connect" },
      { name: "description", content: "Manage users, listings and platform activity." },
      { property: "og:title", content: "Admin Console | Namma Connect" },
      { property: "og:description", content: "Manage users, listings and platform activity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(AdminHome, ["admin"]),
});
