import { createFileRoute } from "@tanstack/react-router";
import { TouristNotifications } from "@/dashboard/tourists/pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/tourist/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications | Namma Connect" },
      { name: "description", content: "Booking updates, offers and reminders." },
      { property: "og:title", content: "Notifications | Namma Connect" },
      { property: "og:description", content: "Booking updates, offers and reminders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(TouristNotifications, ["tourist"]),
});
