import { createFileRoute } from "@tanstack/react-router";
import { FarmerRequests } from "@/dashboard/farmers/pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/farmer/requests")({
  head: () => ({
    meta: [
      { title: "Booking Requests | Namma Connect" },
      { name: "description", content: "Approve or decline incoming guest requests." },
      { property: "og:title", content: "Booking Requests | Namma Connect" },
      { property: "og:description", content: "Approve or decline incoming guest requests." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(FarmerRequests, ["farmer"]),
});
