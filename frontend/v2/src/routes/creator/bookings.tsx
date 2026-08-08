import { createFileRoute } from "@tanstack/react-router";
import CreatorBookings from "@/dashboard/creators/CreatorBookings";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/creator/bookings")({
  head: () => ({
    meta: [
      { title: "Creator Bookings | Namma Connect" },
      { name: "description", content: "Review and manage bookings for your experiences." },
      { property: "og:title", content: "Creator Bookings | Namma Connect" },
      { property: "og:description", content: "Review and manage bookings for your experiences." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(CreatorBookings, ["creator"]),
});
