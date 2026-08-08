import { createFileRoute } from "@tanstack/react-router";
import { CreatorRevenue } from "@/dashboard/creators/pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/creator/revenue")({
  head: () => ({
    meta: [
      { title: "Creator Revenue | Namma Connect" },
      { name: "description", content: "Earnings from collaborations and bookings." },
      { property: "og:title", content: "Creator Revenue | Namma Connect" },
      { property: "og:description", content: "Earnings from collaborations and bookings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(CreatorRevenue, ["creator"]),
});
