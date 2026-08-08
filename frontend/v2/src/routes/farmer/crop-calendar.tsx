import { createFileRoute } from "@tanstack/react-router";
import { FarmerCropCalendar } from "@/dashboard/farmers/pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/farmer/crop-calendar")({
  head: () => ({
    meta: [
      { title: "Crop Calendar | Namma Connect" },
      { name: "description", content: "Track sowing, harvest and visitor seasons." },
      { property: "og:title", content: "Crop Calendar | Namma Connect" },
      { property: "og:description", content: "Track sowing, harvest and visitor seasons." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(FarmerCropCalendar, ["farmer"]),
});
