import { createFileRoute } from "@tanstack/react-router";
import { TouristPayments } from "@/dashboard/tourists/pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/tourist/payments")({
  head: () => ({
    meta: [
      { title: "Payments | Namma Connect" },
      { name: "description", content: "Review your invoices, refunds and payment methods." },
      { property: "og:title", content: "Payments | Namma Connect" },
      { property: "og:description", content: "Review your invoices, refunds and payment methods." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(TouristPayments, ["tourist"]),
});
