import { createFileRoute } from "@tanstack/react-router";
import FarmerProfile from "@/dashboard/farmers/FarmerProfile";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/farmer/profile")({
  head: () => ({
    meta: [
      { title: "Farmer Profile | Namma Connect" },
      { name: "description", content: "Manage your farm host profile and contact details." },
      { property: "og:title", content: "Farmer Profile | Namma Connect" },
      { property: "og:description", content: "Manage your farm host profile and contact details." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(FarmerProfile, ["farmer"]),
});
