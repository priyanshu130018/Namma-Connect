import { createFileRoute } from "@tanstack/react-router";
import Blog from "@/pages/blog";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Stories from the Farm | Namma Connect Blog" },
      { name: "description", content: "Guides, stories and tips on rural travel, farming and local culture." },
      { property: "og:title", content: "Stories from the Farm | Namma Connect Blog" },
      { property: "og:description", content: "Guides, stories and tips on rural travel, farming and local culture." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(Blog),
});
