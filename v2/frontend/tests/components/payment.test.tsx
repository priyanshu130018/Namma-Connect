import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BookingReviewModal } from "@/components/booking/BookingReviewModal";
import { CustomerBookingDetailPage } from "@/routes/customer/BookingDetail";
import * as bookingService from "@/services/bookingService";
import * as paymentService from "@/services/paymentService";
import { MarketplaceService, BookingItem, PaymentOrderData, PaymentVerificationResult } from "@/types";

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

const mockPendingBooking: BookingItem = {
  id: "bkg-201",
  booking_code: "NC-BKG-PAY01",
  customer_id: "user-123",
  service_id: "srv-001",
  service_title: "Coorg Heritage Coffee Estate",
  service_location: "Madikeri, Coorg, Karnataka",
  service_image: "/images/services/coffee-estate.jpg",
  provider_name: "Bopaiah Muthappa",
  provider_phone: "+91 98450 12345",
  start_date: "2026-09-20",
  end_date: "2026-09-22",
  guest_count: 2,
  status: "PENDING",
  unit_price: 2800,
  total_amount: 5600,
  created_at: "2026-08-22T14:30:00Z",
};

const mockOrderData: PaymentOrderData = {
  order_id: "order_mock_991122",
  amount: 5600,
  amount_paise: 560000,
  currency: "INR",
  key_id: "rzp_test_public_key_only",
  booking_id: "bkg-201",
  booking_code: "NC-BKG-PAY01",
  customer_name: "Priya Traveler",
  customer_email: "priya@example.com",
  customer_phone: "+91 98450 12345",
  service_title: "Coorg Heritage Coffee Estate",
};

const mockVerificationResult: PaymentVerificationResult = {
  success: true,
  message: "Payment successfully verified.",
  booking_id: "bkg-201",
  booking_code: "NC-BKG-PAY01",
  status: "CONFIRMED",
  payment_id: "pay_test_998877",
  amount: 5600,
  verified_at: "2026-08-22T14:31:00Z",
};

describe("Customer Payment & Razorpay Integration Suite", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("handles payment initiation, checkout callback, and verification confirmation in BookingReviewModal", async () => {
    vi.spyOn(bookingService, "createBooking").mockResolvedValue(mockPendingBooking);
    const createOrderSpy = vi.spyOn(paymentService, "createPaymentOrder").mockResolvedValue(mockOrderData);
    const verifySpy = vi.spyOn(paymentService, "verifyPayment").mockResolvedValue(mockVerificationResult);

    render(
      <BrowserRouter>
        <BookingReviewModal
          isOpen={true}
          onClose={vi.fn()}
          service={mockService}
          startDate="2026-09-20"
          endDate="2026-09-22"
        />
      </BrowserRouter>
    );

    // 1. Submit booking request
    fireEvent.click(screen.getByRole("button", { name: /Confirm Booking Request/i }));

    // 2. Pending view appears with Pay Now button
    await waitFor(() => {
      expect(screen.getByText("NC-BKG-PAY01")).toBeInTheDocument();
      expect(screen.getByText("PENDING")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Pay Now/i })).toBeInTheDocument();
    });

    // 3. Click Pay Now
    fireEvent.click(screen.getByRole("button", { name: /Pay Now/i }));

    // 4. Verification succeeds and Confirmed screen appears
    await waitFor(() => {
      expect(createOrderSpy).toHaveBeenCalledWith("bkg-201");
      expect(verifySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          booking_id: "bkg-201",
          razorpay_order_id: "order_mock_991122",
        })
      );
      expect(screen.getByText("Payment Verified & Booking Confirmed")).toBeInTheDocument();
      expect(screen.getByText("CONFIRMED")).toBeInTheDocument();
      expect(screen.getByText("pay_test_998877")).toBeInTheDocument();
    });
  });

  it("handles payment from CustomerBookingDetailPage for pending bookings", async () => {
    vi.spyOn(bookingService, "getBookingById").mockResolvedValue(mockPendingBooking);
    const createOrderSpy = vi.spyOn(paymentService, "createPaymentOrder").mockResolvedValue(mockOrderData);
    const verifySpy = vi.spyOn(paymentService, "verifyPayment").mockResolvedValue(mockVerificationResult);

    window.history.pushState({}, "Voucher", "/app/bookings/bkg-201");

    render(
      <BrowserRouter>
        <Routes>
          <Route path="/app/bookings/:booking_id" element={<CustomerBookingDetailPage />} />
        </Routes>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Confirmation #NC-BKG-PAY01")).toBeInTheDocument();
      expect(screen.getByText("Payment Pending")).toBeInTheDocument();
    });

    // Click Pay Now
    const payBtns = screen.getAllByRole("button", { name: /Pay Now/i });
    fireEvent.click(payBtns[0]);

    await waitFor(() => {
      expect(createOrderSpy).toHaveBeenCalledWith("bkg-201");
      expect(verifySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          booking_id: "bkg-201",
          razorpay_order_id: "order_mock_991122",
        })
      );
      expect(screen.getByText("Paid via Razorpay Secure")).toBeInTheDocument();
    });
  });

  it("displays payment failure error banner when verification fails", async () => {
    vi.spyOn(bookingService, "createBooking").mockResolvedValue(mockPendingBooking);
    vi.spyOn(paymentService, "createPaymentOrder").mockResolvedValue(mockOrderData);
    vi.spyOn(paymentService, "verifyPayment").mockRejectedValue(
      new Error("Signature mismatch rejected by server.")
    );

    render(
      <BrowserRouter>
        <BookingReviewModal
          isOpen={true}
          onClose={vi.fn()}
          service={mockService}
          startDate="2026-09-20"
          endDate="2026-09-22"
        />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /Confirm Booking Request/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Pay Now/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Pay Now/i }));

    await waitFor(() => {
      expect(screen.getByText("Signature mismatch rejected by server.")).toBeInTheDocument();
      // Safe retry button remains visible
      expect(screen.getByRole("button", { name: /Pay Now/i })).toBeInTheDocument();
    });
  });
});
