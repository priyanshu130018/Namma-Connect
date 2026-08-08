import { createFileRoute } from "@tanstack/react-router";
import { AdminVerifiedUsers } from "@/dashboard/extra-pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/admin/verified-users")({
  head: () => ({
    meta: [
      { title: "Verified Users | Namma Connect" },
      { name: "description", content: "Accounts that cleared verification." },
      { property: "og:title", content: "Verified Users | Namma Connect" },
      { property: "og:description", content: "Accounts that cleared verification." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(AdminVerifiedUsers, ["admin"]),
});
