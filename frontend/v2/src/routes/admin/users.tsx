import { createFileRoute } from "@tanstack/react-router";
import { AdminUsers } from "@/dashboard/admin/pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [
      { title: "Users | Namma Connect" },
      { name: "description", content: "Manage every account on the platform." },
      { property: "og:title", content: "Users | Namma Connect" },
      { property: "og:description", content: "Manage every account on the platform." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(AdminUsers, ["admin"]),
});
