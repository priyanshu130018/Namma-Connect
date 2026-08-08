import { createFileRoute } from "@tanstack/react-router";
import FarmerSetting from "@/dashboard/farmers/FarmerSetting";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/farmer/settings")({
  head: () => ({
    meta: [
      { title: "Farmer Settings | Namma Connect" },
      { name: "description", content: "Update your account, security and payout settings." },
      { property: "og:title", content: "Farmer Settings | Namma Connect" },
      { property: "og:description", content: "Update your account, security and payout settings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(FarmerSetting, ["farmer"]),
});
