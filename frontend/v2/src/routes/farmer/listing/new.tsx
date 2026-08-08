import { createFileRoute } from "@tanstack/react-router";
import FarmerListingForm from "@/dashboard/farmers/FarmerListingForm";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/farmer/listing/new")({
  head: () => ({
    meta: [
      { title: "New Farm Listing | Namma Connect" },
      { name: "description", content: "Add a new farm stay listing to Namma Connect." },
      { property: "og:title", content: "New Farm Listing | Namma Connect" },
      { property: "og:description", content: "Add a new farm stay listing to Namma Connect." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(FarmerListingForm, ["farmer"]),
});
