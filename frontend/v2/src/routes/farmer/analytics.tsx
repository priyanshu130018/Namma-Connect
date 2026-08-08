import { createFileRoute } from "@tanstack/react-router";
import { FarmerAnalytics } from "@/dashboard/farmers/pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/farmer/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics | Namma Connect" },
      { name: "description", content: "Occupancy, traffic and booking performance." },
      { property: "og:title", content: "Analytics | Namma Connect" },
      { property: "og:description", content: "Occupancy, traffic and booking performance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(FarmerAnalytics, ["farmer"]),
});
