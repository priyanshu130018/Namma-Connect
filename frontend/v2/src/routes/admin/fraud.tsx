import { createFileRoute } from "@tanstack/react-router";
import { AdminFraudDetection } from "@/dashboard/extra-pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/admin/fraud")({
  head: () => ({
    meta: [
      { title: "Fraud Detection | Namma Connect" },
      { name: "description", content: "Risk signals from the automated monitor." },
      { property: "og:title", content: "Fraud Detection | Namma Connect" },
      { property: "og:description", content: "Risk signals from the automated monitor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(AdminFraudDetection, ["admin"]),
});
