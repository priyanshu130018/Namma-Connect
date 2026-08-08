import { createFileRoute } from "@tanstack/react-router";
import { FarmerReports } from "@/dashboard/extra-pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/farmer/reports")({
  head: () => ({
    meta: [
      { title: "Reports | Namma Connect" },
      { name: "description", content: "Performance reports for your farm." },
      { property: "og:title", content: "Reports | Namma Connect" },
      { property: "og:description", content: "Performance reports for your farm." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(FarmerReports, ["farmer"]),
});
