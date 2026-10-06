import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { App } from "@/app/App";

describe("App Routing & Public / Protected Shells", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders Public Home page at root path", () => {
    window.history.pushState({}, "Home", "/");
    render(<App />);
    expect(screen.getByRole("heading", { name: /Authentic Farm Tourism/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /How Namma Connect Works/i })).toBeInTheDocument();
  });

  it("redirects unauthenticated user accessing /app to /login", () => {
    window.history.pushState({}, "Customer App", "/app");
    render(<App />);
    expect(screen.getByRole("heading", { name: /Sign In to Namma Connect/i })).toBeInTheDocument();
    expect(screen.getByText(/Unified Access/i)).toBeInTheDocument();
  });

  it("renders Customer Home when authenticated session exists", () => {
    localStorage.setItem("nc_access_token", "valid_test_token");
    localStorage.setItem("nc_user", JSON.stringify({ id: "u1", email: "user@test.com", role: "customer", full_name: "Test Traveler" }));
    window.history.pushState({}, "Customer App", "/app");
    render(<App />);
    expect(screen.getByPlaceholderText(/Search activities, places, experiences/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Nearby$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Top Rated$/i })).toBeInTheDocument();
  });

  it("renders Customer My Trip bookings page when authenticated", () => {
    localStorage.setItem("nc_access_token", "valid_test_token");
    window.history.pushState({}, "My Trip", "/app/my-trip");
    render(<App />);
    expect(screen.getByRole("heading", { name: /My Trip & Bookings/i })).toBeInTheDocument();
  });

  it("renders Customer Profile with Google-style account view when authenticated", async () => {
    localStorage.setItem("nc_access_token", "valid_test_token");
    localStorage.setItem("nc_user", JSON.stringify({ id: "usr-1", email: "test@example.com", full_name: "Test User", role: "customer", is_active: true, is_verified: true }));
    window.history.pushState({}, "Profile", "/app/profile");
    render(<App />);
    expect(screen.getByRole("heading", { name: /Account Profile/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Basic Info/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Edit Profile/i })).toBeInTheDocument();
    });
  });

  it("renders Customer Settings page when authenticated", () => {
    localStorage.setItem("nc_access_token", "valid_test_token");
    window.history.pushState({}, "Settings", "/app/settings");
    render(<App />);
    expect(screen.getByRole("heading", { name: /Settings & Preferences/i })).toBeInTheDocument();
  });

  it("renders Become a Partner onboarding flow", async () => {
    localStorage.setItem("nc_access_token", "valid_test_token");
    window.history.pushState({}, "Become Partner", "/app/become-partner");
    render(<App />);
    expect(await screen.findByRole("heading", { name: /NammaConnect Provider Onboarding/i })).toBeInTheDocument();
    expect(screen.getByText(/Welcome to NammaConnect Provider Network/i)).toBeInTheDocument();
  });
});
