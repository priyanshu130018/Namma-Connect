import { createFileRoute } from "@tanstack/react-router";
import { CreatorNotifications } from "@/dashboard/extra-pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/creator/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications | Namma Connect" },
      { name: "description", content: "Collab and payout alerts." },
      { property: "og:title", content: "Notifications | Namma Connect" },
      { property: "og:description", content: "Collab and payout alerts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(CreatorNotifications, ["creator"]),
});
