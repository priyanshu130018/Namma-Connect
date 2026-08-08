import { createFileRoute } from "@tanstack/react-router";
import { FarmerActivities } from "@/dashboard/extra-pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/farmer/activities")({
  head: () => ({
    meta: [
      { title: "Farm Activities | Namma Connect" },
      { name: "description", content: "Manage the activities guests can book." },
      { property: "og:title", content: "Farm Activities | Namma Connect" },
      { property: "og:description", content: "Manage the activities guests can book." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(FarmerActivities, ["farmer"]),
});
