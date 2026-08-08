import { createFileRoute } from "@tanstack/react-router";
import { FarmerNotifications } from "@/dashboard/extra-pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/farmer/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications | Namma Connect" },
      { name: "description", content: "Alerts about bookings and payouts." },
      { property: "og:title", content: "Notifications | Namma Connect" },
      { property: "og:description", content: "Alerts about bookings and payouts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(FarmerNotifications, ["farmer"]),
});
