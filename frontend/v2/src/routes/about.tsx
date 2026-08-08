import { createFileRoute } from "@tanstack/react-router";
import About from "@/pages/about";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Namma Connect | Rural Travel Marketplace" },
      { name: "description", content: "Learn how Namma Connect connects travellers with farmers and local creators." },
      { property: "og:title", content: "About Namma Connect | Rural Travel Marketplace" },
      { property: "og:description", content: "Learn how Namma Connect connects travellers with farmers and local creators." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(About),
});
