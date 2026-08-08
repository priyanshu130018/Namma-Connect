import { createFileRoute } from "@tanstack/react-router";
import CreatorRegister from "@/dashboard/creators/CreatorRegister";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/services/creator/register")({
  head: () => ({
    meta: [
      { title: "Register as a Creator | Namma Connect" },
      { name: "description", content: "Offer your local experience to travellers on Namma Connect." },
      { property: "og:title", content: "Register as a Creator | Namma Connect" },
      { property: "og:description", content: "Offer your local experience to travellers on Namma Connect." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(CreatorRegister, ["tourist", "creator"]),
});
