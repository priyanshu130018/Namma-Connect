import { createFileRoute } from "@tanstack/react-router";
import { AdminApprovals } from "@/dashboard/admin/pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/admin/approvals")({
  head: () => ({
    meta: [
      { title: "Approvals | Namma Connect" },
      { name: "description", content: "Moderate new farm and activity listings." },
      { property: "og:title", content: "Approvals | Namma Connect" },
      { property: "og:description", content: "Moderate new farm and activity listings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(AdminApprovals, ["admin"]),
});
