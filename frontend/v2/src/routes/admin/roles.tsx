import { createFileRoute } from "@tanstack/react-router";
import { AdminRoles } from "@/dashboard/admin/pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/admin/roles")({
  head: () => ({
    meta: [
      { title: "Roles & Permissions | Namma Connect" },
      { name: "description", content: "Control what each role can do." },
      { property: "og:title", content: "Roles & Permissions | Namma Connect" },
      { property: "og:description", content: "Control what each role can do." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(AdminRoles, ["admin"]),
});
