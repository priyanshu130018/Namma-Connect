import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "@/app/App";

describe("Provider Routing, Legacy Partner Redirects & RBAC Access Controls", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("redirects unauthenticated user accessing /provider to /login", () => {
    window.history.pushState({}, "Provider Area", "/provider");
    render(<App />);
    expect(screen.getByRole("heading", { name: /Sign In to Namma Connect/i })).toBeInTheDocument();
  });

  it("redirects unauthenticated user accessing /partner to /login", () => {
    window.history.pushState({}, "Legacy Partner Area", "/partner");
    render(<App />);
    expect(screen.getByRole("heading", { name: /Sign In to Namma Connect/i })).toBeInTheDocument();
  });

  it("restricts normal user/customer (role: user) from accessing /provider", () => {
    localStorage.setItem("nc_access_token", "customer_valid_jwt");
    localStorage.setItem("nc_user", JSON.stringify({ id: "u-cust", email: "cust@traveler.com", role: "user", full_name: "Regular Customer" }));
    window.history.pushState({}, "Provider Area", "/provider");
    render(<App />);
    expect(screen.getByRole("heading", { name: /Access Restricted/i })).toBeInTheDocument();
    expect(screen.getByText(/does not have permission to view this section/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Return to Authorized Portal/i })).toBeInTheDocument();
  });

  it("allows authenticated provider (role: provider) to access canonical /provider dashboard", () => {
    localStorage.setItem("nc_access_token", "provider_valid_jwt");
    localStorage.setItem("nc_user", JSON.stringify({ id: "u-prov", email: "somanna@kodagu.in", role: "provider", full_name: "Somanna" }));
    window.history.pushState({}, "Provider Area", "/provider");
    render(<App />);
    expect(screen.getByRole("heading", { name: /Provider Operations Dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/Total Services/i)).toBeInTheDocument();
  });

  it("redirects legacy /partner URL to canonical /provider dashboard", () => {
    localStorage.setItem("nc_access_token", "provider_valid_jwt");
    localStorage.setItem("nc_user", JSON.stringify({ id: "u-prov", email: "somanna@kodagu.in", role: "provider", full_name: "Somanna" }));
    window.history.pushState({}, "Legacy Partner Area", "/partner");
    render(<App />);
    expect(screen.getByRole("heading", { name: /Provider Operations Dashboard/i })).toBeInTheDocument();
  });

  it("allows provider to access /provider/services and /provider/services/new", () => {
    localStorage.setItem("nc_access_token", "provider_valid_jwt");
    localStorage.setItem("nc_user", JSON.stringify({ id: "u-prov", email: "somanna@kodagu.in", role: "provider", full_name: "Somanna" }));
    window.history.pushState({}, "Services", "/provider/services");
    render(<App />);
    expect(screen.getByRole("heading", { name: /My Services Catalog/i })).toBeInTheDocument();

    window.history.pushState({}, "New Service", "/provider/services/new");
    render(<App />);
    expect(screen.getByRole("heading", { name: /Add New Offering/i })).toBeInTheDocument();
    expect(screen.getByText(/Farmer \/ Agro-Host/i)).toBeInTheDocument();
  });

  it("allows provider to access /provider/bookings and /provider/earnings", () => {
    localStorage.setItem("nc_access_token", "provider_valid_jwt");
    localStorage.setItem("nc_user", JSON.stringify({ id: "u-prov", email: "somanna@kodagu.in", role: "provider", full_name: "Somanna" }));
    window.history.pushState({}, "Bookings", "/provider/bookings");
    render(<App />);
    expect(screen.getByRole("heading", { name: /Guest Reservations/i })).toBeInTheDocument();

    window.history.pushState({}, "Earnings", "/provider/earnings");
    render(<App />);
    expect(screen.getByRole("heading", { name: /Earnings & Payouts/i })).toBeInTheDocument();
  });

  it("redirects legacy /partner/creator to /provider/services (no separate creator portal)", () => {
    localStorage.setItem("nc_access_token", "provider_valid_jwt");
    localStorage.setItem("nc_user", JSON.stringify({ id: "u-prov", email: "arjun@lens.in", role: "provider", full_name: "Arjun Nambiar" }));
    window.history.pushState({}, "Creator Studio Redirect", "/partner/creator");
    render(<App />);
    expect(screen.getByRole("heading", { name: /My Services Catalog/i })).toBeInTheDocument();
  });
});
