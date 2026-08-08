import { createFileRoute } from "@tanstack/react-router";
import TouristSetting from "@/dashboard/tourists/TouristSetting";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/tourist/settings")({
  head: () => ({
    meta: [
      { title: "Account Settings | Namma Connect" },
      { name: "description", content: "Update your account, security and notification settings." },
      { property: "og:title", content: "Account Settings | Namma Connect" },
      { property: "og:description", content: "Update your account, security and notification settings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(TouristSetting, ["tourist"]),
});
