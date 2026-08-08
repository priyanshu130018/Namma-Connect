import { createFileRoute } from "@tanstack/react-router";
import { BlogPost } from "@/pages/blog";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/blog/$id")({
  head: () => ({
    meta: [
      { title: "Blog Post | Namma Connect" },
      { name: "description", content: "Read this story from the Namma Connect rural travel community." },
      { property: "og:title", content: "Blog Post | Namma Connect" },
      { property: "og:description", content: "Read this story from the Namma Connect rural travel community." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(BlogPost),
});
