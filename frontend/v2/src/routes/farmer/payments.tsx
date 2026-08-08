import { createFileRoute } from "@tanstack/react-router";
import { FarmerPayments } from "@/dashboard/farmers/pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/farmer/payments")({
  head: () => ({
    meta: [
      { title: "Payments | Namma Connect" },
      { name: "description", content: "Payouts, invoices and settlement history." },
      { property: "og:title", content: "Payments | Namma Connect" },
      { property: "og:description", content: "Payouts, invoices and settlement history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(FarmerPayments, ["farmer"]),
});
