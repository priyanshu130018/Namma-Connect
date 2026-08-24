import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { App } from "@/app/App";

describe("Public Website & Entry Flow Polish Suite", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders Public Home page without authentication and informational content", () => {
    window.history.pushState({}, "Home", "/");
    render(<App />);
    expect(screen.getByRole("heading", { name: /Authentic Farm Tourism/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /How Namma Connect Works/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Marketplace Service Categories/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Become a NammaConnect Partner/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Creator Collaborations for Rural Tourism/i })).toBeInTheDocument();

    // Verify public navbar contains only public links
    expect(screen.getAllByRole("link", { name: /About/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("link", { name: /FAQ/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("link", { name: /Contact/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("link", { name: /Sign In/i }).length).toBeGreaterThanOrEqual(1);
  });

  it("renders Public About page without authentication", () => {
    window.history.pushState({}, "About", "/about");
    render(<App />);
    expect(screen.getByRole("heading", { name: /About Namma Connect/i })).toBeInTheDocument();
    expect(screen.getByText(/Our Founding Mission/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Bridging the gap/i })).toBeInTheDocument();
  });

  it("renders Public Contact page without authentication", () => {
    window.history.pushState({}, "Contact", "/contact");
    render(<App />);
    expect(screen.getByRole("heading", { name: /Contact & Support/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Your Name/i)).toBeInTheDocument();
  });

  it("renders Public FAQ page without authentication", () => {
    window.history.pushState({}, "FAQ", "/faq");
    render(<App />);
    expect(screen.getByRole("heading", { name: /Frequently Asked Questions/i })).toBeInTheDocument();
  });

  it("renders Public Terms page without authentication", () => {
    window.history.pushState({}, "Terms", "/terms");
    render(<App />);
    expect(screen.getByRole("heading", { name: /Terms of Service/i })).toBeInTheDocument();
  });

  it("renders Public Privacy page without authentication", () => {
    window.history.pushState({}, "Privacy", "/privacy");
    render(<App />);
    expect(screen.getByRole("heading", { name: /Privacy Policy/i })).toBeInTheDocument();
  });

  it("renders Normal Registration with only user credentials and NO provider type selector", () => {
    window.history.pushState({}, "Register", "/register");
    render(<App />);
    expect(screen.getByRole("heading", { name: /Join Namma Connect/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();

    // Verify "I WANT TO JOIN AS" and provider role selectors are NOT present
    expect(screen.queryByText(/I WANT TO JOIN AS/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Select Provider Type/i)).not.toBeInTheDocument();
  });

  it("redirects unauthenticated user accessing /app to /login", () => {
    window.history.pushState({}, "Customer", "/app");
    render(<App />);
    expect(screen.getByRole("heading", { name: /Sign In to Namma Connect/i })).toBeInTheDocument();
  });

  it("redirects unauthenticated user accessing /partner to /login", () => {
    window.history.pushState({}, "Partner", "/partner");
    render(<App />);
    expect(screen.getByRole("heading", { name: /Sign In to Namma Connect/i })).toBeInTheDocument();
  });

  it("redirects unauthenticated user accessing /admin to /login", () => {
    window.history.pushState({}, "Admin", "/admin");
    render(<App />);
    expect(screen.getByRole("heading", { name: /Sign In to Namma Connect/i })).toBeInTheDocument();
  });

  it("blocks customer role from accessing /admin with Access Restricted", () => {
    localStorage.setItem("nc_access_token", "valid_test_token");
    localStorage.setItem("nc_user", JSON.stringify({ id: "u-cust", email: "cust@test.com", role: "customer", full_name: "Customer User" }));

    window.history.pushState({}, "Admin", "/admin");
    render(<App />);
    expect(screen.getByText(/Access Restricted/i)).toBeInTheDocument();
    expect(screen.getByText(/customer/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Return to Authorized Portal/i })).toBeInTheDocument();
  });

  it("redirects authenticated customer visiting /login to /app without looping", async () => {
    localStorage.setItem("nc_access_token", "valid_test_token");
    localStorage.setItem("nc_user", JSON.stringify({ id: "u-cust", email: "cust@test.com", role: "customer", full_name: "Customer User" }));

    window.history.pushState({}, "Login", "/login");
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Welcome to NammaConnect/i })).toBeInTheDocument();
    });
  });

  it("renders Public 404 for unknown public route", () => {
    window.history.pushState({}, "Unknown", "/non-existent-page-12345");
    render(<App />);
    expect(screen.getByRole("heading", { name: /Page Not Found/i })).toBeInTheDocument();
    expect(screen.getByText(/404 Error/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Back to Home/i })).toBeInTheDocument();
  });

  it("renders Customer 404 for unknown /app/* sub-route when authenticated", () => {
    localStorage.setItem("nc_access_token", "valid_test_token");
    localStorage.setItem("nc_user", JSON.stringify({ id: "u-cust", email: "cust@test.com", role: "customer", full_name: "Customer User" }));

    window.history.pushState({}, "Unknown App", "/app/unknown-subroute-999");
    render(<App />);
    expect(screen.getByRole("heading", { name: /Service or Page Not Found/i })).toBeInTheDocument();
    expect(screen.getByText(/404 Customer Area/i)).toBeInTheDocument();
  });
});
