import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import {
  AdminHomePage,
  AdminUsersPage,
  AdminPartnersPage,
  AdminVerificationPage,
  AdminServicesPage,
  AdminBookingsPage,
  AdminPaymentsPage,
  AdminPayoutsPage,
  AdminSupportPage,
  AdminSettingsPage,
} from "@/routes/admin/AdminPages";
import * as adminService from "@/services/adminService";
import {
  AdminOverviewData,
  AdminUserItem,
  ServiceItem,
  ProviderBookingItem,
  AdminPaymentAuditItem,
  PayoutItem,
  AdminSupportTicketItem,
  AdminPlatformSettings,
} from "@/types";

const mockOverview: AdminOverviewData = {
  total_users: 1420,
  total_partners: 48,
  pending_verifications: 3,
  published_services: 24,
  total_bookings: 312,
  total_revenue: 1248000,
  pending_payouts: 2,
  open_support_tickets: 4,
};

const mockUsers: AdminUserItem[] = [
  {
    id: "usr-01",
    email: "ramesh@example.com",
    full_name: "Ramesh Gowda",
    role: "partner",
    is_active: true,
    is_verified: true,
    created_at: "2026-08-01T10:00:00Z",
  },
  {
    id: "usr-02",
    email: "priya@example.com",
    full_name: "Priya Rao",
    role: "customer",
    is_active: true,
    is_verified: false,
    created_at: "2026-08-05T10:00:00Z",
  },
];

const mockVerificationQueue: AdminUserItem[] = [
  {
    id: "usr-queue-01",
    email: "anand.farm@example.com",
    full_name: "Anand Kumar",
    role: "partner",
    is_active: true,
    is_verified: false,
    created_at: "2026-08-10T10:00:00Z",
  },
];

const mockServices: ServiceItem[] = [
  {
    id: "srv-01",
    provider_name: "Ramesh Gowda",
    provider_type: "farmer",
    title: "Organic Coffee Estate Stay",
    slug: "organic-coffee-estate-stay",
    description: "Serene coffee plantation stay",
    category: "Stay",
    category_slug: "stay",
    location: "Madikeri",
    district: "Kodagu",
    state: "Karnataka",
    price: 3500,
    unit: "night",
    status: "DRAFT",
    primary_image: "https://images.unsplash.com/photo-1",
    images: [],
    inclusions: [],
    amenities: [],
    is_verified: true,
    rating: 4.9,
    reviews_count: 12,
  },
];

const mockBookings: ProviderBookingItem[] = [
  {
    id: "book-01",
    booking_code: "NC-BKG-8819A",
    service_id: "srv-01",
    service_title: "Organic Coffee Estate Stay",
    customer_name: "Priya Rao",
    customer_email: "priya@example.com",
    start_date: "2026-09-01",
    end_date: "2026-09-03",
    guest_count: 2,
    unit_price: 3500,
    total_amount: 7000,
    net_payout: 6650,
    status: "CONFIRMED",
    payment_status: "PAID",
    created_at: "2026-08-15T10:00:00Z",
  },
];

const mockPayments: AdminPaymentAuditItem[] = [
  {
    id: "pay-01",
    booking_id: "book-01",
    customer_id: "usr-02",
    razorpay_order_id: "order_K8819",
    razorpay_payment_id: "pay_K8819X",
    amount: 7000,
    currency: "INR",
    status: "PAID",
    method: "UPI",
    created_at: "2026-08-15T10:05:00Z",
  },
];

const mockPayouts: PayoutItem[] = [
  {
    id: "payout-01",
    payout_code: "NC-PAY-9812A",
    provider_id: "usr-01",
    amount: 6650,
    currency: "INR",
    status: "PROCESSING",
    bank_account_last4: "4092",
    ifsc_code: "SBIN0001234",
    created_at: "2026-08-16T10:00:00Z",
  },
];

const mockTickets: AdminSupportTicketItem[] = [
  {
    id: "TICK-1001",
    user_email: "priya@example.com",
    user_name: "Priya Rao",
    subject: "Reschedule inquiry for plantation tour",
    category: "Booking",
    status: "OPEN",
    priority: "HIGH",
    created_at: "2026-08-18T10:00:00Z",
  },
];

const mockSettings: AdminPlatformSettings = {
  platform_name: "NammaConnect",
  commission_rate: 0.05,
  currency: "INR",
  environment: "production",
  is_maintenance_mode: false,
  support_email: "support@nammaconnect.in",
};

describe("Admin Operations Component Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders AdminHomePage with overview metrics", async () => {
    vi.spyOn(adminService, "getAdminOverview").mockResolvedValue(mockOverview);

    render(
      <BrowserRouter>
        <AdminHomePage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Admin Operations Control Center")).toBeInTheDocument();
      expect(screen.getByText(/1,420|1420/)).toBeInTheDocument();
      expect(screen.getByText("48")).toBeInTheDocument();
      expect(screen.getByText(/1,248,000|12,48,000|1248000/)).toBeInTheDocument();
    });
  });

  it("renders AdminUsersPage and displays accounts list", async () => {
    vi.spyOn(adminService, "getAdminUsers").mockResolvedValue(mockUsers);

    render(
      <BrowserRouter>
        <AdminUsersPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("User Directory")).toBeInTheDocument();
      expect(screen.getByText("Ramesh Gowda")).toBeInTheDocument();
      expect(screen.getByText("Priya Rao")).toBeInTheDocument();
    });
  });

  it("renders AdminPartnersPage", async () => {
    vi.spyOn(adminService, "getAdminPartners").mockResolvedValue(mockUsers.filter((u) => u.role === "partner"));

    render(
      <BrowserRouter>
        <AdminPartnersPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Partner Directory")).toBeInTheDocument();
      expect(screen.getByText("Ramesh Gowda")).toBeInTheDocument();
      expect(screen.getByText("KYC Approved")).toBeInTheDocument();
    });
  });

  it("handles KYC Verification action in AdminVerificationPage", async () => {
    vi.spyOn(adminService, "getAdminVerificationQueue").mockResolvedValue(mockVerificationQueue);
    const verifySpy = vi.spyOn(adminService, "verifyAdminPartner").mockResolvedValue({
      ...mockVerificationQueue[0],
      is_verified: true,
    });

    render(
      <BrowserRouter>
        <AdminVerificationPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Host KYC Verification Queue")).toBeInTheDocument();
      expect(screen.getByText("Anand Kumar")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Approve/i }));

    await waitFor(() => {
      expect(verifySpy).toHaveBeenCalledWith("usr-queue-01", {
        action: "APPROVE",
        notes: "Approved by Admin Operations",
      });
    });
  });

  it("handles Service Moderation in AdminServicesPage", async () => {
    vi.spyOn(adminService, "getAdminServices").mockResolvedValue(mockServices);
    const updateSpy = vi.spyOn(adminService, "updateAdminServiceStatus").mockResolvedValue({
      ...mockServices[0],
      status: "PUBLISHED",
    });

    render(
      <BrowserRouter>
        <AdminServicesPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Service Listing Moderation")).toBeInTheDocument();
      expect(screen.getByText("Organic Coffee Estate Stay")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Publish/i }));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith("srv-01", { status: "PUBLISHED" });
    });
  });

  it("renders AdminBookingsPage", async () => {
    vi.spyOn(adminService, "getAdminBookings").mockResolvedValue(mockBookings);

    render(
      <BrowserRouter>
        <AdminBookingsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Global Bookings & Disputes")).toBeInTheDocument();
      expect(screen.getByText("NC-BKG-8819A")).toBeInTheDocument();
      expect(screen.getByText(/7,000|7000/)).toBeInTheDocument();
    });
  });

  it("renders AdminPaymentsPage", async () => {
    vi.spyOn(adminService, "getAdminPayments").mockResolvedValue(mockPayments);

    render(
      <BrowserRouter>
        <AdminPaymentsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Payment Transactions Audit")).toBeInTheDocument();
      expect(screen.getByText("order_K8819")).toBeInTheDocument();
      expect(screen.getByText(/7,000 INR|7000 INR/)).toBeInTheDocument();
    });
  });

  it("renders AdminPayoutsPage and updates payout status", async () => {
    vi.spyOn(adminService, "getAdminPayouts").mockResolvedValue(mockPayouts);
    const payoutSpy = vi.spyOn(adminService, "updateAdminPayoutStatus").mockResolvedValue({
      ...mockPayouts[0],
      status: "COMPLETED",
    });

    render(
      <BrowserRouter>
        <AdminPayoutsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Host Payouts Ledger")).toBeInTheDocument();
      expect(screen.getByText("NC-PAY-9812A")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Mark Paid/i }));

    await waitFor(() => {
      expect(payoutSpy).toHaveBeenCalledWith("payout-01", { status: "COMPLETED" });
    });
  });

  it("renders AdminSupportPage", async () => {
    vi.spyOn(adminService, "getAdminSupportTickets").mockResolvedValue(mockTickets);

    render(
      <BrowserRouter>
        <AdminSupportPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Support Tickets Queue")).toBeInTheDocument();
      expect(screen.getByText("Reschedule inquiry for plantation tour")).toBeInTheDocument();
    });
  });

  it("renders AdminSettingsPage", async () => {
    vi.spyOn(adminService, "getAdminSettings").mockResolvedValue(mockSettings);

    render(
      <BrowserRouter>
        <AdminSettingsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Global Platform Settings")).toBeInTheDocument();
      expect(screen.getByText("NammaConnect")).toBeInTheDocument();
      expect(screen.getByText("5% (Host receives 95% net settlement)")).toBeInTheDocument();
      expect(screen.getByText("Disabled (Live)")).toBeInTheDocument();
    });
  });
});
