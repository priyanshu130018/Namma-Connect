import { createFileRoute } from "@tanstack/react-router";
import FarmerCard from "@/dashboard/farmers/FarmerCard";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/farmercard/$slug")({
  head: () => ({
    meta: [
      { title: "Farm Stay Details | Namma Connect" },
      { name: "description", content: "See photos, amenities, pricing and availability for this farm stay." },
      { property: "og:title", content: "Farm Stay Details | Namma Connect" },
      { property: "og:description", content: "See photos, amenities, pricing and availability for this farm stay." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(FarmerCard),
});
