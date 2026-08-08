import { createFileRoute } from "@tanstack/react-router";
import { FarmerRevenue } from "@/dashboard/farmers/pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/farmer/revenue")({
  head: () => ({
    meta: [
      { title: "Revenue | Namma Connect" },
      { name: "description", content: "Track earnings from stays and experiences." },
      { property: "og:title", content: "Revenue | Namma Connect" },
      { property: "og:description", content: "Track earnings from stays and experiences." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(FarmerRevenue, ["farmer"]),
});
