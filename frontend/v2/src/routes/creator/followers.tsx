import { createFileRoute } from "@tanstack/react-router";
import { CreatorFollowers } from "@/dashboard/creators/pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/creator/followers")({
  head: () => ({
    meta: [
      { title: "Followers | Namma Connect" },
      { name: "description", content: "People following your work on Namma Connect." },
      { property: "og:title", content: "Followers | Namma Connect" },
      { property: "og:description", content: "People following your work on Namma Connect." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(CreatorFollowers, ["creator"]),
});
