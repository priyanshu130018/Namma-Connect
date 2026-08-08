import { createFileRoute } from "@tanstack/react-router";
import { TouristExperiences } from "@/dashboard/tourists/pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/tourist/experiences")({
  head: () => ({
    meta: [
      { title: "Experiences | Namma Connect" },
      { name: "description", content: "Book hands-on rural experiences and workshops." },
      { property: "og:title", content: "Experiences | Namma Connect" },
      { property: "og:description", content: "Book hands-on rural experiences and workshops." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(TouristExperiences, ["tourist"]),
});
