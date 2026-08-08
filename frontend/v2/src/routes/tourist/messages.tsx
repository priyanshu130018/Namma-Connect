import { createFileRoute } from "@tanstack/react-router";
import { TouristMessages } from "@/dashboard/tourists/pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/tourist/messages")({
  head: () => ({
    meta: [
      { title: "Messages | Namma Connect" },
      { name: "description", content: "Chat with hosts and creators before you travel." },
      { property: "og:title", content: "Messages | Namma Connect" },
      { property: "og:description", content: "Chat with hosts and creators before you travel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(TouristMessages, ["tourist"]),
});
