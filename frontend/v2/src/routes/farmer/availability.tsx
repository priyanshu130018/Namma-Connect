import { createFileRoute } from "@tanstack/react-router";
import { FarmerAvailability } from "@/dashboard/farmers/pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/farmer/availability")({
  head: () => ({
    meta: [
      { title: "Availability | Namma Connect" },
      { name: "description", content: "Manage open dates and blackout days." },
      { property: "og:title", content: "Availability | Namma Connect" },
      { property: "og:description", content: "Manage open dates and blackout days." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(FarmerAvailability, ["farmer"]),
});
