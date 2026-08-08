import { createFileRoute } from "@tanstack/react-router";
import { CreatorPayments } from "@/dashboard/extra-pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/creator/payments")({
  head: () => ({
    meta: [
      { title: "Payments | Namma Connect" },
      { name: "description", content: "Payouts and transaction history." },
      { property: "og:title", content: "Payments | Namma Connect" },
      { property: "og:description", content: "Payouts and transaction history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(CreatorPayments, ["creator"]),
});
