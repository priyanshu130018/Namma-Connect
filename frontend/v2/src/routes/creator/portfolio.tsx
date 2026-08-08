import { createFileRoute } from "@tanstack/react-router";
import { CreatorPortfolio } from "@/dashboard/creators/pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/creator/portfolio")({
  head: () => ({
    meta: [
      { title: "Portfolio | Namma Connect" },
      { name: "description", content: "Showcase your reels, photo sets and films." },
      { property: "og:title", content: "Portfolio | Namma Connect" },
      { property: "og:description", content: "Showcase your reels, photo sets and films." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(CreatorPortfolio, ["creator"]),
});
