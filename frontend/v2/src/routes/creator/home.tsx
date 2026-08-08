import { createFileRoute } from "@tanstack/react-router";
import CreatorHome from "@/dashboard/creators/CreatorHome";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/creator/home")({
  head: () => ({
    meta: [
      { title: "Creator Dashboard | Namma Connect" },
      { name: "description", content: "Track bookings, experiences and earnings as a local creator." },
      { property: "og:title", content: "Creator Dashboard | Namma Connect" },
      { property: "og:description", content: "Track bookings, experiences and earnings as a local creator." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(CreatorHome, ["creator"]),
});
