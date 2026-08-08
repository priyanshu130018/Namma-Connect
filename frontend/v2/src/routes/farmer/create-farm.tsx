import { createFileRoute } from "@tanstack/react-router";
import { FarmerCreateFarm } from "@/dashboard/farmers/pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/farmer/create-farm")({
  head: () => ({
    meta: [
      { title: "Create Farm Listing | Namma Connect" },
      { name: "description", content: "Publish a new farm stay in a few guided steps." },
      { property: "og:title", content: "Create Farm Listing | Namma Connect" },
      { property: "og:description", content: "Publish a new farm stay in a few guided steps." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(FarmerCreateFarm, ["farmer"]),
});
