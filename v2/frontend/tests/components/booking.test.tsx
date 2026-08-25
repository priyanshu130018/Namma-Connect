import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BookingReviewModal } from "@/components/booking/BookingReviewModal";
import { CustomerMyTripPage } from "@/routes/customer/MyTrip";
import { CustomerBookingDetailPage } from "@/routes/customer/BookingDetail";
import * as bookingService from "@/services/bookingService";
import { MarketplaceService, BookingItem } from "@/types";

const mockService: MarketplaceService = {
  id: "srv-001",
  title: "Coorg Heritage Coffee Estate",
  slug: "coorg-heritage-coffee-estate",
  description: "Stay in a century-old planter's bungalow.",
  category: "Stay",
  category_slug: "stay",
  location: "Madikeri, Coorg, Karnataka",
  district: "Coorg",
  state: "Karnataka",
  price: 2800,
  unit: "night",
  rating: 4.92,
  reviews_count: 34,
  is_verified: true,
  status: "PUBLISHED",
  provider_name: "Bopaiah Muthappa",
  provider_type: "Farmer / Plantation Host",
  primary_image: "/images/services/coffee-estate.jpg",
  images: ["/images/services/coffee-estate.jpg"],
  inclusions: ["Breakfast included"],
  amenities: ["Wi-Fi", "Solar Heated Water"],
};

const mockBooking: BookingItem = {
  id: "bkg-101",
  booking_code: "NC-BKG-99A1X",
  customer_id: "user-123",
  service_id: "srv-001",
  service_title: "Coorg Heritage Coffee Estate",
  service_location: "Madikeri, Coorg, Karnataka",
  service_image: "/images/services/coffee-estate.jpg",
  provider_name: "Bopaiah Muthappa",
  provider_phone: "+91 98450 12345",
  start_date: "2026-09-15",
  end_date: "2026-09-17",
  guest_count: 2,
  status: "PENDING",
  unit_price: 2800,
  total_amount: 5600,
  special_requests: "Vegetarian food request.",
  created_at: "2026-08-22T14:00:00Z",
};

const mockCompletedBooking: BookingItem = {
  ...mockBooking,
  id: "bkg-102",
  booking_code: "NC-BKG-22B2Y",
  status: "COMPLETED",
};

describe("Customer Booking Engine & My Trip Suite", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders BookingReviewModal and submits booking request", async () => {
    const createSpy = vi.spyOn(bookingService, "createBooking").mockResolvedValue(mockBooking);

    render(
      <BrowserRouter>
        <BookingReviewModal
          isOpen={true}
          onClose={vi.fn()}
          service={mockService}
          startDate="2026-09-15"
          endDate="2026-09-17"
        />
      </BrowserRouter>
    );

    expect(screen.getByRole("heading", { name: /Review Your Reservation/i })).toBeInTheDocument();
    expect(screen.getByText("Coorg Heritage Coffee Estate")).toBeInTheDocument();
    expect(screen.getAllByText(/2 nights/i).length).toBeGreaterThan(0);
    expect(screen.getByText("₹5,600")).toBeInTheDocument();

    // Increase guests to 2
    const plusBtn = screen.getByRole("button", { name: /Increase guests/i });
    fireEvent.click(plusBtn);

    // Submit booking request
    const confirmBtn = screen.getByRole("button", { name: /Confirm Booking Request/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          service_id: "srv-001",
          start_date: "2026-09-15",
          end_date: "2026-09-17",
          guest_count: 2,
        })
      );
      expect(screen.getByText("NC-BKG-99A1X")).toBeInTheDocument();
      expect(screen.getByText("PENDING")).toBeInTheDocument();
    });
  });

  it("renders CustomerMyTripPage with upcoming and completed tabs", async () => {
    vi.spyOn(bookingService, "getCustomerBookings").mockResolvedValue({
      bookings: [mockBooking, mockCompletedBooking],
      total: 2,
    });

    render(
      <BrowserRouter>
        <CustomerMyTripPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("NC-BKG-99A1X")).toBeInTheDocument();
      expect(screen.getByText("Pending Request")).toBeInTheDocument();
    });

    // Check QR pass dialog opens
    const qrBtn = screen.getByRole("button", { name: /Entry QR/i });
    fireEvent.click(qrBtn);
    expect(screen.getByRole("heading", { name: /Check-In Digital Pass/i })).toBeInTheDocument();

    // Switch to Completed tab
    const completedTab = screen.getByRole("button", { name: /Completed/i });
    fireEvent.click(completedTab);

    await waitFor(() => {
      expect(screen.getByText("NC-BKG-22B2Y")).toBeInTheDocument();
    });
  });

  it("allows cancellation from MyTrip page", async () => {
    vi.spyOn(bookingService, "getCustomerBookings").mockResolvedValue({
      bookings: [mockBooking],
      total: 1,
    });
    const cancelSpy = vi.spyOn(bookingService, "cancelBooking").mockResolvedValue({
      ...mockBooking,
      status: "CANCELLED",
    });

    render(
      <BrowserRouter>
        <CustomerMyTripPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("NC-BKG-99A1X")).toBeInTheDocument();
    });

    // Click Cancel on card
    const cancelBtn = screen.getByRole("button", { name: /^Cancel$/i });
    fireEvent.click(cancelBtn);

    expect(screen.getByRole("heading", { name: /Cancel this booking\?/i })).toBeInTheDocument();

    // Confirm cancel
    const confirmCancelBtn = screen.getByRole("button", { name: /Cancel Booking/i });
    fireEvent.click(confirmCancelBtn);

    await waitFor(() => {
      expect(cancelSpy).toHaveBeenCalledWith("bkg-101");
    });
  });

  it("renders empty state in MyTrip when no trips exist", async () => {
    vi.spyOn(bookingService, "getCustomerBookings").mockResolvedValue({
      bookings: [],
      total: 0,
    });

    render(
      <BrowserRouter>
        <CustomerMyTripPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("No trips yet")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Explore Marketplace/i })).toBeInTheDocument();
    });
  });

  it("renders CustomerBookingDetailPage with booking details and allows cancel", async () => {
    vi.spyOn(bookingService, "getBookingById").mockResolvedValue(mockBooking);
    const cancelSpy = vi.spyOn(bookingService, "cancelBooking").mockResolvedValue({
      ...mockBooking,
      status: "CANCELLED",
    });

    window.history.pushState({}, "Voucher", "/app/bookings/bkg-101");

    render(
      <BrowserRouter>
        <Routes>
          <Route path="/app/bookings/:booking_id" element={<CustomerBookingDetailPage />} />
        </Routes>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Confirmation #NC-BKG-99A1X")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Coorg Heritage Coffee Estate" })).toBeInTheDocument();
      expect(screen.getByText("Bopaiah Muthappa")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Cancel Booking" })).toBeInTheDocument();
    });

    // Click Cancel in details page
    fireEvent.click(screen.getByRole("button", { name: "Cancel Booking" }));
    const modalCancelBtn = screen.getAllByRole("button", { name: "Cancel Booking" })[1];
    fireEvent.click(modalCancelBtn);

    await waitFor(() => {
      expect(cancelSpy).toHaveBeenCalledWith("bkg-101");
      expect(screen.getByText("Cancelled")).toBeInTheDocument();
    });
  });
});
