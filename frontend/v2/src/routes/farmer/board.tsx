import { createFileRoute } from "@tanstack/react-router";
import { FarmerListingsBoard } from "@/dashboard/farmers/pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/farmer/board")({
  head: () => ({
    meta: [
      { title: "Listings Board | Namma Connect" },
      { name: "description", content: "All your farm listings at a glance." },
      { property: "og:title", content: "Listings Board | Namma Connect" },
      { property: "og:description", content: "All your farm listings at a glance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(FarmerListingsBoard, ["farmer"]),
});
