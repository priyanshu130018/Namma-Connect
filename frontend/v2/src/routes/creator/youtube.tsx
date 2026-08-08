import { createFileRoute } from "@tanstack/react-router";
import { CreatorYoutube } from "@/dashboard/extra-pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/creator/youtube")({
  head: () => ({
    meta: [
      { title: "YouTube | Namma Connect" },
      { name: "description", content: "Channel growth and top videos." },
      { property: "og:title", content: "YouTube | Namma Connect" },
      { property: "og:description", content: "Channel growth and top videos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(CreatorYoutube, ["creator"]),
});
