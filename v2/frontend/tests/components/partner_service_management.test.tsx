import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BrowserRouter, MemoryRouter, Routes, Route } from "react-router-dom";
import { PartnerServicesPage } from "@/routes/partner/PartnerServices";
import { PartnerServiceNewPage } from "@/routes/partner/PartnerServiceNew";
import { PartnerServiceDetailPage } from "@/routes/partner/PartnerServiceDetail";
import * as partnerService from "@/services/partnerService";
import { MarketplaceService } from "@/types";

const mockServices: MarketplaceService[] = [
  {
    id: "srv-001",
    title: "Organic Coffee Estate Homestay",
    slug: "organic-coffee-estate-homestay",
    description: "Serene stay nestled inside a 50-acre coffee plantation.",
    category: "Stay",
    category_slug: "stay",
    location: "Madikeri, Coorg, Karnataka",
    district: "Kodagu",
    state: "Karnataka",
    price: 3800,
    unit: "night",
    duration_hours: 24,
    max_capacity: 6,
    rating: 4.9,
    reviews_count: 14,
    is_verified: true,
    status: "PUBLISHED",
    provider_name: "Somanna Gowda",
    provider_type: "Farmer",
    primary_image: "/images/services/coorg-stay.jpg",
    images: ["/images/services/coorg-stay.jpg"],
    inclusions: ["Breakfast", "Plantation Tour"],
    amenities: ["Wi-Fi", "Hot Water"],
  },
  {
    id: "srv-002",
    title: "Mandalpatti Peak Off-Road Jeep Safari",
    slug: "mandalpatti-peak-jeep-safari",
    description: "4x4 trail ride to the misty Mandalpatti view point.",
    category: "Experiences",
    category_slug: "experiences",
    location: "Mandalpatti, Kodagu",
    district: "Kodagu",
    state: "Karnataka",
    price: 2200,
    unit: "trip",
    duration_hours: 4,
    max_capacity: 5,
    rating: 4.8,
    reviews_count: 8,
    is_verified: true,
    status: "DRAFT",
    provider_name: "Somanna Gowda",
    provider_type: "Travel",
    primary_image: "/images/services/jeep-safari.jpg",
    images: ["/images/services/jeep-safari.jpg"],
    inclusions: ["Driver", "Permits"],
    amenities: ["First Aid Kit"],
  },
];

describe("Provider Service Management Component Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders PartnerServicesPage with real service catalog", async () => {
    vi.spyOn(partnerService, "getPartnerServices").mockResolvedValue(mockServices);

    render(
      <BrowserRouter>
        <PartnerServicesPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("My Services Catalog")).toBeInTheDocument();
      expect(screen.getByText("Organic Coffee Estate Homestay")).toBeInTheDocument();
      expect(screen.getByText("Mandalpatti Peak Off-Road Jeep Safari")).toBeInTheDocument();
      expect(screen.getByText("Published")).toBeInTheDocument();
      expect(screen.getByText("Draft")).toBeInTheDocument();
    });
  });

  it("renders empty state when partner has zero services", async () => {
    vi.spyOn(partnerService, "getPartnerServices").mockResolvedValue([]);

    render(
      <BrowserRouter>
        <PartnerServicesPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("No Services Created Yet")).toBeInTheDocument();
      expect(screen.getByText("Create Your First Service")).toBeInTheDocument();
    });
  });

  it("creates a new draft and review submission in PartnerServiceNewPage", async () => {
    const createSpy = vi.spyOn(partnerService, "createPartnerService").mockResolvedValue(mockServices[1]);

    render(
      <BrowserRouter>
        <PartnerServiceNewPage />
      </BrowserRouter>
    );

    // Step 1: Select Category
    expect(screen.getByText("Step 1: Choose Your Offering Category")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Farmer / Agro-Host"));

    // Step 2: Form configuration
    await waitFor(() => {
      expect(screen.getByText("farmer Offering Form")).toBeInTheDocument();
    });

    const titleInput = screen.getByLabelText(/Service \/ Stay Title/i);
    fireEvent.change(titleInput, { target: { value: "Kabini Riverfront Agro Trail" } });

    const priceInput = screen.getByLabelText(/Price \(₹ INR\)/i);
    fireEvent.change(priceInput, { target: { value: "2900" } });

    // Save as Draft
    const draftButton = screen.getByRole("button", { name: /Save as Draft/i });
    fireEvent.click(draftButton);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Kabini Riverfront Agro Trail",
          price: 2900,
          status: "DRAFT",
        })
      );
      expect(screen.getByText("Draft Service Saved Successfully")).toBeInTheDocument();
    });
  });

  it("loads and edits existing service in PartnerServiceDetailPage", async () => {
    vi.spyOn(partnerService, "getPartnerServiceById").mockResolvedValue(mockServices[1]);
    const updateSpy = vi.spyOn(partnerService, "updatePartnerService").mockResolvedValue({
      ...mockServices[1],
      price: 2500,
    });
    const submitReviewSpy = vi
      .spyOn(partnerService, "submitPartnerServiceForReview")
      .mockResolvedValue({
        ...mockServices[1],
        status: "UNDER REVIEW",
      });

    render(
      <MemoryRouter initialEntries={["/partner/services/srv-002"]}>
        <Routes>
          <Route path="/partner/services/:service_id" element={<PartnerServiceDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Mandalpatti Peak Off-Road Jeep Safari")).toBeInTheDocument();
      expect(screen.getByDisplayValue("2200")).toBeInTheDocument();
    });

    // Edit Price & Save
    const priceInput = screen.getByDisplayValue("2200");
    fireEvent.change(priceInput, { target: { value: "2500" } });

    const saveButton = screen.getByRole("button", { name: /Save Changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        "srv-002",
        expect.objectContaining({ price: 2500 })
      );
    });

    // Submit for Review
    const submitReviewBtn = screen.getByRole("button", { name: /Submit for Review/i });
    fireEvent.click(submitReviewBtn);

    await waitFor(() => {
      expect(submitReviewSpy).toHaveBeenCalled();
      expect(screen.getByText(/Listing submitted for administrative compliance review/i)).toBeInTheDocument();
    });
  });
});
