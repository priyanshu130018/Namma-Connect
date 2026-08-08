import { createFileRoute } from "@tanstack/react-router";
import { clientPage } from "@/lib/route-page";
import SearchPage from "@/pages/SearchPage";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search farms, experiences & activities — Namma Connect" },
      {
        name: "description",
        content:
          "Search farm stays, local experiences and activities across South India. Filter by location, category and price on Namma Connect.",
      },
      { property: "og:title", content: "Search farms, experiences & activities — Namma Connect" },
      {
        property: "og:description",
        content:
          "Search farm stays, local experiences and activities across South India. Filter by location, category and price on Namma Connect.",
      },
    ],
  }),
  component: clientPage(SearchPage),
});
