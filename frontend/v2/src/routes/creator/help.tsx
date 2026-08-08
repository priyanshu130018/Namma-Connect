import { createFileRoute } from "@tanstack/react-router";
import { CreatorHelp } from "@/dashboard/extra-pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/creator/help")({
  head: () => ({
    meta: [
      { title: "Help Centre | Namma Connect" },
      { name: "description", content: "Support for creators." },
      { property: "og:title", content: "Help Centre | Namma Connect" },
      { property: "og:description", content: "Support for creators." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(CreatorHelp, ["creator"]),
});
