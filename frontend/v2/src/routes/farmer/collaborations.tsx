import { createFileRoute } from "@tanstack/react-router";
import { FarmerCollaborations } from "@/dashboard/farmers/pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/farmer/collaborations")({
  head: () => ({
    meta: [
      { title: "Collaborations | Namma Connect" },
      { name: "description", content: "Work with creators to promote your farm." },
      { property: "og:title", content: "Collaborations | Namma Connect" },
      { property: "og:description", content: "Work with creators to promote your farm." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(FarmerCollaborations, ["farmer"]),
});
