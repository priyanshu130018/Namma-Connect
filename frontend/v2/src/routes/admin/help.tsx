import { createFileRoute } from "@tanstack/react-router";
import { AdminHelp } from "@/dashboard/extra-pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/admin/help")({
  head: () => ({
    meta: [
      { title: "Help Centre | Namma Connect" },
      { name: "description", content: "Internal support playbooks." },
      { property: "og:title", content: "Help Centre | Namma Connect" },
      { property: "og:description", content: "Internal support playbooks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(AdminHelp, ["admin"]),
});
