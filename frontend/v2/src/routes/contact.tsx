import { createFileRoute } from "@tanstack/react-router";
import Contact from "@/pages/contact";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Namma Connect | Support & Help" },
      { name: "description", content: "Questions about bookings, listings or partnerships? Reach the Namma Connect team." },
      { property: "og:title", content: "Contact Namma Connect | Support & Help" },
      { property: "og:description", content: "Questions about bookings, listings or partnerships? Reach the Namma Connect team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(Contact),
});
