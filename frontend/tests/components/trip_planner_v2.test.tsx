import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TripPlannerModal } from "@/components/customer/TripPlannerModal";
import { TravelAIFloating } from "@/components/customer/TravelAIFloating";
import * as aiService from "@/services/aiService";

// Mock i18n
vi.mock("@/i18n", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    language: "en",
    changeLanguage: vi.fn(),
  }),
}));

describe("Agentic Trip Planner V2 Frontend Integration", () => {
  const mockPlanResponse: aiService.TripPlanResponse = {
    plan_id: "plan-test-101",
    status: "READY_FOR_REVIEW",
    constraints: {
      destination_district: "Kodagu (Coorg)",
      duration_days: 2,
      party_size: 2,
      max_budget: 15000,
      pace: "MODERATE",
    },
    proposal: {
      total_days: 2,
      estimated_total_cost: 8500,
      currency: "INR",
      days: [
        {
          day_number: 1,
          theme: "Coffee Plantation & Heritage Experience",
          estimated_day_cost: 5000,
          items: [
            {
              item_id: "item-01",
              service_id: "srv-001",
              title: "Organic Cardamom & Coffee Farm Stay",
              time_slot: "MORNING",
              start_time: "09:00",
              end_time: "13:00",
              price: 3500,
              category: "Stays",
              provider_name: "Bopanna Gowda",
              is_verified: true,
            },
            {
              item_id: "item-02",
              service_id: "srv-002",
              title: "Traditional Kodava Cooking Workshop",
              time_slot: "AFTERNOON",
              start_time: "14:00",
              end_time: "17:00",
              price: 1500,
              category: "Workshops",
              provider_name: "Kaveri Amma",
              is_verified: true,
            },
          ],
        },
        {
          day_number: 2,
          theme: "Spice Trail & River Kayaking",
          estimated_day_cost: 3500,
          items: [
            {
              item_id: "item-03",
              service_id: "srv-003",
              title: "Cauvery River Eco-Kayaking",
              time_slot: "MORNING",
              start_time: "08:30",
              end_time: "12:00",
              price: 3500,
              category: "Activities",
              provider_name: "Appanna Adventure",
              is_verified: true,
            },
          ],
        },
      ],
    },
    validation_report: {
      is_valid: true,
      score: 1.0,
      issues: [],
      conflicts: [],
    },
    clarification_questions: [],
    associated_trip_id: "trip-persisted-999",
  };

  const mockHandoffResponse: aiService.BookingHandoffResponse = {
    plan_id: "plan-test-101",
    associated_trip_id: "trip-persisted-999",
    user_id: "u-traveler-01",
    status: "HANDED_OFF",
    estimated_total_cost: 8500,
    currency: "INR",
    items_to_book: [
      {
        item_id: "item-01",
        service_id: "srv-001",
        title: "Organic Cardamom & Coffee Farm Stay",
        day_number: 1,
        time_slot: "MORNING",
        price: 3500,
        category: "Stays",
      },
      {
        item_id: "item-02",
        service_id: "srv-002",
        title: "Traditional Kodava Cooking Workshop",
        day_number: 1,
        time_slot: "AFTERNOON",
        price: 1500,
        category: "Workshops",
      },
    ],
    bookings_created: false,
    payment_created: false,
    requires_user_checkout: true,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders requirement gathering form when modal opens in fresh state", () => {
    render(<TripPlannerModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText("Agentic AI Trip Planner")).toBeInTheDocument();
    expect(screen.getByText("Destination District")).toBeInTheDocument();
    expect(screen.getByText(/Duration/i)).toBeInTheDocument();
    expect(screen.getByText(/Travelers/i)).toBeInTheDocument();
    expect(screen.getByText(/Max Budget/i)).toBeInTheDocument();
    expect(screen.getByText(/Travel Pace/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Generate Agentic Itinerary/i })).toBeInTheDocument();
  });

  it("triggers generateTripPlan API on form submit and displays itinerary proposal", async () => {
    const generateSpy = vi
      .spyOn(aiService, "generateTripPlan")
      .mockResolvedValue(mockPlanResponse);

    render(<TripPlannerModal isOpen={true} onClose={vi.fn()} />);

    const generateBtn = screen.getByRole("button", { name: /Generate Agentic Itinerary/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(generateSpy).toHaveBeenCalled();
      expect(screen.getByText("Ready for Review")).toBeInTheDocument();
      expect(
        screen.getByText(/Organic Cardamom & Coffee Farm Stay/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Traditional Kodava Cooking Workshop/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Cauvery River Eco-Kayaking/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/Itinerary Validated & Verified/i)).toBeInTheDocument();
    });
  });

  it("handles itinerary refinement actions (REMOVE and REPLACE)", async () => {
    vi.spyOn(aiService, "generateTripPlan").mockResolvedValue(mockPlanResponse);
    const refineSpy = vi.spyOn(aiService, "refineTripPlan").mockResolvedValue({
      ...mockPlanResponse,
      status: "REFINING",
    });

    render(<TripPlannerModal isOpen={true} onClose={vi.fn()} />);

    // Generate initial plan
    fireEvent.click(
      screen.getByRole("button", { name: /Generate Agentic Itinerary/i })
    );

    await waitFor(() => {
      expect(screen.getByText(/Organic Cardamom & Coffee Farm Stay/i)).toBeInTheDocument();
    });

    // Click Swap button
    const swapButtons = screen.getAllByRole("button", { name: /Swap/i });
    fireEvent.click(swapButtons[0]);

    await waitFor(() => {
      expect(refineSpy).toHaveBeenCalledWith(
        "plan-test-101",
        expect.objectContaining({
          action: "REPLACE",
          day_number: 1,
          item_id: "item-01",
        })
      );
    });
  });

  it("confirms trip plan and transitions to pre-booking handoff view without creating premature bookings", async () => {
    vi.spyOn(aiService, "generateTripPlan").mockResolvedValue(mockPlanResponse);
    const confirmSpy = vi
      .spyOn(aiService, "confirmTripPlan")
      .mockResolvedValue({ status: "success", plan_id: "plan-test-101" });
    const handoffSpy = vi
      .spyOn(aiService, "getBookingHandoff")
      .mockResolvedValue(mockHandoffResponse);

    render(<TripPlannerModal isOpen={true} onClose={vi.fn()} />);

    // Generate plan
    fireEvent.click(
      screen.getByRole("button", { name: /Generate Agentic Itinerary/i })
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Confirm Plan & Prepare Booking/i })
      ).toBeInTheDocument();
    });

    // Confirm plan
    fireEvent.click(
      screen.getByRole("button", { name: /Confirm Plan & Prepare Booking/i })
    );

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalled();
      expect(handoffSpy).toHaveBeenCalled();
      expect(screen.getByText(/Itinerary Confirmed & Saved!/i)).toBeInTheDocument();
      expect(screen.getByText(/Pre-Booking Status/i)).toBeInTheDocument();
      expect(
        screen.getByText(
          /No charge has been made\. Your reservations remain in draft status until you complete checkout/i
        )
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /View My Trips/i })).toBeInTheDocument();
    });
  });

  it("handles conversational AI chat floating window interactions", async () => {
    const convSpy = vi.spyOn(aiService, "createAIConversation").mockResolvedValue({
      id: "conv-123",
      title: "Namma Travel Assistant",
      context_type: "TRAVEL",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const sendSpy = vi.spyOn(aiService, "sendMessageToAI").mockResolvedValue({
      id: "msg-ai-01",
      conversation_id: "conv-123",
      role: "assistant",
      content: "Here are some recommended plantation stays in Madikeri.",
      recommended_services: [
        {
          service_id: "srv-001",
          title: "Organic Cardamom & Coffee Farm Stay",
          location: "Madikeri",
          category: "Stays",
          price: 3500,
        },
      ],
      created_at: new Date().toISOString(),
    });

    render(<TravelAIFloating />);

    // Click floating trigger button
    const openBtn = screen.getByRole("button", { name: /Open Namma AI/i });
    fireEvent.click(openBtn);

    await waitFor(() => {
      expect(convSpy).toHaveBeenCalled();
      expect(screen.getByText(/Namma AI Assistant/i)).toBeInTheDocument();
      expect(screen.getByText(/Namaskara!/i)).toBeInTheDocument();
    });

    // Send a message
    const input = screen.getByPlaceholderText(/Ask about farm stays/i);
    fireEvent.change(input, { target: { value: "Tell me about farm stays" } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => {
      expect(sendSpy).toHaveBeenCalledWith("conv-123", {
        content: "Tell me about farm stays",
      });
      expect(
        screen.getByText(/Here are some recommended plantation stays in Madikeri/i)
      ).toBeInTheDocument();
    });
  });
});
