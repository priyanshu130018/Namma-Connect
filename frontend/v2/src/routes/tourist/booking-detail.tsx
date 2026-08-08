import { createFileRoute } from "@tanstack/react-router";
import { TouristBookingDetail } from "@/dashboard/tourists/pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/tourist/booking-detail")({
  head: () => ({
    meta: [
      { title: "Booking Details | Namma Connect" },
      { name: "description", content: "Full details, itinerary and payment for your booking." },
      { property: "og:title", content: "Booking Details | Namma Connect" },
      { property: "og:description", content: "Full details, itinerary and payment for your booking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(TouristBookingDetail, ["tourist"]),
});
