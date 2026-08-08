import { createFileRoute } from "@tanstack/react-router";
import { TouristHelp } from "@/dashboard/extra-pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/tourist/help")({
  head: () => ({
    meta: [
      { title: "Help Centre | Namma Connect" },
      { name: "description", content: "Guides and support for your bookings." },
      { property: "og:title", content: "Help Centre | Namma Connect" },
      { property: "og:description", content: "Guides and support for your bookings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(TouristHelp, ["tourist"]),
});
