import { createFileRoute } from "@tanstack/react-router";
import ChangePassword from "@/auth/changePassword";
import { clientPage } from "@/lib/route-page";

export const Route = createFileRoute("/auth/change-password")({
  head: () => ({
    meta: [
      { title: "Reset Password | Namma Connect" },
      { name: "description", content: "Verify your account and set a new Namma Connect password." },
      { property: "og:title", content: "Reset Password | Namma Connect" },
      { property: "og:description", content: "Verify your account and set a new Namma Connect password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: clientPage(ChangePassword),
});
