import { createFileRoute } from "@tanstack/react-router";
import { CreatorSocial } from "@/dashboard/creators/pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/creator/social")({
  head: () => ({
    meta: [
      { title: "Social Integrations | Namma Connect" },
      { name: "description", content: "Connect Instagram, YouTube and more." },
      { property: "og:title", content: "Social Integrations | Namma Connect" },
      { property: "og:description", content: "Connect Instagram, YouTube and more." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(CreatorSocial, ["creator"]),
});
