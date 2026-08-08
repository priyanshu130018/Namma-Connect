import { createFileRoute } from "@tanstack/react-router";
import { CreatorCollaborations } from "@/dashboard/creators/pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/creator/collaborations")({
  head: () => ({
    meta: [
      { title: "Collaborations | Namma Connect" },
      { name: "description", content: "Brand and farm partnerships in progress." },
      { property: "og:title", content: "Collaborations | Namma Connect" },
      { property: "og:description", content: "Brand and farm partnerships in progress." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(CreatorCollaborations, ["creator"]),
});
