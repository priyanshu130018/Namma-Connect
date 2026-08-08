import { createFileRoute } from "@tanstack/react-router";
import { TouristReviews } from "@/dashboard/tourists/pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/tourist/reviews")({
  head: () => ({
    meta: [
      { title: "My Reviews | Namma Connect" },
      { name: "description", content: "Reviews you left for farms, hosts and creators." },
      { property: "og:title", content: "My Reviews | Namma Connect" },
      { property: "og:description", content: "Reviews you left for farms, hosts and creators." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(TouristReviews, ["tourist"]),
});
