import { createFileRoute } from "@tanstack/react-router";
import TouristBookings from "@/dashboard/tourists/TouristBookings";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/tourist/bookings")({
  head: () => ({
    meta: [
      { title: "Your Bookings | Namma Connect" },
      { name: "description", content: "Track upcoming and past farm stay and experience bookings." },
      { property: "og:title", content: "Your Bookings | Namma Connect" },
      { property: "og:description", content: "Track upcoming and past farm stay and experience bookings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(TouristBookings, ["tourist"]),
});
