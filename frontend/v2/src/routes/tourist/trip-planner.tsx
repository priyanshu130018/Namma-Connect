import { createFileRoute } from "@tanstack/react-router";
import { TouristTripPlanner } from "@/dashboard/tourists/pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/tourist/trip-planner")({
  head: () => ({
    meta: [
      { title: "AI Trip Planner | Namma Connect" },
      { name: "description", content: "Plan your rural getaway with an AI itinerary builder." },
      { property: "og:title", content: "AI Trip Planner | Namma Connect" },
      { property: "og:description", content: "Plan your rural getaway with an AI itinerary builder." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(TouristTripPlanner, ["tourist"]),
});
