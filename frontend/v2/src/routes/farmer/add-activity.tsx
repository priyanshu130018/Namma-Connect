import { createFileRoute } from "@tanstack/react-router";
import { FarmerAddActivity } from "@/dashboard/extra-pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/farmer/add-activity")({
  head: () => ({
    meta: [
      { title: "Add Activity | Namma Connect" },
      { name: "description", content: "Publish a new on-farm activity." },
      { property: "og:title", content: "Add Activity | Namma Connect" },
      { property: "og:description", content: "Publish a new on-farm activity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(FarmerAddActivity, ["farmer"]),
});
