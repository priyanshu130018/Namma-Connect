import { createFileRoute } from "@tanstack/react-router";
import AIChatbot from "@/pages/AIChatbot";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/AI-trip-planner")({
  head: () => ({
    meta: [
      { title: "AI Trip Planner | Namma Connect" },
      { name: "description", content: "Plan your rural getaway with the Namma Connect AI trip planner." },
      { property: "og:title", content: "AI Trip Planner | Namma Connect" },
      { property: "og:description", content: "Plan your rural getaway with the Namma Connect AI trip planner." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(AIChatbot),
});
