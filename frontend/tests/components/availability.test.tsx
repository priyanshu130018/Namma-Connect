import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AvailabilityCalendar } from "@/components/availability/AvailabilityCalendar";
import { TimeSlotSelector } from "@/components/availability/TimeSlotSelector";
import { CustomerServiceDetailPage } from "@/routes/customer/ServiceDetail";
import * as marketplaceService from "@/services/marketplaceService";
import * as savedService from "@/services/savedService";
import { DayAvailability, TimeSlot } from "@/types";

const mockDays: DayAvailability[] = [
  {
    date: "2026-09-10",
    is_available: true,
    status: "AVAILABLE",
    remaining_capacity: 10,
    time_slots: [
      {
        id: "2026-09-10-slot-1",
        start_time: "09:00 AM",
        end_time: "12:30 PM",
        is_available: true,
        capacity: 10,
        remaining_capacity: 6,
      },
      {
        id: "2026-09-10-slot-2",
        start_time: "02:00 PM",
        end_time: "05:30 PM",
        is_available: false,
        capacity: 10,
        remaining_capacity: 0,
      },
    ],
  },
  {
    date: "2026-09-11",
    is_available: true,
    status: "LIMITED",
    remaining_capacity: 2,
    time_slots: [
      {
        id: "2026-09-11-slot-1",
        start_time: "09:00 AM",
        end_time: "12:30 PM",
        is_available: true,
        capacity: 10,
        remaining_capacity: 2,
      },
    ],
  },
  {
    date: "2026-09-12",
    is_available: false,
    status: "BLACKOUT",
    remaining_capacity: 0,
    time_slots: [],
  },
];

const mockTimeSlots: TimeSlot[] = [
  {
    id: "slot-1",
    start_time: "09:00 AM",
    end_time: "12:30 PM",
    is_available: true,
    capacity: 10,
    remaining_capacity: 4,
  },
  {
    id: "slot-2",
    start_time: "02:00 PM",
    end_time: "05:30 PM",
    is_available: false,
    capacity: 10,
    remaining_capacity: 0,
  },
];

const mockService = {
  id: "srv-exp-01",
  title: "Cardamom & Black Pepper Canopy Trail",
  slug: "wayanad-spice-canopy-trail",
  description: "Join certified agricultural naturalists across an 80-acre biodynamic spice estate.",
  category: "Guides & Tours",
  category_slug: "guides-tours",
  location: "Meppadi, Wayanad, Kerala",
  district: "Wayanad",
  state: "Kerala",
  price: 650,
  unit: "person",
  rating: 4.88,
  reviews_count: 28,
  is_verified: true,
  status: "PUBLISHED",
  provider_name: "Devasia Thomas",
  provider_type: "Guide & Naturalist",
  primary_image: "/images/services/spice-trail.jpg",
  images: ["/images/services/spice-trail.jpg"],
  inclusions: ["Guided walk", "Spice sample pouch"],
  amenities: ["First Aid", "Walking Sticks"],
};

describe("Service Availability Component Suite", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders AvailabilityCalendar and handles date selection", () => {
    const handleSelectDate = vi.fn();
    render(
      <AvailabilityCalendar
        days={mockDays}
        bookingModel="time_slot"
        selectedDate="2026-09-10"
        onSelectDate={handleSelectDate}
      />
    );

    expect(screen.getByText("Available")).toBeInTheDocument();
    expect(screen.getByText("Limited")).toBeInTheDocument();
    expect(screen.getByText("Booked / Past")).toBeInTheDocument();
  });

  it("renders TimeSlotSelector with slots and remaining capacity", () => {
    const handleSelectSlot = vi.fn();
    render(
      <TimeSlotSelector
        slots={mockTimeSlots}
        selectedSlotId="slot-1"
        onSelectSlot={handleSelectSlot}
      />
    );

    expect(screen.getByText("09:00 AM – 12:30 PM")).toBeInTheDocument();
    expect(screen.getByText("4 spots remaining")).toBeInTheDocument();
    expect(screen.getByText("02:00 PM – 05:30 PM")).toBeInTheDocument();
    expect(screen.getByText("Full capacity")).toBeInTheDocument();
  });

  it("renders ServiceDetailPage with host details and Message Host action", async () => {
    vi.spyOn(marketplaceService, "getServiceDetail").mockResolvedValue({
      service: mockService,
      reviews: [],
    });
    vi.spyOn(marketplaceService, "getServiceAvailability").mockResolvedValue({
      service_id: "srv-exp-01",
      service_title: "Cardamom & Black Pepper Canopy Trail",
      booking_model: "time_slot",
      min_guests: 1,
      max_guests: 10,
      min_days_notice: 1,
      max_days_advance: 30,
      start_date: "2026-09-10",
      end_date: "2026-10-10",
      days: mockDays,
      blackout_dates: [],
    });
    vi.spyOn(savedService, "getSavedStatus").mockResolvedValue(false);

    window.history.pushState({}, "Detail", "/app/services/srv-exp-01");

    render(
      <BrowserRouter>
        <Routes>
          <Route path="/app/services/:service_id" element={<CustomerServiceDetailPage />} />
        </Routes>
      </BrowserRouter>
    );

    // Wait for service detail load
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Cardamom & Black Pepper Canopy Trail" })).toBeInTheDocument();
      expect(screen.getAllByText(/Devasia Thomas/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByRole("button", { name: /Message Host \/ Inquire/i })).toBeInTheDocument();
    });
  });
});
