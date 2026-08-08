import { createFileRoute } from "@tanstack/react-router";
import { TouristSavedRoutes } from "@/dashboard/extra-pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/tourist/saved-routes")({
  head: () => ({
    meta: [
      { title: "Saved Routes | Namma Connect" },
      { name: "description", content: "Multi-stop farm trips you saved." },
      { property: "og:title", content: "Saved Routes | Namma Connect" },
      { property: "og:description", content: "Multi-stop farm trips you saved." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(TouristSavedRoutes, ["tourist"]),
});
