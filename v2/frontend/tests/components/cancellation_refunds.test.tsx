import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BrowserRouter, MemoryRouter, Routes, Route } from "react-router-dom";
import { CustomerBookingDetailPage } from "@/routes/customer/BookingDetail";
import { CustomerMyTripPage } from "@/routes/customer/MyTrip";
import * as bookingService from "@/services/bookingService";
import { BookingItem } from "@/types";

const mockActiveBooking: BookingItem = {
  id: "bkg-01",
  booking_code: "NC-BKG-8812",
  customer_id: "usr-01",
  service_id: "srv-01",
  service_title: "Highland Arabica Coffee Estate Stay",
  service_location: "Madikeri, Coorg, Karnataka",
  service_image: "/images/coffee.jpg",
  provider_name: "Somanna (Kodagu Organics)",
  provider_phone: "+91 98450 12345",
  start_date: "2026-09-10",
  end_date: "2026-09-12",
  guest_count: 2,
  status: "CONFIRMED",
  payment_status: "PAID",
  unit_price: 3600,
  total_amount: 7200,
  is_cancellable: true,
  created_at: "2026-08-20T10:00:00Z",
};

const mockCancelledBooking: BookingItem = {
  ...mockActiveBooking,
  status: "CANCELLED",
  is_cancellable: false,
  refund_amount: 7200,
  refund_status: "COMPLETED",
  refund_code: "NC-REF-7711A",
};

describe("Booking Cancellation & Refund Management Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows Cancel Booking button and triggers confirmation modal", async () => {
    vi.spyOn(bookingService, "getBookingById").mockResolvedValue(mockActiveBooking);
    const cancelSpy = vi.spyOn(bookingService, "cancelBooking").mockResolvedValue(mockCancelledBooking);

    render(
      <MemoryRouter initialEntries={["/app/bookings/bkg-01"]}>
        <Routes>
          <Route path="/app/bookings/:booking_id" element={<CustomerBookingDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Highland Arabica Coffee Estate Stay")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Cancel Booking/i })).toBeInTheDocument();
    });

    // Open confirmation dialog
    fireEvent.click(screen.getByRole("button", { name: /Cancel Booking/i }));

    expect(screen.getByText("Cancel this booking?")).toBeInTheDocument();
    expect(
      screen.getByText("This action may be subject to the platform's cancellation and refund policy.")
    ).toBeInTheDocument();

    // Click Cancel Booking in modal
    const modalCancelBtn = screen.getAllByRole("button", { name: /Cancel Booking/i })[1];
    fireEvent.click(modalCancelBtn);

    await waitFor(() => {
      expect(cancelSpy).toHaveBeenCalledWith("bkg-01");
      expect(screen.getByText("Reservation Cancelled")).toBeInTheDocument();
      expect(screen.getByText("NC-REF-7711A")).toBeInTheDocument();
      expect(screen.getByText("Refund: COMPLETED")).toBeInTheDocument();
    });
  });

  it("renders cancelled booking with refund details and no active cancel button", async () => {
    vi.spyOn(bookingService, "getBookingById").mockResolvedValue(mockCancelledBooking);

    render(
      <MemoryRouter initialEntries={["/app/bookings/bkg-01"]}>
        <Routes>
          <Route path="/app/bookings/:booking_id" element={<CustomerBookingDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Highland Arabica Coffee Estate Stay")).toBeInTheDocument();
      expect(screen.getByText("Reservation Cancelled")).toBeInTheDocument();
      expect(screen.getByText("NC-REF-7711A")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^Cancel Booking$/i })).not.toBeInTheDocument();
    });
  });

  it("reflects cancelled bookings and refund badge in MyTrip page", async () => {
    vi.spyOn(bookingService, "getCustomerBookings").mockResolvedValue({
      bookings: [mockCancelledBooking],
      total: 1,
    });

    render(
      <BrowserRouter>
        <CustomerMyTripPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("My Trip & Bookings")).toBeInTheDocument();
      expect(screen.getByText(/Cancelled \(1\)/i)).toBeInTheDocument();
    });

    // Switch to cancelled tab
    fireEvent.click(screen.getByText(/Cancelled \(1\)/i));

    await waitFor(() => {
      expect(screen.getByText("Highland Arabica Coffee Estate Stay")).toBeInTheDocument();
      expect(screen.getByText("Refund: COMPLETED")).toBeInTheDocument();
    });
  });
});
