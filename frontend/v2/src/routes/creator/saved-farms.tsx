import { createFileRoute } from "@tanstack/react-router";
import { CreatorSavedFarms } from "@/dashboard/creators/pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/creator/saved-farms")({
  head: () => ({
    meta: [
      { title: "Saved Farms | Namma Connect" },
      { name: "description", content: "Locations you're planning to shoot at." },
      { property: "og:title", content: "Saved Farms | Namma Connect" },
      { property: "og:description", content: "Locations you're planning to shoot at." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(CreatorSavedFarms, ["creator"]),
});
