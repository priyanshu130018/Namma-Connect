import { createFileRoute } from "@tanstack/react-router";
import { FarmerHelp } from "@/dashboard/extra-pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/farmer/help")({
  head: () => ({
    meta: [
      { title: "Help Centre | Namma Connect" },
      { name: "description", content: "Support for farm hosts." },
      { property: "og:title", content: "Help Centre | Namma Connect" },
      { property: "og:description", content: "Support for farm hosts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(FarmerHelp, ["farmer"]),
});
