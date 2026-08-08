import { createFileRoute } from "@tanstack/react-router";
import FarmerListingForm from "@/dashboard/farmers/FarmerListingForm";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/farmer/listing/$id")({
  head: () => ({
    meta: [
      { title: "Edit Farm Listing | Namma Connect" },
      { name: "description", content: "Update the details of your farm stay listing." },
      { property: "og:title", content: "Edit Farm Listing | Namma Connect" },
      { property: "og:description", content: "Update the details of your farm stay listing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(FarmerListingForm, ["farmer"]),
});
