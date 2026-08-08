import { createFileRoute } from "@tanstack/react-router";
import { CreatorBookingsBoard } from "@/dashboard/creators/pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/creator/board")({
  head: () => ({
    meta: [
      { title: "Creator Bookings | Namma Connect" },
      { name: "description", content: "Clients who booked your creative services." },
      { property: "og:title", content: "Creator Bookings | Namma Connect" },
      { property: "og:description", content: "Clients who booked your creative services." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(CreatorBookingsBoard, ["creator"]),
});
