import { createFileRoute } from "@tanstack/react-router";
import { TouristActivities } from "@/dashboard/extra-pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/tourist/activities")({
  head: () => ({
    meta: [
      { title: "Activities | Namma Connect" },
      { name: "description", content: "Browse bookable farm activities near you." },
      { property: "og:title", content: "Activities | Namma Connect" },
      { property: "og:description", content: "Browse bookable farm activities near you." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(TouristActivities, ["tourist"]),
});
