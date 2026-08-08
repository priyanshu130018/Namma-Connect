import { createFileRoute } from "@tanstack/react-router";
import TouristProfile from "@/dashboard/tourists/TouristProfile";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/tourist/profile")({
  head: () => ({
    meta: [
      { title: "Your Profile | Namma Connect" },
      { name: "description", content: "Manage your traveller profile and preferences." },
      { property: "og:title", content: "Your Profile | Namma Connect" },
      { property: "og:description", content: "Manage your traveller profile and preferences." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(TouristProfile, ["tourist"]),
});
