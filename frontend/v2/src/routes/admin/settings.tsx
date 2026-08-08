import { createFileRoute } from "@tanstack/react-router";
import { AdminSettings } from "@/dashboard/extra-pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [
      { title: "Settings | Namma Connect" },
      { name: "description", content: "Platform configuration and policies." },
      { property: "og:title", content: "Settings | Namma Connect" },
      { property: "og:description", content: "Platform configuration and policies." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(AdminSettings, ["admin"]),
});
