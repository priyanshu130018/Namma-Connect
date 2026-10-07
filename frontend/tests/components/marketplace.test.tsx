import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BrowserRouter, MemoryRouter, Routes, Route } from "react-router-dom";
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
    expect(screen.getByRole("link", { name: /Coorg Heritage Coffee Estate/i })).toBeInTheDocument();
  });

  it("renders ServiceCardSkeleton correctly", () => {
    const { container } = render(<ServiceCardSkeleton />);
    expect(container.getElementsByClassName("animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders CustomerHomePage with Search Bar and Discovery Sections", async () => {
    vi.spyOn(marketplaceService, "getHomeRecommendations").mockResolvedValue({
      recommended_for_you: [mockService],
      top_rated: [mockService],
      most_visited: [mockService],
      near_you: [mockService],
      nearby: [mockService],
      things_to_visit: [mockService],
      things_to_do: [mockService],
      categories: [],
    });

    render(
      <BrowserRouter>
        <CustomerHomePage />
      </BrowserRouter>
    );

    expect(screen.getByPlaceholderText(/Search activities, places, experiences/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Search/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Nearby$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Top Rated$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Most Visited$/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText("Coorg Heritage Coffee Estate")[0]).toBeInTheDocument();
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
    vi.spyOn(marketplaceService, "getExploreFeed").mockResolvedValue({
      categories: [],
      active_sections: ["top_and_most_visited"],
      top_and_most_visited: [mockService],
      user_signals: { is_authenticated: false, has_location: false },
    } as any);

    render(
      <BrowserRouter>
        <CustomerExplorePage />
      </BrowserRouter>
    );

    expect(screen.getByRole("heading", { name: /Explore Karnataka/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search farm stays/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /filter/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Coorg Heritage Coffee Estate")).toBeInTheDocument();
    });
  });

  it("renders CustomerServiceDetailPage with details, host profile, amenities, reviews, and Message Host button", async () => {
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
      days: [],
    } as any);

    render(
      <MemoryRouter initialEntries={["/app/services/srv-001"]}>
        <Routes>
          <Route path="/app/services/:service_id" element={<CustomerServiceDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Coorg Heritage Coffee Estate" })).toBeInTheDocument();
      expect(screen.getAllByText(/Bopaiah Muthappa/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Solar Heated Water")).toBeInTheDocument();
      expect(screen.getByText("Kavita Nair")).toBeInTheDocument();
      expect(screen.getByText("Breathtaking estate walk and lovely hosts!")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Message Host \/ Inquire/i })).toBeInTheDocument();
    });
  });

  it("filters marketplace results when Category is selected and Apply is clicked", async () => {
    const getServicesSpy = vi.spyOn(marketplaceService, "getMarketplaceServices").mockResolvedValue({
      services: [mockService],
      total: 1,
      page: 1,
      limit: 16,
      total_pages: 1,
    });
    vi.spyOn(marketplaceService, "getExploreFeed").mockResolvedValue({
      categories: [],
      active_sections: ["top_and_most_visited"],
      top_and_most_visited: [mockService],
      user_signals: { is_authenticated: false, has_location: false },
    } as any);

    const { container } = render(
      <MemoryRouter initialEntries={["/explore"]}>
        <Routes>
          <Route path="/explore" element={<CustomerExplorePage />} />
        </Routes>
      </MemoryRouter>
    );

    // 1. Open Filter Popover
    const filterButton = screen.getByRole("button", { name: /filter/i });
    fireEvent.click(filterButton);

    // 2. Select Category "Farm Tours & Experiences" (value: "farm")
    const selects = container.querySelectorAll("select");
    expect(selects.length).toBeGreaterThanOrEqual(1);
    const categorySelect = selects[0];
    fireEvent.change(categorySelect, { target: { value: "farm" } });

    // 3. Click Apply
    const applyButton = screen.getByRole("button", { name: /^Apply$/i });
    fireEvent.click(applyButton);

    // 4. Verify API was called with category: "farm"
    await waitFor(() => {
      expect(getServicesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "farm",
        })
      );
    });
  });
});
