import { createFileRoute } from "@tanstack/react-router";
import { CreatorBrandDeals } from "@/dashboard/extra-pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/creator/brand-deals")({
  head: () => ({
    meta: [
      { title: "Brand Deals | Namma Connect" },
      { name: "description", content: "Sponsored campaigns and pipeline." },
      { property: "og:title", content: "Brand Deals | Namma Connect" },
      { property: "og:description", content: "Sponsored campaigns and pipeline." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(CreatorBrandDeals, ["creator"]),
});
