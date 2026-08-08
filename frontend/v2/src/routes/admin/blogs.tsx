import { createFileRoute } from "@tanstack/react-router";
import { AdminBlogs } from "@/dashboard/admin/pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/admin/blogs")({
  head: () => ({
    meta: [
      { title: "Blogs | Namma Connect" },
      { name: "description", content: "Create and manage editorial content." },
      { property: "og:title", content: "Blogs | Namma Connect" },
      { property: "og:description", content: "Create and manage editorial content." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(AdminBlogs, ["admin"]),
});
