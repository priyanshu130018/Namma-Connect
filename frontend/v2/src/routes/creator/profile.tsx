import { createFileRoute } from "@tanstack/react-router";
import CreatorProfile from "@/dashboard/creators/CreatorProfile";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/creator/profile")({
  head: () => ({
    meta: [
      { title: "Creator Profile | Namma Connect" },
      { name: "description", content: "Manage your creator profile, skills and showcase." },
      { property: "og:title", content: "Creator Profile | Namma Connect" },
      { property: "og:description", content: "Manage your creator profile, skills and showcase." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(CreatorProfile, ["creator"]),
});
