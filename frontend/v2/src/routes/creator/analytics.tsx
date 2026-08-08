import { createFileRoute } from "@tanstack/react-router";
import { CreatorAnalytics } from "@/dashboard/creators/pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/creator/analytics")({
  head: () => ({
    meta: [
      { title: "Creator Analytics | Namma Connect" },
      { name: "description", content: "Audience growth and engagement insights." },
      { property: "og:title", content: "Creator Analytics | Namma Connect" },
      { property: "og:description", content: "Audience growth and engagement insights." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(CreatorAnalytics, ["creator"]),
});
