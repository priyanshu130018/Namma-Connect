import { createFileRoute } from "@tanstack/react-router";
import { TouristWishlist } from "@/dashboard/tourists/pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/tourist/wishlist")({
  head: () => ({
    meta: [
      { title: "Wishlist | Namma Connect" },
      { name: "description", content: "Farms and experiences you saved for later." },
      { property: "og:title", content: "Wishlist | Namma Connect" },
      { property: "og:description", content: "Farms and experiences you saved for later." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(TouristWishlist, ["tourist"]),
});
