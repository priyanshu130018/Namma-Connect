import { createFileRoute } from "@tanstack/react-router";
import Services from "@/pages/services";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Services for Farmers & Creators | Namma Connect" },
      { name: "description", content: "List your farm or creative experience and reach travellers across the region." },
      { property: "og:title", content: "Services for Farmers & Creators | Namma Connect" },
      { property: "og:description", content: "List your farm or creative experience and reach travellers across the region." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(Services),
});
