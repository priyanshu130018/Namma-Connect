import { createFileRoute } from "@tanstack/react-router";
import FarmerListings from "@/dashboard/farmers/FarmerListings";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/farmer/listings")({
  head: () => ({
    meta: [
      { title: "Farm Listings | Namma Connect" },
      { name: "description", content: "Create and edit the farm stays you offer to travellers." },
      { property: "og:title", content: "Farm Listings | Namma Connect" },
      { property: "og:description", content: "Create and edit the farm stays you offer to travellers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(FarmerListings, ["farmer"]),
});
