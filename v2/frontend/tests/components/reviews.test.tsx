import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { LeaveReviewModal } from "@/components/reviews/LeaveReviewModal";
import { CustomerBookingDetailPage } from "@/routes/customer/BookingDetail";
import { CustomerMyTripPage } from "@/routes/customer/MyTrip";
import * as marketplaceService from "@/services/marketplaceService";
import * as bookingService from "@/services/bookingService";
import { BookingItem } from "@/types";

const mockCompletedBooking: BookingItem = {
  id: "bkg-comp-01",
  booking_code: "NC-BKG-9922",
  customer_id: "usr-01",
  service_id: "srv-01",
  service_title: "Highland Arabica Coffee Estate Stay",
  service_location: "Madikeri, Coorg, Karnataka",
  service_image: "/images/coffee.jpg",
  provider_name: "Somanna (Kodagu Organics)",
  provider_phone: "+91 98450 12345",
  start_date: "2026-08-10",
  end_date: "2026-08-12",
  guest_count: 2,
  status: "COMPLETED",
  payment_status: "PAID",
  unit_price: 3600,
  total_amount: 7200,
  can_review: true,
  has_reviewed: false,
  created_at: "2026-08-01T10:00:00Z",
};

const mockReviewedBooking: BookingItem = {
  ...mockCompletedBooking,
  id: "bkg-comp-02",
  booking_code: "NC-BKG-9923",
  can_review: false,
  has_reviewed: true,
};

describe("Customer Reviews & Ratings Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders LeaveReviewModal with star ratings, accessible labels, and textarea", async () => {
    const submitSpy = vi.spyOn(marketplaceService, "submitReview").mockResolvedValue({
      id: "rev-01",
      service_id: "srv-01",
      booking_id: "bkg-comp-01",
      user_name: "Priyanka Reviewer",
      rating: 5,
      comment: "Incredible stay surrounded by organic coffee groves!",
      is_verified: true,
    });

    const handleClose = vi.fn();
    const handleSuccess = vi.fn();

    render(
      <LeaveReviewModal
        isOpen={true}
        onClose={handleClose}
        booking={mockCompletedBooking}
        onSuccess={handleSuccess}
      />
    );

    expect(screen.getByText(/Leave a Review/i)).toBeInTheDocument();
    expect(screen.getByText("Highland Arabica Coffee Estate Stay")).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: /Star rating from 1 to 5/i })).toBeInTheDocument();

    const starButtons = screen.getAllByRole("radio");
    expect(starButtons).toHaveLength(5);

    // Select 4 stars
    fireEvent.click(starButtons[3]);

    const textarea = screen.getByLabelText(/What was your experience like\?/i);
    fireEvent.change(textarea, {
      target: { value: "Incredible stay surrounded by organic coffee groves!" },
    });

    const submitBtn = screen.getByRole("button", { name: /Submit Review/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(submitSpy).toHaveBeenCalledWith("srv-01", {
        booking_id: "bkg-comp-01",
        rating: 4,
        comment: "Incredible stay surrounded by organic coffee groves!",
      });
    });
  });

  it("displays Leave Review button on completed bookings in BookingDetail", async () => {
    vi.spyOn(bookingService, "getBookingById").mockResolvedValue(mockCompletedBooking);

    render(
      <MemoryRouter initialEntries={["/app/bookings/bkg-comp-01"]}>
        <Routes>
          <Route path="/app/bookings/:booking_id" element={<CustomerBookingDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Highland Arabica Coffee Estate Stay")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Leave Review/i })).toBeInTheDocument();
    });
  });

  it("displays Reviewed badge on already reviewed bookings in BookingDetail", async () => {
    vi.spyOn(bookingService, "getBookingById").mockResolvedValue(mockReviewedBooking);

    render(
      <MemoryRouter initialEntries={["/app/bookings/bkg-comp-02"]}>
        <Routes>
          <Route path="/app/bookings/:booking_id" element={<CustomerBookingDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Highland Arabica Coffee Estate Stay")).toBeInTheDocument();
      expect(screen.getByText(/Reviewed/i)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Leave Review/i })).not.toBeInTheDocument();
    });
  });

  it("displays Leave Review action on completed bookings in MyTrip", async () => {
    vi.spyOn(bookingService, "getCustomerBookings").mockResolvedValue({
      bookings: [mockCompletedBooking],
      total: 1,
    });

    render(
      <MemoryRouter>
        <CustomerMyTripPage />
      </MemoryRouter>
    );

    // Switch to Completed tab
    await waitFor(() => {
      expect(screen.getByText(/Completed \(1\)/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Completed \(1\)/i));

    await waitFor(() => {
      expect(screen.getByText("Highland Arabica Coffee Estate Stay")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Leave Review/i })).toBeInTheDocument();
    });
  });
});
