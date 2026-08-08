import { createFileRoute } from "@tanstack/react-router";
import Landing from "@/pages/landing";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Namma Connect — Agri-Tourism & Local Experiences" },
      { name: "description", content: "Book authentic farm stays, local creators and rural experiences on Namma Connect." },
      { property: "og:title", content: "Namma Connect — Agri-Tourism & Local Experiences" },
      { property: "og:description", content: "Book authentic farm stays, local creators and rural experiences on Namma Connect." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(Landing),
});
