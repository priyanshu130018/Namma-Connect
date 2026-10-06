import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import {
  ProviderAvailabilitySection,
  DEFAULT_AVAILABILITY_STATE,
  validateAvailability,
  ServiceAvailabilityState,
} from "@/components/partner/ProviderAvailabilitySection";
import { PartnerServiceNewPage } from "@/routes/partner/PartnerServiceNew";
import { PartnerServiceDetailPage } from "@/routes/partner/PartnerServiceDetail";
import * as partnerService from "@/services/partnerService";
import { MarketplaceService } from "@/types";

describe("Provider Availability Component & Logic Suite", () => {
  describe("validateAvailability Logic", () => {
    it("validates a standard valid availability state", () => {
      const state: ServiceAvailabilityState = {
        weeklyAvailability: {
          monday: true,
          tuesday: true,
          wednesday: false,
          thursday: true,
          friday: true,
          saturday: true,
          sunday: false,
        },
        startTime: "09:00",
        endTime: "18:00",
        capacity: 10,
      };

      const result = validateAvailability(state);
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it("rejects when no days are selected", () => {
      const state: ServiceAvailabilityState = {
        weeklyAvailability: {
          monday: false,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false,
          saturday: false,
          sunday: false,
        },
        startTime: "09:00",
        endTime: "18:00",
        capacity: 10,
      };

      const result = validateAvailability(state);
      expect(result.isValid).toBe(false);
      expect(result.errors.days).toBe("At least one available day must be selected.");
    });

    it("rejects when end time is before or equal to start time", () => {
      const state: ServiceAvailabilityState = {
        weeklyAvailability: { ...DEFAULT_AVAILABILITY_STATE.weeklyAvailability },
        startTime: "18:00",
        endTime: "09:00",
        capacity: 5,
      };

      const result = validateAvailability(state);
      expect(result.isValid).toBe(false);
      expect(result.errors.time).toBe("End time must be after start time.");
    });

    it("rejects when capacity is invalid or zero", () => {
      const state: ServiceAvailabilityState = {
        weeklyAvailability: { ...DEFAULT_AVAILABILITY_STATE.weeklyAvailability },
        startTime: "09:00",
        endTime: "17:00",
        capacity: 0,
      };

      const result = validateAvailability(state);
      expect(result.isValid).toBe(false);
      expect(result.errors.capacity).toBe("Maximum capacity must be a positive integer (at least 1).");
    });
  });

  describe("ProviderAvailabilitySection Component", () => {
    it("renders availability title, description, all 7 days, times, and capacity", () => {
      const onChange = vi.fn();
      render(
        <ProviderAvailabilitySection
          value={DEFAULT_AVAILABILITY_STATE}
          onChange={onChange}
        />
      );

      // Section Title & Description
      expect(screen.getByText("Availability")).toBeInTheDocument();
      expect(
        screen.getByText("Set when this service is normally available for booking.")
      ).toBeInTheDocument();

      // Monday to Sunday controls
      expect(screen.getByText("Monday")).toBeInTheDocument();
      expect(screen.getByText("Tuesday")).toBeInTheDocument();
      expect(screen.getByText("Wednesday")).toBeInTheDocument();
      expect(screen.getByText("Thursday")).toBeInTheDocument();
      expect(screen.getByText("Friday")).toBeInTheDocument();
      expect(screen.getByText("Saturday")).toBeInTheDocument();
      expect(screen.getByText("Sunday")).toBeInTheDocument();

      // Available Time controls
      expect(screen.getByText("Available Time")).toBeInTheDocument();
      expect(screen.getByLabelText(/start time/i)).toHaveValue("09:00");
      expect(screen.getByLabelText(/end time/i)).toHaveValue("18:00");

      // Capacity control
      expect(screen.getByText("Capacity")).toBeInTheDocument();
      expect(
        screen.getByLabelText(/maximum people per availability period/i)
      ).toHaveValue(10);
    });

    it("toggles day availability when clicked", () => {
      const onChange = vi.fn();
      render(
        <ProviderAvailabilitySection
          value={DEFAULT_AVAILABILITY_STATE}
          onChange={onChange}
        />
      );

      const switches = screen.getAllByRole("switch");
      expect(switches.length).toBe(7);

      // Click Wednesday toggle (3rd item)
      fireEvent.click(switches[2]);
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          weeklyAvailability: expect.objectContaining({
            wednesday: false,
          }),
        })
      );
    });

    it("displays validation error messages when passed", () => {
      render(
        <ProviderAvailabilitySection
          value={DEFAULT_AVAILABILITY_STATE}
          onChange={vi.fn()}
          errors={{
            days: "At least one day must be active",
            time: "End time must be after start time",
            capacity: "Capacity must be positive",
          }}
        />
      );

      expect(screen.getByText("At least one day must be active")).toBeInTheDocument();
      expect(screen.getByText("End time must be after start time")).toBeInTheDocument();
      expect(screen.getByText("Capacity must be positive")).toBeInTheDocument();
    });
  });

  describe("Integration: Add Service Form (PartnerServiceNewPage)", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("displays Availability section after choosing a provider type", async () => {
      render(
        <MemoryRouter>
          <PartnerServiceNewPage />
        </MemoryRouter>
      );

      // Step 1: Select Farmer category
      const farmerCard = screen.getByText("Farmer / Agro-Host");
      fireEvent.click(farmerCard);

      // Step 2: Verify Availability Section is visible in form
      expect(screen.getByText("Availability")).toBeInTheDocument();
      expect(
        screen.getByText("Set when this service is normally available for booking.")
      ).toBeInTheDocument();
      expect(screen.getByText("Weekly Availability")).toBeInTheDocument();
      expect(screen.getByText("Available Time")).toBeInTheDocument();
      expect(screen.getByText("Capacity")).toBeInTheDocument();
    });

    it("creates service with availability data across multiple provider types", async () => {
      const createSpy = vi.spyOn(partnerService, "createPartnerService").mockResolvedValue({
        id: "srv-new-1",
        title: "Kurinji Flower Botanical Guided Trek",
        slug: "kurinji-flower-trek",
        description: "Guided floral hike in Chikmagalur.",
        category: "Experiences",
        category_slug: "experiences",
        location: "Mullayanagiri, Chikmagalur",
        district: "Chikmagalur",
        state: "Karnataka",
        price: 1500,
        unit: "person",
        max_capacity: 12,
        rating: 5.0,
        reviews_count: 0,
        is_verified: true,
        status: "DRAFT",
        provider_name: "Ravi Kumar",
        provider_type: "Guide",
        primary_image: "/images/test.jpg",
        images: [],
        inclusions: [],
        amenities: [],
      });

      render(
        <MemoryRouter>
          <PartnerServiceNewPage />
        </MemoryRouter>
      );

      // Select Guide provider type
      const guideCard = screen.getByText("Guide & Naturalist");
      fireEvent.click(guideCard);

      // Fill basic inputs
      fireEvent.change(screen.getByLabelText(/service \/ stay title/i), {
        target: { value: "Kurinji Flower Botanical Guided Trek" },
      });
      fireEvent.change(screen.getByLabelText(/location/i), {
        target: { value: "Mullayanagiri, Chikmagalur" },
      });
      fireEvent.change(screen.getByLabelText(/price/i), {
        target: { value: "1500" },
      });

      // Change capacity in Availability section
      const capInput = screen.getByLabelText(/maximum people per availability period/i);
      fireEvent.change(capInput, { target: { value: "12" } });

      // Save as Draft
      const saveDraftBtn = screen.getByRole("button", { name: /save as draft/i });
      fireEvent.click(saveDraftBtn);

      await waitFor(() => {
        expect(createSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Kurinji Flower Botanical Guided Trek",
            location: "Mullayanagiri, Chikmagalur",
            price: 1500,
            max_capacity: 12,
            specific_details: expect.objectContaining({
              weeklyAvailability: expect.objectContaining({
                monday: true,
              }),
              startTime: "09:00",
              endTime: "18:00",
              capacity: 12,
            }),
          })
        );
      });
    });
  });

  describe("Integration: Edit Service Form (PartnerServiceDetailPage)", () => {
    const mockServiceWithAvailability: MarketplaceService = {
      id: "srv-edit-101",
      title: "Coorg Heritage Coffee Plantation Stay",
      slug: "coorg-heritage-coffee-plantation-stay",
      description: "Authentic colonial estate cottage stay.",
      category: "Stay",
      category_slug: "stay",
      location: "Madikeri, Coorg",
      district: "Kodagu",
      state: "Karnataka",
      price: 4500,
      unit: "night",
      max_capacity: 8,
      rating: 4.9,
      reviews_count: 22,
      is_verified: true,
      status: "PUBLISHED",
      provider_name: "Kaveri Muthappa",
      provider_type: "Farmer",
      primary_image: "/images/estate.jpg",
      images: ["/images/estate.jpg"],
      inclusions: ["Breakfast"],
      amenities: ["Wi-Fi"],
      specific_details: {
        weeklyAvailability: {
          monday: true,
          tuesday: true,
          wednesday: false,
          thursday: true,
          friday: true,
          saturday: true,
          sunday: false,
        },
        startTime: "10:00",
        endTime: "19:00",
        capacity: 8,
      },
    };

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("loads existing availability values into the edit form", async () => {
      vi.spyOn(partnerService, "getPartnerServiceById").mockResolvedValue(mockServiceWithAvailability);

      render(
        <MemoryRouter initialEntries={["/partner/services/srv-edit-101"]}>
          <Routes>
            <Route path="/partner/services/:service_id" element={<PartnerServiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Coorg Heritage Coffee Plantation Stay")).toBeInTheDocument();
      });

      // Availability section rendered with loaded values
      expect(screen.getByText("Availability")).toBeInTheDocument();
      expect(screen.getByLabelText(/start time/i)).toHaveValue("10:00");
      expect(screen.getByLabelText(/end time/i)).toHaveValue("19:00");
      expect(screen.getByLabelText(/maximum people per availability period/i)).toHaveValue(8);

      // Wednesday & Sunday should be "Not Available"
      const switches = screen.getAllByRole("switch");
      expect(switches[2]).toHaveTextContent("Not Available"); // Wednesday
      expect(switches[6]).toHaveTextContent("Not Available"); // Sunday
    });

    it("saves updated availability values to backend", async () => {
      vi.spyOn(partnerService, "getPartnerServiceById").mockResolvedValue(mockServiceWithAvailability);
      const updateSpy = vi.spyOn(partnerService, "updatePartnerService").mockResolvedValue({
        ...mockServiceWithAvailability,
        max_capacity: 10,
      });

      render(
        <MemoryRouter initialEntries={["/partner/services/srv-edit-101"]}>
          <Routes>
            <Route path="/partner/services/:service_id" element={<PartnerServiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Coorg Heritage Coffee Plantation Stay")).toBeInTheDocument();
      });

      // Toggle Wednesday to Available
      const switches = screen.getAllByRole("switch");
      fireEvent.click(switches[2]); // Wednesday toggles to Available

      // Update capacity to 10
      const capInput = screen.getByLabelText(/maximum people per availability period/i);
      fireEvent.change(capInput, { target: { value: "10" } });

      // Save changes
      const saveBtn = screen.getByRole("button", { name: /save changes/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(updateSpy).toHaveBeenCalledWith(
          "srv-edit-101",
          expect.objectContaining({
            max_capacity: 10,
            specific_details: expect.objectContaining({
              weeklyAvailability: expect.objectContaining({
                wednesday: true,
              }),
              capacity: 10,
            }),
          })
        );
      });
    });
  });
});
