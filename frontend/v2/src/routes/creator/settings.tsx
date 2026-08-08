import { createFileRoute } from "@tanstack/react-router";
import CreatorSetting from "@/dashboard/creators/CreatorSetting";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/creator/settings")({
  head: () => ({
    meta: [
      { title: "Creator Settings | Namma Connect" },
      { name: "description", content: "Update your account, security and payout settings." },
      { property: "og:title", content: "Creator Settings | Namma Connect" },
      { property: "og:description", content: "Update your account, security and payout settings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(CreatorSetting, ["creator"]),
});
