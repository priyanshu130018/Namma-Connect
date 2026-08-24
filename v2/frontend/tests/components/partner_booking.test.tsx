import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PartnerBookingsPage } from "@/routes/partner/PartnerBookings";
import { PartnerBookingDetailPage } from "@/routes/partner/PartnerBookingDetail";
import * as bookingService from "@/services/bookingService";
import { ProviderBookingItem } from "@/types";

const mockPartnerBookings: ProviderBookingItem[] = [
  {
    id: "bkg-p101",
    booking_code: "NC-BKG-HOST01",
    service_id: "srv-001",
    service_title: "Coorg Heritage Coffee Plantation Stay",
    customer_name: "Anita Sharma",
    customer_phone: "+91 98450 11223",
    customer_email: "anita@example.com",
    start_date: "2026-09-15",
    end_date: "2026-09-17",
    guest_count: 2,
    status: "PENDING",
    payment_status: "PAID",
    unit_price: 2800,
    total_amount: 5600,
    net_payout: 5320,
    special_requests: "Early morning plantation walk requested",
    created_at: "2026-08-22T15:00:00Z",
  },
  {
    id: "bkg-p102",
    booking_code: "NC-BKG-HOST02",
    service_id: "srv-002",
    service_title: "Organic Honey Harvesting Tour",
    customer_name: "Rahul Verma",
    customer_phone: "+91 98450 44556",
    customer_email: "rahul@example.com",
    start_date: "2026-09-18",
    time_slot_label: "09:00 AM – 12:30 PM",
    guest_count: 3,
    status: "CONFIRMED",
    payment_status: "PAID",
    unit_price: 1200,
    total_amount: 3600,
    net_payout: 3420,
    created_at: "2026-08-22T15:05:00Z",
  },
  {
    id: "bkg-p103",
    booking_code: "NC-BKG-HOST03",
    service_id: "srv-001",
    service_title: "Coorg Heritage Coffee Plantation Stay",
    customer_name: "Karan Johar",
    start_date: "2026-08-10",
    end_date: "2026-08-12",
    guest_count: 1,
    status: "COMPLETED",
    payment_status: "PAID",
    unit_price: 2800,
    total_amount: 2800,
    net_payout: 2660,
    created_at: "2026-08-01T10:00:00Z",
  },
];

describe("Provider Booking Management Suite", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders PartnerBookingsPage with real bookings grouped by status tabs", async () => {
    vi.spyOn(bookingService, "getPartnerBookings").mockResolvedValue({
      bookings: mockPartnerBookings,
      total: mockPartnerBookings.length,
    });

    render(
      <BrowserRouter>
        <PartnerBookingsPage />
      </BrowserRouter>
    );

    // Real bookings load
    await waitFor(() => {
      expect(screen.getByText("Guest Reservations")).toBeInTheDocument();
      expect(screen.getByText("NC-BKG-HOST01")).toBeInTheDocument();
      expect(screen.getByText(/Anita Sharma/)).toBeInTheDocument();
      expect(screen.getByText("NC-BKG-HOST02")).toBeInTheDocument();
    });

    // Net Payouts rendered
    expect(screen.getByText(/₹5,320/)).toBeInTheDocument();

    // Tab switching to Completed
    fireEvent.click(screen.getByRole("button", { name: /^Completed \(/i }));
    await waitFor(() => {
      expect(screen.getByText("NC-BKG-HOST03")).toBeInTheDocument();
      expect(screen.getByText(/Karan Johar/)).toBeInTheDocument();
    });
  });

  it("executes status update action (Accept Booking) with confirmation dialog", async () => {
    vi.spyOn(bookingService, "getPartnerBookings").mockResolvedValue({
      bookings: mockPartnerBookings,
      total: mockPartnerBookings.length,
    });

    const updateSpy = vi.spyOn(bookingService, "updatePartnerBookingStatus").mockResolvedValue({
      ...mockPartnerBookings[0],
      status: "CONFIRMED",
    });

    render(
      <BrowserRouter>
        <PartnerBookingsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("NC-BKG-HOST01")).toBeInTheDocument();
    });

    // Click Accept button on pending card
    const acceptBtn = screen.getByRole("button", { name: /^Accept$/i });
    fireEvent.click(acceptBtn);

    // Dialog opens
    await waitFor(() => {
      expect(screen.getByText(/Confirm Action: Accept Booking/i)).toBeInTheDocument();
    });

    // Confirm in dialog
    fireEvent.click(screen.getByRole("button", { name: /Confirm CONFIRMED/i }));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith("bkg-p101", "CONFIRMED");
    });
  });

  it("renders PartnerBookingDetailPage with full guest manifest and payout breakdown", async () => {
    vi.spyOn(bookingService, "getPartnerBookingById").mockResolvedValue(mockPartnerBookings[0]);

    window.history.pushState({}, "Manifest", "/partner/bookings/bkg-p101");

    render(
      <BrowserRouter>
        <Routes>
          <Route path="/partner/bookings/:booking_id" element={<PartnerBookingDetailPage />} />
        </Routes>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Reservation Manifest #NC-BKG-HOST01/i)).toBeInTheDocument();
      expect(screen.getByText("Anita Sharma")).toBeInTheDocument();
      expect(screen.getByText("+91 98450 11223")).toBeInTheDocument();
      expect(screen.getByText("anita@example.com")).toBeInTheDocument();
      expect(screen.getByText("Early morning plantation walk requested")).toBeInTheDocument();
      expect(screen.getByText(/Host Net Payout/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Accept Reservation/i })).toBeInTheDocument();
    });
  });
});
