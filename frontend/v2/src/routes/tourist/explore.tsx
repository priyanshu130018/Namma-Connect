import { createFileRoute } from "@tanstack/react-router";
import { ExploreFarms } from "@/dashboard/tourists/pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/tourist/explore")({
  head: () => ({
    meta: [
      { title: "Explore Farms | Namma Connect" },
      { name: "description", content: "Browse curated farm stays across India." },
      { property: "og:title", content: "Explore Farms | Namma Connect" },
      { property: "og:description", content: "Browse curated farm stays across India." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(ExploreFarms, ["tourist"]),
});
