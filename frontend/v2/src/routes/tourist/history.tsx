import { createFileRoute } from "@tanstack/react-router";
import { TouristHistory } from "@/dashboard/extra-pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/tourist/history")({
  head: () => ({
    meta: [
      { title: "Tour History | Namma Connect" },
      { name: "description", content: "Every trip you have taken on Namma Connect." },
      { property: "og:title", content: "Tour History | Namma Connect" },
      { property: "og:description", content: "Every trip you have taken on Namma Connect." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(TouristHistory, ["tourist"]),
});
