import { createFileRoute } from "@tanstack/react-router";
import FarmerHome from "@/dashboard/farmers/FarmerHome";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/farmer/home")({
  head: () => ({
    meta: [
      { title: "Farmer Dashboard | Namma Connect" },
      { name: "description", content: "Track bookings, listings and earnings for your farm." },
      { property: "og:title", content: "Farmer Dashboard | Namma Connect" },
      { property: "og:description", content: "Track bookings, listings and earnings for your farm." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(FarmerHome, ["farmer"]),
});
