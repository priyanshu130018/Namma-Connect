import { createFileRoute } from "@tanstack/react-router";
import { FarmerHistory } from "@/dashboard/extra-pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/farmer/history")({
  head: () => ({
    meta: [
      { title: "History | Namma Connect" },
      { name: "description", content: "Past bookings and hosted stays." },
      { property: "og:title", content: "History | Namma Connect" },
      { property: "og:description", content: "Past bookings and hosted stays." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(FarmerHistory, ["farmer"]),
});
