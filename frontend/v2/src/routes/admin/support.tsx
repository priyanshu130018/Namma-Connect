import { createFileRoute } from "@tanstack/react-router";
import { AdminSupport } from "@/dashboard/admin/pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/admin/support")({
  head: () => ({
    meta: [
      { title: "Support | Namma Connect" },
      { name: "description", content: "Tickets raised by users and hosts." },
      { property: "og:title", content: "Support | Namma Connect" },
      { property: "og:description", content: "Tickets raised by users and hosts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(AdminSupport, ["admin"]),
});
