import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ServiceCard } from "@/components/cards/ServiceCard";
import { ServiceCardSkeleton } from "@/components/cards/ServiceCardSkeleton";
import { CustomerHomePage } from "@/routes/customer/CustomerHome";
import { CustomerExplorePage } from "@/routes/customer/Explore";
import { CustomerServiceDetailPage } from "@/routes/customer/ServiceDetail";
import * as marketplaceService from "@/services/marketplaceService";

const mockService = {
  id: "srv-001",
  title: "Coorg Heritage Coffee Estate",
  slug: "coorg-heritage-coffee-estate",
  description: "Stay in a colonial planter's bungalow surrounded by coffee plantations.",
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
  images: ["/images/services/coffee-estate.jpg", "/images/services/coffee-roasting.jpg"],
  inclusions: ["Breakfast included", "Guided 3h plantation trail"],
  amenities: ["Wi-Fi", "Solar Heated Water", "Organic Home Dining"],
};

describe("Customer Marketplace Discovery & Search Component Suite", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders ServiceCard with title, location, price, rating, and verified badge", () => {
    render(
      <BrowserRouter>
        <ServiceCard service={mockService} />
      </BrowserRouter>
    );

    expect(screen.getByText("Coorg Heritage Coffee Estate")).toBeInTheDocument();
    expect(screen.getByText("Madikeri")).toBeInTheDocument();
    expect(screen.getByText("₹2,800")).toBeInTheDocument();
    expect(screen.getByText("4.92")).toBeInTheDocument();
    expect(screen.getByText("Bopaiah Muthappa")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View/i })).toBeInTheDocument();
  });

  it("renders ServiceCardSkeleton correctly", () => {
    const { container } = render(<ServiceCardSkeleton />);
    expect(container.getElementsByClassName("animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders CustomerHomePage with Search Bar and Categories", async () => {
    vi.spyOn(marketplaceService, "getMarketplaceServices").mockResolvedValue({
      services: [mockService],
      total: 1,
      page: 1,
      limit: 6,
      total_pages: 1,
    });

    render(
      <BrowserRouter>
        <CustomerHomePage />
      </BrowserRouter>
    );

    expect(screen.getByText(/Agricultural Tourism Marketplace/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Place \(e\.g\. Coorg, Wayanad\)/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Search/i })).toBeInTheDocument();
    expect(screen.getByText(/Explore Categories/i)).toBeInTheDocument();
    expect(screen.getByText(/Recommended for You/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Coorg Heritage Coffee Estate")).toBeInTheDocument();
    });
  });

  it("renders CustomerExplorePage with filter bar, category pills, and services list", async () => {
    vi.spyOn(marketplaceService, "getMarketplaceServices").mockResolvedValue({
      services: [mockService],
      total: 1,
      page: 1,
      limit: 9,
      total_pages: 1,
    });

    render(
      <BrowserRouter>
        <CustomerExplorePage />
      </BrowserRouter>
    );

    expect(screen.getByRole("heading", { name: /Marketplace Catalog/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search by estate, crop, or district/i)).toBeInTheDocument();
    expect(screen.getByText(/All Offerings/i)).toBeInTheDocument();
    expect(screen.getByText(/Max: ₹5000/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Coorg Heritage Coffee Estate")).toBeInTheDocument();
    });
  });

  it("renders CustomerServiceDetailPage with details, host profile, reviews, and Check Availability button", async () => {
    vi.spyOn(marketplaceService, "getServiceDetail").mockResolvedValue({
      service: mockService,
      reviews: [
        {
          id: "rev-1",
          service_id: "srv-001",
          user_name: "Kavita Nair",
          rating: 5.0,
          comment: "Breathtaking estate walk and lovely hosts!",
        },
      ],
    });

    vi.spyOn(marketplaceService, "getServiceAvailability").mockResolvedValue({
      service_id: "srv-001",
      service_title: "Coorg Heritage Coffee Estate",
      booking_model: "date_range",
      min_guests: 1,
      max_guests: 6,
      min_days_notice: 1,
      max_days_advance: 60,
      start_date: "2026-09-01",
      end_date: "2026-09-30",
      days: [
        {
          date: "2026-09-01",
          is_available: true,
          status: "AVAILABLE",
          remaining_capacity: 6,
          time_slots: [],
        },
        {
          date: "2026-09-02",
          is_available: true,
          status: "AVAILABLE",
          remaining_capacity: 6,
          time_slots: [],
        },
      ],
      blackout_dates: [],
    });

    window.history.pushState({}, "Detail", "/app/services/srv-001");

    render(
      <BrowserRouter>
        <Routes>
          <Route path="/app/services/:service_id" element={<CustomerServiceDetailPage />} />
        </Routes>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Coorg Heritage Coffee Estate" })).toBeInTheDocument();
      expect(screen.getByText(/Bopaiah Muthappa/i)).toBeInTheDocument();
      expect(screen.getByText("Breakfast included")).toBeInTheDocument();
      expect(screen.getByText("Solar Heated Water")).toBeInTheDocument();
      expect(screen.getByText("Kavita Nair")).toBeInTheDocument();
      expect(screen.getByText("Breathtaking estate walk and lovely hosts!")).toBeInTheDocument();
    });

    const checkBtn = screen.getByRole("button", { name: /Check Availability/i });
    expect(checkBtn).toBeInTheDocument();
    fireEvent.click(checkBtn);

    await waitFor(() => {
      expect(screen.getByText(/Live Schedule Matrix/i)).toBeInTheDocument();
    });
  });
});
