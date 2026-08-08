import { createFileRoute } from "@tanstack/react-router";
import { AdminReports } from "@/dashboard/admin/pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Fraud | Namma Connect" },
      { name: "description", content: "Automated risk signals across the platform." },
      { property: "og:title", content: "Reports & Fraud | Namma Connect" },
      { property: "og:description", content: "Automated risk signals across the platform." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(AdminReports, ["admin"]),
});
