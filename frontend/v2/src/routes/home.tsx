import { createFileRoute } from "@tanstack/react-router";
import Home from "@/pages/home";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Explore Farm Stays & Experiences | Namma Connect" },
      { name: "description", content: "Discover curated farm stays, local guides and cultural experiences near you." },
      { property: "og:title", content: "Explore Farm Stays & Experiences | Namma Connect" },
      { property: "og:description", content: "Discover curated farm stays, local guides and cultural experiences near you." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(Home, ["tourist", "farmer", "creator", "admin"]),
});
