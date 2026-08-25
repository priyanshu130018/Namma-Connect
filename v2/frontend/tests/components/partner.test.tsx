import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { PartnerNavbar } from "@/components/layout/PartnerNavbar";
import { PartnerSidebar } from "@/components/layout/PartnerSidebar";
import { PartnerDashboardPage } from "@/routes/partner/PartnerDashboard";
import { PartnerServicesPage } from "@/routes/partner/PartnerServices";
import { PartnerBookingsPage } from "@/routes/partner/PartnerBookings";
import { PartnerEarningsPage } from "@/routes/partner/PartnerEarnings";
import { PartnerProfilePage } from "@/routes/partner/PartnerProfile";
import * as earningsService from "@/services/earningsService";

describe("Partner Application Components", () => {
  it("renders PartnerNavbar with Brand, Notifications, Messages, and Profile menu", () => {
    render(
      <BrowserRouter>
        <PartnerNavbar />
      </BrowserRouter>
    );
    expect(screen.getByText(/Namma/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Notifications")).toBeInTheDocument();
    expect(screen.getByLabelText("Customer Messages")).toBeInTheDocument();
    expect(screen.getByLabelText("Provider Profile Menu")).toBeInTheDocument();
  });

  it("renders PartnerSidebar with all primary links", () => {
    render(
      <BrowserRouter>
        <PartnerSidebar isCollapsed={false} onToggleCollapse={() => {}} />
      </BrowserRouter>
    );
    expect(screen.getByRole("link", { name: /Dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /My Services/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Bookings/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Earnings/i })).toBeInTheDocument();
  });

  it("renders PartnerDashboard with KPI metrics", () => {
    render(
      <BrowserRouter>
        <PartnerDashboardPage />
      </BrowserRouter>
    );
    expect(screen.getByRole("heading", { name: /Host Operations Dashboard/i })).toBeInTheDocument();
    expect(screen.getByText("Active Services")).toBeInTheDocument();
    expect(screen.getByText("Upcoming Bookings")).toBeInTheDocument();
    expect(screen.getByText("Net Payout (30 Days)")).toBeInTheDocument();
  });

  it("renders PartnerServices with table of services and + Add Service CTA", () => {
    render(
      <BrowserRouter>
        <PartnerServicesPage />
      </BrowserRouter>
    );
    expect(screen.getByRole("heading", { name: /My Services Catalog/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /\+ Add Service/i })).toBeInTheDocument();
  });

  it("renders PartnerBookings with exactly 3 tabs (Upcoming, Completed, Cancelled)", async () => {
    render(
      <BrowserRouter>
        <PartnerBookingsPage />
      </BrowserRouter>
    );
    expect(screen.getByRole("heading", { name: /Guest Reservations/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Upcoming/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Completed/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Cancelled/i })).toBeInTheDocument();
    });
  });

  it("renders PartnerEarnings with exactly 3 time ranges (7 Days, 30 Days, 1 Year)", async () => {
    vi.spyOn(earningsService, "getPartnerEarnings").mockResolvedValue({
      period: "30d",
      total_earnings: 11400,
      gross_revenue: 12000,
      platform_fee: 600,
      currency: "INR",
      booking_count: 4,
      data: [{ date: "Aug 20", amount: 11400, bookings_count: 4 }],
    });

    render(
      <BrowserRouter>
        <PartnerEarningsPage />
      </BrowserRouter>
    );
    expect(screen.getByRole("heading", { name: /Earnings & Payouts/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^7 Days$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^30 Days$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^1 Year$/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^7 Days$/i }));
    await waitFor(() => {
      expect(screen.getByText(/Earnings Timeline \(7 Days\)/i)).toBeInTheDocument();
    });
  });

  it("renders PartnerProfile with protected Verified Information and Request Change button", () => {
    render(
      <BrowserRouter>
        <PartnerProfilePage />
      </BrowserRouter>
    );
    expect(screen.getByRole("heading", { name: /Host & Property Profile/i })).toBeInTheDocument();
    expect(screen.getByText(/Protected Legal & KYC Credentials/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Request Change/i })).toBeInTheDocument();
  });
});
