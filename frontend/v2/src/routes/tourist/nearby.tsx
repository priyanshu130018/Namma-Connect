import { createFileRoute } from "@tanstack/react-router";
import { TouristNearby } from "@/dashboard/tourists/pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/tourist/nearby")({
  head: () => ({
    meta: [
      { title: "Nearby Farms | Namma Connect" },
      { name: "description", content: "Find farm stays and activities close to you." },
      { property: "og:title", content: "Nearby Farms | Namma Connect" },
      { property: "og:description", content: "Find farm stays and activities close to you." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(TouristNearby, ["tourist"]),
});
