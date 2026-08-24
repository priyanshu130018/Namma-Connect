import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CustomerSavedPage } from "@/routes/customer/Saved";
import { ServiceCard } from "@/components/cards/ServiceCard";
import * as savedService from "@/services/savedService";
import { MarketplaceService } from "@/types";

const mockSavedServices: MarketplaceService[] = [
  {
    id: "srv-01",
    title: "Highland Arabica Coffee Estate Stay",
    slug: "highland-arabica-coffee-estate",
    description: "Serene coffee plantation stay in Madikeri.",
    category: "Stay",
    category_slug: "stay",
    location: "Madikeri, Coorg, Karnataka",
    district: "Kodagu",
    state: "Karnataka",
    price: 3600,
    unit: "night",
    rating: 4.9,
    reviews_count: 34,
    is_verified: true,
    status: "PUBLISHED",
    provider_name: "Somanna (Kodagu Organics)",
    provider_type: "Individual Farmer",
    primary_image: "/images/coffee.jpg",
    images: ["/images/coffee.jpg"],
    inclusions: ["Breakfast", "Estate Tour"],
    amenities: ["Wi-Fi", "Hot Water"],
  },
  {
    id: "srv-02",
    title: "Channapatna Heritage Toy Craft Workshop",
    slug: "channapatna-toy-craft-workshop",
    description: "Hands-on lacquerware toy craft experience.",
    category: "Experiences",
    category_slug: "experiences",
    location: "Channapatna, Ramanagara",
    district: "Ramanagara",
    state: "Karnataka",
    price: 950,
    unit: "person",
    rating: 4.85,
    reviews_count: 19,
    is_verified: true,
    status: "PUBLISHED",
    provider_name: "Nagesh Master Artisan",
    provider_type: "Artisan Guild",
    primary_image: "/images/toys.jpg",
    images: ["/images/toys.jpg"],
    inclusions: ["Craft Material", "Take-home Toy"],
    amenities: ["Tools Provided"],
  },
];

describe("Customer Saved Services (Wishlist) Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Saved Services page with real saved items from API", async () => {
    vi.spyOn(savedService, "getSavedServices").mockResolvedValue(mockSavedServices);

    render(
      <MemoryRouter>
        <CustomerSavedPage />
      </MemoryRouter>
    );

    expect(screen.getByText("Saved Services")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Highland Arabica Coffee Estate Stay")).toBeInTheDocument();
      expect(screen.getByText("Channapatna Heritage Toy Craft Workshop")).toBeInTheDocument();
    });
  });

  it("removes a saved service from UI and invokes removeSavedService API", async () => {
    vi.spyOn(savedService, "getSavedServices").mockResolvedValue(mockSavedServices);
    const removeSpy = vi.spyOn(savedService, "removeSavedService").mockResolvedValue(false);

    render(
      <MemoryRouter>
        <CustomerSavedPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Highland Arabica Coffee Estate Stay")).toBeInTheDocument();
    });

    const removeButtons = screen.getAllByRole("button", { name: /Remove from wishlist/i });
    expect(removeButtons.length).toBeGreaterThanOrEqual(1);

    // Click remove on first item
    fireEvent.click(removeButtons[0]);

    await waitFor(() => {
      expect(removeSpy).toHaveBeenCalledWith("srv-01");
      expect(screen.queryByText("Highland Arabica Coffee Estate Stay")).not.toBeInTheDocument();
      expect(screen.getByText("Channapatna Heritage Toy Craft Workshop")).toBeInTheDocument();
    });
  });

  it("displays empty state when customer has no saved services", async () => {
    vi.spyOn(savedService, "getSavedServices").mockResolvedValue([]);

    render(
      <MemoryRouter>
        <CustomerSavedPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("No saved services yet.")).toBeInTheDocument();
      expect(screen.getByText("Save services you want to revisit later.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Explore Services/i })).toBeInTheDocument();
    });
  });

  it("displays error state and allows retry when API fails", async () => {
    const fetchSpy = vi.spyOn(savedService, "getSavedServices")
      .mockRejectedValueOnce(new Error("Network Error"))
      .mockResolvedValueOnce(mockSavedServices);

    render(
      <MemoryRouter>
        <CustomerSavedPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Unable to load saved services.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Retry/i })).toBeInTheDocument();
    });

    // Click Retry
    fireEvent.click(screen.getByRole("button", { name: /Retry/i }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(screen.getByText("Highland Arabica Coffee Estate Stay")).toBeInTheDocument();
    });
  });

  it("ServiceCard toggles saved state and invokes onSaveToggle callback", () => {
    const handleToggle = vi.fn();

    render(
      <MemoryRouter>
        <ServiceCard
          service={mockSavedServices[0]}
          isInitiallySaved={false}
          onSaveToggle={handleToggle}
        />
      </MemoryRouter>
    );

    const saveBtn = screen.getByRole("button", { name: /Save to wishlist/i });
    fireEvent.click(saveBtn);

    expect(handleToggle).toHaveBeenCalledWith("srv-01", true);
  });
});
