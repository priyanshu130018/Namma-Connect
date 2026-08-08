import { createFileRoute } from "@tanstack/react-router";
import { FarmerWeather } from "@/dashboard/farmers/pages";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/farmer/weather")({
  head: () => ({
    meta: [
      { title: "Weather | Namma Connect" },
      { name: "description", content: "Forecasts and advisories for your farm location." },
      { property: "og:title", content: "Weather | Namma Connect" },
      { property: "og:description", content: "Forecasts and advisories for your farm location." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(FarmerWeather, ["farmer"]),
});
