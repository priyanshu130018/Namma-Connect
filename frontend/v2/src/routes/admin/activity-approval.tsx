import { createFileRoute } from "@tanstack/react-router";
import { AdminActivityApproval } from "@/dashboard/extra-pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/admin/activity-approval")({
  head: () => ({
    meta: [
      { title: "Activity Approval | Namma Connect" },
      { name: "description", content: "Moderate submitted activities." },
      { property: "og:title", content: "Activity Approval | Namma Connect" },
      { property: "og:description", content: "Moderate submitted activities." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(AdminActivityApproval, ["admin"]),
});
