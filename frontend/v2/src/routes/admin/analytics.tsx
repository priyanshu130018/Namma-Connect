import { createFileRoute } from "@tanstack/react-router";
import { AdminAnalytics } from "@/dashboard/admin/pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Platform Analytics | Namma Connect" },
      { name: "description", content: "Growth, bookings and marketplace volume." },
      { property: "og:title", content: "Platform Analytics | Namma Connect" },
      { property: "og:description", content: "Growth, bookings and marketplace volume." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(AdminAnalytics, ["admin"]),
});
