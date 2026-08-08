import { createFileRoute } from "@tanstack/react-router";
import { TouristChecklist } from "@/dashboard/tourists/pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/tourist/checklist")({
  head: () => ({
    meta: [
      { title: "Trip Checklist | Namma Connect" },
      { name: "description", content: "Stay organised before every farm trip." },
      { property: "og:title", content: "Trip Checklist | Namma Connect" },
      { property: "og:description", content: "Stay organised before every farm trip." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(TouristChecklist, ["tourist"]),
});
