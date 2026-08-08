import { createFileRoute } from "@tanstack/react-router";
import { CreatorMessages } from "@/dashboard/extra-pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/creator/messages")({
  head: () => ({
    meta: [
      { title: "Messages | Namma Connect" },
      { name: "description", content: "Chat with farms and brands." },
      { property: "og:title", content: "Messages | Namma Connect" },
      { property: "og:description", content: "Chat with farms and brands." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(CreatorMessages, ["creator"]),
});
