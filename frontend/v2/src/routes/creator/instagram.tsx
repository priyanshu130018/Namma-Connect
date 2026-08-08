import { createFileRoute } from "@tanstack/react-router";
import { CreatorInstagram } from "@/dashboard/extra-pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/creator/instagram")({
  head: () => ({
    meta: [
      { title: "Instagram | Namma Connect" },
      { name: "description", content: "Instagram reach and top posts." },
      { property: "og:title", content: "Instagram | Namma Connect" },
      { property: "og:description", content: "Instagram reach and top posts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(CreatorInstagram, ["creator"]),
});
