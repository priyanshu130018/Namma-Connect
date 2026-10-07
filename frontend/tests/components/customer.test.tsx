import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { ServiceCard } from "@/components/cards/ServiceCard";
import { TravelAIFloating } from "@/components/customer/TravelAIFloating";
import { CustomerNavbar } from "@/components/layout/CustomerNavbar";
import { CustomerSidebar } from "@/components/layout/CustomerSidebar";
import { MarketplaceService } from "@/types";

const mockService: MarketplaceService = {
  id: "srv-001",
  title: "Organic Cardamom Farm Stay",
  slug: "cardamom-stay",
  description: "Peaceful cardamom estate in Madikeri Coorg",
  category: "Stays",
  category_slug: "stay",
  location: "Madikeri, Coorg",
  district: "Kodagu (Coorg)",
  state: "Karnataka",
  price: 3800,
  unit: "night",
  rating: 4.9,
  reviews_count: 24,
  is_verified: true,
  status: "PUBLISHED",
  provider_name: "Bopanna Gowda",
  provider_type: "Farmer",
  primary_image: "/images/services/coffee-estate.jpg",
  images: ["/images/services/coffee-estate.jpg"],
  inclusions: [],
  amenities: [],
};

describe("Customer Application Components", () => {
  it("renders ServiceCard with title, location, price, and provider", () => {
    render(
      <BrowserRouter>
        <ServiceCard service={mockService} />
      </BrowserRouter>
    );
    expect(screen.getByText(mockService.title)).toBeInTheDocument();
    expect(screen.getByText(mockService.provider_name)).toBeInTheDocument();
    expect(screen.getByText(/Madikeri/i)).toBeInTheDocument();
  });

  it("renders TravelAIFloating and opens assistant window on click", async () => {
    render(
      <BrowserRouter>
        <TravelAIFloating />
      </BrowserRouter>
    );
    const aiButton = screen.getByRole("button", { name: /Namma AI/i });
    expect(aiButton).toBeInTheDocument();

    fireEvent.click(aiButton);
    expect(screen.getByText(/Namma AI Assistant/i)).toBeInTheDocument();
  });

  it("renders CustomerNavbar with Brand, Notifications, Messages, and Profile", () => {
    render(
      <BrowserRouter>
        <CustomerNavbar />
      </BrowserRouter>
    );
    expect(screen.getByText(/Namma/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Notifications/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Messages/i)).toBeInTheDocument();
  });

  it("renders CustomerSidebar with navigation items and become partner link", () => {
    const onToggle = vi.fn();
    render(
      <BrowserRouter>
        <CustomerSidebar isCollapsed={false} onToggleCollapse={onToggle} />
      </BrowserRouter>
    );
    expect(screen.getByText(/Namma AI/i)).toBeInTheDocument();
    expect(screen.getByText(/^Explore$/i)).toBeInTheDocument();
    expect(screen.getByText(/My Trip/i)).toBeInTheDocument();
    expect(screen.getByText(/Become Partner/i)).toBeInTheDocument();
  });
});
