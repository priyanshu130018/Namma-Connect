import { createFileRoute } from "@tanstack/react-router";
import { FarmerCalendar } from "@/dashboard/extra-pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/farmer/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar | Namma Connect" },
      { name: "description", content: "Upcoming bookings and farm schedule." },
      { property: "og:title", content: "Calendar | Namma Connect" },
      { property: "og:description", content: "Upcoming bookings and farm schedule." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(FarmerCalendar, ["farmer"]),
});
