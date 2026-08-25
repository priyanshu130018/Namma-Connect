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
    expect(screen.getByRole("heading", { name: /Welcome to NammaConnect/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Place \(e\.g\. Coorg, Wayanad\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Explore Categories/i)).toBeInTheDocument();
    expect(screen.getByText(/Recommended for You/i)).toBeInTheDocument();
  });

  it("renders Customer My Trip bookings page when authenticated", () => {
    localStorage.setItem("nc_access_token", "valid_test_token");
    window.history.pushState({}, "My Trip", "/app/my-trip");
    render(<App />);
    expect(screen.getByRole("heading", { name: /My Trip & Bookings/i })).toBeInTheDocument();
  });

  it("renders Customer Profile with Verified Information when authenticated", async () => {
    localStorage.setItem("nc_access_token", "valid_test_token");
    localStorage.setItem("nc_user", JSON.stringify({ id: "usr-1", email: "test@example.com", full_name: "Test User", role: "customer", is_active: true, is_verified: true }));
    window.history.pushState({}, "Profile", "/app/profile");
    render(<App />);
    expect(screen.getByRole("heading", { name: /Customer Profile/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Verified Information/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Request Change/i })).toBeInTheDocument();
    });
  });

  it("renders Customer Settings page when authenticated", () => {
    localStorage.setItem("nc_access_token", "valid_test_token");
    window.history.pushState({}, "Settings", "/app/settings");
    render(<App />);
    expect(screen.getByRole("heading", { name: /Settings & Preferences/i })).toBeInTheDocument();
  });

  it("renders Become a Partner onboarding flow", () => {
    localStorage.setItem("nc_access_token", "valid_test_token");
    window.history.pushState({}, "Become Partner", "/app/become-partner");
    render(<App />);
    expect(screen.getByRole("heading", { name: /Become a NammaConnect Partner/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Farmer \/ Agriculture Host/i })).toBeInTheDocument();
  });
});
