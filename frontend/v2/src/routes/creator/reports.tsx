import { createFileRoute } from "@tanstack/react-router";
import { CreatorReports } from "@/dashboard/creators/pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/creator/reports")({
  head: () => ({
    meta: [
      { title: "Reports | Namma Connect" },
      { name: "description", content: "Content and revenue reports." },
      { property: "og:title", content: "Reports | Namma Connect" },
      { property: "og:description", content: "Content and revenue reports." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(CreatorReports, ["creator"]),
});
