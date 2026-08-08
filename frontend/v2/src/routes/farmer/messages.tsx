import { createFileRoute } from "@tanstack/react-router";
import { FarmerMessages } from "@/dashboard/extra-pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/farmer/messages")({
  head: () => ({
    meta: [
      { title: "Messages | Namma Connect" },
      { name: "description", content: "Chat with guests and creators." },
      { property: "og:title", content: "Messages | Namma Connect" },
      { property: "og:description", content: "Chat with guests and creators." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(FarmerMessages, ["farmer"]),
});
