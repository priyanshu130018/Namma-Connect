import { createFileRoute } from "@tanstack/react-router";
import CreatorCard from "@/dashboard/creators/CreatorCard";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/creatorcard/$slug")({
  head: () => ({
    meta: [
      { title: "Creator Experience | Namma Connect" },
      { name: "description", content: "See details, pricing and availability for this local creator experience." },
      { property: "og:title", content: "Creator Experience | Namma Connect" },
      { property: "og:description", content: "See details, pricing and availability for this local creator experience." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(CreatorCard),
});
