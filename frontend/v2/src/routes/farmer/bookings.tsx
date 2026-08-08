import { createFileRoute } from "@tanstack/react-router";
import FarmerBookings from "@/dashboard/farmers/FarmerBookings";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/farmer/bookings")({
  head: () => ({
    meta: [
      { title: "Farm Bookings | Namma Connect" },
      { name: "description", content: "Review and manage guest bookings for your farm stays." },
      { property: "og:title", content: "Farm Bookings | Namma Connect" },
      { property: "og:description", content: "Review and manage guest bookings for your farm stays." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(FarmerBookings, ["farmer"]),
});
