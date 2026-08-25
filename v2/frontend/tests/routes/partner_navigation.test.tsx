import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "@/app/App";

describe("Partner Routing & RBAC Access Controls", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("redirects unauthenticated user accessing /partner to /login", () => {
    window.history.pushState({}, "Partner Area", "/partner");
    render(<App />);
    expect(screen.getByRole("heading", { name: /Sign In to Namma Connect/i })).toBeInTheDocument();
  });

  it("restricts normal customer (role: customer) from accessing /partner", () => {
    localStorage.setItem("nc_access_token", "customer_valid_jwt");
    localStorage.setItem("nc_user", JSON.stringify({ id: "u-cust", email: "cust@traveler.com", role: "customer", full_name: "Regular Customer" }));
    window.history.pushState({}, "Partner Area", "/partner");
    render(<App />);
    expect(screen.getByRole("heading", { name: /Access Restricted/i })).toBeInTheDocument();
    expect(screen.getByText(/does not have permission to view this section/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Return to Authorized Portal/i })).toBeInTheDocument();
  });

  it("allows authenticated partner (role: partner) to access /partner dashboard", () => {
    localStorage.setItem("nc_access_token", "partner_valid_jwt");
    localStorage.setItem("nc_user", JSON.stringify({ id: "u-ptnr", email: "somanna@kodagu.in", role: "partner", full_name: "Somanna" }));
    window.history.pushState({}, "Partner Area", "/partner");
    render(<App />);
    expect(screen.getByRole("heading", { name: /Host Operations Dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/Active Services/i)).toBeInTheDocument();
  });

  it("allows partner to access /partner/services and /partner/services/new", () => {
    localStorage.setItem("nc_access_token", "partner_valid_jwt");
    localStorage.setItem("nc_user", JSON.stringify({ id: "u-ptnr", email: "somanna@kodagu.in", role: "farmer", full_name: "Somanna" }));
    window.history.pushState({}, "Services", "/partner/services");
    render(<App />);
    expect(screen.getByRole("heading", { name: /My Services Catalog/i })).toBeInTheDocument();

    window.history.pushState({}, "New Service", "/partner/services/new");
    render(<App />);
    expect(screen.getByRole("heading", { name: /Add New Offering/i })).toBeInTheDocument();
    expect(screen.getByText(/Farmer \/ Agro-Host/i)).toBeInTheDocument();
  });

  it("allows partner to access /partner/bookings and /partner/earnings", () => {
    localStorage.setItem("nc_access_token", "partner_valid_jwt");
    localStorage.setItem("nc_user", JSON.stringify({ id: "u-ptnr", email: "somanna@kodagu.in", role: "partner", full_name: "Somanna" }));
    window.history.pushState({}, "Bookings", "/partner/bookings");
    render(<App />);
    expect(screen.getByRole("heading", { name: /Guest Reservations/i })).toBeInTheDocument();

    window.history.pushState({}, "Earnings", "/partner/earnings");
    render(<App />);
    expect(screen.getByRole("heading", { name: /Earnings & Payouts/i })).toBeInTheDocument();
  });

  it("allows creator (role: creator) to access /partner/creator studio", () => {
    localStorage.setItem("nc_access_token", "creator_valid_jwt");
    localStorage.setItem("nc_user", JSON.stringify({ id: "u-creator", email: "arjun@lens.in", role: "creator", full_name: "Arjun Nambiar" }));
    window.history.pushState({}, "Creator Studio", "/partner/creator");
    render(<App />);
    expect(screen.getByRole("heading", { name: /Creator Media Studio/i })).toBeInTheDocument();
    expect(screen.getByText(/Total Reach/i)).toBeInTheDocument();
  });
});
