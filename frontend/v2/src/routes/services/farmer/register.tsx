import { createFileRoute } from "@tanstack/react-router";
import FarmerRegister from "@/dashboard/farmers/FarmerRegister";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/services/farmer/register")({
  head: () => ({
    meta: [
      { title: "Register as a Farmer | Namma Connect" },
      { name: "description", content: "List your farm on Namma Connect and start hosting travellers." },
      { property: "og:title", content: "Register as a Farmer | Namma Connect" },
      { property: "og:description", content: "List your farm on Namma Connect and start hosting travellers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(FarmerRegister, ["tourist", "farmer"]),
});
