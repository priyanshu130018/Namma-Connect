import { createFileRoute } from "@tanstack/react-router";
import { AdminFarmApproval } from "@/dashboard/extra-pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/admin/farm-approval")({
  head: () => ({
    meta: [
      { title: "Farm Approval | Namma Connect" },
      { name: "description", content: "Review farm listings before they go live." },
      { property: "og:title", content: "Farm Approval | Namma Connect" },
      { property: "og:description", content: "Review farm listings before they go live." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(AdminFarmApproval, ["admin"]),
});
