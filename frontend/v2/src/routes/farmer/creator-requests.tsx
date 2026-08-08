import { createFileRoute } from "@tanstack/react-router";
import { FarmerCreatorRequests } from "@/dashboard/extra-pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/farmer/creator-requests")({
  head: () => ({
    meta: [
      { title: "Creator Requests | Namma Connect" },
      { name: "description", content: "Creators asking to shoot at your farm." },
      { property: "og:title", content: "Creator Requests | Namma Connect" },
      { property: "og:description", content: "Creators asking to shoot at your farm." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(FarmerCreatorRequests, ["farmer"]),
});
