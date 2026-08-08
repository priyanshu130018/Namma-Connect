import { createFileRoute } from "@tanstack/react-router";
import TouristHome from "@/dashboard/tourists/TouristHome";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/tourist/home")({
  head: () => ({
    meta: [
      { title: "Tourist Dashboard | Namma Connect" },
      { name: "description", content: "Your saved trips, bookings and recommendations in one place." },
      { property: "og:title", content: "Tourist Dashboard | Namma Connect" },
      { property: "og:description", content: "Your saved trips, bookings and recommendations in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(TouristHome, ["tourist"]),
});
